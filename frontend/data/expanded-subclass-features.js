/**
 * Traços por nível das subclasses 2014 fora do SRD (XGE, TCE, SCAG, FToD, BGG, VRGR, EGW, MOoT…).
 * Só fatos: nome do traço e nível em que chega, com um resumo curto escrito por nós —
 * nenhum texto do livro. O motor (rules.js) espalha cada linha no nível certo da linha do tempo.
 *
 * Formato: classe → subclasse → [[nível, nomeEN, nomePT, resumoEN, resumoPT], …]
 */
import { CLASS_OPTIONS } from './class-options/index.js';

const F = {
  barbarian: {
    battlerager: [
      [3, 'Restriction: Dwarves Only', 'Restrição: Só Anões', 'Path open to dwarves.', 'Caminho aberto a anões.'],
      [3, 'Battlerager Armor', 'Armadura do Furioso', 'Spiked armor grants an extra attack and grapple damage while raging.', 'Armadura com espetos dá um ataque extra e dano ao agarrar em fúria.'],
      [6, 'Reckless Abandon', 'Abandono Imprudente', 'Gain temporary hit points when attacking recklessly.', 'Ganha PV temporários ao atacar imprudentemente.'],
      [10, 'Battlerager Charge', 'Investida do Furioso', 'Dash as a bonus action while raging.', 'Dispara como ação bônus em fúria.'],
      [14, 'Spiked Retribution', 'Retribuição Espinhosa', 'Melee attackers take piercing damage.', 'Quem ataca corpo a corpo sofre dano perfurante.'],
    ],
    ancestralguardian: [
      [3, 'Ancestral Protectors', 'Protetores Ancestrais', 'The first creature you hit has disadvantage against others and its damage is resisted.', 'A primeira criatura atingida tem desvantagem contra outros e seu dano é resistido.'],
      [6, 'Spirit Shield', 'Escudo Espiritual', 'Reaction to reduce damage to a nearby ally.', 'Reação para reduzir o dano a um aliado próximo.'],
      [10, 'Consult the Spirits', 'Consultar os Espíritos', 'Cast augury or clairvoyance without a slot.', 'Conjura augúrio ou clarividência sem espaço.'],
      [14, 'Vengeful Ancestors', 'Ancestrais Vingativos', 'Damage prevented by Spirit Shield strikes the attacker.', 'O dano evitado pelo Escudo Espiritual atinge o agressor.'],
    ],
    stormherald: [
      [3, 'Storm Aura', 'Aura da Tempestade', 'A desert, sea or tundra aura with a raging effect.', 'Aura de deserto, mar ou tundra com efeito em fúria.'],
      [6, 'Storm Soul', 'Alma da Tempestade', 'Resistance and an environmental benefit.', 'Resistência e um benefício ambiental.'],
      [10, 'Shielding Storm', 'Tempestade Protetora', 'Allies in your aura share your resistance.', 'Aliados na aura dividem sua resistência.'],
      [14, 'Raging Storm', 'Tempestade Furiosa', 'The aura gains a punishing reaction.', 'A aura ganha uma reação punitiva.'],
    ],
    zealot: [
      [3, 'Divine Fury', 'Fúria Divina', 'First hit each turn while raging deals extra radiant or necrotic damage.', 'O primeiro acerto do turno em fúria causa dano radiante ou necrótico extra.'],
      [3, 'Warrior of the Gods', 'Guerreiro dos Deuses', 'Spells that return you to life need no material components.', 'Magias que trazem você de volta não pedem componentes materiais.'],
      [6, 'Fanatical Focus', 'Foco Fanático', 'Reroll a failed save once per rage.', 'Rerrola um teste de resistência falho uma vez por fúria.'],
      [10, 'Zealous Presence', 'Presença Zelosa', 'Allies gain advantage on attacks and saves for a round.', 'Aliados ganham vantagem em ataques e resistências por uma rodada.'],
      [14, 'Rage Beyond Death', 'Fúria Além da Morte', 'While raging, dropping to 0 hit points does not knock you out.', 'Em fúria, chegar a 0 PV não te derruba.'],
    ],
    beast: [
      [3, 'Form of the Beast', 'Forma da Fera', 'Grow bite, claws or tail when you rage.', 'Ganha mordida, garras ou cauda ao entrar em fúria.'],
      [6, 'Bestial Soul', 'Alma Bestial', 'Magical natural weapons and swimming, climbing or jumping.', 'Armas naturais mágicas e natação, escalada ou salto.'],
      [10, 'Infectious Fury', 'Fúria Contagiosa', 'Hits can force a target to attack another or take psychic damage.', 'Acertos podem forçar o alvo a atacar outro ou sofrer dano psíquico.'],
      [14, 'Call the Hunt', 'Chamado da Caçada', 'Allies gain extra damage and you gain temporary hit points.', 'Aliados ganham dano extra e você ganha PV temporários.'],
    ],
    wildmagic: [
      [3, 'Magic Awareness', 'Percepção Mágica', 'Sense spells and magic items nearby.', 'Sente magias e itens mágicos por perto.'],
      [3, 'Wild Surge', 'Surto Selvagem', 'Raging triggers a random magical effect.', 'Entrar em fúria dispara um efeito mágico aleatório.'],
      [6, 'Bolstering Magic', 'Magia Fortalecedora', 'Boost an ally\'s rolls or restore a spell slot.', 'Reforça as rolagens de um aliado ou devolve um espaço de magia.'],
      [10, 'Unstable Backlash', 'Reação Instável', 'Reroll your surge when hurt or failing a save.', 'Rerrola o surto ao sofrer dano ou falhar numa resistência.'],
      [14, 'Controlled Surge', 'Surto Controlado', 'Roll twice on the surge table and choose.', 'Rola duas vezes na tabela de surto e escolhe.'],
    ],
    giant: [
      [3, 'Giant\'s Power', 'Poder do Gigante', 'Learn Giant and a giant-flavored cantrip.', 'Aprende Gigante e um truque ligado aos gigantes.'],
      [3, 'Giant\'s Havoc', 'Devastação do Gigante', 'Grow Large while raging and throw weapons with rage damage.', 'Fica Grande em fúria e arremessa armas com dano de fúria.'],
      [6, 'Elemental Cleaver', 'Cutelo Elemental', 'Your weapon gains elemental damage and returns when thrown.', 'A arma ganha dano elemental e volta ao ser arremessada.'],
      [10, 'Mighty Impel', 'Arremesso Poderoso', 'Hurl a creature as a bonus action while raging.', 'Arremessa uma criatura como ação bônus em fúria.'],
      [14, 'Demiurgic Colossus', 'Colosso Demiúrgico', 'Grow even larger, reach farther and hit harder.', 'Fica ainda maior, alcança mais longe e bate mais forte.'],
    ],
  },
  bard: {
    swords: [
      [3, 'Bonus Proficiencies', 'Proficiências Adicionais', 'Medium armor and scimitars; use weapons as a focus.', 'Armadura média e cimitarras; armas servem de foco.'],
      [3, 'Fighting Style', 'Estilo de Luta', 'Dueling or Two-Weapon Fighting.', 'Duelismo ou Combate com Duas Armas.'],
      [3, 'Blade Flourish', 'Floreio de Lâmina', 'Extra speed and Inspiration-powered flourishes on attacks.', 'Deslocamento extra e floreios com Inspiração nos ataques.'],
      [6, 'Extra Attack', 'Ataque Extra', 'Attack twice with the Attack action.', 'Ataca duas vezes com a ação Atacar.'],
      [14, 'Master\'s Flourish', 'Floreio do Mestre', 'Use a d6 for a flourish without spending Inspiration.', 'Usa um d6 num floreio sem gastar Inspiração.'],
    ],
    whispers: [
      [3, 'Psychic Blades', 'Lâminas Psíquicas', 'Spend Inspiration for extra psychic damage on a hit.', 'Gasta Inspiração para dano psíquico extra num acerto.'],
      [3, 'Words of Terror', 'Palavras de Terror', 'A private talk can frighten a creature.', 'Uma conversa reservada pode amedrontar uma criatura.'],
      [6, 'Mantle of Whispers', 'Manto dos Sussurros', 'Steal a dying humanoid\'s shadow to impersonate it.', 'Rouba a sombra de um humanoide moribundo para se passar por ele.'],
      [14, 'Shadow Lore', 'Saber Sombrio', 'Charm a creature with a secret it fears.', 'Enfeitiça uma criatura com um segredo que ela teme.'],
    ],
    creation: [
      [3, 'Mote of Potential', 'Fagulha de Potencial', 'Inspiration dice gain extra effects.', 'Os dados de Inspiração ganham efeitos extras.'],
      [3, 'Performance of Creation', 'Atuação da Criação', 'Create a nonmagical item from nothing.', 'Cria um item não mágico do nada.'],
      [6, 'Animating Performance', 'Atuação Animadora', 'Bring an object to life as a dancing companion.', 'Dá vida a um objeto como companheiro dançante.'],
      [14, 'Creative Crescendo', 'Crescendo Criativo', 'Create several items at once, of any size.', 'Cria vários itens de uma vez, de qualquer tamanho.'],
    ],
    eloquence: [
      [3, 'Silver Tongue', 'Língua de Prata', 'Persuasion and Deception rolls of 9 or lower count as 10.', 'Persuasão e Enganação de 9 ou menos contam como 10.'],
      [3, 'Unsettling Words', 'Palavras Perturbadoras', 'Spend Inspiration to lower a creature\'s next save.', 'Gasta Inspiração para reduzir a próxima resistência de uma criatura.'],
      [6, 'Unfailing Inspiration', 'Inspiração Infalível', 'A failed Inspiration die is not lost.', 'Um dado de Inspiração que falha não se perde.'],
      [6, 'Universal Speech', 'Fala Universal', 'Make creatures understand you.', 'Faz criaturas entenderem você.'],
      [14, 'Infectious Inspiration', 'Inspiração Contagiosa', 'When an Inspiration die succeeds, inspire another ally.', 'Quando um dado de Inspiração dá certo, inspira outro aliado.'],
    ],
    spirits: [
      [3, 'Guiding Whispers', 'Sussurros Guias', 'Learn guidance with long range.', 'Aprende orientação com longo alcance.'],
      [3, 'Spiritual Focus', 'Foco Espiritual', 'Use a candle, skull or similar as a focus.', 'Usa vela, crânio ou similar como foco.'],
      [3, 'Tales from Beyond', 'Contos do Além', 'Spend Inspiration to draw a random spirit tale.', 'Gasta Inspiração para tirar um conto espiritual aleatório.'],
      [6, 'Spirit Session', 'Sessão Espiritual', 'A ritual teaches you a spell from any list.', 'Um ritual ensina uma magia de qualquer lista.'],
      [14, 'Mystical Connection', 'Conexão Mística', 'Roll twice for a tale and choose.', 'Rola duas vezes para o conto e escolhe.'],
    ],
  },
  cleric: {
    nature: [
      [1, 'Acolyte of Nature', 'Acólito da Natureza', 'A druid cantrip and a nature skill.', 'Um truque de druida e uma perícia de natureza.'],
      [1, 'Bonus Proficiency', 'Proficiência Adicional', 'Heavy armor.', 'Armadura pesada.'],
      [2, 'Channel Divinity: Charm Animals and Plants', 'Canalizar Divindade: Enfeitiçar Animais e Plantas', 'Charm nearby beasts and plants.', 'Enfeitiça bestas e plantas próximas.'],
      [6, 'Dampen Elements', 'Atenuar Elementos', 'Reaction to grant resistance to elemental damage.', 'Reação para dar resistência a dano elemental.'],
      [8, 'Divine Strike', 'Golpe Divino', 'Extra elemental damage once per turn.', 'Dano elemental extra uma vez por turno.'],
      [17, 'Master of Nature', 'Mestre da Natureza', 'Command charmed animals and plants.', 'Comanda animais e plantas enfeitiçados.'],
    ],
    death: [
      [1, 'Bonus Proficiency', 'Proficiência Adicional', 'Martial weapons.', 'Armas marciais.'],
      [1, 'Reaper', 'Ceifador', 'Necromancy cantrips can hit two adjacent targets.', 'Truques de necromancia podem atingir dois alvos vizinhos.'],
      [2, 'Channel Divinity: Touch of Death', 'Canalizar Divindade: Toque da Morte', 'Extra necrotic damage on a melee hit.', 'Dano necrótico extra num acerto corpo a corpo.'],
      [6, 'Inescapable Destruction', 'Destruição Inescapável', 'Your necrotic damage ignores resistance.', 'Seu dano necrótico ignora resistência.'],
      [8, 'Divine Strike', 'Golpe Divino', 'Extra necrotic damage once per turn.', 'Dano necrótico extra uma vez por turno.'],
      [17, 'Improved Reaper', 'Ceifador Aprimorado', 'Single-target necromancy spells can hit two targets.', 'Magias de necromancia de um alvo podem atingir dois.'],
    ],
    arcana: [
      [1, 'Arcane Initiate', 'Iniciado Arcano', 'Arcana proficiency and two wizard cantrips.', 'Proficiência em Arcanismo e dois truques de mago.'],
      [2, 'Channel Divinity: Arcane Abjuration', 'Canalizar Divindade: Abjuração Arcana', 'Turn or banish celestials, elementals, fey and fiends.', 'Expulsa ou bane celestiais, elementais, fadas e corruptores.'],
      [6, 'Spell Breaker', 'Quebra-Magias', 'Healing spells also end a spell on the target.', 'Magias de cura também encerram uma magia no alvo.'],
      [8, 'Potent Spellcasting', 'Conjuração Potente', 'Add Wisdom to cantrip damage.', 'Soma Sabedoria ao dano dos truques.'],
      [17, 'Arcane Mastery', 'Maestria Arcana', 'Add four wizard spells to your domain spells.', 'Adiciona quatro magias de mago às magias de domínio.'],
    ],
    forge: [
      [1, 'Bonus Proficiencies', 'Proficiências Adicionais', 'Heavy armor and smith\'s tools.', 'Armadura pesada e ferramentas de ferreiro.'],
      [1, 'Blessing of the Forge', 'Bênção da Forja', 'Make a weapon or armor +1 each day.', 'Deixa uma arma ou armadura +1 a cada dia.'],
      [2, 'Channel Divinity: Artisan\'s Blessing', 'Canalizar Divindade: Bênção do Artesão', 'Create a metal object.', 'Cria um objeto de metal.'],
      [6, 'Soul of the Forge', 'Alma da Forja', 'Fire resistance and +1 AC in heavy armor.', 'Resistência a fogo e +1 CA com armadura pesada.'],
      [8, 'Divine Strike', 'Golpe Divino', 'Extra fire damage once per turn.', 'Dano de fogo extra uma vez por turno.'],
      [17, 'Saint of Forge and Fire', 'Santo da Forja e do Fogo', 'Fire immunity and resistance to weapon damage in heavy armor.', 'Imunidade a fogo e resistência a dano de armas com armadura pesada.'],
    ],
    grave: [
      [1, 'Circle of Mortality', 'Círculo da Mortalidade', 'Max healing for creatures at 0 HP; spare the dying at range.', 'Cura máxima em quem está a 0 PV; poupar os moribundos à distância.'],
      [1, 'Eyes of the Grave', 'Olhos do Túmulo', 'Sense undead nearby.', 'Sente mortos-vivos por perto.'],
      [2, 'Channel Divinity: Path to the Grave', 'Canalizar Divindade: Caminho ao Túmulo', 'Curse a creature to take vulnerable damage from the next hit.', 'Amaldiçoa uma criatura a ser vulnerável ao próximo acerto.'],
      [6, 'Sentinel at Death\'s Door', 'Sentinela na Porta da Morte', 'Turn a critical hit into a normal hit.', 'Transforma um crítico num acerto normal.'],
      [8, 'Potent Spellcasting', 'Conjuração Potente', 'Add Wisdom to cantrip damage.', 'Soma Sabedoria ao dano dos truques.'],
      [17, 'Keeper of Souls', 'Guardião das Almas', 'Heal when an enemy dies nearby.', 'Cura quando um inimigo morre por perto.'],
    ],
    order: [
      [1, 'Bonus Proficiencies', 'Proficiências Adicionais', 'Heavy armor and a social skill.', 'Armadura pesada e uma perícia social.'],
      [1, 'Voice of Authority', 'Voz da Autoridade', 'Spells on allies grant them a reaction attack.', 'Magias em aliados lhes dão um ataque como reação.'],
      [2, 'Channel Divinity: Order\'s Demand', 'Canalizar Divindade: Exigência da Ordem', 'Charm nearby creatures and make them drop items.', 'Enfeitiça criaturas próximas e as faz largar itens.'],
      [6, 'Embodiment of the Law', 'Encarnação da Lei', 'Cast enchantments as a bonus action.', 'Conjura encantamentos como ação bônus.'],
      [8, 'Divine Strike', 'Golpe Divino', 'Extra psychic damage once per turn.', 'Dano psíquico extra uma vez por turno.'],
      [17, 'Order\'s Wrath', 'Ira da Ordem', 'Your strike curses a target for extra damage from allies.', 'Seu golpe amaldiçoa o alvo para dano extra dos aliados.'],
    ],
    peace: [
      [1, 'Implement of Peace', 'Instrumento da Paz', 'A social skill proficiency.', 'Proficiência numa perícia social.'],
      [1, 'Emboldening Bond', 'Elo Encorajador', 'Bonded allies add a d4 to a roll.', 'Aliados ligados somam 1d4 a uma rolagem.'],
      [2, 'Channel Divinity: Balm of Peace', 'Canalizar Divindade: Bálsamo da Paz', 'Move without provoking and heal creatures you pass.', 'Move sem provocar e cura quem passar.'],
      [6, 'Protective Bond', 'Elo Protetor', 'Teleport to a bonded ally to take its damage.', 'Teleporta até um aliado ligado para assumir o dano.'],
      [8, 'Potent Spellcasting', 'Conjuração Potente', 'Add Wisdom to cantrip damage.', 'Soma Sabedoria ao dano dos truques.'],
      [17, 'Expansive Bond', 'Elo Expansivo', 'Bonds reach farther and grant resistance.', 'Os elos vão mais longe e dão resistência.'],
    ],
    twilight: [
      [1, 'Bonus Proficiencies', 'Proficiências Adicionais', 'Martial weapons and heavy armor.', 'Armas marciais e armadura pesada.'],
      [1, 'Eyes of Night', 'Olhos da Noite', 'Long darkvision you can share.', 'Visão no escuro longa que você pode dividir.'],
      [1, 'Vigilant Blessing', 'Bênção Vigilante', 'Grant advantage on initiative.', 'Dá vantagem na iniciativa.'],
      [2, 'Channel Divinity: Twilight Sanctuary', 'Canalizar Divindade: Santuário do Crepúsculo', 'An aura grants temporary HP or ends charm and fear.', 'Uma aura dá PV temporários ou encerra enfeitiçar e medo.'],
      [6, 'Steps of Night', 'Passos da Noite', 'Fly in dim light or darkness.', 'Voa na penumbra ou escuridão.'],
      [8, 'Divine Strike', 'Golpe Divino', 'Extra radiant damage once per turn.', 'Dano radiante extra uma vez por turno.'],
      [17, 'Twilight Shroud', 'Mortalha do Crepúsculo', 'The sanctuary also grants half cover.', 'O santuário também dá meia cobertura.'],
    ],
  },
  druid: {
    shepherd: [
      [2, 'Speech of the Woods', 'Fala da Floresta', 'Learn Sylvan and speak with beasts.', 'Aprende Silvestre e fala com bestas.'],
      [2, 'Spirit Totem', 'Totem Espiritual', 'Summon a bear, hawk or unicorn spirit aura.', 'Invoca a aura de um espírito de urso, falcão ou unicórnio.'],
      [6, 'Mighty Summoner', 'Invocador Poderoso', 'Summoned beasts and fey are tougher.', 'Bestas e fadas invocadas ficam mais fortes.'],
      [10, 'Guardian Spirit', 'Espírito Guardião', 'Summons in your totem heal each turn.', 'Invocações no totem curam a cada turno.'],
      [14, 'Faithful Summons', 'Invocações Fiéis', 'Beasts appear to protect you when you fall.', 'Bestas aparecem para protegê-lo quando você cai.'],
    ],
  },
  fighter: {
    banneret: [
      [3, 'Rallying Cry', 'Grito de Reunião', 'Second Wind also heals nearby allies.', 'Retomar o Fôlego também cura aliados próximos.'],
      [7, 'Royal Envoy', 'Emissário Real', 'Persuasion expertise and another social skill.', 'Especialização em Persuasão e outra perícia social.'],
      [10, 'Inspiring Surge', 'Surto Inspirador', 'Action Surge lets an ally attack.', 'Surto de Ação deixa um aliado atacar.'],
      [15, 'Bulwark', 'Baluarte', 'Indomitable lets an ally reroll too.', 'Indomável deixa um aliado rerrolar também.'],
      [18, 'Inspiring Surge (two allies)', 'Surto Inspirador (dois aliados)', 'Inspiring Surge affects two allies.', 'O Surto Inspirador alcança dois aliados.'],
    ],
    arcanearcher: [
      [3, 'Arcane Archer Lore', 'Saber do Arqueiro Arcano', 'Arcana or Nature, and a cantrip.', 'Arcanismo ou Natureza, e um truque.'],
      [3, 'Arcane Shot', 'Disparo Arcano', 'Infuse arrows with magical effects.', 'Imbui flechas com efeitos mágicos.'],
      [7, 'Magic Arrow', 'Flecha Mágica', 'Your arrows count as magical.', 'Suas flechas contam como mágicas.'],
      [7, 'Curving Shot', 'Disparo Curvo', 'Redirect a missed magic arrow.', 'Redireciona uma flecha mágica que errou.'],
      [10, 'Additional Arcane Shot Option', 'Opção Adicional de Disparo Arcano', 'Learn another Arcane Shot option.', 'Aprende mais uma opção de Disparo Arcano.'],
      [15, 'Ever-Ready Shot', 'Disparo Sempre Pronto', 'Regain an Arcane Shot at initiative.', 'Recupera um Disparo Arcano na iniciativa.'],
      [18, 'Improved Shots', 'Disparos Aprimorados', 'Arcane Shot damage increases.', 'O dano do Disparo Arcano aumenta.'],
    ],
    cavalier: [
      [3, 'Bonus Proficiency', 'Proficiência Adicional', 'A skill or a language.', 'Uma perícia ou um idioma.'],
      [3, 'Born to the Saddle', 'Nascido para a Sela', 'Mounting and staying mounted are easy.', 'Montar e se manter montado fica fácil.'],
      [3, 'Unwavering Mark', 'Marca Inabalável', 'Marked foes suffer for attacking others.', 'Inimigos marcados sofrem por atacar outros.'],
      [7, 'Warding Maneuver', 'Manobra de Proteção', 'Reaction to protect a nearby ally.', 'Reação para proteger um aliado próximo.'],
      [10, 'Hold the Line', 'Segurar a Linha', 'Opportunity attacks stop enemies.', 'Ataques de oportunidade param inimigos.'],
      [15, 'Ferocious Charger', 'Investida Feroz', 'Charging can knock a foe prone.', 'A investida pode derrubar um inimigo.'],
      [18, 'Vigilant Defender', 'Defensor Vigilante', 'One opportunity attack on every other turn.', 'Um ataque de oportunidade em cada turno alheio.'],
    ],
    samurai: [
      [3, 'Bonus Proficiency', 'Proficiência Adicional', 'A skill or a language.', 'Uma perícia ou um idioma.'],
      [3, 'Fighting Spirit', 'Espírito de Luta', 'Advantage on attacks and temporary hit points.', 'Vantagem nos ataques e PV temporários.'],
      [7, 'Elegant Courtier', 'Cortesão Elegante', 'Add Wisdom to Persuasion and gain a save.', 'Soma Sabedoria à Persuasão e ganha uma resistência.'],
      [10, 'Tireless Spirit', 'Espírito Incansável', 'Regain Fighting Spirit at initiative.', 'Recupera o Espírito de Luta na iniciativa.'],
      [15, 'Rapid Strike', 'Golpe Rápido', 'Trade advantage for an extra attack.', 'Troca a vantagem por um ataque extra.'],
      [18, 'Strength Before Death', 'Força Antes da Morte', 'Take an extra turn when dropping to 0 HP.', 'Ganha um turno extra ao cair a 0 PV.'],
    ],
    echoknight: [
      [3, 'Manifest Echo', 'Manifestar Eco', 'Summon an echo to attack and swap places with.', 'Invoca um eco para atacar e trocar de lugar.'],
      [3, 'Unleash Incarnation', 'Liberar Encarnação', 'Make an extra attack through your echo.', 'Faz um ataque extra através do eco.'],
      [7, 'Echo Avatar', 'Avatar do Eco', 'See and hear through your echo.', 'Vê e ouve através do eco.'],
      [10, 'Shadow Martyr', 'Mártir das Sombras', 'Your echo takes an attack for an ally.', 'O eco recebe um ataque no lugar de um aliado.'],
      [15, 'Reclaim Potential', 'Recuperar Potencial', 'Gain temporary HP when your echo dies.', 'Ganha PV temporários quando o eco é destruído.'],
      [18, 'Legion of One', 'Legião de Um', 'Create two echoes.', 'Cria dois ecos.'],
    ],
    psiwarrior: [
      [3, 'Psionic Power', 'Poder Psiônico', 'Psionic dice for shields, strikes and movement.', 'Dados psiônicos para proteger, golpear e mover.'],
      [7, 'Telekinetic Adept', 'Adepto Telecinético', 'Psi-powered leap and thrust.', 'Salto e empurrão psiônicos.'],
      [10, 'Guarded Mind', 'Mente Protegida', 'Psychic resistance; end charm or fear.', 'Resistência psíquica; encerra enfeitiçar ou medo.'],
      [15, 'Bulwark of Force', 'Baluarte de Força', 'Grant half cover to allies.', 'Dá meia cobertura a aliados.'],
      [18, 'Telekinetic Master', 'Mestre Telecinético', 'Cast telekinesis and attack while holding it.', 'Conjura telecinese e ataca enquanto a mantém.'],
    ],
    runeknight: [
      [3, 'Bonus Proficiencies', 'Proficiências Adicionais', 'Smith\'s tools and Giant.', 'Ferramentas de ferreiro e Gigante.'],
      [3, 'Rune Carver', 'Entalhador de Runas', 'Inscribe giant runes on your gear.', 'Entalha runas de gigante no equipamento.'],
      [3, 'Giant\'s Might', 'Poder do Gigante', 'Grow Large and deal extra damage.', 'Fica Grande e causa dano extra.'],
      [7, 'Runic Shield', 'Escudo Rúnico', 'Force an attacker to reroll.', 'Força um atacante a rerrolar.'],
      [10, 'Great Stature', 'Grande Estatura', 'Grow taller; Giant\'s Might hits harder.', 'Cresce; o Poder do Gigante bate mais forte.'],
      [15, 'Master of Runes', 'Mestre das Runas', 'Use each rune twice per rest.', 'Usa cada runa duas vezes por descanso.'],
      [18, 'Runic Juggernaut', 'Colosso Rúnico', 'Grow Huge with longer reach.', 'Fica Enorme com alcance maior.'],
    ],
  },
  monk: {
    longdeath: [
      [3, 'Touch of Death', 'Toque da Morte', 'Gain temporary HP when you drop a nearby foe.', 'Ganha PV temporários ao derrubar um inimigo próximo.'],
      [6, 'Hour of Reaping', 'Hora da Colheita', 'Frighten creatures around you.', 'Amedronta as criaturas à sua volta.'],
      [11, 'Mastery of Death', 'Maestria da Morte', 'Spend ki to stay at 1 HP.', 'Gasta ki para ficar com 1 PV.'],
      [17, 'Touch of the Long Death', 'Toque da Longa Morte', 'Spend ki for heavy necrotic damage.', 'Gasta ki para muito dano necrótico.'],
    ],
    sunsoul: [
      [3, 'Radiant Sun Bolt', 'Raio Solar Radiante', 'Ranged radiant attacks.', 'Ataques radiantes à distância.'],
      [6, 'Searing Arc Strike', 'Golpe do Arco Ardente', 'Cast burning hands with ki.', 'Conjura mãos flamejantes com ki.'],
      [11, 'Searing Sunburst', 'Explosão Solar Ardente', 'A radiant burst at range.', 'Uma explosão radiante à distância.'],
      [17, 'Sun Shield', 'Escudo Solar', 'Shed light and burn melee attackers.', 'Emite luz e queima quem ataca corpo a corpo.'],
    ],
    drunkenmaster: [
      [3, 'Bonus Proficiencies', 'Proficiências Adicionais', 'Performance and brewer\'s supplies.', 'Atuação e suprimentos de cervejeiro.'],
      [3, 'Drunken Technique', 'Técnica Embriagada', 'Flurry of Blows grants Disengage and speed.', 'Rajada de Golpes dá Desengajar e deslocamento.'],
      [6, 'Tipsy Sway', 'Balanço Ébrio', 'Get up easily and redirect missed attacks.', 'Levanta fácil e redireciona ataques errados.'],
      [11, 'Drunkard\'s Luck', 'Sorte do Bêbado', 'Spend ki to cancel disadvantage.', 'Gasta ki para cancelar desvantagem.'],
      [17, 'Intoxicated Frenzy', 'Frenesi Embriagado', 'Extra Flurry attacks on different targets.', 'Ataques extras da Rajada em alvos diferentes.'],
    ],
    kensei: [
      [3, 'Path of the Kensei', 'Caminho do Kensei', 'Kensei weapons and an agile parry.', 'Armas kensei e um aparo ágil.'],
      [6, 'One with the Blade', 'Um com a Lâmina', 'Magic kensei weapons and a deft strike.', 'Armas kensei mágicas e um golpe preciso.'],
      [11, 'Sharpen the Blade', 'Afiar a Lâmina', 'Spend ki for a weapon bonus.', 'Gasta ki para um bônus na arma.'],
      [17, 'Unerring Accuracy', 'Precisão Infalível', 'Reroll a missed weapon attack.', 'Rerrola um ataque com arma que errou.'],
    ],
    astralself: [
      [3, 'Arms of the Astral Self', 'Braços do Eu Astral', 'Summon spectral arms that strike with Wisdom.', 'Invoca braços espectrais que golpeiam com Sabedoria.'],
      [6, 'Visage of the Astral Self', 'Semblante do Eu Astral', 'A spectral face that sees in darkness.', 'Um rosto espectral que enxerga no escuro.'],
      [11, 'Body of the Astral Self', 'Corpo do Eu Astral', 'Deflect damage and add damage.', 'Desvia dano e soma dano.'],
      [17, 'Awakened Astral Self', 'Eu Astral Desperto', 'Full astral form with extra attacks.', 'Forma astral completa com ataques extras.'],
    ],
    mercy: [
      [3, 'Implements of Mercy', 'Instrumentos da Misericórdia', 'Insight, Medicine and an herbalism kit.', 'Intuição, Medicina e kit de herbalismo.'],
      [3, 'Hand of Healing', 'Mão da Cura', 'Spend ki to heal.', 'Gasta ki para curar.'],
      [3, 'Hand of Harm', 'Mão do Dano', 'Spend ki for extra necrotic damage.', 'Gasta ki para dano necrótico extra.'],
      [6, 'Physician\'s Touch', 'Toque do Médico', 'Healing removes conditions; harm poisons.', 'A cura remove condições; o dano envenena.'],
      [11, 'Flurry of Healing and Harm', 'Rajada de Cura e Dano', 'Heal or harm with Flurry of Blows.', 'Cura ou fere com a Rajada de Golpes.'],
      [17, 'Hand of Ultimate Mercy', 'Mão da Misericórdia Final', 'Bring a creature back to life.', 'Traz uma criatura de volta à vida.'],
    ],
    ascendantdragon: [
      [3, 'Draconic Disciple', 'Discípulo Dracônico', 'Elemental unarmed strikes and Draconic.', 'Golpes desarmados elementais e Dracônico.'],
      [3, 'Breath of the Dragon', 'Sopro do Dragão', 'Exhale a breath weapon.', 'Solta um sopro de dragão.'],
      [6, 'Wings Unfurled', 'Asas Abertas', 'Spectral wings when you step.', 'Asas espectrais ao se mover.'],
      [11, 'Aspect of the Wyrm', 'Aspecto da Serpe', 'A frightening or protective aura.', 'Uma aura que amedronta ou protege.'],
      [17, 'Ascendant Aspect', 'Aspecto Ascendente', 'Blindsight, a stronger breath and an explosive aura.', 'Percepção às cegas, sopro mais forte e aura explosiva.'],
    ],
  },
  paladin: {
    oathbreaker: [
      [3, 'Channel Divinity: Control Undead', 'Canalizar Divindade: Controlar Mortos-Vivos', 'Command an undead creature.', 'Comanda um morto-vivo.'],
      [3, 'Channel Divinity: Dreadful Aspect', 'Canalizar Divindade: Aspecto Terrível', 'Frighten nearby creatures.', 'Amedronta criaturas próximas.'],
      [7, 'Aura of Hate', 'Aura de Ódio', 'You and nearby fiends and undead deal extra damage.', 'Você e corruptores e mortos-vivos próximos causam dano extra.'],
      [15, 'Supernatural Resistance', 'Resistência Sobrenatural', 'Resist nonmagical weapon damage.', 'Resiste a dano de armas não mágicas.'],
      [20, 'Dread Lord', 'Senhor do Pavor', 'An aura of darkness and fear.', 'Uma aura de escuridão e medo.'],
    ],
    crown: [
      [3, 'Channel Divinity: Champion Challenge', 'Canalizar Divindade: Desafio do Campeão', 'Force foes to stay near you.', 'Força inimigos a ficarem perto de você.'],
      [3, 'Channel Divinity: Turn the Tide', 'Canalizar Divindade: Virar a Maré', 'Heal wounded allies around you.', 'Cura aliados feridos à sua volta.'],
      [7, 'Divine Allegiance', 'Lealdade Divina', 'Take damage in an ally\'s place.', 'Recebe o dano no lugar de um aliado.'],
      [15, 'Unyielding Spirit', 'Espírito Inquebrantável', 'Resist paralysis and stunning.', 'Resiste a paralisia e atordoamento.'],
      [20, 'Exalted Champion', 'Campeão Exaltado', 'Resistances and advantage for you and allies.', 'Resistências e vantagem para você e aliados.'],
    ],
    conquest: [
      [3, 'Channel Divinity: Conquering Presence', 'Canalizar Divindade: Presença Conquistadora', 'Frighten nearby creatures.', 'Amedronta criaturas próximas.'],
      [3, 'Channel Divinity: Guided Strike', 'Canalizar Divindade: Golpe Guiado', '+10 to an attack roll.', '+10 numa jogada de ataque.'],
      [7, 'Aura of Conquest', 'Aura da Conquista', 'Frightened foes are stopped and hurt.', 'Inimigos amedrontados ficam parados e feridos.'],
      [15, 'Scornful Rebuke', 'Repreensão Desdenhosa', 'Attackers take psychic damage.', 'Atacantes sofrem dano psíquico.'],
      [20, 'Invincible Conqueror', 'Conquistador Invencível', 'Resistance, an extra attack and wider crits.', 'Resistência, um ataque extra e críticos maiores.'],
    ],
    redemption: [
      [3, 'Channel Divinity: Emissary of Peace', 'Canalizar Divindade: Emissário da Paz', '+5 to Persuasion.', '+5 em Persuasão.'],
      [3, 'Channel Divinity: Rebuke the Violent', 'Canalizar Divindade: Repreender o Violento', 'Turn damage back on an attacker.', 'Devolve o dano ao agressor.'],
      [7, 'Aura of the Guardian', 'Aura do Guardião', 'Take damage for a nearby ally.', 'Recebe o dano de um aliado próximo.'],
      [15, 'Protective Spirit', 'Espírito Protetor', 'Heal at the end of your turn when hurt.', 'Cura no fim do turno quando ferido.'],
      [20, 'Emissary of Redemption', 'Emissário da Redenção', 'Resistance and damage reflection.', 'Resistência e reflexo de dano.'],
    ],
    glory: [
      [3, 'Channel Divinity: Peerless Athlete', 'Canalizar Divindade: Atleta Inigualável', 'Advantage on Athletics and Acrobatics.', 'Vantagem em Atletismo e Acrobacia.'],
      [3, 'Channel Divinity: Inspiring Smite', 'Canalizar Divindade: Destruição Inspiradora', 'Smiting grants temporary HP to allies.', 'Destruir dá PV temporários aos aliados.'],
      [7, 'Aura of Alacrity', 'Aura da Agilidade', 'Faster movement for you and allies.', 'Mais deslocamento para você e aliados.'],
      [15, 'Glorious Defense', 'Defesa Gloriosa', 'Boost AC and strike back.', 'Aumenta a CA e contra-ataca.'],
      [20, 'Living Legend', 'Lenda Viva', 'Charisma to checks, rerolls and sure hits.', 'Carisma nos testes, rerrolagens e acertos garantidos.'],
    ],
    watchers: [
      [3, 'Channel Divinity: Watcher\'s Will', 'Canalizar Divindade: Vontade do Vigia', 'Advantage on mental saves for allies.', 'Vantagem em resistências mentais para aliados.'],
      [3, 'Channel Divinity: Abjure the Extraplanar', 'Canalizar Divindade: Abjurar o Extraplanar', 'Turn extraplanar creatures.', 'Expulsa criaturas extraplanares.'],
      [7, 'Aura of the Sentinel', 'Aura da Sentinela', 'Bonus to initiative for you and allies.', 'Bônus na iniciativa para você e aliados.'],
      [15, 'Vigilant Rebuke', 'Repreensão Vigilante', 'Force damage when an ally saves.', 'Dano de energia quando um aliado resiste.'],
      [20, 'Mortal Bulwark', 'Baluarte Mortal', 'Truesight and advantage against extraplanar foes.', 'Visão verdadeira e vantagem contra extraplanares.'],
    ],
  },
  ranger: {
    gloomstalker: [
      [3, 'Dread Ambusher', 'Emboscador Temível', 'Initiative bonus and an extra first-turn attack.', 'Bônus na iniciativa e um ataque extra no 1º turno.'],
      [3, 'Umbral Sight', 'Visão Umbral', 'Darkvision and invisibility to darkvision.', 'Visão no escuro e invisível a quem usa visão no escuro.'],
      [7, 'Iron Mind', 'Mente de Ferro', 'Wisdom save proficiency.', 'Proficiência em resistência de Sabedoria.'],
      [11, 'Stalker\'s Flurry', 'Rajada do Espreitador', 'Attack again after a miss.', 'Ataca de novo após errar.'],
      [15, 'Shadowy Dodge', 'Esquiva Sombria', 'Impose disadvantage on an attacker.', 'Impõe desvantagem a um atacante.'],
    ],
    horizonwalker: [
      [3, 'Detect Portal', 'Detectar Portal', 'Sense planar portals.', 'Sente portais planares.'],
      [3, 'Planar Warrior', 'Guerreiro Planar', 'Extra force damage on a target.', 'Dano de energia extra num alvo.'],
      [7, 'Ethereal Step', 'Passo Etéreo', 'Step into the Ethereal Plane briefly.', 'Passa ao Plano Etéreo por um momento.'],
      [11, 'Distant Strike', 'Golpe Distante', 'Teleport between attacks.', 'Teleporta entre ataques.'],
      [15, 'Spectral Defense', 'Defesa Espectral', 'Reaction to resist an attack\'s damage.', 'Reação para resistir ao dano de um ataque.'],
    ],
    monsterslayer: [
      [3, 'Hunter\'s Sense', 'Sentido do Caçador', 'Learn a creature\'s immunities and resistances.', 'Descobre imunidades e resistências de uma criatura.'],
      [3, 'Slayer\'s Prey', 'Presa do Matador', 'Extra damage to a chosen target.', 'Dano extra num alvo escolhido.'],
      [7, 'Supernatural Defense', 'Defesa Sobrenatural', 'Bonus against your prey\'s effects.', 'Bônus contra efeitos da sua presa.'],
      [11, 'Magic-User\'s Nemesis', 'Nêmesis dos Conjuradores', 'Foil a spell or teleport.', 'Frustra uma magia ou teleporte.'],
      [15, 'Slayer\'s Counter', 'Contra-ataque do Matador', 'Attack your prey when it forces a save.', 'Ataca a presa quando ela força uma resistência.'],
    ],
    feywanderer: [
      [3, 'Dreadful Strikes', 'Golpes Temíveis', 'Extra psychic damage.', 'Dano psíquico extra.'],
      [3, 'Otherworldly Glamour', 'Fascínio Sobrenatural', 'Add Wisdom to Charisma checks.', 'Soma Sabedoria aos testes de Carisma.'],
      [7, 'Beguiling Twist', 'Reviravolta Sedutora', 'Redirect charm or fear.', 'Redireciona enfeitiçar ou medo.'],
      [11, 'Fey Reinforcements', 'Reforços Feéricos', 'Summon fey without concentration.', 'Invoca fadas sem concentração.'],
      [15, 'Misty Wanderer', 'Andarilho Nebuloso', 'Misty step with an ally.', 'Passo nebuloso com um aliado.'],
    ],
    swarmkeeper: [
      [3, 'Gathered Swarm', 'Enxame Reunido', 'Your swarm deals damage or moves things.', 'Seu enxame causa dano ou move coisas.'],
      [7, 'Writhing Tide', 'Maré Ondulante', 'The swarm lets you fly briefly.', 'O enxame deixa você voar brevemente.'],
      [11, 'Mighty Swarm', 'Enxame Poderoso', 'Stronger swarm effects.', 'Efeitos do enxame mais fortes.'],
      [15, 'Swarming Dispersal', 'Dispersão do Enxame', 'Resist damage and teleport.', 'Resiste ao dano e teleporta.'],
    ],
    drakewarden: [
      [3, 'Draconic Gift', 'Dom Dracônico', 'Thaumaturgy and Draconic.', 'Taumaturgia e Dracônico.'],
      [3, 'Drake Companion', 'Companheiro Draco', 'Summon a drake that fights beside you.', 'Invoca um draco que luta ao seu lado.'],
      [7, 'Bond of Fang and Scale', 'Laço de Presa e Escama', 'Ride your flying drake; its bite hits harder.', 'Monta seu draco voador; a mordida fica mais forte.'],
      [11, 'Drake\'s Breath', 'Sopro do Draco', 'You or your drake exhale a breath weapon.', 'Você ou o draco soltam um sopro.'],
      [15, 'Perfected Bond', 'Laço Perfeito', 'A larger drake that shields you.', 'Um draco maior que te protege.'],
    ],
  },
  rogue: {
    mastermind: [
      [3, 'Master of Intrigue', 'Mestre da Intriga', 'Disguise and forgery kits, languages, mimicry.', 'Kits de disfarce e falsificação, idiomas, imitação.'],
      [3, 'Master of Tactics', 'Mestre das Táticas', 'Help as a bonus action at range.', 'Ajuda como ação bônus à distância.'],
      [9, 'Insightful Manipulator', 'Manipulador Perspicaz', 'Learn a creature\'s capabilities by observing.', 'Descobre as capacidades de uma criatura observando.'],
      [13, 'Misdirection', 'Despistar', 'Redirect an attack to a creature beside you.', 'Desvia um ataque para quem está ao seu lado.'],
      [17, 'Soul of Deceit', 'Alma do Engano', 'Your thoughts cannot be read.', 'Seus pensamentos não podem ser lidos.'],
    ],
    swashbuckler: [
      [3, 'Fancy Footwork', 'Jogo de Pés', 'No opportunity attacks from foes you attack.', 'Sem ataques de oportunidade de quem você ataca.'],
      [3, 'Rakish Audacity', 'Audácia Libertina', 'Charisma to initiative; easier Sneak Attack.', 'Carisma na iniciativa; Ataque Furtivo mais fácil.'],
      [9, 'Panache', 'Panache', 'Charm or goad a creature.', 'Enfeitiça ou provoca uma criatura.'],
      [13, 'Elegant Maneuver', 'Manobra Elegante', 'Advantage on Acrobatics or Athletics.', 'Vantagem em Acrobacia ou Atletismo.'],
      [17, 'Master Duelist', 'Duelista Mestre', 'Reroll a missed attack with advantage.', 'Rerrola um ataque errado com vantagem.'],
    ],
    inquisitive: [
      [3, 'Ear for Deceit', 'Ouvido para Mentiras', 'Insight rolls of 7 or lower count as 8.', 'Intuição de 7 ou menos conta como 8.'],
      [3, 'Eye for Detail', 'Olho para Detalhes', 'Search as a bonus action.', 'Procura como ação bônus.'],
      [3, 'Insightful Fighting', 'Luta Perspicaz', 'Read a foe to Sneak Attack without advantage.', 'Lê o inimigo para Ataque Furtivo sem vantagem.'],
      [9, 'Steady Eye', 'Olho Firme', 'Advantage on Perception and Investigation when moving slowly.', 'Vantagem em Percepção e Investigação ao se mover devagar.'],
      [13, 'Unerring Eye', 'Olho Infalível', 'Sense illusions and shapechangers.', 'Sente ilusões e metamorfos.'],
      [17, 'Eye for Weakness', 'Olho para Fraquezas', 'Extra Sneak Attack damage.', 'Dano extra no Ataque Furtivo.'],
    ],
    scout: [
      [3, 'Skirmisher', 'Escaramuçador', 'Move away as a reaction.', 'Se afasta como reação.'],
      [3, 'Survivalist', 'Sobrevivente', 'Nature and Survival expertise.', 'Especialização em Natureza e Sobrevivência.'],
      [9, 'Superior Mobility', 'Mobilidade Superior', 'Extra speed.', 'Deslocamento extra.'],
      [13, 'Ambush Master', 'Mestre da Emboscada', 'Initiative advantage and set up allies.', 'Vantagem na iniciativa e prepara os aliados.'],
      [17, 'Sudden Strike', 'Golpe Súbito', 'An extra attack as a bonus action.', 'Um ataque extra como ação bônus.'],
    ],
    phantom: [
      [3, 'Whispers of the Dead', 'Sussurros dos Mortos', 'Gain a skill or tool from the dead.', 'Ganha uma perícia ou ferramenta dos mortos.'],
      [3, 'Wails from the Grave', 'Lamentos do Túmulo', 'Sneak Attack echoes to a second target.', 'O Ataque Furtivo ecoa num segundo alvo.'],
      [9, 'Tokens of the Departed', 'Lembranças dos Partidos', 'Capture soul trinkets for benefits.', 'Captura bugigangas de alma para benefícios.'],
      [13, 'Ghost Walk', 'Caminhar Fantasma', 'Become spectral and fly through things.', 'Fica espectral e voa através das coisas.'],
      [17, 'Death\'s Friend', 'Amigo da Morte', 'Wails grow stronger.', 'Os lamentos ficam mais fortes.'],
    ],
    soulknife: [
      [3, 'Psionic Power', 'Poder Psiônico', 'Psionic dice for skills and telepathy.', 'Dados psiônicos para perícias e telepatia.'],
      [3, 'Psychic Blades', 'Lâminas Psíquicas', 'Manifest blades of psychic energy.', 'Manifesta lâminas de energia psíquica.'],
      [9, 'Soul Blades', 'Lâminas da Alma', 'Guided strikes and psychic teleport.', 'Golpes guiados e teleporte psíquico.'],
      [13, 'Psychic Veil', 'Véu Psíquico', 'Become invisible.', 'Fica invisível.'],
      [17, 'Rend Mind', 'Rasgar a Mente', 'Stun a target with your blades.', 'Atordoa o alvo com as lâminas.'],
    ],
  },
  sorcerer: {
    shadow: [
      [1, 'Eyes of the Dark', 'Olhos do Escuro', 'Darkvision; cast darkness and see through it.', 'Visão no escuro; conjura escuridão e enxerga nela.'],
      [1, 'Strength of the Grave', 'Força do Túmulo', 'Avoid dropping to 0 HP.', 'Evita cair a 0 PV.'],
      [6, 'Hound of Ill Omen', 'Cão do Mau Agouro', 'Summon a shadow hound against a foe.', 'Invoca um cão sombrio contra um inimigo.'],
      [14, 'Shadow Walk', 'Caminhar pelas Sombras', 'Teleport between shadows.', 'Teleporta entre sombras.'],
      [18, 'Umbral Form', 'Forma Umbral', 'Become shadowy, resistant and incorporeal.', 'Fica sombrio, resistente e incorpóreo.'],
    ],
    storm: [
      [1, 'Wind Speaker', 'Voz do Vento', 'Learn Primordial.', 'Aprende Primordial.'],
      [1, 'Tempestuous Magic', 'Magia Tempestuosa', 'Fly a short distance after casting.', 'Voa uma curta distância após conjurar.'],
      [6, 'Heart of the Storm', 'Coração da Tempestade', 'Lightning and thunder resistance and bursts.', 'Resistência a relâmpago e trovão e descargas.'],
      [6, 'Storm Guide', 'Guia da Tempestade', 'Control rain and wind around you.', 'Controla chuva e vento à sua volta.'],
      [14, 'Storm\'s Fury', 'Fúria da Tempestade', 'Shock and push melee attackers.', 'Eletrocuta e empurra quem ataca corpo a corpo.'],
      [18, 'Wind Soul', 'Alma do Vento', 'Immunity and flight for you and allies.', 'Imunidade e voo para você e aliados.'],
    ],
    aberrantmind: [
      [1, 'Psionic Spells', 'Magias Psiônicas', 'Bonus psionic spells you can swap.', 'Magias psiônicas extras que você pode trocar.'],
      [1, 'Telepathic Speech', 'Fala Telepática', 'Talk mind to mind.', 'Fala de mente para mente.'],
      [6, 'Psionic Sorcery', 'Feitiçaria Psiônica', 'Cast psionic spells with sorcery points, silently.', 'Conjura magias psiônicas com pontos de feitiçaria, em silêncio.'],
      [6, 'Psychic Defenses', 'Defesas Psíquicas', 'Psychic resistance; resist charm and fear.', 'Resistência psíquica; resiste a enfeitiçar e medo.'],
      [14, 'Revelation in Flesh', 'Revelação na Carne', 'Spend points for aberrant traits.', 'Gasta pontos para traços aberrantes.'],
      [18, 'Warping Implosion', 'Implosão Distorcida', 'Teleport and pull creatures in.', 'Teleporta e puxa criaturas.'],
    ],
    clockworksoul: [
      [1, 'Clockwork Magic', 'Magia Mecânica', 'Bonus clockwork spells you can swap.', 'Magias mecânicas extras que você pode trocar.'],
      [1, 'Restore Balance', 'Restaurar o Equilíbrio', 'Cancel advantage or disadvantage.', 'Cancela vantagem ou desvantagem.'],
      [6, 'Bastion of Law', 'Bastião da Lei', 'A ward that absorbs damage.', 'Uma proteção que absorve dano.'],
      [14, 'Trance of Order', 'Transe da Ordem', 'Rolls under 10 count as 10.', 'Rolagens abaixo de 10 contam como 10.'],
      [18, 'Clockwork Cavalcade', 'Cavalgada Mecânica', 'Heal, repair and end spells around you.', 'Cura, conserta e encerra magias à sua volta.'],
    ],
    lunar: [
      [1, 'Lunar Embodiment', 'Encarnação Lunar', 'Moon-phase spells.', 'Magias das fases da lua.'],
      [1, 'Moon Fire', 'Fogo da Lua', 'Learn sacred flame and hit two targets.', 'Aprende chama sagrada e atinge dois alvos.'],
      [6, 'Lunar Boons', 'Dádivas Lunares', 'Cheaper metamagic on phase spells.', 'Metamagia mais barata nas magias da fase.'],
      [6, 'Waxing and Waning', 'Crescente e Minguante', 'Change your moon phase.', 'Muda a fase da lua.'],
      [14, 'Lunar Empowerment', 'Fortalecimento Lunar', 'A benefit tied to your phase.', 'Um benefício ligado à fase.'],
      [18, 'Lunar Phenomenon', 'Fenômeno Lunar', 'A burst of moon power.', 'Uma explosão de poder lunar.'],
    ],
  },
  warlock: {
    undying: [
      [1, 'Among the Dead', 'Entre os Mortos', 'Spare the dying; undead hesitate to attack you.', 'Poupar os moribundos; mortos-vivos hesitam em atacar.'],
      [6, 'Defy Death', 'Desafiar a Morte', 'Heal when you stabilize or succeed a death save.', 'Cura ao estabilizar ou passar num teste contra a morte.'],
      [10, 'Undying Nature', 'Natureza Imortal', 'Need little air, food or sleep; age slowly.', 'Precisa de pouco ar, comida ou sono; envelhece devagar.'],
      [14, 'Indestructible Life', 'Vida Indestrutível', 'Heal yourself and reattach limbs.', 'Cura a si e recoloca membros.'],
    ],
    celestial: [
      [1, 'Bonus Cantrips', 'Truques Adicionais', 'Light and sacred flame.', 'Luz e chama sagrada.'],
      [1, 'Healing Light', 'Luz Curativa', 'A pool of d6s to heal at range.', 'Uma reserva de d6 para curar à distância.'],
      [6, 'Radiant Soul', 'Alma Radiante', 'Radiant resistance and extra fire or radiant damage.', 'Resistência radiante e dano extra de fogo ou radiante.'],
      [10, 'Celestial Resilience', 'Resiliência Celestial', 'Temporary HP for you and allies after a rest.', 'PV temporários para você e aliados após descansar.'],
      [14, 'Searing Vengeance', 'Vingança Ardente', 'Rise from a death save in a blinding burst.', 'Levanta num teste contra a morte numa explosão ofuscante.'],
    ],
    fathomless: [
      [1, 'Tentacle of the Deeps', 'Tentáculo das Profundezas', 'A spectral tentacle that strikes and slows.', 'Um tentáculo espectral que golpeia e desacelera.'],
      [1, 'Gift of the Sea', 'Dádiva do Mar', 'Swim speed and water breathing.', 'Natação e respirar na água.'],
      [6, 'Oceanic Soul', 'Alma Oceânica', 'Cold resistance and underwater speech.', 'Resistência a frio e fala debaixo d\'água.'],
      [6, 'Guardian Coil', 'Espiral Guardiã', 'Your tentacle reduces damage to allies.', 'O tentáculo reduz o dano aos aliados.'],
      [10, 'Grasping Tentacles', 'Tentáculos Agarradores', 'Cast black tentacles with extra protection.', 'Conjura tentáculos negros com proteção extra.'],
      [14, 'Fathomless Plunge', 'Mergulho Insondável', 'Teleport your group to water.', 'Teleporta o grupo até a água.'],
    ],
    genie: [
      [1, 'Genie\'s Vessel', 'Recipiente do Gênio', 'Rest inside your vessel; add elemental damage.', 'Descansa dentro do recipiente; soma dano elemental.'],
      [6, 'Elemental Gift', 'Dádiva Elemental', 'A resistance and brief flight.', 'Uma resistência e voo breve.'],
      [10, 'Sanctuary Vessel', 'Recipiente Santuário', 'Bring allies into your vessel.', 'Leva aliados para dentro do recipiente.'],
      [14, 'Limited Wish', 'Desejo Limitado', 'Cast a 6th-level-or-lower spell from any list.', 'Conjura uma magia de 6º nível ou menos de qualquer lista.'],
    ],
    undead: [
      [1, 'Form of Dread', 'Forma do Pavor', 'Transform for temporary HP and fear.', 'Transforma-se para PV temporários e medo.'],
      [6, 'Grave Touched', 'Tocado pelo Túmulo', 'No need to eat or breathe; necrotic hits.', 'Não precisa comer nem respirar; acertos necróticos.'],
      [10, 'Necrotic Husk', 'Casca Necrótica', 'Necrotic resistance and a deathly burst.', 'Resistência necrótica e uma explosão mortal.'],
      [14, 'Spirit Projection', 'Projeção Espiritual', 'Project your spirit from your body.', 'Projeta o espírito para fora do corpo.'],
    ],
  },
  wizard: {
    conjuration: [
      [2, 'Conjuration Savant', 'Sábio da Conjuração', 'Copy conjuration spells cheaper.', 'Copia magias de conjuração mais barato.'],
      [2, 'Minor Conjuration', 'Conjuração Menor', 'Conjure a small object.', 'Conjura um pequeno objeto.'],
      [6, 'Benign Transposition', 'Transposição Benigna', 'Teleport or swap places.', 'Teleporta ou troca de lugar.'],
      [10, 'Focused Conjuration', 'Conjuração Focada', 'Damage cannot break concentration on conjurations.', 'Dano não quebra a concentração em conjurações.'],
      [14, 'Durable Summons', 'Invocações Duráveis', 'Summons gain temporary HP.', 'Invocações ganham PV temporários.'],
    ],
    enchantment: [
      [2, 'Enchantment Savant', 'Sábio do Encantamento', 'Copy enchantment spells cheaper.', 'Copia magias de encantamento mais barato.'],
      [2, 'Hypnotic Gaze', 'Olhar Hipnótico', 'Charm a creature beside you.', 'Enfeitiça uma criatura ao seu lado.'],
      [6, 'Instinctive Charm', 'Encanto Instintivo', 'Redirect an attack to another creature.', 'Desvia um ataque para outra criatura.'],
      [10, 'Split Enchantment', 'Encantamento Dividido', 'Single-target enchantments hit two.', 'Encantamentos de um alvo atingem dois.'],
      [14, 'Alter Memories', 'Alterar Memórias', 'Charmed creatures forget being charmed.', 'Enfeitiçados esquecem que foram enfeitiçados.'],
    ],
    bladesinging: [
      [2, 'Training in War and Song', 'Treino de Guerra e Canção', 'Light armor, a one-handed weapon and Performance.', 'Armadura leve, uma arma de uma mão e Atuação.'],
      [2, 'Bladesong', 'Canção da Lâmina', 'AC, speed and concentration bonuses.', 'Bônus em CA, deslocamento e concentração.'],
      [6, 'Extra Attack', 'Ataque Extra', 'Attack twice, one can be a cantrip.', 'Ataca duas vezes, uma pode ser um truque.'],
      [10, 'Song of Defense', 'Canção da Defesa', 'Spend a slot to reduce damage.', 'Gasta um espaço para reduzir o dano.'],
      [14, 'Song of Victory', 'Canção da Vitória', 'Add Intelligence to melee damage.', 'Soma Inteligência ao dano corpo a corpo.'],
    ],
    warmagic: [
      [2, 'Arcane Deflection', 'Deflexão Arcana', 'Boost AC or a save as a reaction.', 'Aumenta CA ou uma resistência como reação.'],
      [2, 'Tactical Wit', 'Astúcia Tática', 'Add Intelligence to initiative.', 'Soma Inteligência à iniciativa.'],
      [6, 'Power Surge', 'Surto de Poder', 'Store surges for extra force damage.', 'Guarda surtos para dano de energia extra.'],
      [10, 'Durable Magic', 'Magia Durável', '+2 AC and saves while concentrating.', '+2 na CA e resistências ao se concentrar.'],
      [14, 'Deflecting Shroud', 'Mortalha Defletora', 'Deflection also deals damage around you.', 'A deflexão também causa dano à sua volta.'],
    ],
    scribes: [
      [2, 'Wizardly Quill', 'Pena Arcana', 'A magical quill for fast copying.', 'Uma pena mágica para copiar rápido.'],
      [2, 'Awakened Spellbook', 'Grimório Desperto', 'Swap damage types; ritual casting at speed.', 'Troca tipos de dano; ritual rápido.'],
      [6, 'Manifest Mind', 'Mente Manifesta', 'Cast spells from your book\'s spirit.', 'Conjura a partir do espírito do grimório.'],
      [10, 'Master Scrivener', 'Escriba Mestre', 'Create a stronger spell scroll.', 'Cria um pergaminho de magia mais forte.'],
      [14, 'One with the Word', 'Um com a Palavra', 'Your book absorbs damage.', 'Seu grimório absorve dano.'],
    ],
    chronurgy: [
      [2, 'Chronal Shift', 'Mudança Cronal', 'Force a reroll.', 'Força uma rerrolagem.'],
      [2, 'Temporal Awareness', 'Consciência Temporal', 'Add Intelligence to initiative.', 'Soma Inteligência à iniciativa.'],
      [6, 'Momentary Stasis', 'Estase Momentânea', 'Freeze a creature in time.', 'Congela uma criatura no tempo.'],
      [10, 'Arcane Abeyance', 'Suspensão Arcana', 'Store a spell in a bead.', 'Guarda uma magia numa conta.'],
      [14, 'Convergent Future', 'Futuro Convergente', 'Decide whether a roll succeeds.', 'Decide se uma rolagem tem sucesso.'],
    ],
    graviturgy: [
      [2, 'Adjust Density', 'Ajustar Densidade', 'Make a creature heavier or lighter.', 'Deixa uma criatura mais pesada ou leve.'],
      [6, 'Gravity Well', 'Poço Gravitacional', 'Move creatures you hit with spells.', 'Move criaturas atingidas por suas magias.'],
      [10, 'Violent Attraction', 'Atração Violenta', 'Increase a hit\'s or fall\'s damage.', 'Aumenta o dano de um acerto ou queda.'],
      [14, 'Event Horizon', 'Horizonte de Eventos', 'An aura that pulls and slows foes.', 'Uma aura que puxa e desacelera inimigos.'],
    ],
  },
};

/** { classe: { subclasse: [{ level, name:{pt,en}, desc:{pt,en} }] } } */
export const EXPANDED_SUBCLASS_FEATURES = Object.fromEntries(Object.entries(F).map(([cls, subs]) => [cls,
  Object.fromEntries(Object.entries(subs).map(([sub, rows]) => [sub, rows.map(([level, en, pt, dEn, dPt]) => ({
    level, name: { pt, en }, desc: { pt: dPt, en: dEn },
  }))])),
]));

// Playtests (UA) e o Cartógrafo só existem no formato 2024 (data/class-options): a ficha 2014
// reaproveita esses mesmos traços, trazendo o nível de entrada da subclasse para o da classe
// em 2014 (druida no 2, clérigo e feiticeiro no 1); os níveis seguintes já coincidem.
const FROM_2024 = [
  ['druid', 'titan', { 3: 2 }],
  ['cleric', 'pestilence', { 3: 1 }],
  ['sorcerer', 'demonic', { 3: 1 }],
  ['fighter', 'hellknight', {}],
  ['artificer', 'cartographer', {}],
];
for (const [cls, sub, remap] of FROM_2024) {
  const levels = CLASS_OPTIONS[cls]?.subclasses?.[sub]?.levels || {};
  const rows = [];
  for (const [lv, node] of Object.entries(levels)) {
    for (const f of node?.features || []) {
      if (!f?.name) continue;
      // Clérigo 2014: a dádiva de Canalizar Divindade chega no 2, não no 1.
      const level = cls === 'cleric' && /Blessing/.test(f.name.en || '') ? 2 : (remap[lv] ?? +lv);
      rows.push({ level, name: { pt: f.name.pt || f.name.en, en: f.name.en || f.name.pt },
        desc: { pt: f.desc?.pt || f.desc?.en || '', en: f.desc?.en || f.desc?.pt || '' } });
    }
  }
  if (rows.length) ((EXPANDED_SUBCLASS_FEATURES[cls] ||= {})[sub] = rows.sort((a, b) => a.level - b.level));
}
export default EXPANDED_SUBCLASS_FEATURES;

/* Grimório — Combate (texto original; campo `srd` = citação literal do SRD 5.2.1, CC-BY 4.0). */
export default [
  {
    id: 'rodada-e-turno',
    aliases: ['round-and-turn', 'combat-round', 'your-turn'],
    cat: 'combat',
    title: { pt: 'Rodada e turno', en: 'Rounds and turns' },
    simple: {
      pt: 'O combate é dividido em **rodadas** de cerca de 6 segundos. Dentro de cada rodada, cada participante tem um **turno**, na ordem da iniciativa. No seu turno você pode **se mover** até o seu deslocamento e **fazer uma ação**, na ordem que quiser; também pode ter uma ação bônus (se algo te der uma) e uma interação livre com um objeto. Falar frases curtas é de graça.',
      en: 'Combat is split into **rounds** of about 6 seconds. In each round, every participant gets a **turn**, in Initiative order. On your turn you can **move** up to your Speed and **take one action**, in any order; you may also have a Bonus Action (if something grants one) and one free object interaction. Short phrases and gestures are free.',
    },
    example: {
      pt: 'Turno de Kael: ele anda 4,5 m até o orc, usa a ação Atacar (d20 + 5 = 18 → acerta) e depois anda mais 4,5 m para trás de uma coluna — o deslocamento de 9 m foi dividido antes e depois da ação.',
      en: 'Kael\'s turn: he walks 15 ft to the orc, takes the Attack action (d20 + 5 = 18 → hit), then moves 15 more feet behind a pillar — his 30 ft of Speed was split before and after the action.',
    },
    sheet: {
      pt: 'Aba Jogar: Deslocamento, Ataques e botões de rolagem ficam juntos para o seu turno.',
      en: 'Play tab: Speed, Attacks and roll buttons sit together for your turn.',
    },
    keywords: 'rodada turno round turn 6 segundos seis seconds ordem ação movimento mover acao meu turno o que posso fazer',
    related: ['iniciativa', 'deslocamento', 'acao-atacar', 'acao-bonus', 'reacao', 'interagir-com-objeto'],
  },
  {
    id: 'iniciativa',
    aliases: ['initiative'],
    cat: 'combat',
    title: { pt: 'Iniciativa', en: 'Initiative' },
    simple: {
      pt: 'Quando a luta começa, todo mundo rola **iniciativa**: um teste de Destreza (d20 + mod. de Destreza + bônus que você tiver). O mestre ordena do maior para o menor, e essa ordem vale para o combate todo. Em empate, os jogadores decidem entre si, e o mestre decide entre monstros ou entre monstro e jogador. Grupos de monstros iguais costumam rolar uma vez só.',
      en: 'When a fight starts, everyone rolls **Initiative**: a Dexterity check (d20 + Dex modifier + any bonuses). The GM ranks results from highest to lowest, and that order holds for the whole combat. On ties, players sort themselves out, and the GM decides among monsters or between a monster and a character. Groups of identical monsters usually roll once.',
    },
    example: {
      pt: 'Brunna rola d20 + 3 = 14, Tordek rola d20 + 0 = 9 e o mestre rola 12 para os goblins. Ordem: Brunna (14), goblins (12), Tordek (9) — e se repete a cada rodada.',
      en: 'Brunna rolls d20 + 3 = 14, Tordek rolls d20 + 0 = 9, and the GM rolls 12 for the goblins. Order: Brunna (14), goblins (12), Tordek (9) — repeated every round.',
    },
    sheet: {
      pt: 'Aba Jogar → caixa Iniciativa: toque para rolar d20 + seu bônus.',
      en: 'Play tab → Initiative box: tap it to roll d20 + your bonus.',
    },
    versions: {
      pt: 'A rolagem é igual nas duas versões. Em 2024 existe ainda o "valor de iniciativa" opcional (10 + mod. de Des., +5 com vantagem, −5 com desvantagem) e a surpresa passou a dar desvantagem na iniciativa em vez de fazer perder o primeiro turno.',
      en: 'The roll is the same in both versions. 2024 also adds an optional "Initiative score" (10 + Dex mod, +5 with Advantage, −5 with Disadvantage), and surprise now gives Disadvantage on Initiative instead of costing your first turn.',
    },
    srd: {
      text: 'When combat starts, every participant rolls Initiative; they make a Dexterity check that determines their place in the Initiative order.',
      ref: 'SRD 5.2.1 — Playing the Game, Combat',
    },
    keywords: 'iniciativa initiative ordem de combate order rolar iniciativa quem começa quem age primeiro destreza dex empate tie init',
    related: ['surpresa', 'rodada-e-turno', 'teste-de-atributo', 'vantagem-desvantagem', 'invisivel'],
  },
  {
    id: 'surpresa',
    aliases: ['surprise', 'surprised'],
    cat: 'combat',
    title: { pt: 'Surpresa', en: 'Surprise' },
    simple: {
      pt: 'Se o combate começa e você **não esperava** — por exemplo, alguém escondido te embosca —, você está surpreso. Em 2024 isso significa só uma coisa: **desvantagem na rolagem de iniciativa**. Você ainda age normalmente no seu turno; só tende a agir mais tarde.',
      en: 'If combat starts and you **didn\'t see it coming** — say, a hidden foe ambushes you — you are surprised. In 2024 that means one thing: **Disadvantage on your Initiative roll**. You still act normally on your turn; you just tend to act later.',
    },
    example: {
      pt: 'Bandidos escondidos atacam a caravana. Mirela estava distraída: rola dois d20 para iniciativa (15 e 6), fica com o 6, + 2 = 8. Os bandidos tiram 13 e agem antes dela.',
      en: 'Hidden bandits ambush the caravan. Mirela was distracted: she rolls two d20s for Initiative (15 and 6), keeps the 6, + 2 = 8. The bandits get 13 and act before her.',
    },
    sheet: {
      pt: 'Role a iniciativa pelo rolador de dados com desvantagem ligada.',
      en: 'Roll Initiative on the dice roller with Disadvantage switched on.',
    },
    versions: {
      pt: 'Em 2014, a criatura surpresa não podia se mover nem agir no seu primeiro turno e não podia usar reações até esse turno acabar. Em 2024, ela só rola iniciativa com desvantagem.',
      en: 'In 2014, a surprised creature couldn\'t move or act on its first turn and couldn\'t take Reactions until that turn ended. In 2024, it just rolls Initiative with Disadvantage.',
    },
    srd: {
      text: 'If a combatant is surprised by combat starting, that combatant has Disadvantage on their Initiative roll.',
      ref: 'SRD 5.2.1 — Playing the Game, Combat',
    },
    keywords: 'surpresa surpreso surprise surprised emboscada ambush pego desprevenido flat-footed primeiro turno',
    related: ['iniciativa', 'acao-esconder', 'vantagem-desvantagem', 'incapacitado', 'invisivel'],
  },
  {
    id: 'deslocamento',
    aliases: ['speed', 'movement'],
    cat: 'combat',
    title: { pt: 'Deslocamento e movimento', en: 'Speed and movement' },
    simple: {
      pt: 'Seu **deslocamento** é quanto você anda por turno (normalmente 9 m). Você pode **dividir** o movimento antes e depois da ação, e misturar andar, escalar, nadar e saltar. Deitar-se (ficar prono) é grátis, mas levantar gasta metade do deslocamento. Se você tem outro tipo de deslocamento (voo, natação), pode trocar no meio, descontando o que já andou. Numa grade, cada quadrado vale 1,5 m.',
      en: 'Your **Speed** is how far you can move each turn (usually 30 ft). You can **split** your move before and after your action, and mix walking, climbing, swimming and jumping. Dropping prone is free, but standing up costs half your Speed. If you have another speed (fly, swim), you can switch mid-move, subtracting what you already moved. On a grid, each square is 5 ft.',
    },
    example: {
      pt: 'Lia tem 9 m de deslocamento e 12 m de voo. Ela anda 3 m, levanta voo e ainda voa 9 m (12 − 3), pousando no telhado.',
      en: 'Lia has a Speed of 30 ft and a Fly Speed of 40 ft. She walks 10 ft, takes off and flies 30 more feet (40 − 10), landing on the roof.',
    },
    sheet: {
      pt: 'Aba Jogar → caixa Deslocamento (em metros no PT).',
      en: 'Play tab → Speed box.',
    },
    keywords: 'deslocamento movimento speed movement mover andar metros quadrados squares grid grade 9m 30ft dividir movimento voo fly swim natação',
    related: ['terreno-dificil', 'rodada-e-turno', 'acao-disparada', 'espaco-e-tamanho', 'escalar-nadar-rastejar', 'saltar'],
  },
  {
    id: 'terreno-dificil',
    aliases: ['difficult-terrain'],
    cat: 'combat',
    title: { pt: 'Terreno difícil', en: 'Difficult terrain' },
    simple: {
      pt: 'Entulho, mato fechado, escada íngreme, neve ou lama rasa são **terreno difícil**: cada metro custa **o dobro** de movimento. Não acumula — dois motivos de terreno difícil no mesmo lugar continuam custando o dobro, não o triplo. O espaço de uma criatura que não seja sua aliada (nem Miúda) também conta como terreno difícil.',
      en: 'Rubble, thick undergrowth, steep stairs, snow or shallow bog are **Difficult Terrain**: each foot costs **double** movement. It doesn\'t stack — two sources of difficult terrain in the same spot still cost double, not triple. The space of a creature that isn\'t your ally (or Tiny) also counts as difficult terrain.',
    },
    example: {
      pt: 'Tordek (deslocamento 9 m) atravessa 3 m de escombros: isso consome 6 m. Sobram 3 m de chão limpo para chegar até o esqueleto.',
      en: 'Tordek (Speed 30 ft) crosses 10 ft of rubble: that uses 20 ft. He has 10 ft of clear ground left to reach the skeleton.',
    },
    srd: {
      text: 'Every foot of movement in Difficult Terrain costs 1 extra foot, even if multiple things in a space count as Difficult Terrain.',
      ref: 'SRD 5.2.1 — Playing the Game, Movement and Position',
    },
    keywords: 'terreno difícil dificil difficult terrain dobro double movimento lama neve entulho escombros mato rubble',
    related: ['deslocamento', 'espaco-e-tamanho', 'acao-disparada', 'prono'],
  },
  {
    id: 'espaco-e-tamanho',
    aliases: ['size-and-space', 'creature-size', 'moving-through-creatures'],
    cat: 'combat',
    title: { pt: 'Tamanho, espaço e passar por criaturas', en: 'Size, space and moving through creatures' },
    simple: {
      pt: 'Cada criatura tem um **tamanho**: Miúdo, Pequeno, Médio, Grande, Enorme ou Imenso. Pequeno e Médio ocupam um quadrado de 1,5 m; Grande ocupa 3 × 3 m (4 quadrados); Enorme 4,5 × 4,5 m; Imenso 6 × 6 m. Você pode **passar pelo espaço** de um aliado, de uma criatura Incapacitada, de uma Miúda ou de uma com dois tamanhos de diferença da sua — mas não pode terminar o movimento ali. O espaço de quem não é aliado conta como terreno difícil.',
      en: 'Every creature has a **size**: Tiny, Small, Medium, Large, Huge or Gargantuan. Small and Medium take up a 5-ft square; Large takes 10 × 10 ft (4 squares); Huge 15 × 15 ft; Gargantuan 20 × 20 ft. You can **move through the space** of an ally, an Incapacitated creature, a Tiny creature, or one two sizes larger or smaller than you — but you can\'t end your move there. A non-ally\'s space counts as difficult terrain.',
    },
    example: {
      pt: 'Lia (Pequena) precisa chegar ao mago inimigo, mas um ogro (Grande) está no caminho. Grande é dois tamanhos acima de Pequeno, então ela passa entre as pernas dele, pagando o dobro de movimento por esses 3 m.',
      en: 'Lia (Small) needs to reach the enemy mage, but an ogre (Large) blocks the way. Large is two sizes above Small, so she slips between its legs, paying double movement for those 10 ft.',
    },
    versions: {
      pt: 'Em 2014 só dava para atravessar criaturas hostis com dois tamanhos de diferença; em 2024 também dá para passar por criaturas Incapacitadas e Miúdas.',
      en: 'In 2014 you could only move through hostile creatures two sizes apart; in 2024 you can also pass through Incapacitated and Tiny creatures.',
    },
    keywords: 'tamanho espaço espaco size space miúdo pequeno médio grande enorme imenso tiny small medium large huge gargantuan passar através atravessar move through',
    related: ['deslocamento', 'terreno-dificil', 'agarrar', 'combate-montado', 'incapacitado'],
  },
  {
    id: 'jogada-de-ataque',
    aliases: ['attack-roll', 'to-hit'],
    cat: 'combat',
    title: { pt: 'Jogada de ataque', en: 'Attack roll' },
    simple: {
      pt: 'Para acertar, role **d20 + modificador do atributo + bônus de proficiência** (se for proficiente com a arma ou for magia). Corpo a corpo costuma usar Força; à distância, Destreza; magias usam o atributo de conjuração. Se o total **igualar ou passar a CA** do alvo, você acerta e rola o dano. Um 20 natural sempre acerta (crítico); um 1 natural sempre erra.',
      en: 'To hit, roll **d20 + ability modifier + Proficiency Bonus** (if you\'re proficient with the weapon, or it\'s a spell). Melee usually uses Strength; ranged uses Dexterity; spells use your spellcasting ability. If the total **equals or beats the target\'s AC**, you hit and roll damage. A natural 20 always hits (critical); a natural 1 always misses.',
    },
    example: {
      pt: 'Thalion ataca o goblin com arco longo: d20 (12) + 3 (Des) + 2 (prof.) = 17 contra CA 15 → acerta. Se tivesse tirado 10, o total seria 15: ainda acerta, porque igualar basta.',
      en: 'Thalion shoots the goblin with a longbow: d20 (12) + 3 (Dex) + 2 (prof.) = 17 vs AC 15 → hit. Had he rolled 10, the total would be 15: still a hit, because meeting the AC is enough.',
    },
    sheet: {
      pt: 'Aba Jogar → Ataques: o botão de ataque já soma atributo e proficiência. Magias: aba Magias → Bônus de Ataque.',
      en: 'Play tab → Attacks: the attack button already adds ability and proficiency. Spells: Spells tab → Attack Bonus.',
    },
    keywords: 'jogada de ataque rolagem de ataque attack roll acertar to hit bônus de ataque atk d20 CA AC acerto erro 1 natural 20 natural',
    related: ['classe-de-armadura', 'acerto-critico', 'jogada-de-dano', 'vantagem-desvantagem', 'bonus-de-proficiencia', 'acao-atacar'],
  },
  {
    id: 'classe-de-armadura',
    aliases: ['armor-class', 'ac'],
    cat: 'combat',
    title: { pt: 'Classe de Armadura (CA)', en: 'Armor Class (AC)' },
    simple: {
      pt: 'A **CA** é o número que um ataque precisa alcançar para te acertar. Sem armadura, ela é **10 + mod. de Destreza**. Armaduras, escudos e habilidades (como Defesa sem Armadura) oferecem outros cálculos, mas você **escolhe um só** — não dá para somar dois cálculos base. Bônus extras (escudo, cobertura, magia) somam por cima.',
      en: '**AC** is the number an attack must reach to hit you. Without armor it is **10 + Dex modifier**. Armor, shields and features (like Unarmored Defense) give other formulas, but you **pick only one** — you can\'t stack two base calculations. Extra bonuses (shield, cover, magic) add on top.',
    },
    example: {
      pt: 'Brunna usa cota de malha (CA 16) e escudo (+2): CA 18. Um orc ataca com d20 + 5 = 17 → erra. Atrás de meia cobertura (+2), ela iria a 20.',
      en: 'Brunna wears chain mail (AC 16) and a shield (+2): AC 18. An orc attacks with d20 + 5 = 17 → miss. Behind half cover (+2), she\'d be at 20.',
    },
    sheet: {
      pt: 'Aba Jogar → caixa CA (calculada pela armadura e escudo do Inventário).',
      en: 'Play tab → AC box (calculated from the armor and shield in your Inventory).',
    },
    srd: {
      text: 'Your base AC calculation is 10 plus your Dexterity modifier. If a rule gives you another base AC calculation, you choose which calculation to use; you can\'t use more than one.',
      ref: 'SRD 5.2.1 — Rules Glossary',
    },
    keywords: 'classe de armadura CA AC armor class defesa difícil de acertar escudo shield armadura unarmored defense sem armadura',
    related: ['jogada-de-ataque', 'armaduras-e-escudos', 'cobertura', 'acao-esquivar'],
  },
  {
    id: 'acerto-critico',
    aliases: ['critical-hit', 'crit', 'natural-20'],
    cat: 'combat',
    title: { pt: 'Acerto crítico', en: 'Critical hit' },
    simple: {
      pt: 'Se o **d20 do ataque cair 20**, é um **crítico**: acerta sempre, não importa a CA. No dano, você **rola todos os dados duas vezes** (inclusive dados extras como Ataque Furtivo ou Destruição Divina) e soma os modificadores **uma vez só**. Salvaguardas e testes de atributo não têm crítico pelas regras básicas.',
      en: 'If the **attack\'s d20 lands on 20**, it\'s a **Critical Hit**: it always hits, whatever the AC. For damage, you **roll all the damage dice twice** (including extra dice like Sneak Attack or Divine Smite) and add modifiers **only once**. Saving throws and ability checks don\'t crit under the core rules.',
    },
    example: {
      pt: 'Kael tira 20 com a espada longa (1d8 + 3). Em vez de 1d8, ele rola 2d8 (5 + 7) + 3 = 15 de dano cortante.',
      en: 'Kael rolls a 20 with his longsword (1d8 + 3). Instead of 1d8, he rolls 2d8 (5 + 7) + 3 = 15 slashing damage.',
    },
    srd: {
      text: 'If you roll a 20 on the d20 for an attack roll, you score a Critical Hit, and the attack hits regardless of any modifiers or the target\'s AC.',
      ref: 'SRD 5.2.1 — Rules Glossary',
    },
    keywords: 'crítico critico critical hit crit 20 natural nat 20 dobro de dados double dice decisivo',
    related: ['jogada-de-ataque', 'jogada-de-dano', 'paralisado', 'inconsciente', 'teste-d20'],
  },
  {
    id: 'jogada-de-dano',
    aliases: ['damage-roll', 'damage'],
    cat: 'combat',
    title: { pt: 'Jogada de dano', en: 'Damage roll' },
    simple: {
      pt: 'Quando acerta, role os dados de dano da arma ou magia. Com armas, some o **mesmo modificador de atributo** usado no ataque. Magias dizem o que somar (normalmente nada). O dano nunca fica negativo — no mínimo 0. Quando um efeito atinge vários alvos de uma vez (como Bola de Fogo), o dano é **rolado uma vez** para todos; quem passa na salvaguarda geralmente leva metade, arredondando para baixo.',
      en: 'When you hit, roll the weapon\'s or spell\'s damage dice. With weapons, add the **same ability modifier** you used to attack. Spells tell you what to add (usually nothing). Damage never goes negative — 0 at minimum. When an effect hits several targets at once (like Fireball), damage is **rolled once** for all; those who succeed on the save usually take half, rounded down.',
    },
    example: {
      pt: 'Tordek acerta o machado de batalha (1d8) com Força +3: 6 + 3 = 9 de dano. Mais tarde, a Bola de Fogo do mago rola 8d6 = 27: o goblin que falhou leva 27, o que passou leva 13.',
      en: 'Tordek hits with his battleaxe (1d8) and Strength +3: 6 + 3 = 9 damage. Later, the wizard\'s Fireball rolls 8d6 = 27: the goblin that failed takes 27, the one that succeeded takes 13.',
    },
    sheet: {
      pt: 'Aba Jogar → Ataques: o botão de dano rola os dados e soma o modificador. Para aplicar dano recebido, use o botão Dano no rastreador de PV.',
      en: 'Play tab → Attacks: the damage button rolls the dice and adds the modifier. To apply damage you take, use the Damage button on the HP tracker.',
    },
    keywords: 'dano jogada de dano damage roll dados de dano metade half damage salvaguarda área múltiplos alvos arredondar para baixo',
    related: ['tipos-de-dano', 'resistencia-e-vulnerabilidade', 'acerto-critico', 'pontos-de-vida', 'salvaguarda'],
  },
  {
    id: 'tipos-de-dano',
    aliases: ['damage-types'],
    cat: 'combat',
    title: { pt: 'Tipos de dano', en: 'Damage types' },
    simple: {
      pt: 'Todo dano tem um tipo: **ácido, concussão, frio, fogo, energia (força), elétrico, necrótico, perfurante, veneno, psíquico, radiante, cortante e trovejante**. O tipo sozinho não faz nada — ele importa porque criaturas podem ter **resistência, vulnerabilidade ou imunidade** a certos tipos. Armas comuns causam concussão, perfurante ou cortante.',
      en: 'All damage has a type: **acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing and thunder**. The type does nothing on its own — it matters because creatures can have **Resistance, Vulnerability or Immunity** to certain types. Mundane weapons deal bludgeoning, piercing or slashing.',
    },
    example: {
      pt: 'O grupo enfrenta um esqueleto, vulnerável a concussão. Tordek troca o machado (cortante) por um martelo de guerra (concussão): 7 de dano vira 14.',
      en: 'The party fights a skeleton, vulnerable to bludgeoning. Tordek swaps his axe (slashing) for a warhammer (bludgeoning): 7 damage becomes 14.',
    },
    keywords: 'tipos de dano damage types ácido acid concussão contundente bludgeoning frio cold fogo fire força energia force elétrico relâmpago lightning necrótico necrotic perfurante piercing veneno poison psíquico psychic radiante radiant cortante slashing trovejante trovão thunder',
    related: ['resistencia-e-vulnerabilidade', 'jogada-de-dano', 'propriedades-de-armas'],
  },
  {
    id: 'resistencia-e-vulnerabilidade',
    aliases: ['resistance-vulnerability-immunity', 'resistance', 'vulnerability', 'immunity'],
    cat: 'combat',
    title: { pt: 'Resistência, vulnerabilidade e imunidade', en: 'Resistance, vulnerability and immunity' },
    simple: {
      pt: '**Resistência** corta pela metade (arredondando para baixo) o dano daquele tipo; **vulnerabilidade** dobra; **imunidade** zera. Várias resistências ao mesmo tipo contam como uma só. A ordem é: primeiro bônus e penalidades, depois a resistência, por último a vulnerabilidade. Imunidade a uma condição significa que ela simplesmente não te afeta.',
      en: '**Resistance** halves damage of that type (round down); **Vulnerability** doubles it; **Immunity** reduces it to zero. Several Resistances to the same type count as one. The order is: bonuses and penalties first, then Resistance, then Vulnerability. Immunity to a condition means it simply doesn\'t affect you.',
    },
    example: {
      pt: 'Brunna (tiefling, resistente a fogo) é pega por um sopro de 23 de fogo: ela leva 11 (23 ÷ 2 = 11,5, arredonda para baixo).',
      en: 'Brunna (a tiefling, resistant to fire) is caught in a 23-fire breath: she takes 11 (23 ÷ 2 = 11.5, rounded down).',
    },
    srd: {
      text: 'If you have Resistance to a damage type, damage of that type is halved against you (round down). If you have Vulnerability to a damage type, damage of that type is doubled against you.',
      ref: 'SRD 5.2.1 — Playing the Game, Damage and Healing',
    },
    keywords: 'resistência resistencia resistance vulnerabilidade vulnerability imunidade immunity imune metade dobro half double não acumula stacking',
    related: ['tipos-de-dano', 'jogada-de-dano', 'combate-subaquatico', 'pontos-de-vida'],
  },
  {
    id: 'ataque-de-oportunidade',
    aliases: ['opportunity-attack', 'aoo'],
    cat: 'combat',
    title: { pt: 'Ataque de oportunidade', en: 'Opportunity attack' },
    simple: {
      pt: 'Se um inimigo que você **vê sai do seu alcance** corpo a corpo, você pode gastar sua **reação** para fazer **um ataque corpo a corpo** (arma ou desarmado) nele, logo antes de ele sair. Isso não acontece se ele usar **Desengajar**, se teleportar ou for **empurrado/arremessado** sem usar o próprio movimento. Andar ao redor do inimigo sem sair do alcance não provoca.',
      en: 'If an enemy you **can see leaves your melee reach**, you can spend your **Reaction** to make **one melee attack** (weapon or unarmed) against it, right before it leaves. This doesn\'t happen if it uses **Disengage**, teleports, or is **pushed/thrown** without using its own movement. Moving around an enemy while staying in reach doesn\'t provoke.',
    },
    example: {
      pt: 'O goblin foge de Kael sem Desengajar. Kael usa a reação: d20 + 5 = 16 contra CA 15 → acerta, 1d8 + 3 = 8. O goblin (7 PV) cai antes de escapar.',
      en: 'The goblin runs from Kael without Disengaging. Kael uses his Reaction: d20 + 5 = 16 vs AC 15 → hit, 1d8 + 3 = 8. The goblin (7 HP) drops before it gets away.',
    },
    sheet: {
      pt: 'Use o botão de ataque da arma na aba Jogar — lembre que isso gasta sua reação da rodada.',
      en: 'Use the weapon\'s attack button on the Play tab — remember it spends your Reaction for the round.',
    },
    srd: {
      text: 'You can make an Opportunity Attack when a creature that you can see leaves your reach. To make the attack, take a Reaction to make one melee attack with a weapon or an Unarmed Strike against that creature.',
      ref: 'SRD 5.2.1 — Playing the Game, Combat',
    },
    keywords: 'ataque de oportunidade opportunity attack aoo ataque oportuno fugir sair do alcance leave reach reação reaction provocar provoke',
    related: ['reacao', 'acao-desengajar', 'deslocamento', 'empurrar', 'acao-atacar'],
  },
  {
    id: 'cobertura',
    aliases: ['cover'],
    cat: 'combat',
    title: { pt: 'Cobertura', en: 'Cover' },
    simple: {
      pt: 'Obstáculos entre você e o atacante te protegem. **Meia cobertura** (mureta, outra criatura, algo que tampa metade do corpo): **+2 na CA e nas salvaguardas de Destreza**. **Três quartos** (seteira, tronco grosso): **+5**. **Total** (atrás de uma parede): não pode ser alvo direto. Só conta a melhor cobertura — não soma, e só vale se o ataque vier do outro lado dela.',
      en: 'Obstacles between you and the attacker protect you. **Half cover** (low wall, another creature, anything blocking half your body): **+2 to AC and Dexterity saves**. **Three-quarters** (arrow slit, thick trunk): **+5**. **Total** (behind a wall): you can\'t be targeted directly. Only the best cover counts — it doesn\'t add up, and it only applies if the attack comes from the other side.',
    },
    example: {
      pt: 'Mirela (CA 14) atira de trás de uma carroça tombada que cobre metade do corpo. O arqueiro inimigo precisa de 16, não de 14: rola d20 + 4 = 15 → erra.',
      en: 'Mirela (AC 14) shoots from behind an overturned cart covering half her body. The enemy archer needs 16, not 14: he rolls d20 + 4 = 15 → miss.',
    },
    keywords: 'cobertura cover meia cobertura half three-quarters três quartos total atrás de parede muro proteção +2 +5 abrigo',
    related: ['classe-de-armadura', 'ataque-a-distancia', 'salvaguarda', 'areas-de-efeito', 'acao-esconder'],
  },
  {
    id: 'ataque-a-distancia',
    aliases: ['ranged-attack', 'long-range', 'ranged-in-melee'],
    cat: 'combat',
    title: { pt: 'Ataque à distância e alcance', en: 'Ranged attacks and range' },
    simple: {
      pt: 'Armas à distância têm dois números de alcance, como 45/180 m: até o primeiro é normal; entre o primeiro e o segundo, o ataque tem **desvantagem**; além do segundo, não dá. Magias com um número só não passam dele. Se um **inimigo a 1,5 m de você** pode te ver e não está Incapacitado, seus ataques à distância (inclusive magias) têm **desvantagem**. Corpo a corpo, o alcance padrão é 1,5 m.',
      en: 'Ranged weapons have two range numbers, like 150/600 ft: up to the first is normal; between the first and second, the attack has **Disadvantage**; beyond the second, you can\'t. Spells with a single range can\'t go past it. If an **enemy within 5 ft** can see you and isn\'t Incapacitated, your ranged attacks (spells included) have **Disadvantage**. Melee reach is 5 ft by default.',
    },
    example: {
      pt: 'Thalion (arco longo, 45/180 m) mira um cultista a 60 m: longo alcance, desvantagem — rola 17 e 8, fica com 8 + 5 = 13 contra CA 12 → acerta mesmo assim.',
      en: 'Thalion (longbow, 150/600 ft) aims at a cultist 200 ft away: long range, Disadvantage — rolls 17 and 8, keeps 8 + 5 = 13 vs AC 12 → still a hit.',
    },
    keywords: 'ataque à distância distancia ranged attack alcance range longo alcance long range arco besta bow crossbow atirar corpo a corpo adjacente close combat desvantagem alcance corpo a corpo reach',
    related: ['jogada-de-ataque', 'vantagem-desvantagem', 'cobertura', 'municao', 'propriedades-de-armas', 'alcance-e-alvos'],
  },
  {
    id: 'luta-com-duas-armas',
    aliases: ['two-weapon-fighting', 'dual-wielding', 'light-property'],
    cat: 'combat',
    title: { pt: 'Lutar com duas armas', en: 'Fighting with two weapons' },
    simple: {
      pt: 'Quando você usa a ação Atacar com uma arma **Leve**, pode fazer **um ataque extra como ação bônus** com **outra arma Leve**. Nesse ataque extra, você **não soma** o modificador de atributo ao dano (a menos que seja negativo). Com a maestria **Ágil (Nick)**, esse ataque extra entra na própria ação Atacar, liberando a ação bônus.',
      en: 'When you take the Attack action with a **Light** weapon, you can make **one extra attack as a Bonus Action** with a **different Light weapon**. On that extra attack you **don\'t add** your ability modifier to damage (unless it\'s negative). With the **Nick** mastery, that extra attack happens as part of the Attack action, freeing your Bonus Action.',
    },
    example: {
      pt: 'Mirela ataca com a espada curta (d20 + 5 = 16 → acerta, 1d6 + 3 = 7) e, como ação bônus, com a adaga (acerta, 1d4 = 3, sem o +3).',
      en: 'Mirela attacks with her shortsword (d20 + 5 = 16 → hit, 1d6 + 3 = 7) and, as a Bonus Action, with her dagger (hit, 1d4 = 3, no +3).',
    },
    sheet: {
      pt: 'Aba Jogar → Ataques: use o botão de ataque da segunda arma; no dano, desconte o modificador (a não ser que tenha o estilo de luta de Duas Armas).',
      en: 'Play tab → Attacks: use the second weapon\'s attack button; for damage, drop the modifier (unless you have the Two-Weapon Fighting style).',
    },
    versions: {
      pt: 'Em 2014 as duas armas precisavam ser Leves e corpo a corpo, e não existia a maestria Ágil. Em 2024 a regra vem da propriedade Leve e vale também para armas Leves de arremesso.',
      en: 'In 2014 both weapons had to be Light melee weapons, and there was no Nick mastery. In 2024 the rule comes from the Light property and also works with Light thrown weapons.',
    },
    srd: {
      text: 'When you take the Attack action on your turn and attack with a Light weapon, you can make one extra attack as a Bonus Action later on the same turn. That extra attack must be made with a different Light weapon',
      ref: 'SRD 5.2.1 — Equipment, Weapon Properties',
    },
    keywords: 'duas armas two weapon fighting dual wield empunhar duas leve light arma secundária off-hand ação bônus bonus action nick ágil',
    related: ['acao-atacar', 'acao-bonus', 'propriedades-de-armas', 'maestria-em-armas'],
  },
  {
    id: 'ataque-desarmado',
    aliases: ['unarmed-strike', 'punch'],
    cat: 'combat',
    title: { pt: 'Golpe desarmado', en: 'Unarmed Strike' },
    simple: {
      pt: 'Soco, chute ou cabeçada contra alguém a 1,5 m. Todo mundo é proficiente. Ao usar um golpe desarmado, escolha o efeito: **Dano** (ataque com Força + proficiência; acerto causa **1 + mod. de Força** de concussão), **Agarrar** ou **Empurrar** (nesses dois, o alvo faz uma salvaguarda de Força ou Destreza contra CD 8 + For + proficiência). Monges e alguns talentos melhoram o dano.',
      en: 'A punch, kick or headbutt against someone within 5 ft. Everyone is proficient. When you use an Unarmed Strike, pick the effect: **Damage** (attack with Strength + proficiency; a hit deals **1 + Str modifier** bludgeoning), **Grapple** or **Shove** (for these two, the target makes a Strength or Dexterity save vs DC 8 + Str + proficiency). Monks and some feats improve the damage.',
    },
    example: {
      pt: 'Sem armas na cela, Tordek (For +3, prof. +2) soca o carcereiro: d20 + 5 = 14 contra CA 12 → acerta, 1 + 3 = 4 de dano.',
      en: 'Weaponless in the cell, Tordek (Str +3, prof. +2) punches the jailer: d20 + 5 = 14 vs AC 12 → hit, 1 + 3 = 4 damage.',
    },
    sheet: {
      pt: 'Aba Jogar → Ataques: a linha "Golpe Desarmado" já traz os botões de ataque e dano.',
      en: 'Play tab → Attacks: the "Unarmed Strike" row has attack and damage buttons.',
    },
    versions: {
      pt: 'O dano (1 + For) é igual. Em 2014, agarrar e empurrar eram ataques especiais resolvidos com teste resistido de Atletismo; em 2024 viraram opções do golpe desarmado com salvaguarda.',
      en: 'The damage (1 + Str) is the same. In 2014, grapple and shove were special attacks resolved with an Athletics contest; in 2024 they became Unarmed Strike options with a saving throw.',
    },
    srd: {
      text: 'Damage. You make an attack roll against the target. Your bonus to the roll equals your Strength modifier plus your Proficiency Bonus. On a hit, the target takes Bludgeoning damage equal to 1 plus your Strength modifier.',
      ref: 'SRD 5.2.1 — Rules Glossary, Unarmed Strike',
    },
    keywords: 'golpe desarmado ataque desarmado unarmed strike soco punch chute kick cabeçada mãos nuas sem arma briga',
    related: ['agarrar', 'empurrar', 'acao-atacar', 'armas-improvisadas', 'ataque-de-oportunidade'],
  },
  {
    id: 'agarrar',
    aliases: ['grapple', 'grappling'],
    cat: 'combat',
    title: { pt: 'Agarrar', en: 'Grappling' },
    simple: {
      pt: 'Agarrar é uma opção do **golpe desarmado**, então substitui um ataque da ação Atacar. Você precisa de uma **mão livre**, e o alvo pode ser no máximo **um tamanho maior** que você. Ele faz uma **salvaguarda de Força ou Destreza** (escolhe qual) contra **CD 8 + mod. de Força + proficiência**; se falhar, fica **Agarrado**. Você pode soltar quando quiser, e o agarrão acaba se você ficar Incapacitado ou se afastar.',
      en: 'Grappling is an **Unarmed Strike** option, so it replaces one attack of the Attack action. You need a **free hand**, and the target can be at most **one size larger** than you. It makes a **Strength or Dexterity save** (its choice) vs **DC 8 + Str modifier + proficiency**; on a failure, it is **Grappled**. You can let go anytime, and the grapple ends if you become Incapacitated or get separated.',
    },
    example: {
      pt: 'Brunna (For +4, prof. +2) agarra o kobold ladrão: CD 14. O kobold rola Destreza: d20 + 2 = 9 → falha e fica Agarrado. Ela o arrasta 3 m gastando 6 m de movimento — só seria de graça se ele fosse dois tamanhos menor.',
      en: 'Brunna (Str +4, prof. +2) grabs the kobold thief: DC 14. The kobold rolls Dexterity: d20 + 2 = 9 → fails and is Grappled. She drags it 10 ft spending 20 ft of movement — it\'d only be free if it were two sizes smaller.',
    },
    versions: {
      pt: 'Em 2014 era um ataque especial: teste resistido de Força (Atletismo) seu contra Atletismo ou Acrobacia do alvo. Em 2024 o alvo faz salvaguarda contra uma CD fixa, e a mesma CD vale para escapar.',
      en: 'In 2014 it was a special attack: your Strength (Athletics) contested by the target\'s Athletics or Acrobatics. In 2024 the target saves against a fixed DC, and the same DC is used to escape.',
    },
    srd: {
      text: 'Grapple. The target must succeed on a Strength or Dexterity saving throw (it chooses which), or it has the Grappled condition. The DC for the saving throw and any escape attempts equals 8 plus your Strength modifier and Proficiency Bonus.',
      ref: 'SRD 5.2.1 — Rules Glossary, Unarmed Strike',
    },
    keywords: 'agarrar agarrão grapple grappling segurar prender imobilizar agarrar inimigo arrastar drag mão livre free hand escapar atletismo athletics',
    related: ['agarrado', 'ataque-desarmado', 'empurrar', 'salvaguarda', 'espaco-e-tamanho', 'teste-resistido'],
  },
  {
    id: 'empurrar',
    aliases: ['shove', 'knock-prone'],
    cat: 'combat',
    title: { pt: 'Empurrar e derrubar', en: 'Shoving' },
    simple: {
      pt: 'Também é uma opção do **golpe desarmado**. O alvo, no máximo **um tamanho maior** que você, faz **salvaguarda de Força ou Destreza** contra **CD 8 + For + proficiência**. Se falhar, você escolhe: **empurrá-lo 1,5 m** para longe ou deixá-lo **Prono** (caído). Derrubar dá vantagem aos aliados que atacam corpo a corpo; empurrar serve para jogar alguém num buraco ou tirá-lo do seu lado.',
      en: 'Also an **Unarmed Strike** option. The target, at most **one size larger** than you, makes a **Strength or Dexterity save** vs **DC 8 + Str + proficiency**. On a failure, you choose: **push it 5 ft** away or knock it **Prone**. Knocking prone gives melee allies Advantage; pushing is great for shoving someone off a ledge or out of your way.',
    },
    example: {
      pt: 'Tordek (CD 13) empurra o cultista perto do poço: o cultista rola For d20 + 1 = 8 → falha. Tordek o empurra 1,5 m, e ele cai 6 m poço abaixo.',
      en: 'Tordek (DC 13) shoves the cultist standing by the well: the cultist rolls Str d20 + 1 = 8 → fails. Tordek pushes him 5 ft, and he falls 20 ft down the well.',
    },
    versions: {
      pt: 'Em 2014, empurrar era um teste resistido de Atletismo contra Atletismo ou Acrobacia; em 2024 é salvaguarda contra CD fixa.',
      en: 'In 2014, shoving was an Athletics contest against Athletics or Acrobatics; in 2024 it\'s a save against a fixed DC.',
    },
    srd: {
      text: 'Shove. The target must succeed on a Strength or Dexterity saving throw (it chooses which), or you either push it 5 feet away or cause it to have the Prone condition.',
      ref: 'SRD 5.2.1 — Rules Glossary, Unarmed Strike',
    },
    keywords: 'empurrar empurrão shove push derrubar knock prone jogar no chão tombar caído prono afastar',
    related: ['prono', 'ataque-desarmado', 'agarrar', 'queda', 'ataque-de-oportunidade'],
  },
  {
    id: 'alvos-invisiveis',
    aliases: ['unseen-attackers-and-targets', 'unseen-attacker', 'unseen-target'],
    cat: 'combat',
    title: { pt: 'Atacar sem ver (e sem ser visto)', en: 'Unseen attackers and targets' },
    simple: {
      pt: 'Atacar algo que você **não consegue ver** tem **desvantagem** — mesmo que você o ouça ou adivinhe onde está. Se errar o quadrado, erra automaticamente. Ao contrário, se **o alvo não pode te ver**, você ataca com **vantagem**. Estando escondido, atacar (acertando ou errando) **revela sua posição**.',
      en: 'Attacking something you **can\'t see** has **Disadvantage** — even if you can hear it or guess where it is. If you pick the wrong spot, you miss automatically. Conversely, if **the target can\'t see you**, you attack with **Advantage**. If you\'re hidden, attacking (hit or miss) **gives away your location**.',
    },
    example: {
      pt: 'Na escuridão total, o ladrão invisível sussurra à esquerda de Kael. Kael ataca aquele quadrado com desvantagem: 14 e 9, fica 9 + 5 = 14 contra CA 13 → acerta, porque adivinhou certo.',
      en: 'In total darkness, the invisible thief whispers to Kael\'s left. Kael attacks that square with Disadvantage: 14 and 9, keeps 9 + 5 = 14 vs AC 13 → hit, since he guessed right.',
    },
    srd: {
      text: 'When you make an attack roll against a target you can\'t see, you have Disadvantage on the roll. This is true whether you\'re guessing the target\'s location or targeting a creature you can hear but not see.',
      ref: 'SRD 5.2.1 — Playing the Game, Combat',
    },
    keywords: 'atacar sem ver invisível invisivel unseen attacker target escuridão darkness escondido hidden cego adivinhar posição vantagem desvantagem',
    related: ['invisivel', 'cego', 'acao-esconder', 'luz-e-visao', 'vantagem-desvantagem', 'obscurecido'],
  },
  {
    id: 'combate-montado',
    aliases: ['mounted-combat', 'mount'],
    cat: 'combat',
    title: { pt: 'Combate montado', en: 'Mounted combat' },
    simple: {
      pt: 'Uma criatura disposta, **pelo menos um tamanho maior** que você e com anatomia adequada, pode ser montaria. Montar ou desmontar custa **metade do seu deslocamento**. Uma montaria **treinada** (cavalo, mula) age na sua iniciativa e, no seu turno, só pode **Disparada, Desengajar ou Esquivar** — mas se move como você mandar. Se algo a mover contra a vontade, ou você ou ela ficar prono, faça **salvaguarda de Destreza CD 10** ou caia prono ao lado.',
      en: 'A willing creature **at least one size larger** than you with a suitable anatomy can be a mount. Mounting or dismounting costs **half your Speed**. A **trained** mount (horse, mule) acts on your Initiative and, on your turn, can only **Dash, Disengage or Dodge** — but it moves as you direct. If something moves it against its will, or you or it are knocked prone, make a **DC 10 Dexterity save** or fall off prone next to it.',
    },
    example: {
      pt: 'Brunna (9 m) gasta 4,5 m para montar o cavalo de guerra. O cavalo usa Disparada (18 m × 2 = 36 m) e ela ataca o cavaleiro inimigo ao passar.',
      en: 'Brunna (30 ft) spends 15 ft to mount her warhorse. The horse Dashes (60 ft × 2 = 120 ft) and she attacks the enemy rider as they pass.',
    },
    srd: {
      text: 'A willing creature that is at least one size larger than a rider and that has an appropriate anatomy can serve as a mount',
      ref: 'SRD 5.2.1 — Playing the Game, Combat',
    },
    keywords: 'montaria combate montado mounted combat mount cavalo horse montar desmontar dismount cavalgar cavaleiro rider cair da montaria fall off',
    related: ['espaco-e-tamanho', 'acao-disparada', 'acao-desengajar', 'acao-esquivar', 'prono'],
  },
  {
    id: 'combate-subaquatico',
    aliases: ['underwater-combat'],
    cat: 'combat',
    title: { pt: 'Combate subaquático', en: 'Underwater combat' },
    simple: {
      pt: 'Embaixo d\'água, quem **não tem deslocamento de natação** ataca corpo a corpo com **desvantagem**, a não ser que a arma cause dano **perfurante** (lança, adaga, tridente). Ataques à distância com arma **erram automaticamente** além do alcance normal e têm **desvantagem** dentro dele. Tudo que está submerso tem **resistência a fogo**. E cuidado com o fôlego (veja Sufocamento).',
      en: 'Underwater, anyone **without a Swim Speed** makes melee weapon attacks with **Disadvantage**, unless the weapon deals **piercing** damage (spear, dagger, trident). Ranged weapon attacks **automatically miss** beyond normal range and have **Disadvantage** within it. Everything submerged has **Resistance to fire**. And watch your breath (see Suffocation).',
    },
    example: {
      pt: 'No naufrágio, Tordek ataca o sahuagin com o machado (cortante): desvantagem. Kael, de lança (perfurante), ataca normalmente: d20 + 5 = 17 → acerta.',
      en: 'In the shipwreck, Tordek swings his axe (slashing) at the sahuagin: Disadvantage. Kael, with a spear (piercing), attacks normally: d20 + 5 = 17 → hit.',
    },
    versions: {
      pt: 'Em 2014 a exceção corpo a corpo era uma lista (adaga, azagaia, espada curta, lança, tridente) e bestas, redes e armas de arremesso escapavam da desvantagem à distância; em 2024 a regra ficou "dano perfurante".',
      en: 'In 2014 the melee exception was a list (dagger, javelin, shortsword, spear, trident), and crossbows, nets and thrown weapons avoided the ranged Disadvantage; in 2024 the rule is simply "piercing damage."',
    },
    srd: {
      text: 'When making a melee attack roll with a weapon underwater, a creature that lacks a Swim Speed has Disadvantage on the attack roll unless the weapon deals Piercing damage.',
      ref: 'SRD 5.2.1 — Playing the Game, Combat',
    },
    keywords: 'combate subaquático submerso debaixo d\'água underwater combat nadar swim água water lança tridente fogo resistência afogar',
    related: ['sufocamento', 'escalar-nadar-rastejar', 'ataque-a-distancia', 'resistencia-e-vulnerabilidade', 'tipos-de-dano'],
  },
];

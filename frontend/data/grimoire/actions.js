/* Grimório — Ações em combate. Explicações originais; `srd` = citação literal do SRD 5.2.1 (CC-BY 4.0). */
export default [
  {
    id: 'acao-atacar',
    aliases: ['attack-action', 'attack'],
    cat: 'actions',
    title: { pt: 'Ação: Atacar', en: 'Action: Attack' },
    simple: {
      pt: 'A ação mais comum do combate: você faz **uma jogada de ataque** com uma arma ou um golpe desarmado. Personagens com **Ataque Extra** fazem dois ou mais ataques na mesma ação e podem se mover entre eles. Em cada ataque você pode também sacar ou guardar uma arma, antes ou depois de atacar.',
      en: 'The most common combat action: you make **one attack roll** with a weapon or an Unarmed Strike. Characters with **Extra Attack** make two or more attacks with the same action and can move between them. With each attack you can also draw or stow one weapon, before or after the attack.',
    },
    example: {
      pt: 'Tordek (guerreiro nível 5, Ataque Extra) usa Atacar: golpeia o orc (d20 + 7 = 19 contra CA 13 → acerta), anda 3 m e golpeia o goblin ao lado (d20 + 7 = 12 contra CA 15 → erra).',
      en: 'Tordek (level 5 Fighter, Extra Attack) takes the Attack action: hits the orc (d20 + 7 = 19 vs AC 13 → hit), moves 10 ft and swings at the goblin next to it (d20 + 7 = 12 vs AC 15 → miss).',
    },
    sheet: {
      pt: 'Aba Jogar → Ataques: botão de ataque rola o d20 com o bônus; o botão de dano rola o dano da arma.',
      en: 'Play tab → Attacks: the attack button rolls the d20 with your bonus; the damage button rolls the weapon damage.',
    },
    versions: {
      pt: 'Em 2024 ficou explícito que cada ataque da ação permite equipar ou desequipar uma arma. Em 2014, sacar uma arma usava a interação gratuita com objeto do turno.',
      en: 'In 2024 it became explicit that each attack in the action lets you equip or unequip one weapon. In 2014, drawing a weapon used your free object interaction for the turn.',
    },
    srd: {
      text: 'When you take the Attack action, you can make one attack roll with a weapon or an Unarmed Strike.',
      ref: 'SRD 5.2.1 — Rules Glossary (Attack)',
    },
    keywords: 'atacar ataque acao de ataque bater golpear ataque extra attack action extra attack hit strike swing sacar arma draw weapon',
    related: ['jogada-de-ataque', 'jogada-de-dano', 'ataque-desarmado', 'luta-com-duas-armas', 'agarrar', 'empurrar'],
  },
  {
    id: 'acao-disparada',
    aliases: ['dash-action', 'dash'],
    cat: 'actions',
    title: { pt: 'Ação: Disparada', en: 'Action: Dash' },
    simple: {
      pt: 'Você troca sua ação por **mais movimento**: ganha um deslocamento extra igual ao seu deslocamento atual neste turno — na prática, anda o dobro. Se seu deslocamento estiver reduzido, o extra também é reduzido. Se você tem voo ou natação, pode usar esse deslocamento no lugar.',
      en: 'You trade your action for **more movement**: you gain extra movement equal to your current Speed this turn — in practice, double moves. If your Speed is reduced, the extra is reduced too. If you have a Fly or Swim Speed, you can use that instead.',
    },
    example: {
      pt: 'Lia (deslocamento 9 m) precisa alcançar a porta a 15 m. Ela anda 9 m e usa Disparada para mais 9 m → chega com 3 m de sobra.',
      en: 'Lia (Speed 30 ft) needs to reach the door 50 ft away. She moves 30 ft and Dashes for 30 more → she arrives with 10 ft to spare.',
    },
    sheet: {
      pt: 'Aba Jogar → caixa Deslocamento mostra quanto você anda por turno; com Disparada, dobre esse valor.',
      en: 'Play tab → Speed box shows how far you move per turn; with Dash, double it.',
    },
    srd: {
      text: 'When you take the Dash action, you gain extra movement for the current turn. The increase equals your Speed after applying any modifiers.',
      ref: 'SRD 5.2.1 — Rules Glossary (Dash)',
    },
    keywords: 'disparada corrida correr dash run dobrar movimento double move andar mais sprint fugir',
    related: ['deslocamento', 'acao-desengajar', 'acao-bonus', 'terreno-dificil', 'marcha-forcada'],
  },
  {
    id: 'acao-desengajar',
    aliases: ['disengage-action', 'disengage'],
    cat: 'actions',
    title: { pt: 'Ação: Desengajar', en: 'Action: Disengage' },
    simple: {
      pt: 'Sair de perto de um inimigo normalmente dá a ele um **ataque de oportunidade**. Com Desengajar, seu movimento **não provoca ataques de oportunidade** pelo resto do turno. É a forma segura de recuar de um combate corpo a corpo.',
      en: 'Leaving an enemy\'s reach normally gives it an **Opportunity Attack**. With Disengage, your movement **doesn\'t provoke Opportunity Attacks** for the rest of the turn. It\'s the safe way to pull back from melee.',
    },
    example: {
      pt: 'Mirela, cercada por dois lobos, usa Desengajar e anda 9 m para trás do guerreiro. Nenhum lobo pode atacá-la enquanto ela se afasta.',
      en: 'Mirela, flanked by two wolves, Disengages and moves 30 ft to get behind the Fighter. Neither wolf can attack her as she leaves.',
    },
    srd: {
      text: 'If you take the Disengage action, your movement doesn’t provoke Opportunity Attacks for the rest of the current turn.',
      ref: 'SRD 5.2.1 — Rules Glossary (Disengage)',
    },
    keywords: 'desengajar recuar sair fugir retirar disengage retreat withdraw back off ataque de oportunidade opportunity attack',
    related: ['ataque-de-oportunidade', 'acao-disparada', 'deslocamento', 'acao-bonus'],
  },
  {
    id: 'acao-esquivar',
    aliases: ['dodge-action', 'dodge'],
    cat: 'actions',
    title: { pt: 'Ação: Esquivar', en: 'Action: Dodge' },
    simple: {
      pt: 'Você passa o turno focado em se defender. Até o início do seu próximo turno, **ataques contra você têm desvantagem** (se você vê o atacante) e você faz **salvaguardas de Destreza com vantagem**. Você perde isso se ficar Incapacitado ou com deslocamento 0.',
      en: 'You spend the turn focused on defense. Until the start of your next turn, **attacks against you have Disadvantage** (if you can see the attacker) and you make **Dexterity saving throws with Advantage**. You lose this if you become Incapacitated or your Speed drops to 0.',
    },
    example: {
      pt: 'Kael, com 4 PV, usa Esquivar. O ogro ataca com desvantagem: rola 15 e 7 → usa 7 + 6 = 13 contra CA 14 → erra.',
      en: 'Kael, at 4 HP, takes the Dodge action. The ogre attacks with Disadvantage: rolls 15 and 7 → uses 7 + 6 = 13 vs AC 14 → miss.',
    },
    srd: {
      text: '…until the start of your next turn, any attack roll made against you has Disadvantage if you can see the attacker, and you make Dexterity saving throws with Advantage.',
      ref: 'SRD 5.2.1 — Rules Glossary (Dodge)',
    },
    keywords: 'esquivar esquiva defender defesa total dodge defend defense desvantagem disadvantage salvaguarda destreza',
    related: ['vantagem-desvantagem', 'salvaguarda', 'incapacitado', 'classe-de-armadura', 'acao-desengajar'],
  },
  {
    id: 'acao-ajudar',
    aliases: ['help-action', 'help'],
    cat: 'actions',
    title: { pt: 'Ação: Ajudar', en: 'Action: Help' },
    simple: {
      pt: 'Você usa sua ação para dar uma mão a alguém. **Num teste**: escolha uma perícia ou ferramenta em que você é proficiente; o aliado tem **vantagem** no próximo teste com ela (até o início do seu próximo turno). **Num ataque**: você distrai um inimigo a até 1,5 m de você, e o próximo ataque de um aliado contra ele tem **vantagem**. Também é a ação usada para **estabilizar** alguém a 0 PV (Medicina CD 10).',
      en: 'You use your action to lend a hand. **On a check**: pick a skill or tool you\'re proficient in; your ally has **Advantage** on their next check with it (until the start of your next turn). **On an attack**: you distract an enemy within 5 ft of you, and the next attack by an ally against it has **Advantage**. It\'s also the action to **stabilize** someone at 0 HP (Medicine DC 10).',
    },
    example: {
      pt: 'Brunna (proficiente em Atletismo) ajuda Tordek a erguer a grade: ele rola com vantagem, 5 e 14 → 14 + 5 = 19 contra CD 18 → a grade sobe.',
      en: 'Brunna (proficient in Athletics) helps Tordek lift the portcullis: he rolls with Advantage, 5 and 14 → 14 + 5 = 19 vs DC 18 → the gate rises.',
    },
    versions: {
      pt: 'Em 2014, ajudar em um teste não exigia proficiência, e para ajudar num ataque o inimigo tinha que estar a até 1,5 m de você (igual). Em 2024 é preciso ser proficiente na perícia ou ferramenta.',
      en: 'In 2014, helping with a check didn\'t require proficiency, and helping with an attack required the enemy to be within 5 ft of you (same). In 2024 you must be proficient in the skill or tool.',
    },
    srd: {
      text: 'Assist an Attack Roll. You momentarily distract an enemy within 5 feet of you, giving Advantage to the next attack roll by one of your allies against that enemy.',
      ref: 'SRD 5.2.1 — Rules Glossary (Help)',
    },
    keywords: 'ajudar ajuda auxiliar distrair help assist aid vantagem advantage estabilizar stabilize primeiros socorros first aid medicina medicine',
    related: ['vantagem-desvantagem', 'teste-em-grupo', 'testes-contra-a-morte', 'zero-pv', 'pericias'],
  },
  {
    id: 'acao-esconder',
    aliases: ['hide-action', 'hide', 'hiding'],
    cat: 'actions',
    title: { pt: 'Ação: Esconder', en: 'Action: Hide' },
    simple: {
      pt: 'Para se esconder você precisa estar **fora da linha de visão** dos inimigos e **muito obscurecido ou atrás de cobertura de três quartos/total**. Faça um teste de Destreza (Furtividade) **CD 15**. Se passar, você fica **Invisível** enquanto escondido, e o total da sua rolagem vira a CD para alguém te achar com Percepção. Você é revelado se fizer barulho mais alto que um sussurro, atacar, lançar magia com componente verbal ou for encontrado.',
      en: 'To hide you must be **out of enemies\' line of sight** and **Heavily Obscured or behind Three-Quarters/Total Cover**. Make a **DC 15** Dexterity (Stealth) check. On a success you have the **Invisible** condition while hidden, and your roll\'s total becomes the DC for someone to find you with Perception. You\'re revealed if you make noise louder than a whisper, attack, cast a spell with a Verbal component, or are found.',
    },
    example: {
      pt: 'Lia se enfia atrás de uma pilha de caixotes: Furtividade 11 + 8 = 19 ≥ 15 → escondida (Invisível). Um guarda procura: Percepção 13 < 19 → não a acha. No turno seguinte ela ataca com vantagem, e então deixa de estar escondida.',
      en: 'Lia ducks behind a stack of crates: Stealth 11 + 8 = 19 ≥ 15 → hidden (Invisible). A guard searches: Perception 13 < 19 → can\'t find her. Next turn she attacks with Advantage, and then she\'s no longer hidden.',
    },
    versions: {
      pt: 'Em 2014 não havia CD fixa: sua Furtividade disputava com a Percepção (passiva ou ativa) de quem procura, e estar escondido dava os benefícios de "atacante não visto", sem aplicar a condição Invisível. A CD 15 e a condição Invisível são de 2024.',
      en: 'In 2014 there was no fixed DC: your Stealth was contested by the searcher\'s Perception (passive or active), and being hidden gave the "unseen attacker" benefits without applying the Invisible condition. The DC 15 and the Invisible condition are from 2024.',
    },
    srd: {
      text: 'To do so, you must succeed on a DC 15 Dexterity (Stealth) check while you’re Heavily Obscured or behind Three-Quarters Cover or Total Cover, and you must be out of any enemy’s line of sight',
      ref: 'SRD 5.2.1 — Rules Glossary (Hide)',
    },
    keywords: 'esconder esconder-se escondido furtividade furtivo sumir hide hiding hidden stealth sneak invisivel invisible cd 15 ataque furtivo',
    related: ['invisivel', 'alvos-invisiveis', 'cobertura', 'obscurecido', 'valor-passivo', 'acao-buscar'],
  },
  {
    id: 'acao-preparar',
    aliases: ['ready-action', 'ready'],
    cat: 'actions',
    title: { pt: 'Ação: Preparar', en: 'Action: Ready' },
    simple: {
      pt: 'Você deixa uma ação "engatilhada" para disparar quando algo acontecer. Diga o **gatilho** (algo perceptível) e **o que vai fazer** — uma ação ou mover-se até seu deslocamento. Quando o gatilho acontecer, você age usando sua **reação**, antes do seu próximo turno. Para preparar uma magia, você a lança já (gasta o espaço) e a segura com **concentração** até soltar.',
      en: 'You set up an action to fire off when something happens. Name the **trigger** (something perceivable) and **what you\'ll do** — an action or moving up to your Speed. When the trigger occurs, you act using your **Reaction**, before your next turn. To ready a spell, you cast it now (spending the slot) and hold it with **Concentration** until you release it.',
    },
    example: {
      pt: 'Thalion diz: "Se o cultista passar pela porta, eu atiro." O cultista entra; Thalion usa a reação: d20 + 6 = 18 contra CA 12 → acerta. Se o cultista não aparecesse, a ação estaria perdida.',
      en: 'Thalion says: "If the cultist comes through the door, I shoot." The cultist enters; Thalion uses his Reaction: d20 + 6 = 18 vs AC 12 → hit. If the cultist never showed up, the action would be wasted.',
    },
    srd: {
      text: 'First, you decide what perceivable circumstance will trigger your Reaction. Then, you choose the action you will take in response to that trigger, or you choose to move up to your Speed in response to it.',
      ref: 'SRD 5.2.1 — Rules Glossary (Ready)',
    },
    keywords: 'preparar acao preparada esperar gatilho segurar acao ready readied action trigger hold wait reacao reaction',
    related: ['reacao', 'concentracao', 'acao-magia', 'rodada-e-turno'],
  },
  {
    id: 'acao-buscar',
    aliases: ['search-action', 'search'],
    cat: 'actions',
    title: { pt: 'Ação: Buscar', en: 'Action: Search' },
    simple: {
      pt: 'Você procura **algo que não está óbvio** fazendo um teste de Sabedoria. A perícia depende do que você procura: **Percepção** para criaturas escondidas ou objetos, **Intuição** para ler a intenção de alguém, **Medicina** para entender um ferimento ou doença, **Sobrevivência** para rastros. Contra alguém escondido, a CD é o total de Furtividade dele.',
      en: 'You look for **something that isn\'t obvious** with a Wisdom check. The skill depends on what you\'re looking for: **Perception** for hidden creatures or objects, **Insight** to read someone\'s intentions, **Medicine** to understand a wound or ailment, **Survival** for tracks. Against a hidden creature, the DC is its Stealth total.',
    },
    example: {
      pt: 'O goblin se escondeu com Furtividade 14. Kael usa Buscar: Percepção 12 + 3 = 15 ≥ 14 → acha o goblin, que deixa de estar escondido.',
      en: 'The goblin hid with a Stealth total of 14. Kael takes the Search action: Perception 12 + 3 = 15 ≥ 14 → he finds the goblin, which is no longer hidden.',
    },
    versions: {
      pt: 'Em 2014, Procurar era um teste de Sabedoria (Percepção) ou Inteligência (Investigação). Em 2024 é sempre Sabedoria; examinar pistas e lembrar coisas com Inteligência virou a ação Estudar.',
      en: 'In 2014, Search was a Wisdom (Perception) or Intelligence (Investigation) check. In 2024 it\'s always Wisdom; examining clues and recalling lore with Intelligence became the Study action.',
    },
    keywords: 'buscar procurar vasculhar achar encontrar perceber search look find perception percepcao intuicao insight medicina medicine sobrevivencia survival rastro track',
    related: ['acao-esconder', 'acao-estudar', 'valor-passivo', 'pericias', 'luz-e-visao'],
  },
  {
    id: 'acao-usar-objeto',
    aliases: ['utilize-action', 'utilize', 'use-an-object'],
    cat: 'actions',
    title: { pt: 'Ação: Usar objeto', en: 'Action: Utilize' },
    simple: {
      pt: 'Quando um objeto **exige uma ação para ser usado** — acender uma lanterna com isca e pederneira, puxar uma alavanca pesada, abrir um frasco de óleo — você usa esta ação. Também é o que você gasta para uma **segunda interação** com objeto no mesmo turno. Itens mágicos costumam usar a ação Magia, não esta.',
      en: 'When an object **requires an action to use** — lighting a lantern with a tinderbox, hauling a heavy lever, uncorking a flask of oil — you take this action. It\'s also what you spend for a **second object interaction** in the same turn. Magic items usually use the Magic action instead.',
    },
    example: {
      pt: 'Zé do Machado anda 6 m e abre a porta de graça. Para também puxar a alavanca da ponte levadiça, ele gasta a ação (Usar objeto); ainda lhe sobram 3 m de deslocamento para atravessar.',
      en: 'Zé do Machado moves 20 ft and opens the door for free. To also pull the drawbridge lever, he spends his action (Utilize); he still has 10 ft of movement left to cross.',
    },
    versions: {
      pt: 'Em 2014 era "Usar um Objeto" e servia inclusive para ativar muitos itens mágicos e beber poções. Em 2024 virou "Utilizar", para objetos não mágicos; itens mágicos usam a ação Magia e beber poção é ação bônus.',
      en: 'In 2014 it was "Use an Object" and also covered activating many magic items and drinking potions. In 2024 it became "Utilize", for nonmagical objects; magic items use the Magic action and drinking a potion is a Bonus Action.',
    },
    srd: {
      text: 'When an object requires an action for its use, you take the Utilize action.',
      ref: 'SRD 5.2.1 — Rules Glossary (Utilize)',
    },
    keywords: 'usar objeto utilizar item alavanca acender use an object utilize use item lever interagir interact',
    related: ['interagir-com-objeto', 'acao-magia', 'pocoes-de-cura', 'ferramentas'],
  },
  {
    id: 'acao-magia',
    aliases: ['magic-action', 'cast-a-spell'],
    cat: 'actions',
    title: { pt: 'Ação: Magia', en: 'Action: Magic' },
    simple: {
      pt: 'É a ação para **lançar uma magia de 1 ação**, **ativar um item mágico** ou usar um poder mágico que diga "ação Magia". Magias com tempo de conjuração de 1 minuto ou mais exigem a ação Magia em cada turno da conjuração, mantendo concentração. Magias de ação bônus ou reação **não** usam esta ação.',
      en: 'This is the action to **cast a spell with a casting time of an action**, **activate a magic item** or use a magical feature that says "Magic action". Spells with a casting time of 1 minute or more require the Magic action on every turn of the casting, while maintaining Concentration. Bonus Action or Reaction spells **don\'t** use this action.',
    },
    example: {
      pt: 'Mirela usa a ação Magia para lançar Raio Guiado: ataque mágico d20 + 5 = 17 contra CA 14 → acerta. Neste turno ela ainda pode se mover.',
      en: 'Mirela takes the Magic action to cast Guiding Bolt: spell attack d20 + 5 = 17 vs AC 14 → hit. She can still move this turn.',
    },
    sheet: {
      pt: 'Aba Magias: suas magias preparadas, com o tempo de conjuração e os espaços disponíveis.',
      en: 'Spells tab: your prepared spells, with casting time and available slots.',
    },
    versions: {
      pt: 'Em 2014 era a ação "Conjurar uma Magia"; ativar item mágico costumava ser "Usar um Objeto". Em 2024 a ação Magia cobre os dois.',
      en: 'In 2014 it was the "Cast a Spell" action; activating a magic item was usually "Use an Object". In 2024 the Magic action covers both.',
    },
    srd: {
      text: 'When you take the Magic action, you cast a spell that has a casting time of an action or use a feature or magic item that requires a Magic action to be activated.',
      ref: 'SRD 5.2.1 — Rules Glossary (Magic)',
    },
    keywords: 'magia acao magia conjurar lancar magia feitico item magico magic action cast a spell cast spell spellcasting magic item',
    related: ['conjurar-magia', 'tempo-de-conjuracao', 'concentracao', 'sintonizacao', 'acao-bonus'],
  },
  {
    id: 'acao-estudar',
    aliases: ['study-action', 'study'],
    cat: 'actions',
    title: { pt: 'Ação: Estudar', en: 'Action: Study' },
    simple: {
      pt: 'Você para para **pensar, examinar ou lembrar** algo: faz um teste de Inteligência. A perícia depende do assunto: **Arcanismo** (magia, planos, certas criaturas), **História** (povos, guerras, lendas), **Investigação** (pistas, mecanismos, dedução), **Natureza** (animais, plantas, clima) e **Religião** (deuses, cultos, mortos-vivos).',
      en: 'You stop to **think, examine or recall** something: make an Intelligence check. The skill depends on the subject: **Arcana** (magic, planes, certain creatures), **History** (peoples, wars, legends), **Investigation** (clues, mechanisms, deduction), **Nature** (animals, plants, weather) and **Religion** (gods, cults, undead).',
    },
    example: {
      pt: 'No meio da luta, Thalion usa Estudar para lembrar o ponto fraco do troll: Natureza d20 + 4 = 16 contra CD 15 → o mestre conta que fogo e ácido impedem a regeneração.',
      en: 'Mid-fight, Thalion takes the Study action to recall the troll\'s weakness: Nature d20 + 4 = 16 vs DC 15 → the GM reveals that fire and acid stop its regeneration.',
    },
    versions: {
      pt: 'Não existia em 2014: lembrar informações era um teste de Inteligência livre, e examinar pistas fazia parte de Procurar (Investigação). Em 2024 virou ação própria.',
      en: 'It didn\'t exist in 2014: recalling lore was a freeform Intelligence check, and examining clues was part of Search (Investigation). In 2024 it became its own action.',
    },
    srd: {
      text: 'When you take the Study action, you make an Intelligence check to study your memory, a book, a clue, or another source of knowledge and call to mind an important piece of information about it.',
      ref: 'SRD 5.2.1 — Rules Glossary (Study)',
    },
    keywords: 'estudar examinar lembrar conhecimento pista study examine recall knowledge lore clue arcanismo arcana historia history investigacao investigation natureza nature religiao religion inteligencia',
    related: ['acao-buscar', 'pericias', 'teste-de-atributo', 'acao-influenciar'],
  },
  {
    id: 'acao-influenciar',
    aliases: ['influence-action', 'influence'],
    cat: 'actions',
    title: { pt: 'Ação: Influenciar', en: 'Action: Influence' },
    simple: {
      pt: 'Você tenta **convencer uma criatura** a fazer algo: descreva ou interprete como fala com ela (mentir, intimidar, encantar, persuadir). Se o pedido já agrada à criatura, ela aceita sem teste; se é repugnante para ela, recusa sem teste. Se ela está **hesitante**, você rola Carisma (Enganação, Intimidação, Atuação ou Persuasão) ou Sabedoria (Lidar com Animais) contra **CD 15 ou a Inteligência dela, o que for maior**. Criaturas amistosas dão vantagem; hostis, desvantagem.',
      en: 'You try to **convince a creature** to do something: describe or roleplay how you talk to it (lie, threaten, charm, persuade). If the request already suits it, it agrees without a check; if it\'s repugnant to it, it refuses without a check. If it\'s **hesitant**, roll Charisma (Deception, Intimidation, Performance or Persuasion) or Wisdom (Animal Handling) against **DC 15 or its Intelligence score, whichever is higher**. Friendly creatures give Advantage; Hostile ones, Disadvantage.',
    },
    example: {
      pt: 'Mirela pede ao guarda (indiferente, Int 10) que a deixe passar sem revista. CD = 15. Persuasão: 13 + 5 = 18 → ele dá de ombros e libera. Se falhasse, teria que esperar 24 h para tentar o mesmo pedido.',
      en: 'Mirela asks the guard (Indifferent, Int 10) to let her through without a search. DC = 15. Persuasion: 13 + 5 = 18 → he shrugs and waves her on. On a failure she\'d have to wait 24 hours to try the same request.',
    },
    versions: {
      pt: 'Em 2014 não havia ação Influenciar: a interação social era resolvida com testes de Carisma definidos pelo mestre. A regra de CD 15 ou Inteligência, e a espera de 24 h após falhar, são de 2024.',
      en: 'In 2014 there was no Influence action: social interaction was resolved with Charisma checks set by the GM. The DC 15-or-Intelligence rule and the 24-hour wait after failing are from 2024.',
    },
    srd: {
      text: 'The GM chooses the check, which has a default DC equal to 15 or the monster’s Intelligence score, whichever is higher.',
      ref: 'SRD 5.2.1 — Rules Glossary (Influence)',
    },
    keywords: 'influenciar convencer persuadir intimidar enganar mentir negociar social influence persuade intimidate deceive lie convince attitude atitude amistoso hostil indiferente friendly hostile indifferent carisma charisma',
    related: ['pericias', 'teste-de-atributo', 'vantagem-desvantagem', 'encantado', 'acao-estudar'],
  },
  {
    id: 'acao-bonus',
    aliases: ['bonus-action'],
    cat: 'actions',
    title: { pt: 'Ação bônus', en: 'Bonus Action' },
    simple: {
      pt: 'É uma ação extra e rápida que você **só tem se alguma regra disser** que algo é feito "como ação bônus" (uma magia, um traço de classe, beber poção em 2024...). Você pode fazer **no máximo uma por turno**, no momento que quiser do seu turno. Se algo impede você de agir (Incapacitado), também impede a ação bônus.',
      en: 'It\'s a quick extra action you **only have if some rule says** something is done "as a Bonus Action" (a spell, a class feature, drinking a potion in 2024...). You can take **at most one per turn**, whenever you like during your turn. Anything that stops you from taking actions (Incapacitated) also stops Bonus Actions.',
    },
    example: {
      pt: 'Lia (ladina) ataca com a adaga usando a ação e depois usa **Ação Ardilosa** como ação bônus para Desengajar e fugir 9 m sem levar ataque de oportunidade.',
      en: 'Lia (Rogue) attacks with her dagger using her action, then uses **Cunning Action** as a Bonus Action to Disengage and slip 30 ft away without drawing an Opportunity Attack.',
    },
    srd: {
      text: 'You can’t take more than one Bonus Action on a turn, and you have a Bonus Action to take only if a rule explicitly says so.',
      ref: 'SRD 5.2.1 — Rules Glossary (Bonus Action)',
    },
    keywords: 'acao bonus acao bonus ab acao extra bonus action ba extra action cunning action acao ardilosa arma leve light weapon',
    related: ['rodada-e-turno', 'reacao', 'luta-com-duas-armas', 'tempo-de-conjuracao', 'pocoes-de-cura'],
  },
  {
    id: 'reacao',
    aliases: ['reaction'],
    cat: 'actions',
    title: { pt: 'Reação', en: 'Reaction' },
    simple: {
      pt: 'Uma reação é uma resposta instantânea a um **gatilho**, e pode acontecer **até no turno de outra criatura**. O exemplo clássico é o **ataque de oportunidade**; magias como Escudo e a ação Preparar também usam reação. Você tem **uma por rodada**: depois de usar, só volta no início do seu próximo turno.',
      en: 'A Reaction is an instant response to a **trigger**, and can happen **even on another creature\'s turn**. The classic example is the **Opportunity Attack**; spells like Shield and the Ready action also use your Reaction. You get **one per round**: once used, it comes back at the start of your next turn.',
    },
    example: {
      pt: 'Um orc ataca Kael (17 contra CA 15 → acertaria). Kael usa a reação para lançar Escudo: CA vira 20 até o próximo turno dele → o golpe erra. Quando outro orc foge dele logo depois, Kael não tem mais reação para o ataque de oportunidade.',
      en: 'An orc attacks Kael (17 vs AC 15 → would hit). Kael uses his Reaction to cast Shield: AC becomes 20 until his next turn → the blow misses. When another orc runs from him right after, Kael has no Reaction left for an Opportunity Attack.',
    },
    sheet: {
      pt: 'Aba Jogar: reações especiais de estilos de luta aparecem como "Reação · ..." abaixo dos ataques.',
      en: 'Play tab: special reactions from Fighting Styles show up as "Reaction · ..." below your attacks.',
    },
    srd: {
      text: 'Once you take a Reaction, you can’t take another one until the start of your next turn.',
      ref: 'SRD 5.2.1 — Rules Glossary (Reaction)',
    },
    keywords: 'reacao reagir resposta gatilho reaction react trigger escudo shield contramagica counterspell ataque de oportunidade opportunity attack',
    related: ['ataque-de-oportunidade', 'acao-preparar', 'acao-bonus', 'rodada-e-turno', 'tempo-de-conjuracao'],
  },
  {
    id: 'interagir-com-objeto',
    aliases: ['object-interaction', 'interacting-with-objects', 'free-object-interaction'],
    cat: 'actions',
    title: { pt: 'Interagir com objeto (grátis)', en: 'Free object interaction' },
    simple: {
      pt: 'Em cada turno você pode fazer **uma interação simples com um objeto de graça**, durante seu movimento ou sua ação: abrir uma porta, pegar algo do chão, puxar uma alavanca leve, entregar um item. Uma segunda interação no mesmo turno exige a ação **Usar objeto**. Falar frases curtas e gesticular também é grátis.',
      en: 'Each turn you can make **one simple object interaction for free**, during your move or your action: open a door, pick something up, pull a light lever, hand over an item. A second interaction in the same turn requires the **Utilize** action. Speaking brief phrases and gesturing is free too.',
    },
    example: {
      pt: 'Brunna anda 4,5 m, abre a porta (grátis) e ataca o esqueleto do outro lado. Se quisesse também pegar a tocha da parede, precisaria gastar a ação.',
      en: 'Brunna moves 15 ft, opens the door (free) and attacks the skeleton beyond it. If she also wanted to grab the torch from the wall, she\'d need to spend her action.',
    },
    srd: {
      text: 'You can interact with one object or feature of the environment for free, during either your move or action.',
      ref: 'SRD 5.2.1 — Playing the Game (Combat)',
    },
    keywords: 'interagir objeto interacao gratis livre abrir porta pegar item free object interaction interact open door pick up grab falar speak',
    related: ['acao-usar-objeto', 'rodada-e-turno', 'acao-atacar', 'deslocamento'],
  },
];

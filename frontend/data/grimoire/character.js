/* Grimório — Criação e progressão. Texto original; `srd` cita o SRD 5.2.1 (CC-BY 4.0). */
export default [
  {
    id: 'criando-personagem',
    aliases: ['character-creation', 'creating-a-character'],
    cat: 'character',
    title: { pt: 'Criando um personagem', en: 'Creating a character' },
    simple: {
      pt: 'Montar um herói segue uma ordem simples: escolha a **classe** (o que você faz na aventura), depois a **origem** (antecedente, espécie e idiomas), gere os **valores de atributo**, pense na personalidade e por fim anote os números derivados: PV, CA, bônus de ataque e perícias. Não precisa decorar nada — cada passo alimenta o seguinte. Na dúvida, comece pelo conceito ("um anão curandeiro que odeia barcos") e escolha o que combina.',
      en: 'Building a hero follows a simple order: pick a **class** (what you do on adventures), then your **origin** (background, species and languages), generate your **ability scores**, think about personality, and finally fill in derived numbers: HP, AC, attack bonuses and skills. You don\'t need to memorize anything — each step feeds the next. When in doubt, start from a concept ("a dwarf healer who hates boats") and pick what fits.',
    },
    example: {
      pt: 'Mirela quer uma arqueira furtiva: escolhe Patrulheira (classe), Soldado (antecedente) e Elfa (espécie). Com o conjunto padrão coloca 15 em Destreza e o antecedente soma +2 → Destreza 17 (mod. +3). No nível 1 ela tem 10 + 2 (Con 14) = 12 PV.',
      en: 'Mirela wants a stealthy archer: she picks Ranger (class), Soldier (background) and Elf (species). Using the standard array she puts 15 in Dexterity and the background adds +2 → Dexterity 17 (+3 modifier). At level 1 she has 10 + 2 (Con 14) = 12 HP.',
    },
    sheet: {
      pt: 'Na tela inicial, "Novo personagem" abre o criador passo a passo; o app calcula PV, CA, perícias e magias sozinho a partir das escolhas.',
      en: 'On the home screen, "New character" opens the step-by-step creator; the app computes HP, AC, skills and spells from your choices.',
    },
    versions: {
      pt: 'Em 2014 os aumentos de atributo vinham da raça e a ordem sugerida começava pela raça; em 2024 eles vêm do antecedente, que também dá um talento de origem.',
      en: 'In 2014 ability increases came from race and the suggested order started with race; in 2024 they come from the background, which also grants an origin feat.',
    },
    keywords: 'criar personagem criação ficha nova passo a passo começar iniciante character creation new character build step by step how to start montar heroi',
    related: ['classe-e-subclasse', 'antecedente', 'especie', 'gerar-atributos', 'idiomas', 'atributos'],
  },
  {
    id: 'gerar-atributos',
    aliases: ['generating-ability-scores', 'point-buy', 'standard-array'],
    cat: 'character',
    title: { pt: 'Gerando os valores de atributo', en: 'Generating ability scores' },
    simple: {
      pt: 'Há três jeitos de conseguir os seis números: o **conjunto padrão** (15, 14, 13, 12, 10, 8), a **compra por pontos** (27 pontos; um 8 é grátis, um 15 custa 9) ou **rolar 4d6** seis vezes descartando o menor dado de cada. Você distribui os números entre os atributos como quiser. Depois, o antecedente soma +2 e +1 (ou +1 em três), sem passar de 20. O mestre costuma dizer qual método a mesa usa.',
      en: 'There are three ways to get your six numbers: the **standard array** (15, 14, 13, 12, 10, 8), **point buy** (27 points; an 8 is free, a 15 costs 9), or **rolling 4d6** six times and dropping the lowest die each time. You assign the numbers to abilities however you like. Then your background adds +2 and +1 (or +1 to three), never above 20. The GM usually says which method the table uses.',
    },
    example: {
      pt: 'Tordek rola 4d6: sai 6, 5, 3, 1 → descarta o 1 e fica com 14. Repete mais cinco vezes e obtém 14, 13, 12, 11, 10, 8. Põe 14 em Força, e o antecedente Soldado dá +2 → Força 16 (mod. +3).',
      en: 'Tordek rolls 4d6: 6, 5, 3, 1 → he drops the 1 and keeps 14. He repeats five more times and gets 14, 13, 12, 11, 10, 8. He puts 14 in Strength, and the Soldier background adds +2 → Strength 16 (+3 modifier).',
    },
    sheet: {
      pt: 'No criador, a etapa de atributos oferece conjunto padrão, compra por pontos e rolagem; o modificador aparece ao lado de cada valor.',
      en: 'In the creator, the ability step offers standard array, point buy and rolling; each score shows its modifier next to it.',
    },
    versions: {
      pt: 'Os três métodos são os mesmos em 2014, mas lá os bônus vinham da raça (ex.: anão +2 Con) em vez do antecedente.',
      en: 'The three methods are the same in 2014, but there the bonuses came from race (e.g., dwarf +2 Con) instead of background.',
    },
    srd: {
      text: 'Standard Array. Use the following six scores for your abilities: 15, 14, 13, 12, 10, 8.',
      ref: 'SRD 5.2.1 — Character Creation',
    },
    keywords: 'gerar atributos rolar 4d6 conjunto padrao compra por pontos 27 pontos point buy standard array roll stats rolling abilities valores 15 14 13 12 10 8',
    related: ['atributos', 'modificador-de-atributo', 'antecedente', 'criando-personagem', 'aumento-de-atributo'],
  },
  {
    id: 'especie',
    aliases: ['species', 'race'],
    cat: 'character',
    title: { pt: 'Espécie', en: 'Species' },
    simple: {
      pt: 'A espécie é o "povo" do seu personagem: humano, elfo, anão, orc, tiefling e outros. Ela define seu **tamanho**, seu **deslocamento** e traços especiais, como visão no escuro, resistências ou pequenas magias. Em 2024 a espécie não mexe nos atributos — por isso qualquer combinação de espécie e classe funciona bem.',
      en: 'Species is your character\'s "people": human, elf, dwarf, orc, tiefling and more. It sets your **size**, your **Speed** and special traits such as darkvision, resistances or minor spells. In 2024 species doesn\'t change ability scores — so any species works fine with any class.',
    },
    example: {
      pt: 'Brunna é anã: tem visão no escuro de 36 m, resistência a veneno e 9 m de deslocamento. Quando um dardo envenenado causa 8 de dano de veneno, ela sofre só 4.',
      en: 'Brunna is a dwarf: she has 120 ft darkvision, resistance to poison and 30 ft Speed. When a poisoned dart deals 8 poison damage, she takes only 4.',
    },
    sheet: {
      pt: 'A espécie é escolhida no criador; traços e escolhas da espécie (linhagem, legado etc.) aparecem no aviso de espécie no topo da ficha.',
      en: 'Species is chosen in the creator; its traits and choices (lineage, legacy, etc.) appear in the species banner at the top of the sheet.',
    },
    versions: {
      pt: 'Em 2014 chamava-se "raça", tinha sub-raças e dava aumentos de atributo (ex.: elfo +2 Des); em 2024 esses aumentos migraram para o antecedente.',
      en: 'In 2014 it was called "race", had subraces and gave ability increases (e.g., elf +2 Dex); in 2024 those increases moved to the background.',
    },
    keywords: 'especie raca povo race species humano elfo anao orc tiefling halfling gnomo draconato golias subraca linhagem lineage tamanho size',
    related: ['criando-personagem', 'antecedente', 'visao-no-escuro', 'espaco-e-tamanho', 'deslocamento', 'idiomas'],
  },
  {
    id: 'antecedente',
    aliases: ['background'],
    cat: 'character',
    title: { pt: 'Antecedente', en: 'Background' },
    simple: {
      pt: 'O antecedente conta o que seu personagem fazia antes de virar aventureiro: acólito, criminoso, sábio, soldado... Em 2024 ele dá bastante coisa: **aumentos de atributo** (+2/+1 ou +1/+1/+1 entre três atributos listados), um **talento de origem**, **duas perícias**, **uma ferramenta** e equipamento inicial. É uma ótima fonte de ganchos para a história.',
      en: 'Your background tells what your character did before adventuring: acolyte, criminal, sage, soldier... In 2024 it gives a lot: **ability increases** (+2/+1 or +1/+1/+1 among three listed abilities), an **origin feat**, **two skills**, **one tool** and starting gear. It\'s also a great source of story hooks.',
    },
    example: {
      pt: 'Kael escolhe Sábio: ganha +2 em Inteligência e +1 em Sabedoria, o talento Iniciado em Magia, proficiência em Arcanismo e História e em suprimentos de caligrafia. Com INT 15 + 2 = 17, seu mod. vira +3.',
      en: 'Kael picks Sage: he gets +2 Intelligence and +1 Wisdom, the Magic Initiate feat, proficiency in Arcana and History, and Calligrapher\'s Supplies. With INT 15 + 2 = 17, his modifier becomes +3.',
    },
    sheet: {
      pt: 'Escolhido no criador; as perícias do antecedente já vêm marcadas na aba Atributos, e o talento de origem aparece em Talentos.',
      en: 'Chosen in the creator; background skills come pre-marked in the Stats tab, and the origin feat shows under Feats.',
    },
    versions: {
      pt: 'Em 2014 o antecedente dava perícias, ferramentas/idiomas e uma "característica" narrativa, mas nenhum aumento de atributo nem talento.',
      en: 'In 2014 a background gave skills, tools/languages and a narrative "feature", but no ability increases or feat.',
    },
    keywords: 'antecedente origem passado background origin feat talento de origem acolito criminoso sabio soldado pericias ferramenta',
    related: ['criando-personagem', 'talentos', 'pericias', 'ferramentas', 'gerar-atributos', 'especie'],
  },
  {
    id: 'classe-e-subclasse',
    aliases: ['class-and-subclass', 'class', 'subclass'],
    cat: 'character',
    title: { pt: 'Classe e subclasse', en: 'Class and subclass' },
    simple: {
      pt: 'A **classe** é a profissão de aventureiro: guerreiro, mago, ladino, clérigo e mais. Ela decide seu dado de vida, proficiências, habilidades e se você conjura magias. A **subclasse** é uma especialização dentro da classe (ex.: Mago Evocador, Ladino Ladrão) e dá habilidades extras em certos níveis. Em 2024 todas as classes escolhem a subclasse no **nível 3**.',
      en: 'Your **class** is your adventuring profession: fighter, wizard, rogue, cleric and more. It sets your Hit Die, proficiencies, features and whether you cast spells. Your **subclass** is a specialization within the class (e.g., Evoker Wizard, Thief Rogue) and gives extra features at certain levels. In 2024 every class picks its subclass at **level 3**.',
    },
    example: {
      pt: 'Lia é Clériga nível 2. Ao chegar ao nível 3 escolhe o Domínio da Vida: a partir daí suas magias de cura restauram PV extras. Seus PV sobem d8 + Con como sempre.',
      en: 'Lia is a level 2 Cleric. Reaching level 3 she picks the Life Domain: from then on her healing spells restore extra HP. Her HP still grows by d8 + Con as usual.',
    },
    sheet: {
      pt: 'Quando chega o nível da subclasse, a ficha mostra um aviso "Escolher subclasse" no topo; o painel de Progressão lista o que cada nível traz.',
      en: 'When you reach the subclass level, the sheet shows a "Choose subclass" banner at the top; the Progression panel lists what each level brings.',
    },
    versions: {
      pt: 'Em 2014 o nível da subclasse variava: clérigo, bruxo e feiticeiro no 1; druida e mago no 2; os demais no 3.',
      en: 'In 2014 the subclass level varied: cleric, warlock and sorcerer at 1; druid and wizard at 2; the rest at 3.',
    },
    keywords: 'classe subclasse arquetipo dominio escola juramento circulo class subclass archetype guerreiro mago ladino clerigo fighter wizard rogue cleric nivel 3',
    related: ['criando-personagem', 'nivel-e-experiencia', 'multiclasse', 'dados-de-vida', 'ganhar-pv-ao-subir'],
  },
  {
    id: 'nivel-e-experiencia',
    aliases: ['level-and-experience', 'experience-points', 'xp', 'leveling-up'],
    cat: 'character',
    title: { pt: 'Nível e experiência (XP)', en: 'Level and experience (XP)' },
    simple: {
      pt: 'Personagens começam no nível 1 e vão até o 20. Vencendo desafios, eles ganham **pontos de experiência (XP)**; ao atingir o total da tabela, **sobem de nível**. Muitas mesas ignoram XP e sobem o grupo inteiro em marcos da história. O bônus de proficiência cresce com o nível total: +2 nos níveis 1–4, +3 no 5–8, +4 no 9–12, +5 no 13–16 e +6 no 17–20.',
      en: 'Characters start at level 1 and go up to 20. By overcoming challenges they earn **experience points (XP)**; once they hit the table total, they **gain a level**. Many tables skip XP and level the whole party at story milestones. Proficiency Bonus grows with total level: +2 at levels 1–4, +3 at 5–8, +4 at 9–12, +5 at 13–16 and +6 at 17–20.',
    },
    example: {
      pt: 'O grupo derrota um bando de orcs e cada um recebe 350 XP. Zé do Machado tinha 600 XP: agora tem 950, passou dos 900 → sobe para o nível 3.',
      en: 'The party defeats a band of orcs and each gets 350 XP. Zé do Machado had 600 XP: now he has 950, over 900 → he reaches level 3.',
    },
    sheet: {
      pt: 'O botão de nível no topo da ficha sobe de nível com escolhas guiadas (em campanha, o mestre libera antes); o painel Progressão mostra o próximo nível.',
      en: 'The level button at the top of the sheet levels you up with guided choices (in a campaign, the GM unlocks it first); the Progression panel shows the next level.',
    },
    srd: {
      text: 'When your XP total equals or exceeds a number in the Experience Points column, you reach the corresponding level.',
      ref: 'SRD 5.2.1 — Character Creation (Level Advancement)',
    },
    keywords: 'nivel xp experiencia subir de nivel level up experience points marco milestone tabela de xp bonus de proficiencia 300 900 2700',
    related: ['ganhar-pv-ao-subir', 'bonus-de-proficiencia', 'aumento-de-atributo', 'classe-e-subclasse', 'multiclasse'],
  },
  {
    id: 'ganhar-pv-ao-subir',
    aliases: ['hit-points-per-level', 'gaining-hit-points'],
    cat: 'character',
    title: { pt: 'Ganhar PV ao subir de nível', en: 'Gaining HP when leveling up' },
    simple: {
      pt: 'A cada nível você ganha um **dado de vida** a mais e aumenta seus PV máximos: **role o dado da classe + mod. de Constituição** (mínimo 1) ou pegue o **valor fixo** (a média arredondada para cima). No nível 1 é diferente: você pega o valor máximo do dado + Con. Se sua Constituição mudar depois, os PV máximos mudam retroativamente, 1 por nível para cada ponto de modificador.',
      en: 'Each level you gain one more **Hit Die** and raise your max HP: **roll your class die + Constitution modifier** (minimum 1) or take the **fixed value** (the average rounded up). Level 1 is different: you take the die\'s maximum + Con. If your Constitution modifier changes later, max HP changes retroactively, 1 per level per point of modifier.',
    },
    example: {
      pt: 'Tordek, Guerreiro (d10) com Con 16 (+3), sobe para o nível 4. Pode rolar d10: tira 4 → ganha 4 + 3 = 7 PV; ou pegar o fixo 6 + 3 = 9 PV. Ele escolhe o fixo: 38 → 47 PV.',
      en: 'Tordek, a Fighter (d10) with Con 16 (+3), reaches level 4. He can roll d10: a 4 → gains 4 + 3 = 7 HP; or take the fixed 6 + 3 = 9 HP. He takes the fixed value: 38 → 47 HP.',
    },
    sheet: {
      pt: 'Na subida de nível o app pergunta se você quer rolar ou usar o valor fixo e já soma aos PV máximos e aos Dados de Vida.',
      en: 'When leveling up, the app asks whether to roll or take the fixed value and adds it to max HP and Hit Dice.',
    },
    srd: {
      text: 'Roll that die, add your Constitution modifier to the roll, and add the total (minimum of 1) to your Hit Point maximum. Instead of rolling, you can use the fixed value shown in the Fixed Hit Points by Class table.',
      ref: 'SRD 5.2.1 — Character Creation (Gaining a Level)',
    },
    keywords: 'pv por nivel ganhar vida subir nivel rolar dado de vida valor fixo media hp per level hit points level up roll or average constituicao con',
    related: ['pontos-de-vida', 'dados-de-vida', 'nivel-e-experiencia', 'modificador-de-atributo', 'multiclasse'],
  },
  {
    id: 'aumento-de-atributo',
    aliases: ['ability-score-improvement', 'asi'],
    cat: 'character',
    title: { pt: 'Aumento no Valor de Atributo', en: 'Ability Score Improvement' },
    simple: {
      pt: 'Em certos níveis (em geral 4, 8, 12, 16 e 19) sua classe te dá um **talento**. A escolha mais comum é o talento **Aumento no Valor de Atributo**: +2 num atributo ou +1 em dois, nunca passando de 20. Você também pode trocar esse aumento por outro talento geral que te agrade. Subir um atributo par (ex.: 15 → 16) é o que aumenta o modificador.',
      en: 'At certain levels (usually 4, 8, 12, 16 and 19) your class gives you a **feat**. The most common pick is the **Ability Score Improvement** feat: +2 to one ability or +1 to two, never above 20. You can instead take any other general feat you like. Reaching an even score (e.g., 15 → 16) is what raises the modifier.',
    },
    example: {
      pt: 'Mirela, nível 4, tem Destreza 17 e Sabedoria 13. Escolhe +1 em cada: Destreza 18 (mod. +3 → +4) e Sabedoria 14 (+1 → +2). Seus ataques com arco agora somam +6 em vez de +5.',
      en: 'Mirela, level 4, has Dexterity 17 and Wisdom 13. She takes +1 to each: Dexterity 18 (+3 → +4) and Wisdom 14 (+1 → +2). Her bow attacks now add +6 instead of +5.',
    },
    sheet: {
      pt: 'Na subida de nível o modal oferece "aumento de atributo ou talento"; se ficar pendente, o painel Progressão avisa para resolver a escolha.',
      en: 'During level-up the modal offers "ability increase or feat"; if left pending, the Progression panel reminds you to resolve it.',
    },
    versions: {
      pt: 'Em 2014 o aumento era uma característica de classe, e talentos eram uma regra opcional que o substituía; em 2024 o aumento é ele próprio um talento geral.',
      en: 'In 2014 the increase was a class feature and feats were an optional rule replacing it; in 2024 the increase is itself a general feat.',
    },
    srd: {
      text: 'Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1. This feat can\'t increase an ability score above 20.',
      ref: 'SRD 5.2.1 — Feats (Ability Score Improvement)',
    },
    keywords: 'aumento de atributo asi +2 +1 ability score improvement increase nivel 4 8 12 16 19 subir atributo talento geral',
    related: ['talentos', 'atributos', 'modificador-de-atributo', 'nivel-e-experiencia', 'gerar-atributos'],
  },
  {
    id: 'talentos',
    aliases: ['feats', 'feat'],
    cat: 'character',
    title: { pt: 'Talentos', en: 'Feats' },
    simple: {
      pt: 'Talentos são habilidades especiais que qualquer classe pode pegar. Há quatro tipos: **de origem** (vêm do antecedente no nível 1, como Alerta ou Iniciado em Magia), **gerais** (a partir do nível 4, no lugar do aumento de atributo), **estilos de luta** e **dádivas épicas** (nível 19+). Alguns têm pré-requisitos, e a maioria só pode ser pego uma vez, a menos que diga "repetível".',
      en: 'Feats are special abilities any class can take. There are four kinds: **origin** (from your background at level 1, like Alert or Magic Initiate), **general** (from level 4, in place of an ability increase), **fighting styles** and **epic boons** (level 19+). Some have prerequisites, and most can be taken only once unless they say "Repeatable".',
    },
    example: {
      pt: 'Kael tem o talento Alerta: soma o bônus de proficiência (+2) à iniciativa. Com Des +2, ele rola d20 + 4; tira 13 → iniciativa 17, e ainda pode trocar essa iniciativa com um aliado disposto.',
      en: 'Kael has the Alert feat: he adds his Proficiency Bonus (+2) to Initiative. With Dex +2 he rolls d20 + 4; a 13 → Initiative 17, and he may swap it with a willing ally.',
    },
    sheet: {
      pt: 'Aba Atributos → seção Talentos; na subida de nível você escolhe talentos pelo modal.',
      en: 'Stats tab → Feats section; during level-up you choose feats in the modal.',
    },
    versions: {
      pt: 'Em 2014 talentos eram opcionais (só com permissão do mestre) e não havia talento de origem no nível 1, exceto para o humano variante.',
      en: 'In 2014 feats were optional (GM permission) and there was no origin feat at level 1, except for the variant human.',
    },
    srd: {
      text: 'Repeatable. A feat can be taken only once unless its description states otherwise in a "Repeatable" subsection.',
      ref: 'SRD 5.2.1 — Feats',
    },
    keywords: 'talento talentos feat feats origem origin geral general dadiva epica epic boon alerta iniciado em magia estilo de luta pre-requisito repetivel',
    related: ['aumento-de-atributo', 'antecedente', 'nivel-e-experiencia', 'iniciativa'],
  },
  {
    id: 'multiclasse',
    aliases: ['multiclassing', 'multiclass'],
    cat: 'character',
    title: { pt: 'Multiclasse', en: 'Multiclassing' },
    simple: {
      pt: 'Ao subir de nível você pode pegar o nível 1 de **outra classe** em vez de avançar na atual. Para isso precisa de **13 ou mais** no atributo principal da classe nova **e** das classes que já tem. XP e bônus de proficiência usam o **nível total**; os dados de vida se somam; você ganha só parte das proficiências iniciais da nova classe. Ataque Extra de duas classes não se acumula, e espaços de magia seguem uma tabela própria.',
      en: 'When you level up you can take level 1 in **another class** instead of advancing your current one. You need **13 or higher** in the new class\'s primary ability **and** in those of your current classes. XP and Proficiency Bonus use your **total level**; Hit Dice add up; you get only some of the new class\'s starting proficiencies. Extra Attack from two classes doesn\'t stack, and spell slots use their own table.',
    },
    example: {
      pt: 'Brunna, Bárbara nível 4 com Força 16 e Sabedoria 13, quer um nível de Druida. Os dois atributos são ≥ 13 → pode. Vira Bárbara 4 / Druida 1, nível total 5: bônus de proficiência +3 e 4d12 + 1d8 dados de vida.',
      en: 'Brunna, a level 4 Barbarian with Strength 16 and Wisdom 13, wants a Druid level. Both scores are ≥ 13 → allowed. She becomes Barbarian 4 / Druid 1, total level 5: Proficiency Bonus +3 and 4d12 + 1d8 Hit Dice.',
    },
    sheet: {
      pt: 'No modal de subida de nível dá para escolher outra classe (em campanha, se o mestre permitir multiclasse); a ficha mostra cada classe com seu nível.',
      en: 'In the level-up modal you can pick another class (in a campaign, if the GM allows multiclassing); the sheet lists each class with its level.',
    },
    srd: {
      text: 'To qualify for a new class, you must have a score of at least 13 in the primary ability of the new class and your current classes.',
      ref: 'SRD 5.2.1 — Character Creation (Multiclassing)',
    },
    keywords: 'multiclasse multiclassing multiclass duas classes dip mesclar classes pre-requisito 13 nivel total espacos de magia ataque extra',
    related: ['classe-e-subclasse', 'nivel-e-experiencia', 'dados-de-vida', 'espacos-de-magia', 'bonus-de-proficiencia'],
  },
  {
    id: 'idiomas',
    aliases: ['languages'],
    cat: 'character',
    title: { pt: 'Idiomas', en: 'Languages' },
    simple: {
      pt: 'Todo personagem fala, lê e escreve o **Comum** e mais **dois idiomas** à escolha da tabela de idiomas padrão (Anão, Élfico, Gigante, Gnômico, Goblin, Halfling, Orc, Dracônico, Língua de Sinais Comum...). Classes e talentos podem dar outros, e idiomas raros (como Abissal ou Infernal) em geral pedem justificativa. Se ninguém do grupo entende o que o NPC fala, prepare-se para mímica ou magia.',
      en: 'Every character speaks, reads and writes **Common** plus **two languages** of choice from the standard languages table (Dwarvish, Elvish, Giant, Gnomish, Goblin, Halfling, Orc, Draconic, Common Sign Language...). Classes and feats may add more, and rare languages (like Abyssal or Infernal) usually need a story reason. If nobody in the party understands the NPC, get ready for charades or magic.',
    },
    example: {
      pt: 'Lia começou com 3 idiomas: Comum + 2 escolhidos (Élfico e Anão). Numa taverna, dois anões cochicham em Anão achando que ninguém entende — Lia escuta tudo e descobre a senha da mina.',
      en: 'Lia started with 3 languages: Common + 2 of her choice (Elvish and Dwarvish). In a tavern, two dwarves whisper in Dwarvish thinking nobody understands — Lia hears everything and learns the mine\'s password.',
    },
    sheet: {
      pt: 'Aba Atributos → "Idiomas e Outras Proficiências": toque nos chips para abrir o seletor; o limite vem da espécie e da origem.',
      en: 'Stats tab → "Languages & Other Proficiencies": tap the chips to open the picker; the limit comes from species and origin.',
    },
    versions: {
      pt: 'Em 2014 a quantidade de idiomas vinha da raça (ex.: elfo sabia Comum e Élfico) e do antecedente; em 2024 é sempre Comum + 2.',
      en: 'In 2014 languages came from race (e.g., elves knew Common and Elvish) and background; in 2024 it\'s always Common + 2.',
    },
    srd: {
      text: 'Your character knows at least three languages: Common plus two languages you roll or choose from the Standard Languages table.',
      ref: 'SRD 5.2.1 — Character Creation',
    },
    keywords: 'idiomas linguas lingua falar ler escrever comum elfico anao draconico languages language common elvish dwarvish draconic sinais',
    related: ['criando-personagem', 'especie', 'antecedente', 'acao-influenciar'],
  },
];

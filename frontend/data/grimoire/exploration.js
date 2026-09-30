/* Grimório — Exploração e ambiente. Texto original; `srd` = citação literal do SRD 5.2.1 (CC-BY 4.0). */
export default [
  {
    id: 'luz-e-visao',
    aliases: ['light-and-vision', 'light', 'darkness'],
    cat: 'exploration',
    title: { pt: 'Luz e escuridão', en: 'Light and darkness' },
    simple: {
      pt: 'Todo lugar tem um de três níveis de luz. **Luz plena** (dia, tochas, lanternas): todo mundo enxerga normal. **Penumbra** (crepúsculo, beirada da luz da tocha, lua cheia): a área fica **levemente obscurecida**. **Escuridão** (noite comum, masmorra apagada, escuridão mágica): a área fica **densamente obscurecida** e quem não tem visão especial fica, na prática, cego ali. Quem carrega a luz costuma decidir quem vê o quê.',
      en: 'Every place has one of three light levels. **Bright Light** (daylight, torches, lanterns): everyone sees normally. **Dim Light** (twilight, the edge of torchlight, a full moon): the area is **Lightly Obscured**. **Darkness** (most nights, an unlit dungeon, magical darkness): the area is **Heavily Obscured** and anyone without special senses is effectively blind there. Whoever carries the light usually decides who sees what.',
    },
    example: {
      pt: 'Tordek entra na cripta com uma tocha: luz plena num raio de 6 m e penumbra por mais 6 m. O esqueleto a 15 m está na escuridão — Tordek não o vê, mas o esqueleto (visão no escuro 18 m) vê a tocha e Tordek perfeitamente.',
      en: 'Tordek enters the crypt with a torch: Bright Light in a 20-foot radius and Dim Light for another 20 feet. The skeleton 50 feet away is in Darkness — Tordek can\'t see it, but the skeleton (Darkvision 60 ft) sees the torch and Tordek just fine.',
    },
    srd: {
      text: 'Dim Light, also called shadows, creates a Lightly Obscured area. An area of Dim Light is usually a boundary between Bright Light and surrounding Darkness.',
      ref: 'SRD 5.2.1 — Playing the Game (Vision and Light)',
    },
    keywords: 'luz escuridão escuro penumbra luz plena luz fraca iluminação tocha lanterna noite sombra light bright light dim light darkness torch shadows illumination',
    related: ['obscurecido', 'visao-no-escuro', 'sentidos-especiais', 'cego', 'acao-esconder'],
  },
  {
    id: 'obscurecido',
    aliases: ['obscured-areas', 'heavily-obscured', 'lightly-obscured'],
    cat: 'exploration',
    title: { pt: 'Áreas obscurecidas', en: 'Obscured areas' },
    simple: {
      pt: 'Uma área **levemente obscurecida** (penumbra, neblina fina, mato moderado) dá **desvantagem em Sabedoria (Percepção)** para ver coisas ali. Uma área **densamente obscurecida** (escuridão, neblina densa, folhagem fechada) é opaca: ao tentar ver algo ali, você está **Cego**. Isso vale nos dois sentidos — ninguém te vê lá dentro, o que ajuda a se esconder.',
      en: 'A **Lightly Obscured** area (dim light, patchy fog, moderate foliage) gives **Disadvantage on Wisdom (Perception)** checks to see things there. A **Heavily Obscured** area (darkness, heavy fog, dense foliage) is opaque: when trying to see something there, you have the **Blinded** condition. It works both ways — no one sees you in there either, which helps with hiding.',
    },
    example: {
      pt: 'Lia procura o ladrão na floresta ao entardecer (penumbra = levemente obscurecido). Percepção com desvantagem: rola 15 e 6, fica com 6 + 4 = 10 contra a Furtividade 13 dele → não o encontra.',
      en: 'Lia looks for the thief in the forest at dusk (Dim Light = Lightly Obscured). Perception with Disadvantage: she rolls 15 and 6, keeps 6 + 4 = 10 against his Stealth of 13 → she doesn\'t find him.',
    },
    srd: {
      text: 'You have the Blinded condition while trying to see something in a Heavily Obscured space.',
      ref: 'SRD 5.2.1 — Rules Glossary (Heavily Obscured)',
    },
    keywords: 'obscurecido obscuro levemente densamente neblina névoa fumaça folhagem mato não consigo ver lightly heavily obscured fog smoke foliage',
    related: ['luz-e-visao', 'cego', 'acao-esconder', 'vantagem-desvantagem', 'alvos-invisiveis'],
  },
  {
    id: 'visao-no-escuro',
    aliases: ['darkvision'],
    cat: 'exploration',
    title: { pt: 'Visão no escuro', en: 'Darkvision' },
    simple: {
      pt: 'Dentro do alcance da sua visão no escuro, **penumbra conta como luz plena** e **escuridão conta como penumbra**. Ou seja: no breu você enxerga, mas como se fosse penumbra — ainda com **desvantagem em Percepção** baseada em visão. E tudo em tons de cinza, sem cores. Fora do alcance, a escuridão é escuridão.',
      en: 'Within your Darkvision range, **Dim Light counts as Bright Light** and **Darkness counts as Dim Light**. So in pitch black you can see, but as if in dim light — still with **Disadvantage on sight-based Perception**. And only in shades of gray, no colors. Beyond the range, darkness is just darkness.',
    },
    example: {
      pt: 'Kael (anão, visão no escuro 36 m) guia o grupo num túnel sem luz. Ele vê a porta a 20 m como em penumbra; ao procurar armadilhas nela, rola Percepção com desvantagem: 17 e 9 → 9 + 3 = 12. O humano Zé, sem tocha, não vê nada.',
      en: 'Kael (dwarf, Darkvision 120 ft) leads the party through an unlit tunnel. He sees the door 60 ft ahead as if in Dim Light; searching it for traps, he rolls Perception with Disadvantage: 17 and 9 → 9 + 3 = 12. Zé, a human without a torch, sees nothing.',
    },
    srd: {
      text: 'If you have Darkvision, you can see in Dim Light within a specified range as if it were Bright Light and in Darkness within that range as if it were Dim Light. You discern colors in that Darkness only as shades of gray.',
      ref: 'SRD 5.2.1 — Rules Glossary (Darkvision)',
    },
    keywords: 'visão no escuro infravisão ver no escuro enxergar breu anão elfo darkvision see in the dark gray tons de cinza',
    related: ['luz-e-visao', 'obscurecido', 'sentidos-especiais', 'especie'],
  },
  {
    id: 'sentidos-especiais',
    aliases: ['special-senses', 'blindsight', 'tremorsense', 'truesight'],
    cat: 'exploration',
    title: { pt: 'Sentidos especiais', en: 'Special senses' },
    simple: {
      pt: 'Além da visão no escuro, há três sentidos especiais. **Percepção às cegas** (blindsight): dentro do alcance você percebe tudo que não está atrás de cobertura total, mesmo cego, no escuro ou contra invisíveis. **Sentido sísmico** (tremorsense): localiza quem está tocando o mesmo chão, parede ou líquido que você — não funciona contra quem voa e não é visão. **Visão verdadeira** (truesight): vê no escuro mágico, vê invisíveis, enxerga através de ilusões visuais e formas transformadas, e vê o Plano Etéreo.',
      en: 'Besides Darkvision there are three special senses. **Blindsight**: within range you perceive anything not behind Total Cover, even while blinded, in darkness or against invisible creatures. **Tremorsense**: pinpoints creatures touching the same ground, wall or liquid as you — it doesn\'t work on flyers and isn\'t sight. **Truesight**: sees in magical darkness, sees invisible things, sees through visual illusions and shapechanges, and sees into the Ethereal Plane.',
    },
    example: {
      pt: 'Um mago invisível tenta passar por um verme escavador com sentido sísmico 18 m. Andando pelo chão a 9 m, ele é localizado; se tivesse lançado Voo, passaria sem ser notado.',
      en: 'An invisible mage tries to sneak past a burrowing worm with Tremorsense 60 ft. Walking on the ground 30 ft away, he\'s pinpointed; had he cast Fly, he would pass unnoticed.',
    },
    sheet: {
      pt: 'Aba Jogar: se você tem Percepção às Cegas por um estilo de luta, ela aparece em "Sentidos".',
      en: 'Play tab: if a Fighting Style grants you Blindsight, it shows under "Senses".',
    },
    srd: {
      text: 'Tremorsense can’t detect creatures or objects in the air, and it doesn’t count as a form of sight.',
      ref: 'SRD 5.2.1 — Rules Glossary (Tremorsense)',
    },
    keywords: 'sentidos especiais percepção às cegas visão cega sentido sísmico sentido de tremor visão verdadeira blindsight tremorsense truesight senses ver invisível',
    related: ['visao-no-escuro', 'invisivel', 'cego', 'alvos-invisiveis', 'luz-e-visao'],
  },
  {
    id: 'queda',
    aliases: ['falling', 'fall-damage'],
    cat: 'exploration',
    title: { pt: 'Queda', en: 'Falling' },
    simple: {
      pt: 'Caiu de uma altura? Leve **1d6 de dano de concussão a cada 3 m** de queda, no máximo **20d6**. Se sofrer algum dano, você termina a queda **Prono** (caído). Caindo na água, pode usar sua **reação** para um teste CD 15 de Força (Atletismo) ou Destreza (Acrobacia): se passar, o dano cai pela metade. Criaturas voando caem se ficarem Incapacitadas, Pronas ou com deslocamento de voo 0 (a não ser que planem).',
      en: 'Fell from a height? Take **1d6 Bludgeoning damage per 10 feet** fallen, up to **20d6**. If you take any damage, you land **Prone**. Falling into water, you can use your **Reaction** for a DC 15 Strength (Athletics) or Dexterity (Acrobatics) check: on a success, the damage is halved. Flying creatures fall if they become Incapacitated or Prone or their Fly Speed drops to 0 (unless they can hover).',
    },
    example: {
      pt: 'A ponte cede e Zé do Machado despenca 12 m: 4d6 = 3 + 5 + 2 + 4 = 14 de dano e ele fica Prono no fundo do barranco. Se fosse num rio, com Atletismo d20 + 5 = 17 ≥ 15, tomaria só 7.',
      en: 'The bridge gives way and Zé do Machado drops 40 feet: 4d6 = 3 + 5 + 2 + 4 = 14 damage and he\'s Prone at the bottom. Into a river, with Athletics d20 + 5 = 17 ≥ 15, he\'d take only 7.',
    },
    sheet: {
      pt: 'Aba Jogar: digite o dano e toque em Dano; marque Prono em Condições e efeitos.',
      en: 'Play tab: type the damage and tap Damage; mark Prone under Conditions & effects.',
    },
    versions: {
      pt: 'O dano (1d6 a cada 3 m, máximo 20d6) e o Prono são iguais em 2014. A reação para cair na água e reduzir o dano pela metade é novidade de 2024.',
      en: 'The damage (1d6 per 10 ft, max 20d6) and landing Prone are the same in 2014. The Reaction to halve damage when falling into water is new in 2024.',
    },
    srd: {
      text: 'A creature that falls takes 1d6 Bludgeoning damage at the end of the fall for every 10 feet it fell, to a maximum of 20d6. When the creature lands, it has the Prone condition unless it avoids taking any damage from the fall.',
      ref: 'SRD 5.2.1 — Rules Glossary (Falling)',
    },
    keywords: 'queda cair caindo despencar altura dano de queda precipício abismo voar cair falling fall damage 1d6 10 feet drop',
    related: ['prono', 'tipos-de-dano', 'reacao', 'saltar', 'escalar-nadar-rastejar'],
  },
  {
    id: 'sufocamento',
    aliases: ['suffocation', 'holding-breath', 'drowning'],
    cat: 'exploration',
    title: { pt: 'Sufocamento e prender a respiração', en: 'Suffocation and holding your breath' },
    simple: {
      pt: 'Você aguenta prender a respiração por **1 + modificador de Constituição minutos** (mínimo 30 segundos). Quando o fôlego acaba, ou se estiver engasgado, você ganha **1 nível de Exaustão ao fim de cada um dos seus turnos**. Assim que voltar a respirar, remove todos os níveis de Exaustão que ganhou sufocando.',
      en: 'You can hold your breath for **1 + Constitution modifier minutes** (minimum 30 seconds). When you run out of breath, or if you\'re choking, you gain **1 Exhaustion level at the end of each of your turns**. As soon as you can breathe again, you remove all Exhaustion levels gained from suffocating.',
    },
    example: {
      pt: 'Brunna (Con +2) mergulha para soltar uma alavanca: aguenta 3 minutos. A alavanca emperra e ela passa do limite: ao fim do próximo turno fica com Exaustão 1, depois 2 (−4 nos testes de d20). Ela sobe, respira e as duas somem.',
      en: 'Brunna (Con +2) dives to pull a lever: she can hold her breath 3 minutes. The lever jams and she goes past the limit: at the end of her next turn she has Exhaustion 1, then 2 (−4 to d20 Tests). She surfaces, breathes, and both levels vanish.',
    },
    versions: {
      pt: 'Em 2014, sem fôlego você sobrevivia um número de rodadas igual ao modificador de Constituição (mínimo 1) e depois caía a 0 PV, morrendo. Em 2024 o perigo vem da Exaustão acumulada a cada turno.',
      en: 'In 2014, out of breath you survived a number of rounds equal to your Constitution modifier (minimum 1), then dropped to 0 HP and started dying. In 2024 the danger comes from Exhaustion stacking each turn.',
    },
    srd: {
      text: 'When a creature runs out of breath or is choking, it gains 1 Exhaustion level at the end of each of its turns. When a creature can breathe again, it removes all levels of Exhaustion it gained from suffocating.',
      ref: 'SRD 5.2.1 — Rules Glossary (Suffocation)',
    },
    keywords: 'sufocar sufocamento afogar afogamento prender respiração fôlego debaixo d\'água engasgar suffocation drowning hold breath underwater choking',
    related: ['exaustao', 'combate-subaquatico', 'escalar-nadar-rastejar', 'modificador-de-atributo'],
  },
  {
    id: 'viagem',
    aliases: ['travel-pace', 'travel'],
    cat: 'exploration',
    title: { pt: 'Viagem e ritmo de marcha', en: 'Travel pace' },
    simple: {
      pt: 'Em viagens longas o grupo escolhe um ritmo. **Rápido**: 6 km/h (45 km por dia), mas com desvantagem em Percepção, Sobrevivência e Furtividade. **Normal**: 4,5 km/h (36 km/dia), com desvantagem em Furtividade. **Lento**: 3 km/h (27 km/dia), com **vantagem** em Percepção e Sobrevivência. Montarias podem dobrar a distância por 1 hora, depois precisam descansar. O terreno e estradas limitam ou melhoram o ritmo.',
      en: 'On long trips the party picks a pace. **Fast**: 4 miles/hour (30 miles/day), but with Disadvantage on Perception, Survival and Stealth. **Normal**: 3 miles/hour (24 miles/day), with Disadvantage on Stealth. **Slow**: 2 miles/hour (18 miles/day), with **Advantage** on Perception and Survival. Mounts can double the distance for 1 hour, then need a rest. Terrain and roads limit or improve the pace.',
    },
    example: {
      pt: 'A cidade fica a 54 km. Em ritmo normal são 36 km no 1º dia e 18 km no 2º. Com pressa, em ritmo rápido fariam 45 km no 1º dia — mas o batedor Kael rola Percepção com desvantagem e não nota a emboscada.',
      en: 'The city is 36 miles away. At a Normal pace that\'s 24 miles on day 1 and 12 on day 2. In a hurry, at a Fast pace they\'d do 30 miles on day 1 — but the scout Kael rolls Perception with Disadvantage and misses the ambush.',
    },
    versions: {
      pt: 'As distâncias são as mesmas de 2014. Em 2014, ritmo rápido dava −5 na Percepção passiva e o lento permitia usar Furtividade; em 2024 os efeitos viraram vantagem/desvantagem.',
      en: 'Distances are the same as in 2014. In 2014 a Fast pace gave −5 to passive Perception and a Slow pace let you use Stealth; in 2024 the effects became Advantage/Disadvantage.',
    },
    keywords: 'viagem viajar ritmo marcha velocidade de viagem km por dia milhas rápido normal lento jornada estrada travel pace fast normal slow miles per day journey overland',
    related: ['marcha-forcada', 'comida-e-agua', 'valor-passivo', 'deslocamento', 'combate-montado'],
  },
  {
    id: 'marcha-forcada',
    aliases: ['forced-march', 'extended-travel'],
    cat: 'exploration',
    title: { pt: 'Marcha forçada', en: 'Forced march' },
    simple: {
      pt: 'Um dia normal de viagem tem **8 horas**. Dá para forçar mais, mas cansa: ao fim de **cada hora extra**, cada personagem faz uma **salvaguarda de Constituição com CD 10 + 1 por hora além das 8**. Falhou, ganha **1 nível de Exaustão**. A CD sobe a cada hora, então a coisa degringola rápido.',
      en: 'A normal travel day is **8 hours**. You can push further, but it\'s tiring: at the end of **each extra hour**, each character makes a **Constitution saving throw, DC 10 + 1 per hour past 8**. On a failure, they gain **1 Exhaustion level**. The DC climbs every hour, so it goes downhill fast.',
    },
    example: {
      pt: 'Fugindo da horda, o grupo marcha 10 horas. Na 9ª hora (CD 11), Lia rola d20 + 1 = 14 → passa. Na 10ª hora (CD 12), rola d20 + 1 = 8 → ganha Exaustão 1: −2 em testes de d20 e −1,5 m de deslocamento.',
      en: 'Fleeing the horde, the party marches 10 hours. At hour 9 (DC 11), Lia rolls d20 + 1 = 14 → pass. At hour 10 (DC 12), she rolls d20 + 1 = 8 → Exhaustion 1: −2 on d20 Tests and −5 ft Speed.',
    },
    sheet: {
      pt: 'Aba Jogar → Condições e efeitos → Exausto; anote o nível num efeito personalizado.',
      en: 'Play tab → Conditions & effects → Exhausted; note the level in a custom effect.',
    },
    keywords: 'marcha forçada forcada viajar mais de 8 horas cansaço cansado exaustão viagem estendida forced march extended travel exhaustion 8 hours',
    related: ['viagem', 'exaustao', 'salvaguarda', 'descanso-longo'],
  },
  {
    id: 'saltar',
    aliases: ['jumping', 'long-jump', 'high-jump'],
    cat: 'exploration',
    title: { pt: 'Saltar', en: 'Jumping' },
    simple: {
      pt: '**Salto em distância**: com 3 m de corrida antes, você pula até **0,3 m por ponto do seu valor de Força** (Força 15 = 4,5 m). **Salto em altura**: com corrida, sobe **(3 + mod. de Força) × 0,3 m**. Parado, qualquer salto cai pela metade. Cada metro saltado gasta um metro de deslocamento. Cair em terreno difícil pede Acrobacia CD 10 para não ficar Prono.',
      en: '**Long Jump**: with a 10-foot running start, you leap up to **your Strength score in feet** (Strength 15 = 15 ft). **High Jump**: with a running start, you rise **3 + Strength modifier feet**. Standing still, either jump is halved. Each foot jumped costs a foot of movement. Landing in Difficult Terrain requires a DC 10 Acrobatics check or you fall Prone.',
    },
    example: {
      pt: 'Zé do Machado (Força 16) corre 3 m e salta um fosso de 4,5 m: alcance máximo 16 × 0,3 = 4,8 m → passa. Ele gastou 3 + 4,5 = 7,5 m dos seus 9 m de deslocamento. Parado, pularia só 2,4 m.',
      en: 'Zé do Machado (Strength 16) runs 10 feet and leaps a 15-foot pit: max distance 16 ft → he clears it. He spent 10 + 15 = 25 of his 30 feet of Speed. From a standstill he\'d only jump 8 feet.',
    },
    srd: {
      text: 'When you make a Long Jump, you leap horizontally a number of feet up to your Strength score if you move at least 10 feet immediately before the jump.',
      ref: 'SRD 5.2.1 — Rules Glossary (Long Jump)',
    },
    keywords: 'saltar salto pular pulo distância altura correr fosso abismo jump jumping long jump high jump leap running start strength score',
    related: ['deslocamento', 'terreno-dificil', 'escalar-nadar-rastejar', 'queda', 'atributos'],
  },
  {
    id: 'escalar-nadar-rastejar',
    aliases: ['climbing-swimming-crawling', 'climbing', 'swimming', 'crawling'],
    cat: 'exploration',
    title: { pt: 'Escalar, nadar e rastejar', en: 'Climbing, swimming and crawling' },
    simple: {
      pt: 'Escalando, nadando ou rastejando, **cada metro custa um metro extra** (dois extras em terreno difícil) — na prática, você anda metade. Quem tem **deslocamento de escalada ou natação** ignora esse custo naquele tipo de movimento. Superfícies escorregadias ou água revolta podem pedir **Atletismo CD 15**. Rastejar é o jeito de se mover estando Prono.',
      en: 'While climbing, swimming or crawling, **each foot costs 1 extra foot** (2 extra in Difficult Terrain) — in practice you move half. A creature with a **Climb or Swim Speed** ignores that cost for that kind of movement. Slippery surfaces or rough water may call for a **DC 15 Athletics** check. Crawling is how you move while Prone.',
    },
    example: {
      pt: 'Lia (deslocamento 9 m) escala um muro de 6 m: cada metro custa 2, então sobe 4,5 m neste turno e termina no seguinte. O muro está molhado, e o mestre pede Atletismo: d20 + 2 = 15 ≥ 15 → ela não escorrega.',
      en: 'Lia (Speed 30 ft) climbs a 20-foot wall: each foot costs 2, so she climbs 15 feet this turn and finishes next turn. The wall is wet, so the GM asks for Athletics: d20 + 2 = 15 ≥ 15 → she doesn\'t slip.',
    },
    srd: {
      text: 'While you’re climbing, each foot of movement costs 1 extra foot (2 extra feet in Difficult Terrain). You ignore this extra cost if you have a Climb Speed and use it to climb.',
      ref: 'SRD 5.2.1 — Rules Glossary (Climbing)',
    },
    keywords: 'escalar escalada subir muro nadar natação nado rastejar engatinhar arrastar deslocamento de escalada natação climb climbing swim swimming crawl crawling climb speed swim speed athletics',
    related: ['deslocamento', 'terreno-dificil', 'prono', 'combate-subaquatico', 'saltar'],
  },
  {
    id: 'comida-e-agua',
    aliases: ['food-and-water', 'dehydration', 'malnutrition'],
    cat: 'exploration',
    title: { pt: 'Comida e água', en: 'Food and water' },
    simple: {
      pt: 'Uma criatura Média precisa de cerca de **0,5 kg de comida** e **4 litros de água** por dia. Beber **menos da metade** da água: ganha **1 nível de Exaustão** no fim do dia. Comer menos da metade: salvaguarda de **Constituição CD 10** ou 1 nível de Exaustão. Ficar **5 dias sem comer nada** dá Exaustão automática no 5º dia e mais um nível a cada dia seguinte. Essa Exaustão só sai depois de um dia inteiro bem alimentado (ou hidratado).',
      en: 'A Medium creature needs about **1 pound of food** and **1 gallon of water** a day. Drinking **less than half** the water: gain **1 Exhaustion level** at the day\'s end. Eating less than half: **DC 10 Constitution** save or 1 Exhaustion level. Going **5 days with no food** gives automatic Exhaustion on day 5 and another level each following day. That Exhaustion only goes away after a full day of proper food (or water).',
    },
    example: {
      pt: 'Perdidos no deserto, Tordek e Kael dividem o último cantil: cada um bebe 1,5 litro, menos da metade dos 4 necessários. No fim do dia, os dois ganham Exaustão 1, e ela não sai com descanso até beberem 4 litros num dia.',
      en: 'Lost in the desert, Tordek and Kael share the last waterskin: each drinks about 1/3 gallon, less than half the gallon they need. At the day\'s end both gain Exhaustion 1, and it won\'t go away with rest until they drink a full gallon in a day.',
    },
    versions: {
      pt: 'Em 2014 era diferente: dava para ficar 3 + mod. de Constituição dias sem comer antes da Exaustão, e com meia água havia uma salvaguarda de Constituição CD 15 (com desvantagem se já tivesse sede no dia anterior).',
      en: 'In 2014 it was different: you could go 3 + Constitution modifier days without food before Exhaustion, and on half water you made a DC 15 Constitution save (at Disadvantage if you\'d been short the day before).',
    },
    keywords: 'comida água comer beber fome sede ração rações cantil desidratação desnutrição food water hunger thirst rations dehydration malnutrition starving',
    related: ['exaustao', 'viagem', 'descanso-longo', 'salvaguarda'],
  },
  {
    id: 'frio-e-calor-extremos',
    aliases: ['extreme-cold-heat', 'extreme-cold', 'extreme-heat', 'frigid-water'],
    cat: 'exploration',
    title: { pt: 'Frio e calor extremos', en: 'Extreme cold and heat' },
    simple: {
      pt: '**Frio extremo** (−18 °C ou menos): ao fim de cada hora exposto, salvaguarda de **Constituição CD 10** ou 1 nível de Exaustão. **Calor extremo** (38 °C ou mais) sem água potável: a CD começa em **5** e sobe 1 a cada hora; quem usa armadura média ou pesada rola com **desvantagem**. **Água gelada**: você aguenta minutos iguais ao seu valor de Constituição; depois, Con CD 10 a cada minuto. Resistência ou imunidade ao dano correspondente (frio ou fogo) passa automaticamente.',
      en: '**Extreme cold** (0 °F or lower): at the end of each hour exposed, a **DC 10 Constitution** save or 1 Exhaustion level. **Extreme heat** (100 °F or higher) without drinkable water: the DC starts at **5** and rises by 1 each hour; creatures in Medium or Heavy armor roll with **Disadvantage**. **Frigid water**: you last a number of minutes equal to your Constitution score; after that, DC 10 Con each minute. Resistance or Immunity to the matching damage (Cold or Fire) succeeds automatically.',
    },
    example: {
      pt: 'Cruzando o deserto ao meio-dia sem água, Tordek (cota de malha, Con +3) rola na 1ª hora com desvantagem: 4 e 12 → 4 + 3 = 7 ≥ 5, passa. Na 3ª hora (CD 7): 2 e 9 → 2 + 3 = 5 < 7 → Exaustão 1. Hora de tirar a armadura.',
      en: 'Crossing the desert at noon with no water, Tordek (chain mail, Con +3) rolls at hour 1 with Disadvantage: 4 and 12 → 4 + 3 = 7 ≥ 5, pass. At hour 3 (DC 7): 2 and 9 → 2 + 3 = 5 < 7 → Exhaustion 1. Time to take off the armor.',
    },
    srd: {
      text: 'When the temperature is 0 degrees Fahrenheit or lower, a creature exposed to the extreme cold must succeed on a DC 10 Constitution saving throw at the end of each hour or gain 1 Exhaustion level.',
      ref: 'SRD 5.2.1 — Gameplay Toolbox (Environmental Effects)',
    },
    keywords: 'frio calor extremo neve deserto temperatura clima gelo água gelada congelar hipotermia insolação cold heat extreme weather frigid water snow desert',
    related: ['exaustao', 'resistencia-e-vulnerabilidade', 'armaduras-e-escudos', 'comida-e-agua', 'salvaguarda'],
  },
];

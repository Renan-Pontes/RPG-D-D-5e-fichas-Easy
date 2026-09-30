/* Grimório — Vida, morte e descanso. Texto original; `srd` = citação literal do SRD 5.2.1 (CC-BY 4.0). */
export default [
  {
    id: 'pontos-de-vida',
    aliases: ['hit-points', 'hp'],
    cat: 'health',
    title: { pt: 'Pontos de vida (PV)', en: 'Hit Points (HP)' },
    simple: {
      pt: 'Os PV medem quanto castigo você aguenta antes de cair. Todo dano sai dos PV atuais, e a cura devolve até o seu **máximo** — nunca passa dele nem fica abaixo de 0. Perder PV não te deixa mais fraco: você luta igual com 30 ou com 1. Com metade dos PV ou menos você está **Sangrando** (Bloodied), o que por si só não faz nada, mas algumas habilidades reagem a isso.',
      en: 'HP measure how much punishment you can take before you drop. All damage comes off your current HP, and healing brings you back up to your **maximum** — never above it and never below 0. Losing HP doesn\'t weaken you: you fight the same at 30 or at 1. At half your HP or fewer you are **Bloodied**, which does nothing on its own, but some abilities trigger on it.',
    },
    example: {
      pt: 'Brunna tem 24 PV máximos e está com 24. Um orc acerta 9 de dano → ela fica com 15. Como 15 é mais que 12 (metade), ela ainda não está Sangrando; no próximo golpe de 4, fica com 11 e passa a estar.',
      en: 'Brunna has 24 max HP and is at 24. An orc hits for 9 → she\'s at 15. Since 15 is more than 12 (half), she isn\'t Bloodied yet; after another 4 damage she\'s at 11 and now is.',
    },
    sheet: {
      pt: 'Aba Jogar → rastreador de Pontos de Vida: digite o valor e toque em Dano ou Curar. A barra mostra a proporção atual/máximo.',
      en: 'Play tab → Hit Points tracker: type the amount and tap Damage or Heal. The bar shows current/max.',
    },
    srd: {
      text: 'Hit Points represent durability and the will to live. Creatures with more Hit Points are more difficult to kill.',
      ref: 'SRD 5.2.1 — Playing the Game (Damage and Healing)',
    },
    keywords: 'pontos de vida pv hp hit points vida máximo maximo dano sangrando bloodied ferido machucado',
    related: ['pv-temporarios', 'cura', 'zero-pv', 'dados-de-vida', 'ganhar-pv-ao-subir', 'jogada-de-dano'],
  },
  {
    id: 'pv-temporarios',
    aliases: ['temporary-hit-points', 'temp-hp'],
    cat: 'health',
    title: { pt: 'PV temporários', en: 'Temporary Hit Points' },
    simple: {
      pt: 'PV temporários são um **escudo extra** por cima da sua vida: o dano gasta eles primeiro e só o que sobrar atinge seus PV de verdade. Eles **não se somam**: se ganhar mais, você escolhe ficar com o valor antigo ou com o novo. Cura não recupera PV temporários, e ganhá-los com 0 PV não te acorda. Duram até acabarem ou até você terminar um descanso longo (ou o que o efeito disser).',
      en: 'Temporary HP are an **extra shield** on top of your health: damage eats them first and only the leftover reaches your real HP. They **don\'t stack**: if you gain more, you pick either the old amount or the new one. Healing doesn\'t restore them, and gaining them at 0 HP doesn\'t wake you up. They last until used up or until you finish a Long Rest (or whatever the effect says).',
    },
    example: {
      pt: 'Kael tem 18 PV e 5 PV temporários. Leva 7 de dano: os 5 temporários somem e ele perde só 2 → fica com 16. Depois recebe 8 PV temporários de outra fonte e mais 4 de uma terceira: fica com 8, não 12.',
      en: 'Kael has 18 HP and 5 temporary HP. He takes 7 damage: the 5 temp HP vanish and he loses only 2 → he\'s at 16. Later he gains 8 temp HP from one source and 4 from another: he keeps 8, not 12.',
    },
    sheet: {
      pt: 'Aba Jogar → campo "PV Temp" abaixo dos botões Dano/Curar. O botão Dano já consome os temporários primeiro; o descanso longo os zera.',
      en: 'Play tab → "Temp HP" field under the Damage/Heal buttons. The Damage button already spends temp HP first; a long rest clears them.',
    },
    srd: {
      text: 'If you have Temporary Hit Points and take damage, those points are lost first, and any leftover damage carries over to your Hit Points.',
      ref: 'SRD 5.2.1 — Playing the Game (Temporary Hit Points)',
    },
    keywords: 'pv temporarios temporários temp hp thp temporary hit points escudo vida extra não soma nao acumula',
    related: ['pontos-de-vida', 'cura', 'zero-pv', 'descanso-longo'],
  },
  {
    id: 'zero-pv',
    aliases: ['dropping-to-0-hit-points', 'zero-hp', 'unconscious-at-0'],
    cat: 'health',
    title: { pt: 'Caindo a 0 PV', en: 'Dropping to 0 HP' },
    simple: {
      pt: 'Quando seus PV chegam a 0 você **não morre na hora** (a menos que seja morte instantânea): você fica **Inconsciente** e começa a fazer **testes contra a morte** no início de cada turno. Monstros comuns, por outro lado, normalmente morrem ao chegar a 0. Qualquer cura, mesmo 1 PV, te acorda e zera os testes. O dano que "sobra" abaixo de 0 é ignorado, exceto para checar morte instantânea.',
      en: 'When your HP hit 0 you **don\'t die right away** (unless it\'s instant death): you fall **Unconscious** and start making **Death Saving Throws** at the start of each of your turns. Ordinary monsters, on the other hand, usually just die at 0. Any healing, even 1 HP, wakes you up and resets your saves. Damage "left over" below 0 is ignored, except to check for instant death.',
    },
    example: {
      pt: 'Lia (20 PV máx.) está com 6 PV e leva 11 de dano. Sobram 5, que não chegam aos 20 do máximo → ela cai Inconsciente a 0 PV. No turno seguinte, o clérigo a cura em 7 → ela acorda com 7 PV (Prona, pois caiu).',
      en: 'Lia (20 max HP) is at 6 HP and takes 11 damage. 5 is left over, which is less than her 20 max → she drops Unconscious at 0 HP. Next turn the cleric heals her for 7 → she wakes up at 7 HP (Prone, since she fell).',
    },
    sheet: {
      pt: 'Aba Jogar: quando os PV atuais ficam em 0, aparece o bloco "Testes contra a Morte" dentro do rastreador de PV. Marque também Inconsciente no painel Condições e efeitos.',
      en: 'Play tab: when current HP is 0, the "Death Saves" block appears inside the HP tracker. Also mark Unconscious in the Conditions & effects panel.',
    },
    srd: {
      text: 'If you reach 0 Hit Points and don’t die instantly, you have the Unconscious condition (see “Rules Glossary”) until you regain any Hit Points, and you now face making Death Saving Throws (see below).',
      ref: 'SRD 5.2.1 — Playing the Game (Falling Unconscious)',
    },
    keywords: 'zero pv 0 pv 0 hp caído caido desmaiado morrendo nocauteado dropping to 0 hit points down downed dying inconsciente unconscious',
    related: ['testes-contra-a-morte', 'morte-instantanea', 'inconsciente', 'nocautear', 'cura', 'pontos-de-vida'],
  },
  {
    id: 'testes-contra-a-morte',
    aliases: ['death-saving-throws', 'death-saves', 'stabilize', 'stabilizing'],
    cat: 'health',
    title: { pt: 'Testes contra a morte', en: 'Death Saving Throws' },
    simple: {
      pt: 'Com 0 PV, no **início de cada turno** você rola um d20 puro (sem modificador): **10 ou mais é sucesso**, menos é falha. **Três sucessos** e você fica **estável** (para de rolar, mas segue inconsciente); **três falhas** e você morre — não precisam ser seguidos. **Tirar 1** conta duas falhas; **tirar 20** te devolve 1 PV e você acorda. Levar dano a 0 PV é uma falha automática (duas se for crítico). Um aliado pode te estabilizar com a ação Ajudar e um teste de Sabedoria (Medicina) CD 10.',
      en: 'At 0 HP, at the **start of each turn** you roll a plain d20 (no modifier): **10 or higher is a success**, lower is a failure. **Three successes** and you become **Stable** (you stop rolling but stay unconscious); **three failures** and you die — they don\'t need to be in a row. **Rolling a 1** counts as two failures; **rolling a 20** gives you back 1 HP and you wake up. Taking damage at 0 HP is an automatic failure (two if it\'s a crit). An ally can stabilize you with the Help action and a DC 10 Wisdom (Medicine) check.',
    },
    example: {
      pt: 'Tordek está a 0 PV. Turno 1: rola 13 → 1 sucesso. Turno 2: rola 4 → 1 falha. Um goblin o acerta com uma flechada → 2 falhas. Turno 3: rola 20 → volta com 1 PV e os contadores zeram.',
      en: 'Tordek is at 0 HP. Turn 1: rolls 13 → 1 success. Turn 2: rolls 4 → 1 failure. A goblin hits him with an arrow → 2 failures. Turn 3: rolls 20 → he\'s back with 1 HP and the counters reset.',
    },
    sheet: {
      pt: 'Aba Jogar → com 0 PV aparece "Testes contra a Morte": toque nos círculos de Sucessos/Falhas e use "Rolar teste contra morte". O descanso longo zera os contadores.',
      en: 'Play tab → at 0 HP "Death Saves" appears: tap the Successes/Failures pips and use "Roll death save". A long rest clears the counters.',
    },
    versions: {
      pt: 'Em 2014 a mecânica é a mesma; a diferença é que estabilizar era uma ação comum com teste de Medicina CD 10 (ou um kit de curandeiro, sem teste). Em 2024 isso é feito pela ação Ajudar (o kit de curandeiro continua permitindo sem teste, via ação Usar).',
      en: 'In 2014 the mechanic is the same; stabilizing was just an action with a DC 10 Medicine check (or a healer\'s kit, no check). In 2024 it\'s done through the Help action (a healer\'s kit still lets you skip the check, via the Utilize action).',
    },
    srd: {
      text: 'Roll 1d20. If the roll is 10 or higher, you succeed. Otherwise, you fail. A success or failure has no effect by itself. On your third success, you become Stable (see “Stabilizing a Character” below). On your third failure, you die.',
      ref: 'SRD 5.2.1 — Playing the Game (Death Saving Throws)',
    },
    keywords: 'testes contra a morte teste de morte salvaguarda contra morte death saving throw death save estabilizar estável estavel stable stabilize medicina 10 três sucessos tres falhas morrer',
    related: ['zero-pv', 'morte-instantanea', 'inconsciente', 'acao-ajudar', 'salvaguarda', 'cura'],
  },
  {
    id: 'morte-instantanea',
    aliases: ['instant-death', 'massive-damage'],
    cat: 'health',
    title: { pt: 'Morte instantânea (dano massivo)', en: 'Instant Death (Massive Damage)' },
    simple: {
      pt: 'Se um golpe te leva a 0 PV e o **dano que sobra é igual ou maior que seu PV máximo**, você morre na hora, sem testes contra a morte. O mesmo vale se você já está a 0 PV e leva, de uma vez, dano igual ou maior que seu máximo. Também morre quem tem o **PV máximo reduzido a 0** por algum efeito drenante. Monstros comuns simplesmente morrem ao chegar a 0, a critério do mestre.',
      en: 'If a hit takes you to 0 HP and the **leftover damage equals or exceeds your HP maximum**, you die on the spot, no death saves. The same goes if you\'re already at 0 HP and take damage equal to or above your maximum in one go. You also die if some draining effect **reduces your HP maximum to 0**. Ordinary monsters just die at 0, at the GM\'s discretion.',
    },
    example: {
      pt: 'Mirela, maga de nível 1, tem 8 PV máx. e está com 3. Um ogro acerta 13: 3 levam ela a 0 e sobram 10. Como 10 ≥ 8, ela morre na hora. Se tivesse levado 10, sobrariam 7 → só cairia inconsciente.',
      en: 'Mirela, a level 1 wizard, has 8 max HP and is at 3. An ogre hits for 13: 3 takes her to 0 and 10 is left. Since 10 ≥ 8, she dies instantly. Had she taken 10, 7 would be left → she\'d just fall unconscious.',
    },
    srd: {
      text: 'Massive Damage. When damage reduces a character to 0 Hit Points and damage remains, the character dies if the remainder equals or exceeds their Hit Point maximum.',
      ref: 'SRD 5.2.1 — Playing the Game (Instant Death)',
    },
    keywords: 'morte instantânea instantanea dano massivo morrer na hora instant death massive damage one shot hit point maximum 0',
    related: ['zero-pv', 'testes-contra-a-morte', 'pontos-de-vida', 'acerto-critico'],
  },
  {
    id: 'nocautear',
    aliases: ['knocking-out-a-creature', 'knock-out', 'nonlethal-damage'],
    cat: 'health',
    title: { pt: 'Nocautear (derrubar sem matar)', en: 'Knocking a Creature Out' },
    simple: {
      pt: 'Quando um **ataque corpo a corpo** seu levaria uma criatura a 0 PV, você pode escolher deixá-la com **1 PV e Inconsciente** em vez de matá-la. Ela fica apagada e começa um descanso curto; acorda ao fim dele, se receber qualquer cura ou se alguém gastar uma ação de primeiros socorros com sucesso (Sabedoria/Medicina CD 10). A escolha é feita na hora do golpe final — ataques à distância e magias não servem.',
      en: 'When one of your **melee attacks** would drop a creature to 0 HP, you can choose to leave it at **1 HP and Unconscious** instead of killing it. It stays out cold and starts a Short Rest; it wakes at the end of that rest, if it gets any healing, or if someone takes an action to give first aid (DC 10 Wisdom (Medicine)). You choose at the moment of the final blow — ranged attacks and spells don\'t qualify.',
    },
    example: {
      pt: 'O bandido tem 4 PV. Zé do Machado acerta 9 de dano com o machado e diz "quero ele vivo" → o bandido fica com 1 PV, Inconsciente. Uma hora depois ele acorda amarrado para o interrogatório.',
      en: 'The bandit has 4 HP. Zé do Machado hits for 9 with his axe and says "I want him alive" → the bandit is left at 1 HP, Unconscious. An hour later he wakes up tied up for questioning.',
    },
    versions: {
      pt: 'Em 2014 a criatura nocauteada ficava inconsciente e estável a 0 PV; em 2024 ela fica com 1 PV, começa um descanso curto e acorda ao terminá-lo.',
      en: 'In 2014 the knocked-out creature was unconscious and stable at 0 HP; in 2024 it\'s left at 1 HP, starts a Short Rest and wakes when it ends.',
    },
    srd: {
      text: 'When you would reduce a creature to 0 Hit Points with a melee attack, you can instead reduce the creature to 1 Hit Point and give it the Unconscious condition.',
      ref: 'SRD 5.2.1 — Playing the Game (Knocking Out a Creature)',
    },
    keywords: 'nocautear nocaute desacordar derrubar sem matar não letal nao letal knock out knockout nonlethal subdue capturar vivo',
    related: ['zero-pv', 'inconsciente', 'acao-atacar', 'descanso-curto'],
  },
  {
    id: 'cura',
    aliases: ['healing', 'heal'],
    cat: 'health',
    title: { pt: 'Cura', en: 'Healing' },
    simple: {
      pt: 'Magias, poções, habilidades e descansos devolvem PV. Você soma a cura aos PV atuais, mas **nunca passa do máximo** — o excesso se perde. Qualquer cura em alguém a 0 PV o **acorda** e zera os testes contra a morte. PV temporários não são cura e não acordam ninguém.',
      en: 'Spells, potions, features and rests give back HP. You add the healing to your current HP, but **never above your maximum** — the excess is lost. Any healing on someone at 0 HP **wakes them up** and resets their death saves. Temporary HP aren\'t healing and don\'t wake anyone.',
    },
    example: {
      pt: 'Thalion (20 PV máx.) está com 14 e bebe uma Poção de Cura: 2d4 + 2 = 8. Ele só recupera 6 e fica com 20 — os 2 restantes se perdem.',
      en: 'Thalion (20 max HP) is at 14 and drinks a Potion of Healing: 2d4 + 2 = 8. He only regains 6 and ends at 20 — the other 2 are lost.',
    },
    sheet: {
      pt: 'Aba Jogar → digite o valor no rastreador de PV e toque em Curar; ele para no máximo automaticamente.',
      en: 'Play tab → type the amount in the HP tracker and tap Heal; it stops at your maximum automatically.',
    },
    srd: {
      text: 'When you receive healing, add the restored Hit Points to your current Hit Points. Your Hit Points can’t exceed your Hit Point maximum, so any Hit Points regained in excess of the maximum are lost.',
      ref: 'SRD 5.2.1 — Playing the Game (Healing)',
    },
    keywords: 'cura curar recuperar pv heal healing cure wounds curar ferimentos poção pocao potion máximo maximo',
    related: ['pontos-de-vida', 'pocoes-de-cura', 'zero-pv', 'dados-de-vida', 'descanso-longo', 'pv-temporarios'],
  },
  {
    id: 'descanso-curto',
    aliases: ['short-rest'],
    cat: 'health',
    title: { pt: 'Descanso curto', en: 'Short Rest' },
    simple: {
      pt: 'Uma pausa de **1 hora** sem nada mais cansativo que comer, conversar, ler ou vigiar. Você precisa ter pelo menos 1 PV para começar. Ao terminar, pode **gastar Dados de Vida** para recuperar PV e recarregar habilidades "por descanso curto" (como os espaços de magia do bruxo). Rolar iniciativa, conjurar magia que não seja truque ou levar dano **interrompe** o descanso, e aí ele não conta.',
      en: 'A **1-hour** break with nothing more strenuous than eating, talking, reading or keeping watch. You need at least 1 HP to start one. When it ends, you can **spend Hit Dice** to regain HP and recharge "short rest" features (like a warlock\'s spell slots). Rolling Initiative, casting a spell other than a cantrip, or taking damage **interrupts** it, and then it gives nothing.',
    },
    example: {
      pt: 'Depois da emboscada, o grupo para 1 hora. Kael (guerreiro, d10, Con +2) gasta 2 Dados de Vida: 7 + 2 = 9 e 3 + 2 = 5 → recupera 14 PV e ainda recarrega seu Retomar o Fôlego.',
      en: 'After the ambush, the party stops for 1 hour. Kael (fighter, d10, Con +2) spends 2 Hit Dice: 7 + 2 = 9 and 3 + 2 = 5 → he regains 14 HP and also recharges his Second Wind.',
    },
    sheet: {
      pt: 'Aba Jogar → Descanso → ☕ Curto recarrega os recursos de descanso curto (ex.: espaços de pacto do bruxo). Os Dados de Vida você rola no rolador e aplica com Curar.',
      en: 'Play tab → Rest → ☕ Short recharges short-rest resources (e.g. warlock pact slots). Roll your Hit Dice in the dice roller and apply them with Heal.',
    },
    versions: {
      pt: 'Em 2014 o descanso curto já era de 1 hora, mas sem a lista explícita de interrupções nem a exigência de ter 1 PV.',
      en: 'In 2014 a short rest was also 1 hour, but without the explicit list of interruptions or the 1 HP requirement.',
    },
    srd: {
      text: 'A Short Rest is a 1-hour period of downtime, during which a creature does nothing more strenuous than reading, talking, eating, or standing watch. To start a Short Rest, you must have at least 1 Hit Point.',
      ref: 'SRD 5.2.1 — Rules Glossary',
    },
    keywords: 'descanso curto descansar 1 hora pausa short rest dados de vida hit dice recarregar recursos',
    related: ['dados-de-vida', 'descanso-longo', 'pontos-de-vida', 'cura', 'espacos-de-magia'],
  },
  {
    id: 'descanso-longo',
    aliases: ['long-rest'],
    cat: 'health',
    title: { pt: 'Descanso longo', en: 'Long Rest' },
    simple: {
      pt: 'É a "noite de sono": pelo menos **8 horas**, dormindo 6 e no máximo 2 de atividade leve (vigiar, conversar, comer). Ao fim você recupera **todos os PV**, **todos os Dados de Vida** gastos, seus espaços de magia e habilidades "por descanso longo", e **reduz 1 nível de Exaustão**. Precisa ter 1 PV para começar e só pode fazer um a cada 24 horas (espera 16 h depois do anterior). Iniciativa, magia que não seja truque, dano ou 1 hora de esforço físico interrompem; se já tinha descansado 1 hora, conta como descanso curto, e você pode retomar somando 1 hora extra.',
      en: 'It\'s the "night\'s sleep": at least **8 hours**, sleeping 6 and at most 2 of light activity (watch, talking, eating). At the end you regain **all HP**, **all spent Hit Dice**, your spell slots and "long rest" features, and **lose 1 Exhaustion level**. You need 1 HP to start and can only have one every 24 hours (wait 16 h after the last one). Initiative, a non-cantrip spell, damage or 1 hour of physical exertion interrupt it; if you\'d already rested 1 hour, you get a Short Rest, and you can resume by adding 1 extra hour.',
    },
    example: {
      pt: 'O grupo acampa. Na 3ª hora, lobos atacam (rolam iniciativa). Depois da luta eles retomam o descanso: precisam de 9 horas no total em vez de 8. Ao fim, Brunna, que estava com 7/31 PV e Exaustão 1, acorda com 31 PV e sem Exaustão.',
      en: 'The party camps. In hour 3, wolves attack (Initiative is rolled). After the fight they resume resting: they need 9 hours total instead of 8. At the end, Brunna, who was at 7/31 HP with Exhaustion 1, wakes at 31 HP with no Exhaustion.',
    },
    sheet: {
      pt: 'Aba Jogar → Descanso → 🛌 Longo: enche os PV, zera PV temporários, espaços usados, testes contra a morte e Dados de Vida gastos (fichas 2014 recuperam só metade), e remove Inconsciente.',
      en: 'Play tab → Rest → 🛌 Long: refills HP, clears temp HP, used slots, death saves and spent Hit Dice (2014 sheets recover only half), and removes Unconscious.',
    },
    versions: {
      pt: 'Em 2014 o descanso longo devolve só **metade** dos Dados de Vida (mínimo 1), e a interrupção era por 1 hora de caminhada, luta, conjuração ou atividade similar. Em 2024 você recupera todos.',
      en: 'In 2014 a long rest gives back only **half** your Hit Dice (minimum 1), and it was interrupted by 1 hour of walking, fighting, casting or similar activity. In 2024 you regain all of them.',
    },
    srd: {
      text: 'Regain All HP. You regain all lost Hit Points and all spent Hit Point Dice. If your Hit Point maximum was reduced, it returns to normal.',
      ref: 'SRD 5.2.1 — Rules Glossary (Long Rest)',
    },
    keywords: 'descanso longo dormir acampar 8 horas noite long rest sleep camp recuperar tudo espaços de magia exaustão exaustao',
    related: ['descanso-curto', 'dados-de-vida', 'exaustao', 'espacos-de-magia', 'pv-temporarios', 'pontos-de-vida'],
  },
  {
    id: 'dados-de-vida',
    aliases: ['hit-dice', 'hit-point-dice'],
    cat: 'health',
    title: { pt: 'Dados de Vida', en: 'Hit Dice' },
    simple: {
      pt: 'Você tem **um Dado de Vida por nível**, do tipo da sua classe (d6 mago, d8 clérigo, d10 guerreiro, d12 bárbaro...). No fim de um **descanso curto**, gaste quantos quiser: role cada um, **some o modificador de Constituição** e recupere esse tanto de PV (no mínimo 1 por dado). Dá para decidir dado a dado. Os dados gastos voltam no descanso longo.',
      en: 'You have **one Hit Die per level**, of your class\'s type (d6 wizard, d8 cleric, d10 fighter, d12 barbarian...). At the end of a **Short Rest**, spend as many as you like: roll each one, **add your Constitution modifier** and regain that many HP (at least 1 per die). You can decide one die at a time. Spent dice come back on a Long Rest.',
    },
    example: {
      pt: 'Lia, ladina de nível 4 (4d8, Con +1), está com 12/31 PV. No descanso curto gasta um dado: 5 + 1 = 6 → 18 PV. Gasta outro: 2 + 1 = 3 → 21 PV. Guarda os outros 2 dados para depois.',
      en: 'Lia, a level 4 rogue (4d8, Con +1), is at 12/31 HP. On a short rest she spends one die: 5 + 1 = 6 → 18 HP. Another: 2 + 1 = 3 → 21 HP. She keeps her other 2 dice for later.',
    },
    sheet: {
      pt: 'Aba Jogar → caixa "Dados de Vida" mostra quantos restam e o tipo (ex.: 3 /4d8). Role no rolador de dados e aplique o total com Curar.',
      en: 'Play tab → the "Hit Dice" box shows how many remain and their type (e.g. 3 /4d8). Roll in the dice roller and apply the total with Heal.',
    },
    versions: {
      pt: 'Em 2014 o descanso longo recupera só metade do total de Dados de Vida (mínimo 1); em 2024 recupera todos.',
      en: 'In 2014 a long rest recovers only half your total Hit Dice (minimum 1); in 2024 it recovers all of them.',
    },
    srd: {
      text: 'For each Hit Point Die you spend in this way, roll the die and add your Constitution modifier to it. You regain Hit Points equal to the total (minimum of 1 Hit Point).',
      ref: 'SRD 5.2.1 — Rules Glossary (Short Rest)',
    },
    keywords: 'dados de vida dado de vida dv hit dice hit die hd hit point dice gastar dado constituição constituicao recuperar pv',
    related: ['descanso-curto', 'descanso-longo', 'ganhar-pv-ao-subir', 'pontos-de-vida', 'modificador-de-atributo'],
  },
];

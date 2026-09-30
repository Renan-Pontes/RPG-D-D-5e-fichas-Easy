/* Grimório — Equipamento. Texto original; `srd` cita o SRD 5.2.1 (CC-BY 4.0). */
export default [
  {
    id: 'armaduras-e-escudos',
    aliases: ['armor-and-shields', 'armor', 'shield'],
    cat: 'equipment',
    title: { pt: 'Armaduras e escudos', en: 'Armor and shields' },
    simple: {
      pt: 'Armaduras são **leves** (CA base + Des inteira), **médias** (+ Des até +2) ou **pesadas** (CA fixa, sem Des). Algumas pesadas pedem Força mínima — sem ela, seu deslocamento cai 3 m — e várias dão desvantagem em Furtividade. O **escudo** soma +2 na CA. Vestir sem treinamento é ruim: desvantagem em testes de d20 com Força ou Destreza e **você não conjura magias**. Vestir e tirar leva tempo: 1 min (leve), 5 min/1 min (média), 10 min/5 min (pesada).',
      en: 'Armor is **light** (base AC + full Dex), **medium** (+ Dex up to +2) or **heavy** (fixed AC, no Dex). Some heavy armor needs a minimum Strength — without it your Speed drops by 10 ft — and many impose Disadvantage on Stealth. A **Shield** adds +2 AC. Wearing armor without training is bad: Disadvantage on D20 Tests using Strength or Dexterity and **you can\'t cast spells**. Donning and doffing takes time: 1 min (light), 5 min/1 min (medium), 10 min/5 min (heavy).',
    },
    example: {
      pt: 'Tordek (For 15) veste cota de malha (CA 16) e escudo (+2) → CA 18. Kael, mago sem treinamento, tenta usar a mesma cota: pode, mas perde a conjuração e rola com desvantagem os testes de For/Des.',
      en: 'Tordek (Str 15) wears Chain Mail (AC 16) and a Shield (+2) → AC 18. Kael, a wizard without training, tries the same armor: he can, but loses spellcasting and has Disadvantage on Str/Dex tests.',
    },
    sheet: {
      pt: 'Aba Inventário: equipe a armadura e o escudo; a caixa CA da aba Jogar recalcula sozinha.',
      en: 'Inventory tab: equip armor and shield; the AC box on the Play tab recalculates automatically.',
    },
    versions: {
      pt: 'Em 2014 as regras são quase iguais; o escudo levava uma ação para colocar ou tirar (em 2024, a ação Usar Objeto).',
      en: 'In 2014 the rules are nearly identical; a shield took an action to don or doff (in 2024, the Utilize action).',
    },
    srd: {
      text: 'If you wear Light, Medium, or Heavy armor and lack training with it, you have Disadvantage on any D20 Test that involves Strength or Dexterity, and you can\'t cast spells.',
      ref: 'SRD 5.2.1 — Equipment (Armor)',
    },
    keywords: 'armadura escudo ca leve media pesada vestir tirar treinamento proficiencia armor shield ac light medium heavy don doff training stealth furtividade forca minima cota de malha placas',
    related: ['classe-de-armadura', 'conjurar-de-armadura', 'carga', 'deslocamento', 'acao-usar-objeto'],
  },
  {
    id: 'propriedades-de-armas',
    aliases: ['weapon-properties'],
    cat: 'equipment',
    title: { pt: 'Propriedades de armas', en: 'Weapon properties' },
    simple: {
      pt: 'Cada arma tem etiquetas que mudam seu uso. **Acuidade**: escolha For ou Des. **Leve**: permite um ataque extra com outra arma leve como ação bônus. **Pesada**: desvantagem se tiver For (corpo a corpo) ou Des (distância) abaixo de 13. **Duas mãos**, **Versátil** (dano maior com as duas mãos), **Alcance** (+1,5 m de alcance), **Arremesso**, **Munição**, **Recarga** (só um disparo por ação) e **Distância** (normal/longa; além da normal, desvantagem).',
      en: 'Each weapon has tags that change how it works. **Finesse**: pick Str or Dex. **Light**: allows an extra attack with another light weapon as a Bonus Action. **Heavy**: Disadvantage if your Str (melee) or Dex (ranged) is below 13. **Two-Handed**, **Versatile** (bigger damage with two hands), **Reach** (+5 ft reach), **Thrown**, **Ammunition**, **Loading** (only one shot per action) and **Range** (normal/long; beyond normal, Disadvantage).',
    },
    example: {
      pt: 'Lia (For 10, Des 16) usa um florete com acuidade: ataque d20 + 3 (Des) + 2 (prof.) e dano 1d8 + 3. Com um arco longo (45/180 m) ela mira um alvo a 60 m: está além do alcance normal → desvantagem.',
      en: 'Lia (Str 10, Dex 16) uses a finesse Rapier: attack d20 + 3 (Dex) + 2 (prof.) and 1d8 + 3 damage. With a Longbow (150/600 ft) she targets someone 200 ft away: beyond normal range → Disadvantage.',
    },
    sheet: {
      pt: 'Aba Jogar → Ataques: o app já escolhe o melhor atributo para armas com acuidade e mostra o dado de dano.',
      en: 'Play tab → Attacks: the app picks the best ability for finesse weapons and shows the damage die.',
    },
    srd: {
      text: 'When making an attack with a Finesse weapon, use your choice of your Strength or Dexterity modifier for the attack and damage rolls. You must use the same modifier for both rolls.',
      ref: 'SRD 5.2.1 — Equipment (Weapon Properties)',
    },
    keywords: 'propriedades armas acuidade leve pesada duas maos versatil alcance arremesso municao recarga distancia weapon properties finesse light heavy two-handed versatile reach thrown ammunition loading range',
    related: ['maestria-em-armas', 'luta-com-duas-armas', 'ataque-a-distancia', 'municao', 'jogada-de-ataque', 'armas-improvisadas'],
  },
  {
    id: 'maestria-em-armas',
    aliases: ['weapon-mastery', 'mastery'],
    cat: 'equipment',
    title: { pt: 'Maestria em armas', en: 'Weapon mastery' },
    simple: {
      pt: 'Toda arma tem uma **propriedade de maestria**, mas só personagens com a característica Maestria em Armas (Bárbaro, Guerreiro, Paladino, Patrulheiro, Ladino) podem usá-la, e apenas com os tipos de arma escolhidos. São oito: **Trespassar** (acerta um segundo alvo próximo), **Roçar** (errou? cause o mod. de atributo mesmo assim), **Ágil** (ataque extra da arma leve sem gastar ação bônus), **Empurrar** (3 m), **Minar** (desvantagem no próximo ataque do alvo), **Lentidão** (−3 m de deslocamento), **Derrubar** (salvaguarda de Con ou cai prono) e **Irritar** (vantagem no seu próximo ataque).',
      en: 'Every weapon has a **mastery property**, but only characters with the Weapon Mastery feature (Barbarian, Fighter, Paladin, Ranger, Rogue) can use it, and only with the weapon kinds they chose. There are eight: **Cleave** (hit a second nearby target), **Graze** (missed? deal your ability modifier anyway), **Nick** (the Light extra attack without spending a Bonus Action), **Push** (10 ft), **Sap** (Disadvantage on the target\'s next attack), **Slow** (−10 ft Speed), **Topple** (Con save or fall Prone) and **Vex** (Advantage on your next attack).',
    },
    example: {
      pt: 'Brunna (For +4) ataca o ogro com uma espada grande, cuja maestria é Roçar, e erra: 13 contra CA 14. Mesmo assim causa 4 de dano cortante (seu mod. de Força).',
      en: 'Brunna (Str +4) attacks the ogre with a Greatsword, whose mastery is Graze, and misses: 13 vs AC 14. She still deals 4 slashing damage (her Strength modifier).',
    },
    sheet: {
      pt: 'Aba Jogar → Ataques: cada arma com maestria ativa mostra "Maestria: nome — efeito". As armas dominadas são escolhidas nas opções de classe.',
      en: 'Play tab → Attacks: each weapon with active mastery shows "Mastery: name — effect". Mastered weapons are chosen in the class options.',
    },
    versions: {
      pt: 'Maestria em armas não existe em 2014; é novidade das regras de 2024.',
      en: 'Weapon mastery doesn\'t exist in 2014; it is new in the 2024 rules.',
    },
    srd: {
      text: 'If your attack roll with this weapon misses a creature, you can deal damage to that creature equal to the ability modifier you used to make the attack roll.',
      ref: 'SRD 5.2.1 — Equipment (Mastery Properties: Graze)',
    },
    keywords: 'maestria em armas weapon mastery trespassar rocar agil empurrar minar lentidao derrubar irritar cleave graze nick push sap slow topple vex 2024',
    related: ['propriedades-de-armas', 'acao-atacar', 'luta-com-duas-armas', 'prono', 'vantagem-desvantagem'],
  },
  {
    id: 'armas-improvisadas',
    aliases: ['improvised-weapons'],
    cat: 'equipment',
    title: { pt: 'Armas improvisadas', en: 'Improvised weapons' },
    simple: {
      pt: 'Qualquer objeto vira arma numa emergência: cadeira, garrafa, perna de mesa. A arma improvisada causa **1d4** de dano (tipo decidido pelo mestre), **não soma o bônus de proficiência** no ataque e, se arremessada, tem alcance 6/18 m. Usar uma arma de forma "errada" (golpear com o arco, arremessar uma espada) também conta como improvisado. Se o objeto parecer uma arma de verdade, o mestre pode tratá-lo como ela.',
      en: 'Any object becomes a weapon in a pinch: a chair, a bottle, a table leg. An improvised weapon deals **1d4** damage (type chosen by the GM), **doesn\'t add your Proficiency Bonus** to the attack and, if thrown, has a 20/60 ft range. Using a weapon the "wrong" way (clubbing with a bow, throwing a sword) also counts as improvised. If the object resembles a real weapon, the GM may treat it as that weapon.',
    },
    example: {
      pt: 'Desarmado na taverna, Zé do Machado arremessa uma caneca (For +3): d20 + 3 = 15 contra CA 13 → acerta, 1d4 + 3 = 5 de dano de concussão.',
      en: 'Unarmed in the tavern, Zé do Machado throws a tankard (Str +3): d20 + 3 = 15 vs AC 13 → hit, 1d4 + 3 = 5 bludgeoning damage.',
    },
    srd: {
      text: 'Proficiency. Don\'t add your Proficiency Bonus to attack rolls with an improvised weapon.',
      ref: 'SRD 5.2.1 — Rules Glossary (Improvised Weapons)',
    },
    keywords: 'arma improvisada objeto cadeira garrafa caneca perna de mesa improvised weapon 1d4 arremessar throw sem proficiencia',
    related: ['propriedades-de-armas', 'jogada-de-ataque', 'ataque-desarmado', 'bonus-de-proficiencia'],
  },
  {
    id: 'municao',
    aliases: ['ammunition'],
    cat: 'equipment',
    title: { pt: 'Munição', en: 'Ammunition' },
    simple: {
      pt: 'Arcos, bestas e fundas precisam de munição: **cada ataque gasta uma** flecha, virote ou pedra. Sacar a munição faz parte do ataque (para carregar uma arma de uma mão, você precisa da outra mão livre). Depois da luta, gastando **1 minuto** de busca você recupera **metade** do que disparou (arredondado para baixo); o resto se perdeu.',
      en: 'Bows, crossbows and slings need ammunition: **each attack uses one** arrow, bolt or bullet. Drawing ammunition is part of the attack (to load a one-handed weapon you need a free hand). After the fight, spending **1 minute** searching recovers **half** of what you fired (round down); the rest is lost.',
    },
    example: {
      pt: 'Mirela começa com 20 flechas e dispara 7 no combate. Depois gasta 1 minuto procurando: recupera 3 (metade de 7, para baixo) e fica com 16.',
      en: 'Mirela starts with 20 arrows and fires 7 in combat. Afterward she spends 1 minute searching: she recovers 3 (half of 7, rounded down) and has 16.',
    },
    sheet: {
      pt: 'Aba Inventário: ajuste a quantidade de flechas/virotes no item de munição.',
      en: 'Inventory tab: adjust the arrow/bolt quantity on the ammunition item.',
    },
    srd: {
      text: 'After a fight, you can spend 1 minute to recover half the ammunition (round down) you used in the fight; the rest is lost.',
      ref: 'SRD 5.2.1 — Equipment (Weapon Properties: Ammunition)',
    },
    keywords: 'municao flechas virotes balas pedras aljava recuperar ammunition arrows bolts bullets quiver recover arco besta funda',
    related: ['propriedades-de-armas', 'ataque-a-distancia', 'carga'],
  },
  {
    id: 'carga',
    aliases: ['carrying-capacity', 'encumbrance'],
    cat: 'equipment',
    title: { pt: 'Carga e capacidade', en: 'Carrying capacity' },
    simple: {
      pt: 'Na maior parte do tempo ninguém conta quilos. Quando importa, uma criatura Pequena ou Média carrega até **Força × 15 lb (≈ For × 7 kg)** e consegue arrastar, erguer ou empurrar o dobro disso. Criaturas Grandes dobram esses valores; Miúdas, a metade. Movendo peso acima do que pode carregar, seu deslocamento cai para **no máximo 1,5 m**.',
      en: 'Most of the time nobody counts pounds. When it matters, a Small or Medium creature can carry up to **Strength × 15 lb** and drag, lift or push twice that. Large creatures double those numbers; Tiny ones halve them. Moving weight above what you can carry, your Speed can be **no more than 5 ft**.',
    },
    example: {
      pt: 'Tordek tem Força 14: carrega até 210 lb (≈ 95 kg) e arrasta até 420 lb (≈ 190 kg). Arrastando um baú de 300 lb (≈ 136 kg) pelo corredor, ele anda só 1,5 m por turno.',
      en: 'Tordek has Strength 14: he can carry up to 210 lb and drag up to 420 lb. Dragging a 300 lb chest down the corridor, he moves only 5 ft per turn.',
    },
    sheet: {
      pt: 'Aba Inventário: o peso de cada item fica registrado para você conferir quando o mestre pedir.',
      en: 'Inventory tab: each item\'s weight is recorded so you can check it when the GM asks.',
    },
    versions: {
      pt: 'Em 2014 a regra base é a mesma; havia ainda uma variante opcional de "sobrecarga" (a partir de For × 5 lb o deslocamento caía).',
      en: 'In 2014 the base rule is the same; there was also an optional "encumbrance" variant (from Str × 5 lb your Speed dropped).',
    },
    srd: {
      text: 'While dragging, lifting, or pushing weight in excess of the maximum weight you can carry, your Speed can be no more than 5 feet.',
      ref: 'SRD 5.2.1 — Rules Glossary (Carrying Capacity)',
    },
    keywords: 'carga capacidade peso carregar arrastar erguer empurrar sobrecarga carrying capacity encumbrance weight lift drag push forca x 15 kg lb',
    related: ['atributos', 'espaco-e-tamanho', 'deslocamento', 'moedas', 'armaduras-e-escudos'],
  },
  {
    id: 'sintonizacao',
    aliases: ['attunement'],
    cat: 'equipment',
    title: { pt: 'Itens mágicos e sintonia', en: 'Magic items and attunement' },
    simple: {
      pt: 'Alguns itens mágicos exigem **sintonia**: um vínculo feito passando um **descanso curto** em contato com o item, focado nele. Sem sintonia você só tem os benefícios comuns do objeto. Você pode estar em sintonia com **no máximo 3 itens** e com apenas uma cópia de cada. A sintonia acaba se você morrer, se outra criatura se sintonizar, se o item ficar a mais de 30 m por 24 horas ou se você abrir mão dela em outro descanso curto.',
      en: 'Some magic items require **attunement**: a bond made by spending a **Short Rest** in contact with the item, focused on it. Without attunement you get only the item\'s mundane benefits. You can be attuned to **at most 3 items** and to only one copy of each. Attunement ends if you die, if another creature attunes to it, if the item is more than 100 ft away for 24 hours, or if you give it up during another Short Rest.',
    },
    example: {
      pt: 'Kael acha um Anel de Proteção (+1 na CA e salvaguardas, exige sintonia). No descanso curto ele se sintoniza: CA 12 → 13. Já tem outros dois itens em sintonia, então chegou ao limite de 3.',
      en: 'Kael finds a Ring of Protection (+1 AC and saves, requires attunement). During a Short Rest he attunes: AC 12 → 13. He already has two other attuned items, so he\'s at the limit of 3.',
    },
    sheet: {
      pt: 'Aba Inventário: itens que exigem sintonia têm o botão de sintonia; a marca "em sintonia" aparece e o app bloqueia um quarto item.',
      en: 'Inventory tab: items requiring attunement have an attune button; the "attuned" tag appears and the app blocks a fourth item.',
    },
    srd: {
      text: 'You can be attuned to no more than three magic items at a time. Any attempt to attune to a fourth item fails; you must end your Attunement to an item first.',
      ref: 'SRD 5.2.1 — Equipment (Magic Items)',
    },
    keywords: 'sintonia sintonizar item magico attunement attune magic item limite 3 tres descanso curto identificar identify anel varinha',
    related: ['descanso-curto', 'pocoes-de-cura', 'classe-de-armadura', 'salvaguarda'],
  },
  {
    id: 'moedas',
    aliases: ['coins', 'money', 'currency'],
    cat: 'equipment',
    title: { pt: 'Moedas e dinheiro', en: 'Coins and money' },
    simple: {
      pt: 'A moeda principal é a **peça de ouro (PO)**. As conversões: 1 PO = 10 peças de prata (PP) = 100 peças de cobre (PC); 1 peça de platina (PL) = 10 PO; 1 peça de electro (PE) = ½ PO. Cinquenta moedas pesam cerca de 1 lb (≈ 0,5 kg). Equipamento usado vende por **metade** do preço; gemas e obras de arte mantêm o valor cheio.',
      en: 'The main coin is the **Gold Piece (GP)**. Conversions: 1 GP = 10 Silver Pieces (SP) = 100 Copper Pieces (CP); 1 Platinum Piece (PP) = 10 GP; 1 Electrum Piece (EP) = ½ GP. Fifty coins weigh about 1 lb. Used equipment sells for **half** its price; gems and art objects keep their full value.',
    },
    example: {
      pt: 'Lia quer uma poção de cura (50 PO) e tem 3 PL, 18 PO e 25 PP: 30 + 18 + 2,5 = 50,5 PO → dá, e sobram 5 PP. Ela ainda vende uma espada longa velha (15 PO) por 7,5 PO.',
      en: 'Lia wants a Potion of Healing (50 GP) and has 3 PP, 18 GP and 25 SP: 30 + 18 + 2.5 = 50.5 GP → enough, with 5 SP left over. She also sells an old Longsword (15 GP) for 7.5 GP.',
    },
    sheet: {
      pt: 'Aba Inventário → Moedas: campos para PC, PP, PE, PO e PL.',
      en: 'Inventory tab → Coins: fields for CP, SP, EP, GP and PP.',
    },
    srd: {
      text: 'A coin weighs about a third of an ounce, so fifty coins weigh a pound.',
      ref: 'SRD 5.2.1 — Equipment (Coins)',
    },
    keywords: 'moedas dinheiro ouro prata cobre platina electro po pp pc pl pe coins money gold silver copper platinum electrum gp sp cp pp ep vender comprar preco',
    related: ['carga', 'pocoes-de-cura', 'ferramentas'],
  },
  {
    id: 'pocoes-de-cura',
    aliases: ['potion-of-healing', 'healing-potions'],
    cat: 'equipment',
    title: { pt: 'Poções de cura', en: 'Potions of healing' },
    simple: {
      pt: 'A poção de cura comum restaura **2d4 + 2 PV** e custa cerca de 50 PO. Em 2024, beber ou dar a poção a alguém a até 1,5 m é uma **ação bônus** — então dá para tomar e ainda atacar no mesmo turno. Existem versões mais fortes (maior, superior, suprema) que curam mais. Dar a poção a um aliado caído com 0 PV o traz de volta à consciência.',
      en: 'A standard Potion of Healing restores **2d4 + 2 HP** and costs about 50 GP. In 2024, drinking it or giving it to someone within 5 ft is a **Bonus Action** — so you can drink and still attack on the same turn. Stronger versions (greater, superior, supreme) heal more. Giving a potion to an ally at 0 HP brings them back to consciousness.',
    },
    example: {
      pt: 'Brunna está com 3 PV. Como ação bônus bebe a poção: 2d4 + 2 = 3 + 2 + 2 = 7 → fica com 10 PV e ainda usa sua ação para atacar o troll.',
      en: 'Brunna is at 3 HP. As a Bonus Action she drinks a potion: 2d4 + 2 = 3 + 2 + 2 = 7 → she\'s at 10 HP and still uses her action to attack the troll.',
    },
    sheet: {
      pt: 'Role 2d4 + 2 no rolador de dados e aplique o total no botão Curar da aba Jogar; tire a poção do Inventário.',
      en: 'Roll 2d4 + 2 on the dice roller and apply the total with the Heal button on the Play tab; remove the potion from the Inventory.',
    },
    versions: {
      pt: 'Em 2014 beber uma poção (ou dar a outro) gastava a ação; muitas mesas já usavam a regra da casa de ação bônus, que virou oficial em 2024.',
      en: 'In 2014 drinking a potion (or giving it to someone) took an action; many tables used a bonus-action house rule, which became official in 2024.',
    },
    srd: {
      text: 'As a Bonus Action, you can drink it or administer it to another creature within 5 feet of yourself. The creature that drinks the magical red fluid in this vial regains 2d4 + 2 Hit Points.',
      ref: 'SRD 5.2.1 — Equipment (Adventuring Gear)',
    },
    keywords: 'pocao de cura pocao vida curar beber acao bonus potion of healing potion drink bonus action 2d4+2 heal hp',
    related: ['cura', 'acao-bonus', 'zero-pv', 'acao-usar-objeto', 'moedas'],
  },
  {
    id: 'ferramentas',
    aliases: ['tools', 'tool-proficiency'],
    cat: 'equipment',
    title: { pt: 'Ferramentas', en: 'Tools' },
    simple: {
      pt: 'Ferramentas (de ladrão, de ferreiro, kit de herbalismo, instrumentos musicais, jogos...) ajudam em testes específicos e em criar itens. Com **proficiência** na ferramenta você soma o bônus de proficiência ao teste feito com ela. Se também tiver proficiência numa perícia que se aplique ao mesmo teste, ganha **vantagem**. Cada ferramenta de artesão exige proficiência própria.',
      en: 'Tools (thieves\' tools, smith\'s tools, herbalism kit, musical instruments, gaming sets...) help with specific checks and crafting. With **proficiency** in the tool you add your Proficiency Bonus to checks using it. If you also have proficiency in a skill that applies to the same check, you get **Advantage**. Each artisan\'s tool needs its own proficiency.',
    },
    example: {
      pt: 'Lia abre uma fechadura (CD 15) com ferramentas de ladrão: Des +3 + prof. +2 → d20 + 5. Tira 11 → 16 ≥ 15, a porta abre.',
      en: 'Lia picks a lock (DC 15) with Thieves\' Tools: Dex +3 + prof. +2 → d20 + 5. She rolls 11 → 16 ≥ 15, the door opens.',
    },
    sheet: {
      pt: 'Aba Atributos → "Idiomas e Outras Proficiências" lista as ferramentas em que você é proficiente.',
      en: 'Stats tab → "Languages & Other Proficiencies" lists the tools you\'re proficient with.',
    },
    versions: {
      pt: 'Em 2014 a vantagem por combinar ferramenta + perícia não estava nas regras básicas (era uma opção de suplemento); em 2024 é regra geral.',
      en: 'In 2014 the Advantage for combining tool + skill wasn\'t in the core rules (it was a supplement option); in 2024 it\'s a general rule.',
    },
    srd: {
      text: 'If you have proficiency with a tool, add your Proficiency Bonus to any ability check you make that uses the tool. If you have proficiency in a skill that\'s used with that check, you have Advantage on the check too.',
      ref: 'SRD 5.2.1 — Equipment (Tools)',
    },
    keywords: 'ferramentas ferramenta de ladrao kit herbalismo instrumento jogo artesao ferreiro tools thieves tools tool proficiency artisan kit instrument gaming set lockpick fechadura',
    related: ['bonus-de-proficiencia', 'pericias', 'teste-de-atributo', 'antecedente', 'acao-usar-objeto'],
  },
];

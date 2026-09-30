/* Grimório — Condições. Texto original; `srd` = citação literal do SRD 5.2.1 (CC-BY 4.0). */
const SHEET = (pt, en) => ({
  pt: `Aba Jogar → Condições e efeitos → + Condição → ${pt}. Toque no chip ativo para remover.`,
  en: `Play tab → Conditions & effects → + Condition → ${en}. Tap the active chip to remove it.`,
});
const REF = 'SRD 5.2.1 — Rules Glossary';

export default [
  {
    id: 'condicoes',
    aliases: ['conditions', 'condition'],
    cat: 'conditions',
    title: { pt: 'Condições: como funcionam', en: 'Conditions: how they work' },
    simple: {
      pt: 'Condições são estados temporários (Cego, Agarrado, Prono...) que mudam o que você pode fazer. Cada uma diz seus efeitos, e quem a causou (magia, veneno, golpe) diz como ela termina. Uma condição **não se acumula com ela mesma**: ou você tem, ou não tem — ser Envenenado duas vezes não piora nada, só vale a duração mais longa na prática. A exceção é a **Exaustão**, que tem níveis. Algumas condições incluem outras (Paralisado já te deixa Incapacitado).',
      en: 'Conditions are temporary states (Blinded, Grappled, Prone...) that change what you can do. Each one lists its effects, and whatever caused it (spell, poison, attack) says how it ends. A condition **doesn\'t stack with itself**: you either have it or you don\'t — being Poisoned twice changes nothing beyond which duration lasts longer. The exception is **Exhaustion**, which has levels. Some conditions include others (Paralyzed already makes you Incapacitated).',
    },
    example: {
      pt: 'Kael é Envenenado por uma aranha (1 minuto) e, no turno seguinte, por outra (1 hora). Ele não fica "duplamente envenenado": continua só com desvantagem, até a hora acabar ou ser curado.',
      en: 'Kael is Poisoned by one spider (1 minute) and, next turn, by another (1 hour). He isn\'t "double poisoned": he just keeps Disadvantage until the hour runs out or he\'s cured.',
    },
    sheet: {
      pt: 'Aba Jogar → painel "Condições e efeitos": + Condição abre os 15 chips; efeitos personalizados (ex.: Bênção, 1 min) podem ser adicionados com duração.',
      en: 'Play tab → "Conditions & effects" panel: + Condition opens the 15 chips; custom effects (e.g. Bless, 1 min) can be added with a duration.',
    },
    srd: {
      text: 'A condition doesn’t stack with itself; a recipient either has a condition or doesn’t. The Exhaustion condition is an exception to that rule.',
      ref: REF,
    },
    keywords: 'condições condicoes condição estado status efeito conditions condition stack acumular lista',
    related: ['exaustao', 'incapacitado', 'agarrado', 'prono', 'envenenado', 'vantagem-desvantagem'],
  },
  {
    id: 'cego',
    aliases: ['blinded'],
    cat: 'conditions',
    title: { pt: 'Cego', en: 'Blinded' },
    simple: {
      pt: 'Você não enxerga. Falha automaticamente em qualquer teste que dependa da visão (ler, procurar algo com os olhos). Seus ataques têm **desvantagem** e ataques contra você têm **vantagem**. Você ainda sabe mais ou menos onde as coisas estão pelo som, mas precisa adivinhar o espaço de alvos que não se revelam.',
      en: 'You can\'t see. You automatically fail any check that needs sight (reading, spotting something). Your attacks have **Disadvantage** and attacks against you have **Advantage**. You can still roughly track things by sound, but you may have to guess where silent targets are.',
    },
    example: {
      pt: 'Uma nuvem de poeira mágica cega Thalion. Ele ataca o goblin: rola 2d20 e fica com o menor, 6 + 5 = 11 contra CA 15 → erra. O goblin ataca com vantagem: 17 e 9, usa o 17 → acerta.',
      en: 'A magic dust cloud blinds Thalion. He attacks the goblin: rolls 2d20 and takes the lower, 6 + 5 = 11 vs AC 15 → miss. The goblin attacks with Advantage: 17 and 9, keeps 17 → hit.',
    },
    sheet: SHEET('Cego', 'Blinded'),
    srd: {
      text: 'Can’t See. You can’t see and automatically fail any ability check that requires sight. Attacks Affected. Attack rolls against you have Advantage, and your attack rolls have Disadvantage.',
      ref: REF,
    },
    keywords: 'cego cegueira cegar não enxerga nao enxerga blinded blind blindness sem visão visao',
    related: ['vantagem-desvantagem', 'alvos-invisiveis', 'sentidos-especiais', 'luz-e-visao', 'obscurecido'],
  },
  {
    id: 'encantado',
    aliases: ['charmed'],
    cat: 'conditions',
    title: { pt: 'Encantado', en: 'Charmed' },
    simple: {
      pt: 'Alguém te encantou (magia, olhar de vampiro, feitiço de fada). Você **não pode atacar quem te encantou** nem mirá-lo com habilidades ou magias que causem dano. Além disso, esse encantador tem **vantagem em testes sociais** com você (Persuasão, Enganação...). Não é controle mental total: você ainda age como quiser contra os outros.',
      en: 'Someone has charmed you (a spell, a vampire\'s gaze, fey magic). You **can\'t attack the charmer** or target them with damaging abilities or spells. The charmer also has **Advantage on social checks** against you (Persuasion, Deception...). It isn\'t full mind control: you still act freely against everyone else.',
    },
    example: {
      pt: 'A dríade encanta Tordek. Ele não pode golpeá-la com o machado, mas pode atacar o lobo dela. Quando ela pede "me deixe passar", rola Persuasão com vantagem: 18 e 7 → usa 18.',
      en: 'The dryad charms Tordek. He can\'t hit her with his axe, but he can attack her wolf. When she asks "let me pass", she rolls Persuasion with Advantage: 18 and 7 → uses 18.',
    },
    sheet: SHEET('Encantado', 'Charmed'),
    srd: {
      text: 'Can’t Harm the Charmer. You can’t attack the charmer or target the charmer with damaging abilities or magical effects. Social Advantage. The charmer has Advantage on any ability check to interact with you socially.',
      ref: REF,
    },
    keywords: 'encantado enfeitiçado enfeiticado charme charmed charm seduzido controle mental amigo',
    related: ['amedrontado', 'acao-influenciar', 'salvaguarda', 'vantagem-desvantagem'],
  },
  {
    id: 'surdo',
    aliases: ['deafened'],
    cat: 'conditions',
    title: { pt: 'Surdo', en: 'Deafened' },
    simple: {
      pt: 'Você não ouve nada. Falha automaticamente em qualquer teste que dependa da audição (escutar atrás de uma porta, perceber passos). Não afeta ataques nem conjuração, mas você não escuta avisos, ordens ou magias que dependem de ouvir o conjurador.',
      en: 'You can\'t hear anything. You automatically fail any check that needs hearing (listening at a door, noticing footsteps). It doesn\'t affect attacks or spellcasting, but you miss warnings, commands, or effects that require hearing the caster.',
    },
    example: {
      pt: 'Depois de uma Onda Trovejante, Mirela fica surda por 1 minuto. O mestre pede um teste de Percepção para ouvir o assassino chegando por trás → falha automática, mesmo com +6.',
      en: 'After a Thunderwave, Mirela is deafened for 1 minute. The GM calls for a Perception check to hear the assassin sneaking up → automatic failure, even with +6.',
    },
    sheet: SHEET('Surdo', 'Deafened'),
    srd: {
      text: 'Can’t Hear. You can’t hear and automatically fail any ability check that requires hearing.',
      ref: REF,
    },
    keywords: 'surdo surdez ensurdecido não ouve nao ouve deafened deaf hearing audição audicao',
    related: ['condicoes', 'teste-de-atributo', 'pericias', 'cego'],
  },
  {
    id: 'exaustao',
    aliases: ['exhausted', 'exhaustion'],
    cat: 'conditions',
    title: { pt: 'Exaustão', en: 'Exhaustion' },
    simple: {
      pt: 'A Exaustão vem em **níveis de 1 a 6** e se acumula: cada vez que você a recebe, sobe um nível. Todo **Teste de d20** (ataques, testes e salvaguardas) perde **2 × o nível**, e seu **deslocamento cai 1,5 m × o nível**. No **nível 6 você morre**. Cada descanso longo tira 1 nível.',
      en: 'Exhaustion comes in **levels 1 to 6** and stacks: each time you get it, you go up a level. Every **D20 Test** (attacks, checks and saves) takes a penalty of **2 × your level**, and your **Speed drops by 5 ft × your level**. At **level 6 you die**. Each Long Rest removes 1 level.',
    },
    example: {
      pt: 'Após dois dias de marcha forçada, Brunna tem Exaustão 2: ataca com d20 + 6 − 4 e anda 9 − 3 = 6 m. Rola 15 → 17 contra CA 16: acerta por pouco. Depois de uma noite de descanso longo, cai para Exaustão 1.',
      en: 'After two days of forced march, Brunna has Exhaustion 2: she attacks at d20 + 6 − 4 and moves 30 − 10 = 20 ft. She rolls 15 → 17 vs AC 16: a narrow hit. After a Long Rest she drops to Exhaustion 1.',
    },
    sheet: {
      pt: 'Aba Jogar → Condições e efeitos → + Condição → Exausto. A ficha não conta os níveis: anote o nível como efeito personalizado (ex.: "Exaustão 2") e subtraia das rolagens.',
      en: 'Play tab → Conditions & effects → + Condition → Exhausted. The sheet doesn\'t track levels: note the level as a custom effect (e.g. "Exhaustion 2") and subtract it from your rolls.',
    },
    versions: {
      pt: 'Em 2014 cada nível tinha um efeito próprio: 1 desvantagem em testes de atributo; 2 deslocamento pela metade; 3 desvantagem em ataques e salvaguardas; 4 PV máximo pela metade; 5 deslocamento 0; 6 morte. Em 2024 virou a penalidade simples de −2 por nível nos Testes de d20 e −1,5 m (5 ft) de deslocamento por nível.',
      en: 'In 2014 each level had its own effect: 1 Disadvantage on ability checks; 2 Speed halved; 3 Disadvantage on attacks and saves; 4 HP maximum halved; 5 Speed 0; 6 death. In 2024 it became a flat −2 per level to D20 Tests and −5 ft Speed per level.',
    },
    srd: {
      text: 'D20 Tests Affected. When you make a D20 Test, the roll is reduced by 2 times your Exhaustion level. Speed Reduced. Your Speed is reduced by a number of feet equal to 5 times your Exhaustion level.',
      ref: REF,
    },
    keywords: 'exaustão exaustao exausto cansaço cansaco fadiga níveis niveis exhaustion exhausted fatigue tired levels -2 penalidade morrer nível 6',
    related: ['descanso-longo', 'marcha-forcada', 'sufocamento', 'comida-e-agua', 'frio-e-calor-extremos', 'teste-d20'],
  },
  {
    id: 'amedrontado',
    aliases: ['frightened', 'fear'],
    cat: 'conditions',
    title: { pt: 'Amedrontado', en: 'Frightened' },
    simple: {
      pt: 'Algo te apavora. Enquanto a **fonte do medo estiver na sua linha de visão**, você tem **desvantagem em testes de atributo e ataques**. Você também **não pode se aproximar dela por vontade própria** — pode ficar parado, recuar ou andar para os lados. Se perder a fonte de vista, a desvantagem some (mas a proibição de se aproximar continua).',
      en: 'Something terrifies you. While the **source of your fear is within line of sight**, you have **Disadvantage on ability checks and attack rolls**. You also **can\'t willingly move closer to it** — you can stand still, back off or move sideways. If you lose sight of the source, the Disadvantage goes away (but you still can\'t approach it).',
    },
    example: {
      pt: 'O dragão ruge e Lia fica Amedrontada. Ela quer atirar com o arco: vê o dragão, então rola com desvantagem, 14 e 5 → 5 + 7 = 12 contra CA 18, erra. No turno seguinte ela se esconde atrás de uma coluna, fora da vista dele.',
      en: 'The dragon roars and Lia is Frightened. She fires her bow: she can see the dragon, so she rolls with Disadvantage, 14 and 5 → 5 + 7 = 12 vs AC 18, miss. Next turn she ducks behind a pillar, out of its sight.',
    },
    sheet: SHEET('Amedrontado', 'Frightened'),
    srd: {
      text: 'Ability Checks and Attacks Affected. You have Disadvantage on ability checks and attack rolls while the source of fear is within line of sight. Can’t Approach. You can’t willingly move closer to the source of fear.',
      ref: REF,
    },
    keywords: 'amedrontado medo assustado apavorado aterrorizado frightened fear scared terrified linha de visão visao não pode se aproximar',
    related: ['encantado', 'vantagem-desvantagem', 'salvaguarda', 'deslocamento'],
  },
  {
    id: 'agarrado',
    aliases: ['grappled'],
    cat: 'conditions',
    title: { pt: 'Agarrado', en: 'Grappled' },
    simple: {
      pt: 'Alguém está te segurando. Seu **deslocamento vira 0** e nada o aumenta enquanto durar. Você ataca com **desvantagem** qualquer alvo que não seja quem te agarrou, e ele pode te arrastar junto (gastando movimento extra). Para se soltar, use sua **ação** num teste de Força (Atletismo) ou Destreza (Acrobacia) contra a CD de escape de quem te agarrou.',
      en: 'Someone is holding on to you. Your **Speed becomes 0** and nothing can raise it while it lasts. You have **Disadvantage** on attacks against anyone other than the grappler, and they can drag you along (spending extra movement). To break free, use your **action** on a Strength (Athletics) or Dexterity (Acrobatics) check against the grappler\'s escape DC.',
    },
    example: {
      pt: 'O ogro agarra Lia (CD 15 para escapar). No turno dela, Lia usa a ação: d20 + 5 (Acrobacia) = 16 ≥ 15 → ela escapa e ainda pode usar seus 9 m de deslocamento.',
      en: 'The ogre grapples Lia (escape DC 15). On her turn, Lia uses her action: d20 + 5 (Acrobatics) = 16 ≥ 15 → she escapes and can still use her 30 ft of Speed.',
    },
    sheet: SHEET('Agarrado', 'Grappled'),
    versions: {
      pt: 'Em 2014 a condição só zerava o deslocamento; a desvantagem em ataques contra outros alvos é de 2024. A CD de escape em 2024 é fixa (8 + For + proficiência de quem agarra); em 2014 escapar era um teste resistido contra o Atletismo de quem agarrou.',
      en: 'In 2014 the condition only set Speed to 0; the Disadvantage on attacks against other targets is new in 2024. In 2024 the escape DC is fixed (8 + Str mod + PB of the grappler); in 2014 escaping was a contest against the grappler\'s Athletics.',
    },
    srd: {
      text: 'Speed 0. Your Speed is 0 and can’t increase. Attacks Affected. You have Disadvantage on attack rolls against any target other than the grappler.',
      ref: REF,
    },
    keywords: 'agarrado agarrar preso segurado imobilizado grapple grappled escapar escape livrar-se soltar arrastar',
    related: ['agarrar', 'restringido', 'deslocamento', 'acao-atacar', 'teste-resistido', 'classe-de-dificuldade'],
  },
  {
    id: 'incapacitado',
    aliases: ['incapacitated'],
    cat: 'conditions',
    title: { pt: 'Incapacitado', en: 'Incapacitated' },
    simple: {
      pt: 'Você está fora de ação: **não pode usar ação, ação bônus nem reação**. Sua **concentração se quebra** e você **não consegue falar**. Se estiver Incapacitado quando rolar iniciativa, rola com desvantagem. Note que ela, sozinha, não zera o deslocamento — mas várias condições que a incluem (Paralisado, Inconsciente, Petrificado) zeram.',
      en: 'You\'re out of action: **no action, Bonus Action or Reaction**. Your **Concentration breaks** and you **can\'t speak**. If you\'re Incapacitated when rolling Initiative, you roll with Disadvantage. On its own it doesn\'t set your Speed to 0 — but several conditions that include it (Paralyzed, Unconscious, Petrified) do.',
    },
    example: {
      pt: 'Mirela mantém Teia com concentração quando falha a salvaguarda de Sabedoria (rolou 9 contra CD 13) do Riso Histérico e fica Incapacitada. A Teia termina na hora, e no turno dela não há ação, ação bônus nem reação.',
      en: 'Mirela is concentrating on Web when she fails the Wisdom save (rolled 9 vs DC 13) against Hideous Laughter and becomes Incapacitated. The Web ends at once, and on her turn she gets no action, Bonus Action or Reaction.',
    },
    sheet: SHEET('Incapacitado', 'Incapacitated'),
    versions: {
      pt: 'Em 2014 Incapacitado só impedia ações e reações. Em 2024 também quebra a concentração, impede de falar e dá desvantagem na iniciativa.',
      en: 'In 2014 Incapacitated only prevented actions and reactions. In 2024 it also breaks Concentration, stops you speaking and gives Disadvantage on Initiative.',
    },
    srd: {
      text: 'Inactive. You can’t take any action, Bonus Action, or Reaction. No Concentration. Your Concentration is broken. Speechless. You can’t speak.',
      ref: REF,
    },
    keywords: 'incapacitado incapacitated sem ação sem acao fora de combate não age nao age perde turno concentração quebrada',
    related: ['concentracao', 'atordoado', 'paralisado', 'inconsciente', 'acao-bonus', 'reacao'],
  },
  {
    id: 'invisivel',
    aliases: ['invisible', 'invisibility'],
    cat: 'conditions',
    title: { pt: 'Invisível', en: 'Invisible' },
    simple: {
      pt: 'Ninguém consegue te ver (nem o que você carrega). Seus **ataques têm vantagem** e **ataques contra você têm desvantagem** — a não ser contra quem consegue te ver de algum jeito (visão verdadeira, percepção às cegas). Efeitos que exigem que o alvo seja visto não te afetam. Se estiver invisível ao rolar iniciativa, rola com **vantagem**. Invisível não é silencioso: barulho e pegadas ainda te denunciam.',
      en: 'Nobody can see you (or what you carry). Your **attacks have Advantage** and **attacks against you have Disadvantage** — except against creatures that can somehow see you (Truesight, Blindsight). Effects that require seeing the target don\'t affect you. If you\'re invisible when rolling Initiative, you roll with **Advantage**. Invisible isn\'t silent: noise and footprints can still give you away.',
    },
    example: {
      pt: 'Kael bebe uma poção de invisibilidade e rola iniciativa com vantagem: 8 e 16 → 16 + 2 = 18. Ele ataca o guarda com vantagem (12 e 19 → 19 + 5 = 24) e acerta; o guarda revida às cegas com desvantagem.',
      en: 'Kael drinks an invisibility potion and rolls Initiative with Advantage: 8 and 16 → 16 + 2 = 18. He attacks the guard with Advantage (12 and 19 → 19 + 5 = 24) and hits; the guard swings back blindly with Disadvantage.',
    },
    sheet: SHEET('Invisível', 'Invisible'),
    versions: {
      pt: 'Em 2014 ser invisível contava como estar em escuridão densa para se esconder e dava vantagem/desvantagem nos ataques. Em 2024 a condição também dá vantagem na iniciativa e protege de efeitos que exigem ver o alvo; a ação Esconder também passou a conceder a condição Invisível.',
      en: 'In 2014 being invisible counted as heavily obscured for hiding and granted the attack Advantage/Disadvantage. In 2024 the condition also gives Advantage on Initiative and protects from effects that require seeing the target; the Hide action now grants the Invisible condition too.',
    },
    srd: {
      text: 'Attacks Affected. Attack rolls against you have Disadvantage, and your attack rolls have Advantage. If a creature can somehow see you, you don’t gain this benefit against that creature.',
      ref: REF,
    },
    keywords: 'invisível invisivel invisibilidade oculto não visto nao visto invisible invisibility unseen escondido hidden',
    related: ['alvos-invisiveis', 'acao-esconder', 'sentidos-especiais', 'iniciativa', 'vantagem-desvantagem', 'cego'],
  },
  {
    id: 'paralisado',
    aliases: ['paralyzed', 'paralysis'],
    cat: 'conditions',
    title: { pt: 'Paralisado', en: 'Paralyzed' },
    simple: {
      pt: 'Seu corpo trava por completo. Você está **Incapacitado** (sem ações, sem fala, sem concentração), com **deslocamento 0**, e **falha automaticamente** em salvaguardas de Força e Destreza. Ataques contra você têm **vantagem**, e qualquer acerto de alguém **a até 1,5 m é crítico automático**. É uma das condições mais perigosas do jogo.',
      en: 'Your body locks up completely. You\'re **Incapacitated** (no actions, no speech, no concentration), with **Speed 0**, and you **automatically fail** Strength and Dexterity saving throws. Attacks against you have **Advantage**, and any hit from someone **within 5 ft is an automatic Critical Hit**. It\'s one of the most dangerous conditions in the game.',
    },
    example: {
      pt: 'Um carniçal paralisa Tordek. O próximo carniçal, ao lado dele, ataca com vantagem e acerta: o dano de 2d6 vira 4d6 por ser crítico → 15 de dano.',
      en: 'A ghoul paralyzes Tordek. The next ghoul, standing next to him, attacks with Advantage and hits: its 2d6 damage becomes 4d6 as a crit → 15 damage.',
    },
    sheet: SHEET('Paralisado', 'Paralyzed'),
    srd: {
      text: 'Automatic Critical Hits. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you.',
      ref: REF,
    },
    keywords: 'paralisado paralisia paralisar travado imóvel imovel paralyzed paralysis hold person crítico automático critico',
    related: ['incapacitado', 'acerto-critico', 'atordoado', 'inconsciente', 'salvaguarda'],
  },
  {
    id: 'petrificado',
    aliases: ['petrified', 'petrification'],
    cat: 'conditions',
    title: { pt: 'Petrificado', en: 'Petrified' },
    simple: {
      pt: 'Você vira pedra (ou outra substância inerte), junto com o equipamento não mágico que carrega. Fica **Incapacitado**, com **deslocamento 0**, **falha em salvaguardas de Força e Destreza**, e ataques contra você têm **vantagem**. Em troca, tem **resistência a todo dano** e imunidade a veneno. Seu peso se multiplica por dez e você para de envelhecer.',
      en: 'You turn to stone (or another inert substance), along with the nonmagical gear you carry. You\'re **Incapacitated**, with **Speed 0**, you **fail Strength and Dexterity saves**, and attacks against you have **Advantage**. On the upside, you have **Resistance to all damage** and immunity to poison. Your weight is multiplied by ten and you stop aging.',
    },
    example: {
      pt: 'O olhar da medusa petrifica Zé do Machado (90 kg → 900 kg). Um golem o acerta com 22 de dano; com resistência, ele leva só 11. O grupo precisa de uma Restauração Maior para trazê-lo de volta.',
      en: 'The medusa\'s gaze petrifies Zé do Machado (200 lb → 2,000 lb). A golem hits him for 22 damage; with Resistance, he takes just 11. The party needs Greater Restoration to bring him back.',
    },
    sheet: SHEET('Petrificado', 'Petrified'),
    srd: {
      text: 'Turned to Inanimate Substance. You are transformed, along with any nonmagical objects you are wearing and carrying, into a solid inanimate substance (usually stone).',
      ref: REF,
    },
    keywords: 'petrificado pedra estátua estatua petrificar medusa basilisco petrified stone statue petrification',
    related: ['incapacitado', 'resistencia-e-vulnerabilidade', 'envenenado', 'paralisado'],
  },
  {
    id: 'envenenado',
    aliases: ['poisoned', 'poison'],
    cat: 'conditions',
    title: { pt: 'Envenenado', en: 'Poisoned' },
    simple: {
      pt: 'Veneno, doença ou náusea te deixam mal. Você tem **desvantagem em jogadas de ataque e testes de atributo** (incluindo perícias). Salvaguardas não são afetadas. Muitas vezes vem junto com dano de veneno, mas a condição e o dano são coisas separadas — resistir a um não livra do outro.',
      en: 'Poison, disease or nausea has you feeling awful. You have **Disadvantage on attack rolls and ability checks** (including skills). Saving throws aren\'t affected. It often comes with Poison damage, but the condition and the damage are separate things — resisting one doesn\'t protect you from the other.',
    },
    example: {
      pt: 'Lia bebe vinho envenenado e falha na salvaguarda: fica Envenenada por 1 hora. Tentando abrir uma fechadura, rola Ferramentas de Ladrão com desvantagem: 17 e 4 → 4 + 7 = 11 contra CD 15, falha.',
      en: 'Lia drinks poisoned wine and fails the save: she\'s Poisoned for 1 hour. Picking a lock, she rolls Thieves\' Tools with Disadvantage: 17 and 4 → 4 + 7 = 11 vs DC 15, fail.',
    },
    sheet: SHEET('Envenenado', 'Poisoned'),
    srd: {
      text: 'Ability Checks and Attacks Affected. You have Disadvantage on attack rolls and ability checks.',
      ref: REF,
    },
    keywords: 'envenenado veneno intoxicado enjoado doente náusea nausea poisoned poison sick antitoxina antitoxin',
    related: ['vantagem-desvantagem', 'tipos-de-dano', 'resistencia-e-vulnerabilidade', 'teste-de-atributo'],
  },
  {
    id: 'prono',
    aliases: ['prone'],
    cat: 'conditions',
    title: { pt: 'Prono (caído)', en: 'Prone' },
    simple: {
      pt: 'Você está no chão. Só pode se mover **rastejando** (cada 1,5 m custa 3 m) ou **gastar metade do deslocamento para se levantar** — com deslocamento 0 você não levanta. Seus ataques têm **desvantagem**. Ataques contra você de alguém **a até 1,5 m têm vantagem**; de mais longe (arcos, bestas), **desvantagem**. Cair no chão de propósito não custa movimento.',
      en: 'You\'re on the ground. You can only move by **crawling** (each foot costs an extra foot) or **spend half your Speed to stand up** — with Speed 0 you can\'t stand. Your attacks have **Disadvantage**. Attacks against you from **within 5 ft have Advantage**; from farther away (bows, crossbows), **Disadvantage**. Dropping prone on purpose costs no movement.',
    },
    example: {
      pt: 'Tordek é derrubado por um lobo. No turno dele, gasta 4,5 m dos seus 9 m para se levantar e anda os outros 4,5 m. Enquanto estava no chão, o lobo ao lado atacava com vantagem, mas o arqueiro goblin a 12 m atirava com desvantagem.',
      en: 'A wolf knocks Tordek down. On his turn he spends 15 of his 30 ft to stand up and moves the other 15 ft. While he was down, the adjacent wolf attacked with Advantage, but the goblin archer 40 ft away shot with Disadvantage.',
    },
    sheet: SHEET('Prono', 'Prone'),
    srd: {
      text: 'Attacks Affected. You have Disadvantage on attack rolls. An attack roll against you has Advantage if the attacker is within 5 feet of you. Otherwise, that attack roll has Disadvantage.',
      ref: REF,
    },
    keywords: 'prono caído caido derrubado deitado no chão chao levantar rastejar prone knocked down stand up crawl',
    related: ['empurrar', 'escalar-nadar-rastejar', 'deslocamento', 'ataque-a-distancia', 'inconsciente', 'vantagem-desvantagem'],
  },
  {
    id: 'restringido',
    aliases: ['restrained'],
    cat: 'conditions',
    title: { pt: 'Restringido (contido)', en: 'Restrained' },
    simple: {
      pt: 'Você está preso de verdade — teia, redes, raízes, correntes. **Deslocamento 0**, seus **ataques têm desvantagem**, **ataques contra você têm vantagem**, e você tem **desvantagem em salvaguardas de Destreza**. É mais grave que Agarrado. Como se soltar depende do que te prende (normalmente um teste de Força ou cortar a amarra).',
      en: 'You\'re truly stuck — webs, nets, roots, chains. **Speed 0**, your **attacks have Disadvantage**, **attacks against you have Advantage**, and you have **Disadvantage on Dexterity saving throws**. It\'s worse than Grappled. How you break free depends on what\'s holding you (usually a Strength check or cutting the bonds).',
    },
    example: {
      pt: 'Brunna fica presa na Teia de uma aranha gigante. No turno dela, usa a ação num teste de Força (Atletismo): 13 + 5 = 18 contra CD 12 → se solta. Antes disso, a aranha a mordeu com vantagem.',
      en: 'Brunna gets stuck in a giant spider\'s web. On her turn she uses her action on a Strength (Athletics) check: 13 + 5 = 18 vs DC 12 → she breaks free. Before that, the spider bit her with Advantage.',
    },
    sheet: SHEET('Restringido', 'Restrained'),
    srd: {
      text: 'Speed 0. Your Speed is 0 and can’t increase. Attacks Affected. Attack rolls against you have Advantage, and your attack rolls have Disadvantage. Saving Throws Affected. You have Disadvantage on Dexterity saving throws.',
      ref: REF,
    },
    keywords: 'restringido contido impedido preso amarrado enredado teia rede restrained restrain entangled web net',
    related: ['agarrado', 'agarrar', 'vantagem-desvantagem', 'salvaguarda', 'deslocamento'],
  },
  {
    id: 'atordoado',
    aliases: ['stunned', 'stun'],
    cat: 'conditions',
    title: { pt: 'Atordoado', en: 'Stunned' },
    simple: {
      pt: 'Você está zonzo, sem conseguir reagir. Fica **Incapacitado** (sem ação, ação bônus, reação, fala ou concentração), **falha automaticamente** em salvaguardas de Força e Destreza, e ataques contra você têm **vantagem**. Diferente de Paralisado, acertos de perto não viram crítico automático.',
      en: 'You\'re dazed and can\'t respond. You\'re **Incapacitated** (no action, Bonus Action, Reaction, speech or concentration), you **automatically fail** Strength and Dexterity saves, and attacks against you have **Advantage**. Unlike Paralyzed, close-range hits don\'t become automatic crits.',
    },
    example: {
      pt: 'O monge Kael usa Golpe Atordoante e o capitão falha na salvaguarda de Constituição. Até o início do próximo turno de Kael, o capitão não age, e Brunna o ataca com vantagem: 11 e 18 → 18 + 6 = 24, acerto.',
      en: 'Kael the monk uses Stunning Strike and the captain fails his Constitution save. Until the start of Kael\'s next turn the captain can\'t act, and Brunna attacks him with Advantage: 11 and 18 → 18 + 6 = 24, hit.',
    },
    sheet: SHEET('Atordoado', 'Stunned'),
    versions: {
      pt: 'Em 2014 a criatura atordoada também não podia se mover e só falava com dificuldade. Em 2024 o texto não zera o deslocamento — mas, Incapacitada, ela não pode usar ações como Disparada.',
      en: 'In 2014 a stunned creature also couldn\'t move and could speak only falteringly. In 2024 the text doesn\'t set Speed to 0 — but, being Incapacitated, it can\'t take actions such as Dash.',
    },
    srd: {
      text: 'Incapacitated. You have the Incapacitated condition. Saving Throws Affected. You automatically fail Strength and Dexterity saving throws. Attacks Affected. Attack rolls against you have Advantage.',
      ref: REF,
    },
    keywords: 'atordoado atordoar zonzo tonto stunned stun stunning strike golpe atordoante',
    related: ['incapacitado', 'paralisado', 'salvaguarda', 'vantagem-desvantagem', 'concentracao'],
  },
  {
    id: 'inconsciente',
    aliases: ['unconscious'],
    cat: 'conditions',
    title: { pt: 'Inconsciente', en: 'Unconscious' },
    simple: {
      pt: 'Você apagou — por dormir, por magia ou por cair a 0 PV. Fica **Incapacitado** e **Prono**, **solta o que estiver segurando**, tem **deslocamento 0** e não percebe nada ao redor. **Falha automaticamente** em salvaguardas de Força e Destreza, ataques contra você têm **vantagem**, e acertos de alguém **a até 1,5 m são críticos automáticos**. Ao acordar, continua Prono.',
      en: 'You\'re out cold — asleep, magically, or from dropping to 0 HP. You\'re **Incapacitated** and **Prone**, you **drop whatever you\'re holding**, your **Speed is 0** and you\'re unaware of your surroundings. You **automatically fail** Strength and Dexterity saves, attacks against you have **Advantage**, and hits from **within 5 ft are automatic crits**. When you wake up, you\'re still Prone.',
    },
    example: {
      pt: 'Mirela cai a 0 PV e fica Inconsciente. Um goblin ao lado a ataca e acerta: é crítico, então ela sofre 2 falhas nos testes contra a morte de uma vez.',
      en: 'Mirela drops to 0 HP and is Unconscious. A goblin next to her attacks and hits: it\'s a crit, so she suffers 2 death save failures at once.',
    },
    sheet: {
      pt: 'Aba Jogar → Condições e efeitos → + Condição → Inconsciente. O descanso longo remove essa condição automaticamente.',
      en: 'Play tab → Conditions & effects → + Condition → Unconscious. A long rest removes this condition automatically.',
    },
    srd: {
      text: 'Inert. You have the Incapacitated and Prone conditions, and you drop whatever you’re holding. When this condition ends, you remain Prone.',
      ref: REF,
    },
    keywords: 'inconsciente desmaiado apagado dormindo sono unconscious knocked out asleep sleep 0 pv crítico automático',
    related: ['zero-pv', 'testes-contra-a-morte', 'nocautear', 'prono', 'incapacitado', 'acerto-critico'],
  },
];

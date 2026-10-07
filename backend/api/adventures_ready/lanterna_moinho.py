"""Aventura pronta 1 — "A Lanterna do Moinho" (níveis 1–2). Texto original da Forja."""
from . import T

PACK = {
    'id': 'lanterna-do-moinho',
    'levels': '1–2',
    'sessions': '1–2',
    'art': '/art/backgrounds/farmer.webp',
    'artFallback': '/art/covers/cozy-tavern.webp',
    'theme': T('Investigação e masmorra curta', 'Investigation and a short dungeon'),
    'name': T('A Lanterna do Moinho', 'The Mill Lantern'),
    'tagline': T('Uma luz verde dança no moinho abandonado — e gente da vila começou a sumir.',
                 'A green light dances in the abandoned mill — and villagers have started to vanish.'),
    'pitch': T('Vau-de-Trigo é uma vila de trigo e conversa fiada. Há duas semanas, sacos de grão somem dos celeiros, '
               'um menino e um velho cavador de poços desapareceram, e toda noite uma luz verde passeia pelas janelas '
               'do moinho que ninguém usa há dez anos. Investigação na vila, uma descida curta por baixo do moinho e um '
               'vilão que fala manso.',
               'Wheatford is a village of wheat and idle talk. For two weeks grain sacks have vanished from the barns, '
               'a boy and an old well-digger have disappeared, and every night a green light drifts past the windows '
               'of the mill nobody has used in ten years. Village investigation, a short delve beneath the mill and a '
               'soft-spoken villain.'),
    'synopsis': T(
        'Há gerações, a fundadora de Vau-de-Trigo prendeu um diabrete, {@pavio}, dentro de uma lanterna de latão e '
        'selou a lanterna numa cisterna anã sob o lugar onde depois ergueram o moinho. Um selo de pedra sob a '
        '{@capela} mantém o encanto. Há um mês, kobolds do {@cla} fugiram de uma mina alagada, acharam a cisterna e '
        'a lanterna. {@pavio} se apresentou como o "Sol Verde" e mandou que cavassem um túnel até a capela: quebrar o '
        'selo o libertaria. Os kobolds roubam grão para comer e levaram {@matias} (que sabe cavar) e o menino {@pipo} '
        '(que viu demais). {@bento}, sobrinho do falecido moleiro, troca grão com os kobolds por moedas anãs antigas e '
        'não contou nada a ninguém. {@celestina}, neta da fundadora, guarda a cantiga que prende a chama de novo. '
        'O grupo investiga a vila, desce pelo moinho, resgata os prisioneiros e enfrenta {@pavio} antes que o túnel '
        'chegue à capela.',
        'Generations ago, the founder of Wheatford trapped an imp, {@pavio}, inside a brass lantern and sealed the '
        'lantern in a dwarven cistern beneath the spot where the mill was later built. A seal stone under the '
        '{@capela} holds the binding. A month ago, kobolds of the {@cla} fled a flooded mine, found the cistern and '
        'the lantern. {@pavio} named himself the "Green Sun" and ordered them to dig a tunnel to the chapel: breaking '
        'the seal would free him. The kobolds steal grain to eat, and took {@matias} (who knows how to dig) and the '
        'boy {@pipo} (who saw too much). {@bento}, the late miller\'s nephew, trades grain to the kobolds for old '
        'dwarven coins and told no one. {@celestina}, the founder\'s granddaughter, keeps the song that binds the '
        'flame again. The party investigates the village, goes down through the mill, rescues the prisoners and '
        'faces {@pavio} before the tunnel reaches the chapel.'),
    'hook': T(
        'A colheita foi boa em Vau-de-Trigo, mas ninguém está comemorando. Há duas semanas, sacos de grão somem dos '
        'celeiros durante a noite. Há três noites, o pequeno Juca, pastor de ovelhas, não voltou para casa — nem o '
        'velho Matias, o cavador de poços. E toda noite, quando a lua sobe, uma luz verde passeia pelas janelas do '
        'moinho velho, parado há dez anos. Na taverna, falam em fantasma. A dona da taverna fala em recompensa.',
        'The harvest was good in Wheatford, but nobody is celebrating. For two weeks grain sacks have vanished from '
        'the barns at night. Three nights ago little Juca, the shepherd boy, did not come home — and neither did old '
        'Matias, the well-digger. And every night, when the moon rises, a green light drifts past the windows of the '
        'old mill, still for ten years now. At the tavern they talk of ghosts. The tavern keeper talks of a reward.'),
    'strongStart': T(
        'Comece com os personagens na taverna A Mó Cantante, à noite. O sino do celeiro da praça dispara. Lá fora, '
        'duas figuras pequenas e escamosas arrastam um saco de trigo para o escuro, rindo em uma língua chiada. '
        'Se o grupo correr atrás: dois kobolds guerreiros lutam um pouco e fogem em direção ao moinho, largando uma '
        'moeda quadrada de prata antiga. No alto da colina, a luz verde acende.',
        'Start with the characters at the Singing Millstone tavern, at night. The square\'s barn bell starts ringing. '
        'Outside, two small scaly figures drag a sack of wheat into the dark, cackling in a hissing tongue. If the '
        'party gives chase: two kobold warriors fight briefly and flee toward the mill, dropping an old square silver '
        'coin. On top of the hill, the green light flares.'),
    'tips': [
        T('Se os jogadores forem direto ao moinho, deixe o bilhete de {@pipo} e as pegadas guiarem a descida. A '
          'cantiga pode ser aprendida depois: {@pipo} também a conhece, porque {@celestina} cantava para ele.',
          'If the players rush straight to the mill, let {@pipo}\'s note and the tracks lead them down. The song can '
          'be learned later: {@pipo} knows it too, because {@celestina} used to sing it to him.'),
        T('Se atacarem os kobolds de cara, {@skrit} se rende quando metade dos guerreiros cai e oferece ajuda contra '
          '{@pavio} em troca de um lugar seco para os ovos do clã.',
          'If they attack the kobolds head-on, {@skrit} surrenders once half the warriors fall and offers help against '
          '{@pavio} in exchange for a dry place for the clan\'s eggs.'),
        T('Se quiserem quebrar a lanterna, avise antes (Arcanismo CD 12): quebrar solta {@pavio} de vez. Fechar a '
          'tampa enquanto alguém canta a cantiga prende a chama de novo — sem precisar matar ninguém.',
          'If they want to smash the lantern, warn them first (Arcana DC 12): breaking it frees {@pavio} for good. '
          'Closing the lid while someone sings the lullaby binds the flame again — no killing required.'),
        T('Grupo de nível 2 ou com 5+ jogadores: some 2 kobolds guerreiros em cada encontro.',
          'Level 2 party or 5+ players: add 2 kobold warriors to each encounter.'),
        T('Se o grupo travar, {@bento} entra em pânico e confessa: ele tem a chave do porão do moinho.',
          'If the party gets stuck, {@bento} panics and confesses: he has the key to the mill cellar.'),
        T('No fim, os personagens sobem para o nível 2 (marco).', 'At the end, the characters reach level 2 (milestone).'),
    ],
    'planScenes': ['n1', 'n2', 'n3', 'n4', 'n5', 'n7', 'n8'],

    # ------------------------------------------------------------------ Mundo
    'entries': [
        {'key': 'vila', 'kind': 'place', 'data': {'placeType': 'village'},
         'name': T('Vau-de-Trigo', 'Wheatford'),
         'summary': T('Vila de trigais dourados à beira de um rio raso, com um moinho velho no alto da colina.',
                      'A village of golden wheat fields by a shallow river, with an old mill atop the hill.'),
         'body': T('Quarenta casas de taipa, uma praça com celeiro comunitário e uma ponte de pedra que a vila jura ter '
                   'mais de trezentos anos. Todo mundo se encontra na {@taverna}; quem está doente procura '
                   '{@celestina}. No alto da colina, o {@moinho} está parado desde a morte do moleiro.',
                   'Forty wattle houses, a square with a shared barn and a stone bridge the village swears is over '
                   'three hundred years old. Everyone meets at the {@taverna}; the sick seek out {@celestina}. Atop '
                   'the hill, the {@moinho} has stood still since the miller died.'),
         'dmNotes': T('Ponto de partida. A vila é amistosa, mas está com medo: estranhos são olhados de lado até '
                      'ajudarem em algo.',
                      'Starting point. The village is friendly but scared: strangers get sideways looks until they '
                      'help with something.'),
         'tags': T(['vila', 'início'], ['village', 'start']),
         'when': T('Fundada há trezentos anos', 'Founded three hundred years ago'), 'whenOrder': 1},
        {'key': 'taverna', 'kind': 'place', 'parent': 'vila', 'data': {'placeType': 'building'},
         'name': T('Taverna A Mó Cantante', 'The Singing Millstone Tavern'),
         'summary': T('Taverna com cheiro de pão quente e uma velha mó pendurada sobre a lareira.',
                      'A tavern smelling of warm bread, an old millstone hanging over the hearth.'),
         'body': T('Mesas compridas, um gato gordo no balcão e a melhor torta de maçã do vale. Quem manda aqui é '
                   '{@marta}.', 'Long tables, a fat cat on the counter and the best apple pie in the valley. '
                   '{@marta} runs the place.'),
         'tags': T(['taverna'], ['tavern']), 'links': [('vila', 'located_in')]},
        {'key': 'moinho', 'kind': 'place', 'parent': 'vila', 'data': {'placeType': 'building'},
         'name': T('O Moinho Velho', 'The Old Mill'),
         'summary': T('Moinho de vento parado há dez anos. Agora, à noite, uma luz verde passeia pelas janelas.',
                      'A windmill still for ten years. Now, at night, a green light drifts past its windows.'),
         'body': T('As pás estão quebradas e o telhado tem buracos, mas a porta de baixo foi aberta há pouco: a lama '
                   'na soleira está fresca.', 'The sails are broken and the roof is holed, but the lower door was '
                   'opened recently: the mud on the threshold is fresh.'),
         'dmNotes': T('Sob a mó grande há um alçapão para o porão; do porão, uma escada desce até a {@cisterna}.',
                      'Beneath the big millstone a trapdoor leads to the cellar; from the cellar, stairs go down to the '
                      '{@cisterna}.'),
         'tags': T(['moinho', 'masmorra'], ['mill', 'dungeon']), 'links': [('cisterna', 'other')]},
        {'key': 'cisterna', 'kind': 'place', 'parent': 'moinho', 'data': {'placeType': 'dungeon'},
         'name': T('A Cisterna dos Anões', 'The Dwarven Cistern'),
         'summary': T('Salões de pedra alagados, bem mais antigos que a vila.',
                      'Flooded stone halls, much older than the village.'),
         'body': T('Colunas com runas anãs apagadas, água pela cintura e o eco de pás cavando em algum lugar lá '
                   'embaixo.', 'Columns with worn dwarven runes, waist-deep water and the echo of shovels digging '
                   'somewhere below.'),
         'dmNotes': T('Toca do {@cla}. O túnel novo segue para o lado da {@capela}.',
                      'Lair of the {@cla}. The new tunnel heads toward the {@capela}.'),
         'tags': T(['masmorra'], ['dungeon'])},
        {'key': 'capela', 'kind': 'place', 'parent': 'vila', 'data': {'placeType': 'landmark'},
         'name': T('Capela da Fundadora', "The Founder's Chapel"),
         'summary': T('Capelinha de pedra onde a vila acende velas na colheita.',
                      'A little stone chapel where the village lights candles at harvest.'),
         'body': T('No chão, uma laje gasta com o desenho de uma lanterna fechada. As crianças pulam por cima dela '
                   'para dar sorte.', 'On the floor, a worn slab carved with a closed lantern. Children hop over it '
                   'for luck.'),
         'dmNotes': T('A laje é o selo que prende {@pavio}. Se o túnel dos kobolds chegar aqui e a laje rachar, o '
                      'diabrete fica livre.', 'The slab is the seal that holds {@pavio}. If the kobold tunnel reaches '
                      'it and the slab cracks, the imp is free.'),
         'tags': T(['templo', 'selo'], ['temple', 'seal'])},
        # NPCs
        {'key': 'marta', 'kind': 'npc', 'parent': 'taverna',
         'data': {'role': T('Dona da taverna', 'Tavern keeper'),
                  'appearance': T('Mulher larga e corada, avental sempre branco de farinha, tranças grisalhas.',
                                  'A broad, rosy woman, apron always white with flour, grey braids.'),
                  'mannerism': T('Limpa a farinha das mãos no avental o tempo todo e chama todo mundo de "meu bem".',
                                 'Keeps wiping flour off her hands on her apron and calls everyone "dear".'),
                  'wants': T('O sobrinho, Juca, de volta em casa — e paz na vila.',
                             'Her nephew Juca back home — and peace in the village.')},
         'name': T('Marta Sete-Fornos', 'Martha Sevenovens'),
         'summary': T('Dona da Mó Cantante. Oferece 50 peças de ouro a quem trouxer Juca de volta.',
                      'Keeper of the Singing Millstone. Offers 50 gold pieces to whoever brings Juca back.'),
         'body': T('Conhece cada morador pelo nome e pelo pão favorito. Tia de {@pipo}.',
                   'Knows every villager by name and favorite bread. Aunt of {@pipo}.'),
         'dmNotes': T('Ela viu {@bento} subindo para o moinho de madrugada com um carrinho de mão e ficou quieta: '
                      'gosta do rapaz e tem medo de acusá-lo à toa.',
                      'She saw {@bento} heading up to the mill at dawn with a wheelbarrow and kept quiet: she likes '
                      'the lad and fears accusing him for nothing.'),
         'secrets': [T('Marta viu Bento subir para o moinho de madrugada com um carrinho cheio de sacos.',
                       'Martha saw Bento go up to the mill at dawn with a wheelbarrow full of sacks.')],
         'tags': T(['taverna', 'aliada'], ['tavern', 'ally']), 'links': [('pipo', 'family'), ('bento', 'other')]},
        {'key': 'celestina', 'kind': 'npc', 'parent': 'vila',
         'data': {'role': T('Erveira', 'Herbalist'),
                  'appearance': T('Velhinha miúda de olhos muito vivos, xale verde e um cesto de ervas.',
                                  'A tiny old woman with very bright eyes, a green shawl and a basket of herbs.'),
                  'mannerism': T('Cantarola uma cantiga antiga enquanto trabalha e para de repente quando percebe.',
                                 'Hums an old lullaby while she works and stops suddenly when she notices.'),
                  'wants': T('Que ninguém suba ao moinho — e, se subirem, que voltem.',
                             'That nobody goes up to the mill — and, if they do, that they come back.')},
         'name': T('Avó Celestina', 'Granny Celestine'),
         'summary': T('Erveira da vila. Diz que a luz do moinho "não é fantasma nenhum".',
                      'The village herbalist. Says the light in the mill "is no ghost at all".'),
         'body': T('Neta da fundadora de Vau-de-Trigo. Cura febres, tosses e corações partidos. Cuidou de {@pipo} '
                   'quando ele era bebê.', "Granddaughter of Wheatford's founder. Cures fevers, coughs and broken "
                   'hearts. Looked after {@pipo} when he was a baby.'),
         'dmNotes': T('Sabe pela metade a história da {@lenda} e tem vergonha de contar: acha que ninguém vai '
                      'acreditar. Dá a {@cantiga} a quem for gentil (Persuasão CD 12) ou a quem mostrar a moeda anã.',
                      'Knows half the tale of the {@lenda} and is ashamed to tell it: thinks nobody will believe her. '
                      'Gives the {@cantiga} to anyone kind (Persuasion DC 12) or who shows her the dwarven coin.'),
         'secrets': [T('A cantiga que Celestina cantarola é a canção que prendeu a chama verde na lanterna.',
                       'The lullaby Celestine hums is the song that bound the green flame in the lantern.')],
         'tags': T(['aliada', 'saber'], ['ally', 'lore']), 'links': [('lenda', 'other'), ('pipo', 'ally')]},
        {'key': 'bento', 'kind': 'npc', 'parent': 'vila',
         'data': {'role': T('Herdeiro do moinho', 'Heir to the mill'),
                  'appearance': T('Rapaz magro de chapéu de palha furado, roupas melhores do que deveria ter.',
                                  'A thin young man in a holed straw hat, clothes nicer than he should afford.'),
                  'mannerism': T('Ri nervoso e conta moedas no bolso sem tirar a mão de lá.',
                                 'Laughs nervously and counts coins in his pocket without taking his hand out.'),
                  'wants': T('Pagar as dívidas e ir embora para a cidade grande.',
                             'To pay his debts and leave for the big city.')},
         'name': T('Bento Farinha', 'Ben Flourly'),
         'summary': T('Sobrinho do falecido moleiro. Diz que nunca mais pisou no moinho.',
                      'Nephew of the late miller. Says he has never set foot in the mill again.'),
         'body': T('Herdou o {@moinho} e nenhum dinheiro. Ultimamente pagou todas as contas na {@taverna}.',
                   'Inherited the {@moinho} and no money. Lately he has paid all his tabs at the {@taverna}.'),
         'dmNotes': T('Leva grão para os kobolds em troca de moedas anãs da cisterna. Não sabe dos sequestros e fica '
                      'horrorizado ao descobrir. Tem a chave do porão.',
                      'Brings grain to the kobolds in exchange for dwarven coins from the cistern. Does not know about '
                      'the kidnappings and is horrified to find out. Has the cellar key.'),
         'secrets': [T('Bento troca grão roubado com os kobolds por moedas anãs antigas.',
                       'Ben trades stolen grain with the kobolds for old dwarven coins.'),
                     T('Bento tem a chave do porão do moinho.', 'Ben has the key to the mill cellar.')],
         'tags': T(['suspeito'], ['suspect']), 'links': [('cla', 'owes'), ('moinho', 'other')]},
        {'key': 'pavio', 'kind': 'npc', 'parent': 'cisterna',
         'data': {'role': T('Vilão', 'Villain'),
                  'appearance': T('Uma chaminha verde dentro de uma lanterna de latão; quando se mostra, é um diabrete '
                                  'de chifres curvos e sorriso educado.',
                                  'A little green flame inside a brass lantern; when it shows itself, a curly-horned '
                                  'imp with a polite smile.'),
                  'mannerism': T('Fala doce e cheio de "por gentileza"; a chama tremula quando mente.',
                                 'Speaks sweetly, full of "if you would be so kind"; the flame flickers when it lies.'),
                  'wants': T('Sair da lanterna e cobrar trezentos anos de prisão de Vau-de-Trigo.',
                             'To get out of the lantern and make Wheatford pay for three hundred years in prison.')},
         'name': T('Pavio, a Chama Verde', 'Wick, the Green Flame'),
         'summary': T('A luz verde do moinho. Os kobolds o chamam de "Sol Verde".',
                      'The green light in the mill. The kobolds call it the "Green Sun".'),
         'body': T('Uma voz gentil que promete exatamente o que cada um quer ouvir.',
                   'A gentle voice that promises exactly what each person wants to hear.'),
         'dmNotes': T('Use as estatísticas de Diabrete. Enquanto preso, só fala e solta faíscas; se a lanterna '
                      'quebrar, luta (voa, fica invisível, foge se cair a 3 PV). Tenta subornar o grupo: "abram a '
                      'tampa e cada um terá um desejo pequeno".',
                      'Use the Imp stat block. While bound it only talks and spits sparks; if the lantern breaks it '
                      'fights (flies, turns invisible, flees at 3 HP). Tries to bribe the party: "open the lid and each '
                      'of you gets a small wish".'),
         'secrets': [T('Pavio está preso na lanterna: se a tampa for fechada enquanto alguém canta a cantiga da '
                       'fundadora, ele adormece de novo.',
                       "Wick is bound to the lantern: if the lid is closed while someone sings the founder's "
                       'lullaby, he falls asleep again.'),
                     T('Pavio mandou cavar o túnel até a capela para quebrar o selo.',
                       'Wick ordered the tunnel dug to the chapel to break the seal.')],
         'tags': T(['vilão'], ['villain']), 'links': [('cla', 'employer'), ('lanterna', 'other'), ('capela', 'enemy')]},
        {'key': 'skrit', 'kind': 'npc', 'parent': 'cisterna',
         'data': {'role': T('Chefe kobold', 'Kobold chief'),
                  'appearance': T('Kobold de escamas cor de ferrugem e um capacete feito de panela.',
                                  'A rust-scaled kobold wearing a helmet made from a cooking pot.'),
                  'mannerism': T('Fala de si na terceira pessoa ("Skrit não gosta") e cheira todo mundo.',
                                 'Speaks of himself in the third person ("Skrit no like") and sniffs everyone.'),
                  'wants': T('Um lugar seco e quente para os ovos do clã.', 'A dry, warm place for the clan\'s eggs.')},
         'name': T('Skrit Rabo-de-Brasa', 'Skrit Ember-Tail'),
         'summary': T('Chefe do clã kobold que se mudou para baixo do moinho.',
                      'Chief of the kobold clan that moved in beneath the mill.'),
         'body': T('Pequeno, desconfiado e muito orgulhoso do capacete.', 'Small, suspicious and very proud of his helmet.'),
         'dmNotes': T('Kobold Guerreiro com 10 PV. Odeia {@pavio}, mas tem medo dele. Troca de lado se o grupo '
                      'prometer abrigo (Persuasão CD 13, ou automático se {@bento} oferecer o porão do moinho).',
                      'Kobold Warrior with 10 HP. Hates {@pavio} but fears him. Switches sides if the party promises '
                      'shelter (Persuasion DC 13, or automatic if {@bento} offers the mill cellar).'),
         'secrets': [T('Os kobolds obedecem ao Sol Verde por medo e trocariam de lado por um abrigo seguro.',
                       'The kobolds obey the Green Sun out of fear and would switch sides for a safe shelter.')],
         'tags': T(['kobold'], ['kobold']), 'links': [('cla', 'member')]},
        {'key': 'pipo', 'kind': 'npc', 'parent': 'cisterna',
         'data': {'role': T('Pastorzinho desaparecido', 'Missing shepherd boy'),
                  'appearance': T('Menino de doze anos, sardento, com um cajado maior que ele.',
                                  'A freckled twelve-year-old with a crook taller than he is.'),
                  'mannerism': T('Valente e tagarela: conta tudo três vezes, cada vez maior.',
                                 'Brave and chatty: tells everything three times, bigger each time.'),
                  'wants': T('Voltar para casa e ver se as ovelhas estão bem.', 'To go home and check on his sheep.')},
         'name': T('Juca', 'Juca'),
         'summary': T('Sumiu há três noites, quando foi buscar uma ovelha perto do moinho.',
                      'Vanished three nights ago, fetching a sheep near the mill.'),
         'body': T('Sobrinho de {@marta}. Conhece cada pedra da colina.', 'Nephew of {@marta}. Knows every stone on the hill.'),
         'dmNotes': T('Preso na {@cisterna}, carregando terra do túnel. Achou uma passagem antiga com runas que leva '
                      'direto ao santuário da lanterna.',
                      'Held in the {@cisterna}, hauling dirt from the tunnel. Found an old rune passage that leads '
                      'straight to the lantern shrine.'),
         'secrets': [T('Juca sabe de uma porta de runas que leva direto ao santuário da lanterna.',
                       'Juca knows of a rune door that leads straight to the lantern shrine.')],
         'tags': T(['prisioneiro'], ['prisoner']), 'links': [('marta', 'family')]},
        {'key': 'matias', 'kind': 'npc', 'parent': 'cisterna',
         'data': {'role': T('Cavador de poços', 'Well-digger'),
                  'appearance': T('Velho careca de braços enormes e unhas sempre sujas de barro.',
                                  'A bald old man with huge arms and nails forever caked in clay.'),
                  'mannerism': T('Responde tudo com provérbios sobre água ("água parada não mente").',
                                 'Answers everything with water proverbs ("still water never lies").'),
                  'wants': T('Sair dali e nunca mais ver um túnel na vida.', 'To get out and never see another tunnel.')},
         'name': T('Matias Poço-Fundo', 'Matthias Deepwell'),
         'summary': T('Desapareceu na mesma noite que Juca.', 'Vanished the same night as Juca.'),
         'body': T('Cavou metade dos poços de Vau-de-Trigo.', "Dug half of Wheatford's wells."),
         'dmNotes': T('Os kobolds o levaram porque sabe cavar. Calcula que o túnel chega à {@capela} em dois dias.',
                      'The kobolds took him because he can dig. He reckons the tunnel reaches the {@capela} in two days.'),
         'secrets': [T('O túnel chega à capela em dois dias.', 'The tunnel reaches the chapel in two days.')],
         'tags': T(['prisioneiro'], ['prisoner'])},
        # facção
        {'key': 'cla', 'kind': 'faction', 'data': {'goal': T('Sobreviver e achar um lar seco.', 'Survive and find a dry home.'),
                                                    'symbolColor': '#c0562b'},
         'name': T('Clã Rabo-de-Brasa', 'The Ember-Tail Clan'),
         'summary': T('Kobolds refugiados de uma mina alagada.', 'Kobold refugees from a flooded mine.'),
         'body': T('Uns vinte kobolds, metade deles filhotes. Pintam a ponta do rabo de vermelho com barro.',
                   'About twenty kobolds, half of them young. They paint the tips of their tails red with clay.'),
         'dmNotes': T('Não são maus: estão assustados e obedecem a {@pavio}. Se o grupo os poupar, viram aliados '
                      'estranhos (e úteis) da vila.', 'They are not evil: they are frightened and obey {@pavio}. If '
                      'the party spares them, they become odd (and useful) allies of the village.'),
         'tags': T(['kobold'], ['kobold']), 'links': [('pavio', 'enemy')]},
        # lore
        {'key': 'boato', 'kind': 'lore', 'name': T('O fantasma do moleiro', "The miller's ghost"),
         'summary': T('Na taverna, juram que o velho moleiro voltou para moer de noite.',
                      'At the tavern they swear the old miller came back to grind at night.'),
         'body': T('Dizem que a luz verde é a lamparina do moleiro Ostran, que morreu devendo farinha à vila inteira.',
                   'They say the green light is miller Ostran\'s lamp — he died owing flour to the whole village.'),
         'dmNotes': T('Falso. O moleiro morreu de velhice e nunca soube da cisterna.',
                      'False. The miller died of old age and never knew about the cistern.'),
         'tags': T(['boato'], ['rumor'])},
        {'key': 'lenda', 'kind': 'lore', 'name': T('A Fundadora e a Chama', 'The Founder and the Flame'),
         'summary': T('Como a fundadora de Vau-de-Trigo enganou um diabrete com uma canção de ninar.',
                      "How Wheatford's founder tricked an imp with a lullaby."),
         'body': T('Há trezentos anos, uma chama falante queimava os trigais. A fundadora cantou para ela até que '
                   'dormisse, fechou-a numa lanterna e a escondeu debaixo da terra, sob uma pedra marcada.',
                   'Three hundred years ago a talking flame burned the wheat fields. The founder sang to it until it '
                   'slept, shut it in a lantern and hid it underground, beneath a marked stone.'),
         'dmNotes': T('Verdadeira. A pedra marcada é a laje da {@capela}.', 'True. The marked stone is the slab in '
                      'the {@capela}.'),
         'tags': T(['lenda'], ['legend']), 'when': T('Há trezentos anos', 'Three hundred years ago'), 'whenOrder': 0,
         'links': [('pavio', 'other'), ('capela', 'other')]},
        # documentos
        {'key': 'bilhete', 'kind': 'handout', 'data': {'style': 'note', 'recipients': 'all'},
         'name': T('Bilhete rabiscado de Juca', "Juca's scribbled note"),
         'summary': T('Escrito a carvão num pedaço de saco de farinha.', 'Written in charcoal on a scrap of flour sack.'),
         'body': T('Luz verde. Bichos de rabo vermelho. Eles cavam pra baixo da capela. O Matias tá aqui também. '
                   'Fala pra vó Celestina cantar a música. — J.',
                   'Green light. Critters with red tails. They dig under the chapel. Matthias is here too. Tell '
                   'Granny Celestine to sing the song. — J.'),
         'dmNotes': T('Fica preso num prego, no andar de cima do {@moinho}.', 'Hangs on a nail upstairs in the {@moinho}.'),
         'tags': T(['pista'], ['clue'])},
        {'key': 'diario', 'kind': 'handout', 'data': {'style': 'letter', 'recipients': 'all'},
         'name': T('Página do diário do moleiro', "A page from the miller's diary"),
         'summary': T('Papel amarelado, letra tremida.', 'Yellowed paper, shaky handwriting.'),
         'body': T('Dia de chuva. A mó grande não gira direito: tem um oco embaixo dela, ouço água correndo lá no fundo. '
                   'Meu avô dizia para nunca cavar debaixo do moinho. Vou pregar o alçapão e esquecer que vi.',
                   'Rainy day. The big millstone won\'t turn right: there is a hollow beneath it, I hear water running '
                   'deep below. My grandfather said never to dig under the mill. I will nail the trapdoor shut and '
                   'forget I ever saw it.'),
         'dmNotes': T('Na gaveta da mesa do {@moinho}. Indica o alçapão sob a mó.',
                      'In the desk drawer at the {@moinho}. Points to the trapdoor under the millstone.'),
         'tags': T(['pista'], ['clue'])},
        {'key': 'cantiga', 'kind': 'handout', 'data': {'style': 'scroll', 'recipients': 'all'},
         'name': T('A cantiga da Fundadora', "The Founder's Lullaby"),
         'summary': T('Quatro versos que toda criança de Vau-de-Trigo já ouviu.', 'Four lines every child in Wheatford has heard.'),
         'body': T('Dorme, chaminha, dorme no latão,\nque o trigo é dourado e não é carvão.\nFecha teu olho, apaga teu '
                   'chão,\nque a lua te guarda na escuridão.',
                   'Sleep, little flame, sleep in the brass,\nthe wheat is for gold and not for ash.\nClose your bright '
                   'eye, put out your glow,\nthe moon keeps you safe in the dark below.'),
         'dmNotes': T('Cantar estes versos enquanto alguém fecha a tampa da {@lanterna} prende {@pavio} de novo.',
                      'Singing these lines while someone closes the lid of the {@lanterna} binds {@pavio} again.'),
         'tags': T(['pista', 'música'], ['clue', 'song'])},
        # item
        {'key': 'lanterna', 'kind': 'item',
         'data': {'rarity': T('incomum', 'uncommon'), 'attunement': False,
                  'effect': T('Enquanto fechada com a chama dentro, ilumina 6 m em luz verde e nunca se apaga. '
                              'Aberta, liberta o que estiver preso nela.',
                              'While closed with the flame inside, sheds green light in a 20-foot radius and never '
                              'goes out. Opened, it frees whatever is bound in it.')},
         'name': T('A Lanterna de Latão', 'The Brass Lantern'),
         'summary': T('Lanterna anã de latão, coberta de runas, quente ao toque.',
                      'A dwarven brass lantern covered in runes, warm to the touch.'),
         'body': T('A tampa tem o desenho de uma lua fechando um olho.', 'The lid is engraved with a moon closing an eye.'),
         'dmNotes': T('Prisão de {@pavio}. Se o grupo ficar com ela, o diabrete vai tentar negociar a liberdade a '
                      'cada noite.', 'Prison of {@pavio}. If the party keeps it, the imp will try to bargain for its '
                      'freedom every night.'),
         'tags': T(['artefato'], ['artifact'])},
    ],

    # ------------------------------------------------------------------ Aventura
    'nodes': [
        {'id': 'n1', 'kind': 'combat', 'x': 0, 'y': 0, 'refs': ['taverna', 'vila', 'cla'],
         'name': T('Começo forte: o sino do celeiro', 'Strong start: the barn bell'),
         'readAloud': T('O fogo estala, a torta de maçã ainda fumega e alguém na mesa do canto jura que viu o '
                        'fantasma do moleiro. Então o sino do celeiro da praça começa a bater, desesperado. Pela '
                        'janela, vocês veem duas figuras pequenas, de rabo comprido, arrastando um saco de trigo para '
                        'o escuro — e rindo.',
                        'The fire crackles, the apple pie is still steaming and someone at the corner table swears '
                        "they saw the miller's ghost. Then the barn bell on the square starts ringing, frantic. "
                        'Through the window you see two small, long-tailed figures dragging a sack of wheat into the '
                        'dark — and laughing.'),
         'notes': T('Dois kobolds guerreiros. Lutam 2 rodadas e fogem colina acima. Quem cair larga uma moeda '
                    'quadrada de prata, com runas anãs (pista para {@bento} e {@celestina}). Depois da luta, '
                    '{@marta} oferece 50 po para trazerem {@pipo} de volta.',
                    'Two kobold warriors. They fight 2 rounds and flee up the hill. Whoever falls drops a square '
                    'silver coin with dwarven runes (clue for {@bento} and {@celestina}). After the fight, {@marta} '
                    'offers 50 gp to bring {@pipo} back.'),
         'encounter': [('kobold-warrior', 2)],
         'checks': [('survival', 10, T('Seguir as pegadas pequenas até a colina do moinho.', 'Follow the small tracks to the mill hill.')),
                    ('history', 12, T('Reconhecer a moeda: cunhagem anã, muito antiga.', 'Recognize the coin: dwarven minting, very old.'))]},
        {'id': 'n2', 'kind': 'social', 'x': 320, 'y': -120, 'refs': ['marta', 'bento', 'boato', 'taverna'],
         'name': T('A Mó Cantante', 'The Singing Millstone'),
         'readAloud': T('A taverna se enche de gente assustada falando ao mesmo tempo. Marta bate a colher na panela '
                        'até todo mundo calar e olha direto para vocês.',
                        'The tavern fills with frightened people all talking at once. Martha bangs a spoon on a pot '
                        'until everyone hushes, then looks straight at you.'),
         'notes': T('Boatos: o fantasma do moleiro; grão sumindo; {@bento} anda com dinheiro. Intuição CD 12 em '
                    '{@marta}: ela esconde algo sobre {@bento}. Se pressionado, {@bento} nega rindo nervoso; '
                    'Intimidação ou Persuasão CD 13 arranca a verdade e a chave do porão.',
                    'Rumors: the miller\'s ghost; grain vanishing; {@bento} has money lately. Insight DC 12 on '
                    '{@marta}: she is hiding something about {@bento}. Pressed, {@bento} denies it with a nervous '
                    'laugh; Intimidation or Persuasion DC 13 gets the truth and the cellar key.'),
         'checks': [('insight', 12, T('Perceber que Marta esconde algo sobre Bento.', 'Notice Martha is hiding something about Ben.')),
                    ('persuasion', 13, T('Bento confessa a troca de grão e entrega a chave.', 'Ben confesses the grain trade and hands over the key.')),
                    ('intimidation', 13, T('O mesmo, mas Bento passa a evitar o grupo.', 'Same, but Ben avoids the party afterwards.'))]},
        {'id': 'n3', 'kind': 'social', 'x': 320, 'y': 140, 'refs': ['celestina', 'lenda', 'cantiga', 'capela'],
         'name': T('A casa da Avó Celestina', "Granny Celestine's cottage"),
         'readAloud': T('Ervas penduradas no teto, uma chaleira cantando no fogo e uma velhinha que não parece nada '
                        'surpresa em vê-los. "Demoraram", ela diz. "Sentem. Não é fantasma nenhum."',
                        'Herbs hanging from the ceiling, a kettle singing on the fire and an old woman who does not '
                        'look surprised to see you at all. "You took your time," she says. "Sit. It is no ghost."'),
         'notes': T('Ela conta a lenda da {@lenda} se os personagens forem gentis (Persuasão CD 12) ou mostrarem a moeda anã. '
                    'Ensina a {@cantiga}. Se alguém visitar a {@capela}, Investigação CD 13 nota rachaduras novas em '
                    'volta da laje — o túnel está perto.',
                    'She tells the legend of the {@lenda} if the characters are kind (Persuasion DC 12) or show her the dwarven coin. '
                    'She teaches the {@cantiga}. If anyone visits the {@capela}, Investigation DC 13 notices fresh '
                    'cracks around the slab — the tunnel is close.'),
         'checks': [('persuasion', 12, T('Celestina conta a lenda e ensina a cantiga.', 'Celestine tells the legend and teaches the lullaby.')),
                    ('investigation', 13, T('Na capela: rachaduras novas em volta da laje.', 'At the chapel: fresh cracks around the slab.')),
                    ('medicine', 10, T('Ganhar 1 Kit de Curandeiro de presente por ajudar com os doentes.', "Receive a Healer's Kit as thanks for helping the sick."))],
         'treasure': {'items': [('healersKit', 1)]}},
        {'id': 'n4', 'kind': 'exploration', 'x': 640, 'y': 0, 'refs': ['moinho', 'bilhete', 'diario'],
         'name': T('O Moinho Velho', 'The Old Mill'),
         'readAloud': T('As pás quebradas rangem com o vento. Lá dentro, cheiro de mofo e de algo queimado. A mó '
                        'gigante está no centro, e o chão em volta dela está riscado, como se alguém a tivesse '
                        'arrastado muitas vezes.',
                        'The broken sails creak in the wind. Inside, a smell of mildew and of something burnt. The '
                        'giant millstone sits in the middle, and the floor around it is scored, as if someone had '
                        'dragged it many times.'),
         'notes': T('Andar de cima: o {@bilhete} num prego e a gaveta com o {@diario}. Ratos gigantes fizeram ninho '
                    'nos sacos velhos. A mó esconde o alçapão: Percepção CD 13 nota os riscos; Atletismo CD 12 '
                    'empurra a mó (ou a chave de {@bento} abre o cadeado).',
                    'Upstairs: the {@bilhete} on a nail and the drawer with the {@diario}. Giant rats nest in the old '
                    'sacks. The millstone hides the trapdoor: Perception DC 13 notices the scratches; Athletics DC 12 '
                    "pushes the stone (or {@bento}'s key opens the padlock)."),
         'encounter': [('giant-rat', 3)],
         'hazards': [{'name': T('Assoalho podre', 'Rotten floor'), 'dc': 11,
                      'effect': T('Salvaguarda de Destreza: quem falhar cai 3 m até o térreo.',
                                  'Dexterity saving throw: on a failure, fall 10 feet to the ground floor.'),
                      'damage': '1d6'}],
         'checks': [('perception', 13, T('Ver os riscos em volta da mó e o alçapão.', 'Spot the scratches around the millstone and the trapdoor.')),
                    ('athletics', 12, T('Empurrar a mó para o lado.', 'Push the millstone aside.'))],
         'treasure': {'coins': {'sp': 14}}},
        {'id': 'n5', 'kind': 'trap', 'x': 960, 'y': 0, 'refs': ['moinho', 'bento', 'cla'],
         'name': T('O porão do moinho', 'The mill cellar'),
         'readAloud': T('Degraus de madeira descem para um porão abarrotado de sacos de trigo — os sacos que '
                        'sumiram da vila. No canto, uma escada de pedra muito mais velha continua descendo, e de lá '
                        'sobe um ar frio e úmido.',
                        "Wooden steps lead down to a cellar crammed with wheat sacks — the village's missing sacks. "
                        'In the corner, a much older stone stair keeps going down, breathing cold, damp air.'),
         'notes': T('Os kobolds armaram uma rede com panelas penduradas no pé da escada de pedra: se disparar, os '
                    'guerreiros da {@cisterna} ficam alertas (sem surpresa no próximo encontro). Os sacos podem '
                    'voltar para a vila — a vila agradece.',
                    'The kobolds rigged a net hung with pots at the foot of the stone stair: if triggered, the '
                    'warriors in the {@cisterna} are alerted (no surprise in the next encounter). The sacks can go '
                    'back to the village — the village is grateful.'),
         'hazards': [{'name': T('Rede de panelas', 'Pot net'), 'dc': 12,
                      'effect': T('Salvaguarda de Destreza ou fica Contido (Atletismo CD 12 para soltar). O barulho '
                                  'alerta os kobolds.', 'Dexterity saving throw or Restrained (Athletics DC 12 to '
                                  'escape). The noise alerts the kobolds.'),
                      'damage': ''}],
         'checks': [('perception', 12, T('Ver a corda da armadilha.', 'Spot the trap cord.')),
                    ('sleightOfHand', 12, T('Desarmar a rede sem barulho.', 'Disarm the net silently.'))],
         'treasure': {'items': [('rope50ft', 1), ('lantern', 1)]}},
        {'id': 'n6', 'kind': 'exploration', 'x': 1280, 'y': 0, 'refs': ['cisterna'],
         'name': T('A cisterna alagada', 'The flooded cistern'),
         'readAloud': T('Colunas de pedra somem na escuridão. A água bate na cintura e está gelada. Bem à frente, '
                        'uma luz esverdeada pulsa, e o som de pás cavando ecoa por todo lado.',
                        'Stone columns vanish into darkness. The water is waist-deep and freezing. Far ahead, a '
                        'greenish light pulses, and the sound of digging shovels echoes everywhere.'),
         'notes': T('Sapos gigantes caçam na água escura. Numa parede, uma porta com runas anãs (a passagem que '
                    '{@pipo} achou) leva direto ao santuário: Percepção CD 14 para notar, ou {@pipo} mostra.',
                    'Giant frogs hunt in the dark water. In one wall, a door with dwarven runes (the passage {@pipo} '
                    'found) leads straight to the shrine: Perception DC 14 to notice, or {@pipo} shows it.'),
         'encounter': [('giant-frog', 2)],
         'checks': [('athletics', 10, T('Atravessar a correnteza sem perder nada.', 'Cross the current without losing anything.')),
                    ('perception', 14, T('Achar a porta de runas.', 'Find the rune door.')),
                    ('stealth', 12, T('Chegar ao acampamento kobold sem ser visto.', 'Reach the kobold camp unseen.'))]},
        {'id': 'n7', 'kind': 'social', 'x': 1600, 'y': -140, 'refs': ['skrit', 'pipo', 'matias', 'cla'],
         'name': T('O acampamento Rabo-de-Brasa', 'The Ember-Tail camp'),
         'readAloud': T('Fogueirinhas, ninhos de palha roubada e ovos enrolados em panos. Um menino sardento e um '
                        'velho careca carregam baldes de terra, vigiados por kobolds de lança. Um deles, de capacete '
                        'de panela, sobe num caixote e grita: "Skrit manda vocês pararem!"',
                        'Little fires, nests of stolen straw and eggs wrapped in cloth. A freckled boy and a bald old '
                        'man haul buckets of dirt, watched by spear-carrying kobolds. One of them, in a cooking-pot '
                        'helmet, climbs onto a crate and shouts: "Skrit says you stop!"'),
         'notes': T('{@skrit} e três guerreiros (use 4 Kobolds Guerreiros; Skrit tem 10 PV). Dá para negociar: '
                    'Persuasão CD 13 ou oferecer abrigo. Se metade cair, Skrit se rende. {@pipo} e {@matias} '
                    'contam do túnel e da porta de runas. Os kobolds guardam o "tesouro" do clã num caldeirão.',
                    '{@skrit} and three warriors (use 4 Kobold Warriors; Skrit has 10 HP). Negotiation works: '
                    'Persuasion DC 13 or an offer of shelter. If half fall, Skrit surrenders. {@pipo} and {@matias} '
                    'tell of the tunnel and the rune door. The kobolds keep the clan "treasure" in a cauldron.'),
         'encounter': [('kobold-warrior', 4)],
         'checks': [('persuasion', 13, T('Skrit aceita trocar de lado por um abrigo.', 'Skrit agrees to switch sides for shelter.')),
                    ('intimidation', 14, T('Os kobolds fogem e deixam os prisioneiros.', 'The kobolds flee and leave the prisoners.'))],
         'treasure': {'items': [('potionHealing', 2)], 'coins': {'gp': 30}}},
        {'id': 'n8', 'kind': 'boss', 'x': 1920, 'y': 0, 'refs': ['pavio', 'lanterna', 'cantiga', 'capela'],
         'name': T('O santuário da lanterna', 'The lantern shrine'),
         'readAloud': T('Uma câmara redonda, seca, com um altar de pedra no centro. Sobre ele, uma lanterna de latão '
                        'brilha em verde, e a luz desenha sombras que se mexem sozinhas. Uma voz muito educada diz: '
                        '"Ah, visitas. Por gentileza, abram a tampinha. Prometo recompensar cada um de vocês."',
                        'A round, dry chamber with a stone altar at its center. On it, a brass lantern glows green, '
                        'and the light casts shadows that move on their own. A very polite voice says: "Ah, guests. '
                        'If you would be so kind, open the little lid. I promise to reward each of you."'),
         'notes': T('{@pavio} negocia, mente e solta faíscas. Dois kobolds fanáticos defendem o altar. Para vencer: '
                    'fechar a tampa enquanto alguém canta a {@cantiga} (ação + teste de Atuação CD 12; com '
                    'Desvantagem se ninguém aprendeu a letra). Se a lanterna quebrar, {@pavio} sai como Diabrete '
                    'e luta. O túnel desta sala termina a poucos metros da {@capela}.',
                    '{@pavio} bargains, lies and spits sparks. Two zealous kobolds guard the altar. To win: close '
                    'the lid while someone sings the {@cantiga} (an action + Performance DC 12; with Disadvantage if '
                    'nobody learned the words). If the lantern breaks, {@pavio} emerges as an Imp and fights. The '
                    'tunnel from this room ends a few yards from the {@capela}.'),
         'encounter': [('imp', 1), ('kobold-warrior', 2)],
         'hazards': [{'name': T('Faíscas verdes', 'Green sparks'), 'dc': 12,
                      'effect': T('Uma vez por rodada, Pavio cospe faíscas em uma criatura a até 3 m da lanterna: '
                                  'Salvaguarda de Destreza para metade.',
                                  'Once per round, Wick spits sparks at one creature within 10 feet of the lantern: '
                                  'Dexterity saving throw for half.'),
                      'damage': '1d6'}],
         'checks': [('performance', 12, T('Cantar a cantiga enquanto alguém fecha a tampa.', 'Sing the lullaby while someone closes the lid.')),
                    ('arcana', 12, T('Entender que quebrar a lanterna liberta Pavio.', 'Understand that breaking the lantern frees Wick.')),
                    ('insight', 13, T('Perceber quando Pavio mente (a chama tremula).', 'Notice when Wick lies (the flame flickers).'))],
         'treasure': {'items': [('cloakProtection', 1), ('ammo+1', 6)], 'coins': {'gp': 25}}},
    ],
    'edges': [
        ('e1', 'n1', 'n2', 'path', T('Voltar à taverna', 'Back to the tavern'), ''),
        ('e2', 'n2', 'n3', 'path', T('Rua das ervas', 'Herb lane'), ''),
        ('e3', 'n2', 'n4', 'path', T('Subir a colina', 'Up the hill'), ''),
        ('e4', 'n1', 'n4', 'path', T('Seguir os kobolds', 'Chase the kobolds'), ''),
        ('e5', 'n3', 'n4', 'path', T('Trilha da colina', 'Hill path'), ''),
        ('e6', 'n4', 'n5', 'locked', T('Alçapão sob a mó', 'Trapdoor under the millstone'),
         T('Percepção CD 13 + Atletismo CD 12, ou a chave de Bento', "Perception DC 13 + Athletics DC 12, or Ben's key")),
        ('e7', 'n5', 'n6', 'stairs', T('Escada de pedra', 'Stone stair'), ''),
        ('e8', 'n6', 'n7', 'path', T('Seguir o som das pás', 'Follow the shovel sounds'), ''),
        ('e9', 'n7', 'n8', 'path', T('O túnel novo', 'The new tunnel'), ''),
        ('e10', 'n6', 'n8', 'secret', T('Porta de runas', 'Rune door'), T('Percepção CD 14, ou Juca mostra', 'Perception DC 14, or Juca shows it')),
    ],
    # (texto, cartão, índice do segredo no cartão)
    'clues': [
        (T('Os desaparecidos estão debaixo do moinho, cavando um túnel.', 'The missing are beneath the mill, digging a tunnel.'), 'bilhete', None),
        (T('Bento troca grão com os kobolds por moedas anãs.', 'Ben trades grain with the kobolds for dwarven coins.'), 'bento', 0),
        (T('Há um alçapão debaixo da mó do moinho.', 'There is a trapdoor beneath the mill\'s millstone.'), 'diario', None),
        (T('A luz verde é uma criatura presa numa lanterna.', 'The green light is a creature bound in a lantern.'), 'pavio', 0),
        (T('A cantiga da Avó Celestina prende a chama de novo.', "Granny Celestine's lullaby binds the flame again."), 'celestina', 0),
        (T('Se o túnel chegar à capela, o selo se rompe.', 'If the tunnel reaches the chapel, the seal breaks.'), 'lenda', None),
        (T('Os kobolds obedecem por medo e aceitariam um abrigo.', 'The kobolds obey out of fear and would accept a shelter.'), 'skrit', 0),
        (T('Matias calcula que o túnel chega à capela em dois dias.', 'Matthias reckons the tunnel reaches the chapel in two days.'), 'matias', 0),
    ],
}

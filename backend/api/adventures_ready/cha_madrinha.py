"""Aventura pronta 2 — "O Chá da Madrinha Urtiga" (níveis 2–3). Texto original da Forja."""
from . import T

PACK = {
    'id': 'cha-da-madrinha',
    'levels': '2–3',
    'sessions': '2–3',
    'art': '/art/covers/dark-forest.webp',
    'artFallback': '/art/backgrounds/guide.webp',
    'theme': T('Jornada na floresta das fadas', 'A journey into the fey forest'),
    'name': T('O Chá da Madrinha Urtiga', "Granny Nettle's Tea"),
    'tagline': T('As crianças de Orvalhal adormeceram e não acordam. A cura cresce no coração do bosque das fadas.',
                 "Dewhollow's children have fallen asleep and will not wake. The cure grows in the heart of the fey wood."),
    'pitch': T('Uma a uma, as crianças de Orvalhal caem num sono do qual ninguém consegue acordá-las. A querida '
               'Madrinha Urtiga, erveira da vila, diz que só a Flor-da-Lua, que cresce na corte das fadas do Bosque '
               'Sussurrante, pode curá-las. Lobos, um sátiro de charadas, teias, fogos-fátuos e uma rainha feérica '
               'que responde perguntas com perguntas — e um segredo de quarenta anos esperando no fim do caminho.',
               "One by one, Dewhollow's children fall into a sleep no one can wake them from. Beloved Granny Nettle, "
               'the village herbalist, says only the Moonbloom, which grows in the fey court of the Whisperwood, can '
               'cure them. Wolves, a riddling satyr, webs, will-o\'-wisps and a fey lady who answers questions with '
               'questions — and a forty-year-old secret waiting at the end of the road.'),
    'synopsis': T(
        'Quarenta anos atrás, a parteira Rosa foi acusada pela morte de um bebê e expulsa de Orvalhal para o bosque. '
        'A culpa era de {@tome}, que estava bêbado na noite do parto e mentiu para salvar o nome. No bosque, Rosa '
        'virou uma bruxa verde e voltou com outro rosto: a doce {@urtiga}. Agora ela se vinga: seu chá põe as '
        'crianças da vila num sono sem fim e guarda os sonhos delas em potes no {@casebre}. Ela manda o grupo buscar '
        'a {@flor} porque só forasteiros podem colhê-la — e a flor é o selo do {@pacto} que protege Orvalhal das '
        'fadas e dela. Se a flor for colhida, a vila fica indefesa. {@liriel}, a senhora do bosque, sabe disso e testa '
        'o grupo. O caminho certo passa por descobrir quem é a Madrinha, quebrar os potes de sonho e, se o grupo '
        'quiser, arrancar a confissão de {@tome}.',
        'Forty years ago, the midwife Rosa was blamed for a baby\'s death and driven out of Dewhollow into the woods. '
        'The fault was {@tome}\'s: he was drunk on the night of the birth and lied to save his name. In the woods, Rosa '
        'became a green hag and came back with a new face: sweet {@urtiga}. Now she takes her revenge: her tea puts '
        "the village children into an endless sleep and keeps their dreams in jars at the {@casebre}. She sends the "
        'party for the {@flor} because only outsiders can pick it — and the flower is the seal of the {@pacto} that '
        'protects Dewhollow from the fey and from her. If the flower is picked, the village is defenseless. {@liriel}, '
        'the lady of the wood, knows this and tests the party. The right road means learning who Granny really is, '
        "breaking the dream jars and, if the party wishes, drawing a confession out of {@tome}."),
    'hook': T(
        'É noite de festa em Orvalhal: lanternas de papel, pão doce e música de rabeca. No meio de uma risada, o '
        'pequeno Davi, filho da caçadora Lia, deita a cabeça na mesa e dorme. Ninguém consegue acordá-lo — como as '
        'outras quatro crianças que dormem há dias. A Madrinha Urtiga, a erveira que todos amam, chega com uma '
        'chaleira fumegante e os olhos cheios de lágrimas. "Só a Flor-da-Lua cura isso", ela diz. "E ela cresce onde '
        'gente da vila não pode entrar."',
        "It is festival night in Dewhollow: paper lanterns, sweet bread and fiddle music. In the middle of a laugh, "
        'little Davi, son of the huntress Lia, lays his head on the table and falls asleep. No one can wake him — '
        'like the other four children who have been sleeping for days. Granny Nettle, the herbalist everyone loves, '
        'arrives with a steaming kettle and tears in her eyes. "Only the Moonbloom can cure this," she says. "And it '
        'grows where village folk cannot go."'),
    'strongStart': T(
        'Comece no meio da festa, com Davi caindo no sono na mesa ao lado dos personagens. Lia grita, a música para, '
        'e uma revoada de corvos levanta das árvores na beira do bosque — todos olhando para a vila. A Madrinha '
        'Urtiga aparece em seguida, oferece chá a todos (quem beber precisa de uma salvaguarda de Constituição CD 10 '
        'ou fica sonolento até o amanhecer) e pede ajuda.',
        'Start in the middle of the festival, with Davi falling asleep at the table next to the characters. Lia '
        'screams, the music stops, and a flock of crows rises from the trees at the edge of the woods — all of them '
        'watching the village. Granny Nettle appears right after, offers everyone tea (whoever drinks makes a DC 10 '
        'Constitution saving throw or is drowsy until dawn) and asks for help.'),
    'tips': [
        T('Se os jogadores desconfiarem da Madrinha cedo, ótimo: ela finge mágoa, manda {@pimpim} segui-los e o '
          'confronto acontece no {@casebre}.',
          'If the players suspect Granny early, great: she feigns hurt, sends {@pimpim} to follow them and the '
          'showdown happens at the {@casebre}.'),
        T('Se colherem a {@flor} e a entregarem à Madrinha, ela ri, mostra a cara verdadeira e foge para o charco. '
          'A vila fica sem proteção até o {@pacto} ser renovado — o final fica mais urgente.',
          'If they pick the {@flor} and hand it to Granny, she laughs, shows her true face and flees to the bog. The '
          'village is unprotected until the {@pacto} is renewed — the ending becomes more urgent.'),
        T('Se convencerem {@tome} a confessar diante da bruxa (Persuasão CD 15, ou mostrando a {@carta}), ela pode '
          'desistir sem luta: quebra os potes e some no bosque. Final de redenção.',
          'If they convince {@tome} to confess before the hag (Persuasion DC 15, or by showing the {@carta}), she may '
          'give up without a fight: she breaks the jars and vanishes into the woods. A redemption ending.'),
        T('Fadas não mentem diretamente: {@liriel} e {@pimpim} enganam com meias-verdades. Responda às perguntas do '
          'grupo com outra pergunta quando elas falarem.',
          'Fey never lie outright: {@liriel} and {@pimpim} deceive with half-truths. Answer the party\'s questions '
          'with another question when they speak.'),
        T('Nível 3 ou 5+ jogadores: some 1 aranha gigante na teia e 2 lobos na trilha.',
          'Level 3 or 5+ players: add 1 giant spider to the web and 2 wolves to the trail.'),
        T('No fim, os personagens sobem um nível (marco).', 'At the end, the characters gain a level (milestone).'),
    ],
    'planScenes': ['n1', 'n2', 'n3', 'n4', 'n7', 'n8', 'n9'],

    'entries': [
        {'key': 'vila', 'kind': 'place', 'data': {'placeType': 'village'},
         'name': T('Orvalhal', 'Dewhollow'),
         'summary': T('Vila de lenhadores e apicultores na beira do Bosque Sussurrante.',
                      'A village of woodcutters and beekeepers at the edge of the Whisperwood.'),
         'body': T('Casas de madeira com telhados de musgo, colmeias em todo quintal e um círculo de pedras antigas '
                   'onde, antigamente, se deixava pão para as fadas. Quem manda, por costume, é {@tome}.',
                   'Wooden houses with mossy roofs, beehives in every yard and a ring of old standing stones where, '
                   'once upon a time, bread was left for the fey. By custom, {@tome} is in charge.'),
         'dmNotes': T('Faz dez anos que ninguém deixa pão nas pedras: o {@pacto} está fraco.',
                      'Nobody has left bread at the stones for ten years: the {@pacto} is weak.'),
         'tags': T(['vila', 'início'], ['village', 'start'])},
        {'key': 'bosque', 'kind': 'place', 'data': {'placeType': 'region'},
         'name': T('O Bosque Sussurrante', 'The Whisperwood'),
         'summary': T('Floresta antiga onde as árvores parecem cochichar quando o vento para.',
                      'An ancient forest where the trees seem to whisper when the wind stops.'),
         'body': T('Trilhas que mudam de lugar, cogumelos que brilham e uma corte de fadas que não gosta de visitas '
                   'sem educação.', 'Paths that move, glowing mushrooms and a fey court that dislikes rude guests.'),
         'tags': T(['floresta', 'fadas'], ['forest', 'fey'])},
        {'key': 'vau', 'kind': 'place', 'parent': 'bosque', 'data': {'placeType': 'landmark'},
         'name': T('O Vau das Charadas', 'The Riddle Ford'),
         'summary': T('Um riacho de pedras lisas guardado por um sátiro que adora charadas.',
                      'A stream of smooth stones guarded by a satyr who loves riddles.'),
         'body': T('Só se atravessa pelas pedras certas. {@bartolomeu} sabe quais são.',
                   'You can only cross on the right stones. {@bartolomeu} knows which.'),
         'tags': T(['enigma'], ['puzzle'])},
        {'key': 'clareira', 'kind': 'place', 'parent': 'bosque', 'data': {'placeType': 'landmark'},
         'name': T('A Clareira das Mil Lanternas', 'The Glade of a Thousand Lanterns'),
         'summary': T('Onde vagalumes do tamanho de punhos iluminam a corte do orvalho.',
                      'Where fist-sized fireflies light the dew court.'),
         'body': T('No centro, um carvalho branco e, aos pés dele, uma única flor prateada que só abre à noite.',
                   'At its heart, a white oak, and at its foot a single silver flower that only opens at night.'),
         'tags': T(['fadas'], ['fey']), 'links': [('corte', 'other'), ('flor', 'other')]},
        {'key': 'casebre', 'kind': 'place', 'parent': 'bosque', 'data': {'placeType': 'building'},
         'name': T('O casebre do charco', 'The bog hut'),
         'summary': T('Uma choupana torta sobre palafitas, no meio de um charco que cheira a hortelã.',
                      'A crooked hut on stilts in the middle of a bog that smells of mint.'),
         'body': T('Ninguém em Orvalhal sabe que este lugar existe.', 'No one in Dewhollow knows this place exists.'),
         'dmNotes': T('O verdadeiro lar de {@urtiga}. Prateleiras com potes de vidro: em cada um, um sonho de '
                      'criança brilhando.', "{@urtiga}'s true home. Shelves of glass jars: in each, a child's dream glowing."),
         'tags': T(['covil'], ['lair'])},
        # NPCs
        {'key': 'urtiga', 'kind': 'npc', 'parent': 'vila',
         'data': {'role': T('Erveira da vila', 'Village herbalist'),
                  'appearance': T('Velhinha roliça, bochechas rosadas, avental de bolsos cheios de saquinhos de chá.',
                                  'A plump old woman with rosy cheeks and an apron whose pockets are full of tea pouches.'),
                  'mannerism': T('Serve chá a todos sem perguntar e chama todo mundo de "meus pintinhos". Sempre cheira '
                                 'a hortelã.', 'Serves everyone tea without asking and calls them "my chicks". Always '
                                 'smells of mint.'),
                  'wants': T('Que Orvalhal pague pelo que lhe fez.', 'For Dewhollow to pay for what it did to her.')},
         'name': T('Madrinha Urtiga', 'Granny Nettle'),
         'summary': T('A erveira que todos amam. Diz que só a Flor-da-Lua acorda as crianças.',
                      'The herbalist everyone loves. Says only the Moonbloom can wake the children.'),
         'body': T('Chegou a Orvalhal há uns dez anos e logo virou "a madrinha" de todo mundo.',
                   'She came to Dewhollow about ten years ago and soon became everyone\'s "granny".'),
         'dmNotes': T('Bruxa Verde disfarçada (ilusão). Intuição CD 15 percebe que o carinho dela é ensaiado. Se '
                      'desmascarada antes da hora, finge mágoa e some para o {@casebre}.',
                      'A Green Hag in disguise (illusion). Insight DC 15 notices her warmth is rehearsed. If unmasked '
                      'too soon, she feigns hurt and vanishes to the {@casebre}.'),
         'secrets': [T('A Madrinha Urtiga é uma bruxa verde disfarçada.', 'Granny Nettle is a green hag in disguise.'),
                     T('Ela é Rosa, a parteira expulsa de Orvalhal quarenta anos atrás.',
                       'She is Rosa, the midwife driven out of Dewhollow forty years ago.'),
                     T('Os sonhos das crianças estão presos em potes no casebre do charco; quebrar os potes acorda todas.',
                       "The children's dreams are trapped in jars at the bog hut; breaking the jars wakes them all.")],
         'tags': T(['vilã'], ['villain']), 'links': [('tome', 'enemy'), ('pimpim', 'employer'), ('casebre', 'other')]},
        {'key': 'tome', 'kind': 'npc', 'parent': 'vila',
         'data': {'role': T('Ancião da vila', 'Village elder'),
                  'appearance': T('Velho alto de bengala de freixo, barba branca bem penteada, colete de veludo.',
                                  'A tall old man with an ash cane, a neatly combed white beard and a velvet waistcoat.'),
                  'mannerism': T('Começa toda frase com "no meu tempo…" e bate a bengala no chão para encerrar o assunto.',
                                 'Starts every sentence with "in my day…" and taps his cane to end the matter.'),
                  'wants': T('Manter a vila em ordem — e o próprio nome limpo.', 'To keep the village in order — and his name clean.')},
         'name': T('Velho Tomé', 'Old Tomé'),
         'summary': T('O ancião de Orvalhal. Promete 100 po a quem acordar as crianças.',
                      "Dewhollow's elder. Promises 100 gp to whoever wakes the children."),
         'body': T('Respeitado, rico em colmeias e pobre em paciência. Desconfia de tudo que vem do bosque.',
                   'Respected, rich in beehives and poor in patience. Distrusts everything that comes from the woods.'),
         'dmNotes': T('Escreveu uma confissão que nunca enviou ({@carta}); está escondida no livro de '
                      'orações da casa dele. Fica pálido se alguém disser o nome "Rosa".',
                      'He wrote a confession he never sent ({@carta}); it is hidden in his prayer book at home. He '
                      'goes pale if anyone says the name "Rosa".'),
         'secrets': [T('Tomé mentiu: foi culpa dele, não da parteira, a morte do bebê quarenta anos atrás.',
                       'Tomé lied: the baby\'s death forty years ago was his fault, not the midwife\'s.')],
         'tags': T(['autoridade'], ['authority']), 'links': [('lenda', 'other')]},
        {'key': 'lia', 'kind': 'npc', 'parent': 'vila',
         'data': {'role': T('Caçadora', 'Huntress'),
                  'appearance': T('Mulher de cabelo curto, cicatriz no queixo, aljava sempre cheia.',
                                  'A short-haired woman with a scar on her chin and a quiver always full.'),
                  'mannerism': T('Conta as flechas da aljava quando está nervosa; fala pouco e direto.',
                                 'Counts the arrows in her quiver when nervous; speaks little and bluntly.'),
                  'wants': T('O filho, Davi, acordado. Vai junto se o grupo deixar.',
                             'Her son Davi awake. She will come along if the party lets her.')},
         'name': T('Lia Cardo', 'Lia Thistle'),
         'summary': T('Mãe de Davi, a última criança que adormeceu. Conhece as trilhas do bosque.',
                      'Mother of Davi, the latest child to fall asleep. Knows the forest trails.'),
         'body': T('A melhor arqueira de Orvalhal. Não acredita em fadas — ainda.',
                   "Dewhollow's best archer. Doesn't believe in fey — yet."),
         'dmNotes': T('Use Batedor se ela lutar junto. Numa noite, seguiu {@urtiga} até a beira do bosque e a viu '
                      'conversando com um corvo de olhos humanos — achou que era sonho.',
                      'Use Scout if she fights alongside. One night she followed {@urtiga} to the edge of the woods '
                      'and saw her talking to a crow with human eyes — she thought it was a dream.'),
         'secrets': [T('Lia viu a Madrinha conversando com um corvo de olhos humanos na beira do bosque.',
                       'Lia saw Granny talking to a crow with human eyes at the edge of the woods.')],
         'tags': T(['aliada', 'guia'], ['ally', 'guide'])},
        {'key': 'liriel', 'kind': 'npc', 'parent': 'clareira',
         'data': {'role': T('Senhora do Bosque', 'Lady of the Wood'),
                  'appearance': T('Dríade de pele de casca clara e cabelo de folhas que mudam de cor com o humor.',
                                  'A dryad with pale bark skin and leaf hair that changes color with her mood.'),
                  'mannerism': T('Responde perguntas com perguntas; onde pisa, nascem flores miúdas.',
                                 'Answers questions with questions; tiny flowers sprout where she steps.'),
                  'wants': T('Que a vila volte a honrar o pacto — e que ninguém colha a flor.',
                             'For the village to honor the pact again — and for no one to pick the flower.')},
         'name': T('Senhora Liriel', 'Lady Liriel'),
         'summary': T('A dríade que governa a corte do orvalho.', 'The dryad who rules the dew court.'),
         'body': T('Antiga como o carvalho branco. Cansada de ser esquecida por Orvalhal.',
                   'As old as the white oak. Tired of being forgotten by Dewhollow.'),
         'dmNotes': T('Use Dríade. Não luta contra quem for educado. Testa o grupo com três provas: dar algo que '
                      'ame, dizer uma verdade que doa, dançar até a lua passar do carvalho. Se o grupo passar, conta '
                      'o que a {@flor} realmente é e aponta o caminho do {@casebre}.',
                      'Use Dryad. She will not fight anyone polite. She tests the party with three trials: give '
                      'something they love, tell a truth that hurts, dance until the moon passes the oak. If they '
                      'pass, she reveals what the {@flor} truly is and points the way to the {@casebre}.'),
         'secrets': [T('A Flor-da-Lua é o selo do pacto: colhê-la deixa Orvalhal sem proteção.',
                       'The Moonbloom is the seal of the pact: picking it leaves Dewhollow unprotected.')],
         'tags': T(['fadas', 'aliada?'], ['fey', 'ally?']), 'links': [('corte', 'member'), ('urtiga', 'enemy')]},
        {'key': 'pimpim', 'kind': 'npc', 'parent': 'clareira',
         'data': {'role': T('Mensageiro da corte', 'Court messenger'),
                  'appearance': T('Sprite do tamanho de uma mão, asas de libélula e chapéu de bolota.',
                                  'A hand-sized sprite with dragonfly wings and an acorn-cap hat.'),
                  'mannerism': T('Fala rapidíssimo, sempre rimando, e nunca para no ar.',
                                 'Talks incredibly fast, always rhyming, and never hovers still.'),
                  'wants': T('Mel. Muito mel.', 'Honey. Lots of honey.')},
         'name': T('Pimpim', 'Pimpim'),
         'summary': T('Um sprite tagarela que aparece para "ajudar" o grupo no bosque.',
                      'A chatty sprite who shows up to "help" the party in the woods.'),
         'body': T('Conhece todas as trilhas e todos os fuxicos do bosque.', 'Knows every trail and every bit of forest gossip.'),
         'dmNotes': T('Espião de {@urtiga}, pago em mel. Leva notícias do grupo para o {@casebre}. Se pego (Intuição '
                      'CD 13), troca de lado por um pote de mel melhor.',
                      'A spy for {@urtiga}, paid in honey. Carries news of the party to the {@casebre}. If caught '
                      '(Insight DC 13), switches sides for a better jar of honey.'),
         'secrets': [T('Pimpim espiona o grupo para a Madrinha em troca de mel.',
                       'Pimpim spies on the party for Granny in exchange for honey.')],
         'tags': T(['fadas', 'espião'], ['fey', 'spy']), 'links': [('urtiga', 'employer'), ('corte', 'member')]},
        {'key': 'bartolomeu', 'kind': 'npc', 'parent': 'vau',
         'data': {'role': T('Guardião do vau', 'Ford warden'),
                  'appearance': T('Sátiro de chifres enfeitados com fitas e uma flauta de bambu na cintura.',
                                  'A satyr with ribbon-wrapped horns and a bamboo flute at his belt.'),
                  'mannerism': T('Toca três notas na flauta entre uma frase e outra.', 'Plays three notes on his flute between sentences.'),
                  'wants': T('Alguém que o vença numa charada ou numa dança.', 'Someone to beat him at a riddle or a dance.')},
         'name': T('Bartolomeu', 'Bartholomew'),
         'summary': T('O sátiro do Vau das Charadas. Ninguém passa sem jogar com ele.',
                      'The satyr of the Riddle Ford. No one crosses without playing his game.'),
         'body': T('Brincalhão, vaidoso e muito mais velho do que parece.', 'Playful, vain and much older than he looks.'),
         'dmNotes': T('Use Sátiro. Charadas (respostas entre parênteses): "Corre sem pernas, canta sem boca, e quem me '
                      'atravessa não volta seco" (o riacho); "Quanto mais se tira, maior fica" (um buraco); "Tenho '
                      'cidades sem casas e rios sem água" (um mapa). Conhecia Rosa quando ela era humana.',
                      'Use Satyr. Riddles (answers in parentheses): "I run with no legs, sing with no mouth, and whoever '
                      'crosses me won\'t come back dry" (the stream); "The more you take, the bigger I get" (a hole); '
                      '"I have cities but no houses, rivers but no water" (a map). He knew Rosa when she was human.'),
         'secrets': [T('Bartolomeu sabe que a Madrinha já foi humana e se chamava Rosa.',
                       'Bartholomew knows Granny was once human and named Rosa.')],
         'tags': T(['fadas'], ['fey']), 'links': [('corte', 'member')]},
        # facção
        {'key': 'corte', 'kind': 'faction',
         'data': {'goal': T('Manter o bosque intocado e ser lembrada pelos mortais.', 'Keep the wood untouched and be remembered by mortals.'),
                  'symbolColor': '#5fa37a'},
         'name': T('A Corte do Orvalho', 'The Dew Court'),
         'summary': T('As fadas do Bosque Sussurrante.', 'The fey of the Whisperwood.'),
         'body': T('Sprites, um sátiro, cães cintilantes e uma dríade antiga. Adoram presentes, odeiam promessas quebradas.',
                   'Sprites, a satyr, blink dogs and an ancient dryad. They love gifts and hate broken promises.'),
         'tags': T(['fadas'], ['fey'])},
        # lore
        {'key': 'lenda', 'kind': 'lore', 'name': T('A parteira banida', 'The banished midwife'),
         'summary': T('Quarenta anos atrás, uma parteira foi expulsa de Orvalhal sob a acusação de matar um bebê.',
                      'Forty years ago, a midwife was driven out of Dewhollow, accused of killing a baby.'),
         'body': T('Os velhos dizem que ela foi para o bosque e nunca mais saiu. Alguns dizem que ela virou corvo.',
                   'The elders say she went into the woods and never came out. Some say she turned into a crow.'),
         'dmNotes': T('Ela se chamava Rosa. É {@urtiga}.', 'Her name was Rosa. She is {@urtiga}.'),
         'tags': T(['lenda'], ['legend']), 'when': T('Há quarenta anos', 'Forty years ago'), 'whenOrder': 1,
         'links': [('urtiga', 'other'), ('tome', 'other')]},
        {'key': 'pacto', 'kind': 'lore', 'name': T('O pacto do pão', 'The bread pact'),
         'summary': T('Um costume antigo: deixar pão nas pedras em pé a cada solstício.',
                      'An old custom: leaving bread at the standing stones every solstice.'),
         'body': T('Em troca do pão, as fadas guardavam a vila de "tudo que vem do bosque com fome".',
                   'In exchange for bread, the fey guarded the village from "everything that comes hungry from the woods".'),
         'dmNotes': T('A {@flor} é o selo vivo do pacto. Renovar o pacto (pão nas pedras + desculpas a {@liriel}) '
                      'protege a vila de novo.', 'The {@flor} is the living seal of the pact. Renewing it (bread at '
                      'the stones + an apology to {@liriel}) protects the village again.'),
         'tags': T(['costume'], ['custom']), 'when': T('Desde a fundação', 'Since the founding'), 'whenOrder': 0,
         'links': [('corte', 'other'), ('flor', 'other')]},
        # documentos
        {'key': 'receita', 'kind': 'handout', 'data': {'style': 'note', 'recipients': 'all'},
         'name': T('Receita do chá da Madrinha', "Granny's tea recipe"),
         'summary': T('Letra redonda e caprichada, num papel que cheira a hortelã.', 'Round, careful handwriting on paper that smells of mint.'),
         'body': T('Para o sono bom:\n– três folhas de hortelã-do-charco\n– uma colher de mel escuro\n– orvalho colhido '
                   'antes do galo\n– um fio de cabelo de quem vai dormir\nMexer sete vezes ao contrário. Servir quente.',
                   'For a good sleep:\n– three leaves of bog mint\n– a spoonful of dark honey\n– dew gathered before the '
                   'rooster\n– one hair from whoever will sleep\nStir seven times backwards. Serve hot.'),
         'dmNotes': T('Na gaveta da cozinha de {@urtiga}, na vila. "Um fio de cabelo de quem vai dormir" é a pista.',
                      "In the kitchen drawer at {@urtiga}'s village cottage. \"One hair from whoever will sleep\" is the clue."),
         'tags': T(['pista'], ['clue'])},
        {'key': 'carta', 'kind': 'handout', 'data': {'style': 'letter', 'recipients': 'all'},
         'name': T('Carta de Tomé, nunca enviada', "Tomé's letter, never sent"),
         'summary': T('Dobrada muitas vezes, com manchas de lágrima.', 'Folded many times, with tear stains.'),
         'body': T('Rosa, eu sei que você não vai ler isto. Naquela noite eu bebi, não chamei você a tempo, e quando '
                   'chamei já era tarde. Deixei a vila culpar você porque era mais fácil do que olhar para mim. '
                   'Perdoe um covarde. — T.',
                   'Rosa, I know you will never read this. That night I drank, I did not call you in time, and when I '
                   'did it was too late. I let the village blame you because it was easier than looking at myself. '
                   'Forgive a coward. — T.'),
         'dmNotes': T('No livro de orações da casa de {@tome}. Investigação CD 14 para achar.',
                      "In the prayer book at {@tome}'s house. Investigation DC 14 to find."),
         'tags': T(['pista', 'confissão'], ['clue', 'confession'])},
        {'key': 'convite', 'kind': 'handout', 'data': {'style': 'scroll', 'recipients': 'all'},
         'name': T('Convite da Corte do Orvalho', 'Invitation of the Dew Court'),
         'summary': T('Uma folha de carvalho com letras de orvalho que não secam.', 'An oak leaf with letters of dew that never dry.'),
         'body': T('Quem vem buscar o que não plantou\nresponda antes o que já tirou.\nTragam um presente, uma verdade e '
                   'um passo de dança,\ne a corte ouvirá a sua esperança.',
                   'Who comes to take what they did not sow\nmust first answer what they owe.\nBring a gift, a truth and a '
                   'dancing step,\nand the court will hear the hope you kept.'),
         'dmNotes': T('{@pimpim} entrega ao grupo na entrada do bosque. Antecipa as provas de {@liriel}.',
                      "{@pimpim} hands it to the party at the forest's edge. Foreshadows {@liriel}'s trials."),
         'tags': T(['fadas'], ['fey'])},
        # item
        {'key': 'flor', 'kind': 'item',
         'data': {'rarity': T('rara', 'rare'), 'attunement': False,
                  'effect': T('Uma pétala no chá cura um sono mágico. Arrancada do chão, murcha em três dias e quebra o pacto.',
                              'One petal in tea cures a magical sleep. Pulled from the ground, it withers in three days and breaks the pact.')},
         'name': T('A Flor-da-Lua', 'The Moonbloom'),
         'summary': T('Flor prateada que só abre à noite, aos pés do carvalho branco.', 'A silver flower that opens only at night, at the foot of the white oak.'),
         'body': T('Quem a vê uma vez nunca esquece o perfume.', 'Whoever sees it once never forgets its scent.'),
         'dmNotes': T('Funciona mesmo como cura — {@urtiga} não mentiu nisso. Mas quem a quer de verdade é ela.',
                      'It really does cure — {@urtiga} did not lie about that. But she is the one who truly wants it.'),
         'tags': T(['artefato'], ['artifact'])},
    ],

    'nodes': [
        {'id': 'n1', 'kind': 'social', 'x': 0, 'y': 0, 'refs': ['vila', 'lia', 'urtiga', 'tome'],
         'name': T('Começo forte: a festa interrompida', 'Strong start: the interrupted festival'),
         'readAloud': T('Lanternas de papel balançam entre as casas e a rabeca toca rápido. Do outro lado da mesa, um '
                        'menino de oito anos ri de uma piada — e no meio da risada encosta a cabeça na mesa e dorme. A '
                        'mãe sacode, chama, grita. Ele não acorda. Na beira do bosque, centenas de corvos levantam voo '
                        'de uma vez.',
                        'Paper lanterns sway between the houses and the fiddle plays fast. Across the table, an '
                        'eight-year-old boy laughs at a joke — and in the middle of the laugh he lays his head on the '
                        'table and sleeps. His mother shakes him, calls him, screams. He does not wake. At the edge of '
                        'the woods, hundreds of crows take flight at once.'),
         'notes': T('{@urtiga} chega com chá e conta da {@flor}. {@tome} oferece 100 po. {@lia} pede para ir junto. '
                    'Medicina CD 12: o sono não é doença, é magia. Quem beber o chá: salvaguarda de Constituição CD 10 '
                    'ou fica sonolento (Desvantagem em Percepção) até o amanhecer.',
                    '{@urtiga} arrives with tea and tells of the {@flor}. {@tome} offers 100 gp. {@lia} asks to come '
                    'along. Medicine DC 12: the sleep is not illness, it is magic. Whoever drinks the tea: DC 10 '
                    'Constitution saving throw or drowsy (Disadvantage on Perception) until dawn.'),
         'checks': [('medicine', 12, T('O sono é mágico, não é doença.', 'The sleep is magical, not an illness.')),
                    ('insight', 15, T('O carinho da Madrinha parece ensaiado.', "Granny's warmth feels rehearsed.")),
                    ('save:con', 10, T('Quem bebeu o chá: se falhar, fica sonolento até o amanhecer.', 'Whoever drank the tea: on a failure, drowsy until dawn.'))]},
        {'id': 'n2', 'kind': 'exploration', 'x': 320, 'y': -140, 'refs': ['urtiga', 'receita', 'tome', 'carta', 'lenda'],
         'name': T('Segredos de Orvalhal', "Dewhollow's secrets"),
         'readAloud': T('De manhã, a vila parece outra: janelas fechadas, mães sentadas na porta dos quartos, e o '
                        'cheiro de hortelã em todas as cozinhas.',
                        'In the morning the village feels different: shutters closed, mothers sitting by bedroom '
                        'doors, and the smell of mint in every kitchen.'),
         'notes': T('Cena opcional de investigação. Na casa da Madrinha: a {@receita} (Investigação CD 13) e um '
                    'pente cheio de cabelos de cores diferentes. Na casa de {@tome}: a {@carta} (Investigação CD 14). '
                    'Os velhos da vila contam a história da {@lenda} (História CD 12 ou uma rodada de bebida).',
                    'Optional investigation scene. At Granny\'s house: the {@receita} (Investigation DC 13) and a comb '
                    "full of hairs of different colors. At {@tome}'s house: the {@carta} (Investigation DC 14). The "
                    'village elders tell the tale of the {@lenda} (History DC 12 or a round of drinks).'),
         'checks': [('investigation', 13, T('Achar a receita e o pente com cabelos.', 'Find the recipe and the comb full of hair.')),
                    ('investigation', 14, T('Achar a carta escondida de Tomé.', "Find Tomé's hidden letter.")),
                    ('arcana', 14, T('O chá tem magia feérica.', 'The tea carries fey magic.')),
                    ('history', 12, T('Ouvir a história da parteira banida.', 'Hear the tale of the banished midwife.'))]},
        {'id': 'n3', 'kind': 'travel', 'x': 320, 'y': 140, 'refs': ['bosque', 'lia', 'pimpim', 'convite'],
         'name': T('A trilha dos lobos', 'The wolf trail'),
         'readAloud': T('As árvores fecham o céu logo nos primeiros passos. O bosque cochicha quando o vento para. '
                        'Então, à frente, um uivo — e outro, atrás de vocês.',
                        'The trees close over the sky within the first steps. The wood whispers when the wind stops. '
                        'Then, ahead, a howl — and another, behind you.'),
         'notes': T('Três lobos famintos cercam o grupo. Sobrevivência CD 12 evita a emboscada; Lidar com Animais '
                    'CD 13 ou fogo afugenta. Depois, {@pimpim} aparece com o {@convite} e se oferece como guia.',
                    'Three hungry wolves surround the party. Survival DC 12 avoids the ambush; Animal Handling DC 13 '
                    'or fire scares them off. Afterwards {@pimpim} appears with the {@convite} and offers to guide them.'),
         'encounter': [('wolf', 3)],
         'checks': [('survival', 12, T('Evitar a emboscada dos lobos.', "Avoid the wolves' ambush.")),
                    ('animalHandling', 13, T('Afugentar os lobos sem lutar.', 'Drive the wolves off without a fight.')),
                    ('insight', 13, T('Pimpim está escondendo algo.', 'Pimpim is hiding something.'))]},
        {'id': 'n4', 'kind': 'puzzle', 'x': 640, 'y': 140, 'refs': ['vau', 'bartolomeu'],
         'name': T('O Vau das Charadas', 'The Riddle Ford'),
         'readAloud': T('Um riacho largo e raso, cheio de pedras lisas. Sentado na maior delas, um sátiro de chifres '
                        'enfeitados toca três notas na flauta e sorri: "Ninguém atravessa sem jogar comigo."',
                        'A wide, shallow stream full of smooth stones. Sitting on the largest, a satyr with ribboned '
                        'horns plays three notes on his flute and grins: "No one crosses without playing with me."'),
         'notes': T('{@bartolomeu} propõe três charadas (estão nas notas dele). Duas certas: ele mostra as pedras '
                    'certas e, se perguntarem, conta que a Madrinha "já foi gente". Erraram: ele toca a flauta '
                    '(salvaguarda de Sabedoria CD 12 ou dança, Enfeitiçado, por 1 minuto) e o grupo atravessa pela '
                    'água (Atletismo CD 12; falha = 1d6 de dano de concussão nas pedras).',
                    '{@bartolomeu} poses three riddles (in his notes). Two right: he shows the safe stones and, if '
                    'asked, says Granny "was people once". Wrong: he plays his flute (DC 12 Wisdom saving throw or '
                    'dance, Charmed, for 1 minute) and the party must wade across (Athletics DC 12; failure = 1d6 '
                    'bludgeoning damage on the rocks).'),
         'encounter': [('satyr', 1)],
         'hazards': [{'name': T('Correnteza nas pedras', 'Current on the rocks'), 'dc': 12,
                      'effect': T('Teste de Força (Atletismo) para atravessar sem as pedras certas.',
                                  'Strength (Athletics) check to cross without the safe stones.'),
                      'damage': '1d6'}],
         'checks': [('athletics', 12, T('Atravessar pela água.', 'Wade across.')),
                    ('save:wis', 12, T('Resistir à flauta do sátiro.', "Resist the satyr's flute.")),
                    ('performance', 13, T('Vencer Bartolomeu numa dança.', 'Beat Bartholomew at a dance.'))]},
        {'id': 'n5', 'kind': 'combat', 'x': 960, 'y': 0, 'refs': ['bosque'],
         'name': T('A teia do ettercap', 'The ettercap web'),
         'readAloud': T('Fios brancos ligam uma árvore à outra, cada vez mais grossos. Um casulo do tamanho de um '
                        'homem balança devagar. Lá do alto, algo estala a língua.',
                        'White strands link tree to tree, thicker and thicker. A man-sized cocoon sways slowly. From '
                        'above, something clicks its tongue.'),
         'notes': T('Um ettercap e uma aranha gigante. O casulo guarda um aventureiro morto há tempos, com tesouro. '
                    'Fogo queima a teia (cada quadrado de 1,5 m some numa rodada).',
                    'An ettercap and a giant spider. The cocoon holds a long-dead adventurer with treasure. Fire burns '
                    'the web (each 5-foot square vanishes in a round).'),
         'encounter': [('ettercap', 1), ('giant-spider', 1)],
         'hazards': [{'name': T('Teia grudenta', 'Sticky web'), 'dc': 12,
                      'effect': T('Salvaguarda de Destreza ou fica Contido; Força (Atletismo) CD 12 para se soltar.',
                                  'Dexterity saving throw or Restrained; Strength (Athletics) DC 12 to break free.'),
                      'damage': ''}],
         'checks': [('perception', 13, T('Ver as teias antes de pisar nelas.', 'Spot the webs before stepping in.')),
                    ('nature', 12, T('Fogo resolve a teia.', 'Fire clears the web.'))],
         'treasure': {'items': [('potionClimbing', 1), ('featherTokenTree', 1)], 'coins': {'gp': 18, 'sp': 40}}},
        {'id': 'n6', 'kind': 'exploration', 'x': 960, 'y': 280, 'refs': ['bosque', 'casebre'],
         'name': T('O charco dos fogos-fátuos', 'The will-o\'-wisp bog'),
         'readAloud': T('O chão afunda a cada passo e o ar cheira a hortelã — muito forte. Entre os juncos, luzinhas '
                        'azuis piscam, como se chamassem: por aqui, por aqui.',
                        'The ground sinks with every step and the air smells of mint — far too strong. Among the reeds, '
                        'little blue lights blink as if calling: this way, this way.'),
         'notes': T('Um fogo-fátuo tenta afogar o grupo no lamaçal. Seguir as luzes leva direto ao {@casebre} (o '
                    'caminho "secreto"). Sobrevivência CD 13 mantém o rumo da clareira.',
                    'A will-o\'-wisp tries to drown the party in the mire. Following the lights leads straight to the '
                    '{@casebre} (the "secret" path). Survival DC 13 keeps the course to the glade.'),
         'encounter': [('will-o-wisp', 1)],
         'hazards': [{'name': T('Lamaçal', 'Mire'), 'dc': 11,
                      'effect': T('Salvaguarda de Força ou fica Contido no lodo até alguém puxar (Atletismo CD 11).',
                                  'Strength saving throw or Restrained in the muck until pulled out (Athletics DC 11).'),
                      'damage': ''}],
         'checks': [('survival', 13, T('Não se perder seguindo as luzes.', 'Not get lost following the lights.'))]},
        {'id': 'n7', 'kind': 'social', 'x': 1280, 'y': 0, 'refs': ['clareira', 'liriel', 'pimpim', 'corte', 'flor', 'pacto'],
         'name': T('A Clareira das Mil Lanternas', 'The Glade of a Thousand Lanterns'),
         'readAloud': T('Vagalumes do tamanho de punhos flutuam em silêncio. No centro, um carvalho branco, e aos pés '
                        'dele uma flor prateada se abre devagar. Uma mulher de pele de casca e cabelo de folhas está '
                        'sentada numa raiz. "Quem mandou vocês aqui?", ela pergunta, "e por que vocês acham que ela '
                        'não veio pessoalmente?"',
                        'Fist-sized fireflies drift in silence. At the center, a white oak, and at its foot a silver '
                        'flower slowly opens. A woman with bark skin and leaf hair sits on a root. "Who sent you here?" '
                        'she asks, "and why do you think she did not come herself?"'),
         'notes': T('{@liriel} testa o grupo: um presente que amem, uma verdade que doa, uma dança (Atuação CD 13). '
                    'Passando, ela conta que a {@flor} é o selo do {@pacto} e dá uma pétala (cura UMA criança) e as '
                    'Botas Élficas. Insultada, três sprites atacam. {@pimpim} tenta fugir para avisar a Madrinha.',
                    '{@liriel} tests the party: a gift they love, a truth that hurts, a dance (Performance DC 13). If '
                    'they pass, she reveals the {@flor} is the seal of the {@pacto} and gives one petal (cures ONE '
                    'child) and the Boots of Elvenkind. If insulted, three sprites attack. {@pimpim} tries to slip '
                    'away to warn Granny.'),
         'encounter': [('sprite', 3)],
         'checks': [('performance', 13, T('A dança até a lua passar do carvalho.', 'The dance until the moon passes the oak.')),
                    ('persuasion', 14, T('Convencer Liriel sem passar pelas provas.', 'Convince Liriel without the trials.')),
                    ('insight', 13, T('Perceber que Pimpim vai fugir.', 'Notice Pimpim is about to flee.'))],
         'treasure': {'items': [('bootsElven', 1)]}},
        {'id': 'n8', 'kind': 'boss', 'x': 1600, 'y': 140, 'refs': ['urtiga', 'casebre', 'tome', 'lenda'],
         'name': T('O casebre do charco', 'The bog hut'),
         'readAloud': T('Uma choupana torta sobre palafitas, com fumaça verde saindo da chaminé. Lá dentro, centenas '
                        'de potes de vidro brilham nas prateleiras — e em cada um, uma luzinha se mexe como um '
                        'pensamento. Ao lado do caldeirão, a Madrinha Urtiga sorri. Só que o sorriso tem dentes demais.',
                        'A crooked hut on stilts, green smoke rising from the chimney. Inside, hundreds of glass jars '
                        'glow on the shelves — and in each one, a little light moves like a thought. Beside the '
                        'cauldron, Granny Nettle smiles. Only the smile has too many teeth.'),
         'notes': T('Bruxa Verde e três arbustos despertos. Ela prefere conversar: quer a {@flor} e quer ouvir '
                    '{@tome} confessar. Quebrar um pote (ação) acorda a criança dele. Se {@tome} estiver presente e '
                    'confessar (ou o grupo ler a carta e passar em Persuasão CD 15), ela abaixa as mãos e vai embora. '
                    'Se cair a 15 PV, foge como corvo.',
                    'Green Hag and three awakened shrubs. She would rather talk: she wants the {@flor} and wants to '
                    'hear {@tome} confess. Breaking a jar (an action) wakes its child. If {@tome} is present and '
                    'confesses (or the party reads the letter and passes Persuasion DC 15), she lowers her hands and '
                    'leaves. At 15 HP, she flees as a crow.'),
         'encounter': [('green-hag', 1), ('awakened-shrub', 3)],
         'hazards': [{'name': T('Vapor do caldeirão', 'Cauldron fumes'), 'dc': 12,
                      'effect': T('Quem começar o turno a até 3 m do caldeirão: salvaguarda de Constituição ou fica '
                                  'Envenenado até o fim do próximo turno.',
                                  'Whoever starts their turn within 10 feet of the cauldron: Constitution saving '
                                  'throw or Poisoned until the end of their next turn.'),
                      'damage': ''}],
         'checks': [('persuasion', 15, T('Fazer a bruxa desistir com a confissão de Tomé.', "Make the hag give up with Tomé's confession.")),
                    ('arcana', 13, T('Quebrar os potes acorda as crianças.', 'Breaking the jars wakes the children.')),
                    ('save:con', 12, T('Vapor do caldeirão.', 'Cauldron fumes.'))],
         'treasure': {'items': [('potionHealing', 2), ('wandWeb', 1)], 'coins': {'gp': 60}}},
        {'id': 'n9', 'kind': 'rest', 'x': 1920, 'y': 0, 'refs': ['vila', 'tome', 'lia', 'pacto'],
         'name': T('A volta para Orvalhal', 'The return to Dewhollow'),
         'readAloud': T('Quando vocês saem do bosque, os sinos de Orvalhal estão tocando. Crianças de pijama correm '
                        'pela rua, rindo, como se tivessem dormido só uma noite.',
                        'As you leave the woods, the bells of Dewhollow are ringing. Children in nightclothes run down '
                        'the street, laughing, as if they had slept only one night.'),
         'notes': T('Desfecho. {@tome} paga a recompensa — ou, se a verdade veio à tona, a vila decide o que fazer '
                    'com ele. Se o grupo explicar o {@pacto}, a vila volta a deixar pão nas pedras e {@liriel} '
                    'manda um presente. {@lia} vira aliada para sempre.',
                    'Wrap-up. {@tome} pays the reward — or, if the truth came out, the village decides what to do '
                    'with him. If the party explains the {@pacto}, the village leaves bread at the stones again and '
                    '{@liriel} sends a gift. {@lia} becomes a lifelong ally.'),
         'treasure': {'coins': {'gp': 100}}},
    ],
    'edges': [
        ('e1', 'n1', 'n2', 'path', T('Investigar a vila', 'Investigate the village'), ''),
        ('e2', 'n1', 'n3', 'path', T('Partir para o bosque', 'Set out for the woods'), ''),
        ('e3', 'n2', 'n3', 'path', T('Para o bosque', 'Into the woods'), ''),
        ('e4', 'n3', 'n4', 'path', T('Trilha do riacho', 'Stream trail'), ''),
        ('e5', 'n4', 'n5', 'path', T('Trilha estreita', 'Narrow trail'), ''),
        ('e6', 'n4', 'n6', 'path', T('Atalho pelo charco', 'Shortcut through the bog'), ''),
        ('e7', 'n5', 'n7', 'path', T('Seguir os vagalumes', 'Follow the fireflies'), ''),
        ('e8', 'n6', 'n7', 'path', T('Manter o rumo', 'Hold the course'), T('Sobrevivência CD 13', 'Survival DC 13')),
        ('e9', 'n6', 'n8', 'secret', T('Seguir as luzes azuis', 'Follow the blue lights'), ''),
        ('e10', 'n7', 'n8', 'path', T('Liriel aponta o caminho', 'Liriel points the way'), ''),
        ('e11', 'n8', 'n9', 'path', T('De volta à vila', 'Back to the village'), ''),
    ],
    'clues': [
        (T('O chá da Madrinha tem magia feérica.', "Granny's tea carries fey magic."), 'receita', None),
        (T('A receita pede "um fio de cabelo de quem vai dormir".', 'The recipe calls for "one hair from whoever will sleep".'), 'receita', None),
        (T('Lia viu a Madrinha conversando com um corvo de olhos humanos.', 'Lia saw Granny talking to a crow with human eyes.'), 'lia', 0),
        (T('A parteira banida há quarenta anos se chamava Rosa.', 'The midwife banished forty years ago was named Rosa.'), 'lenda', None),
        (T('Tomé mentiu sobre a morte do bebê.', "Tomé lied about the baby's death."), 'tome', 0),
        (T('A Flor-da-Lua é o selo do pacto que protege a vila.', 'The Moonbloom is the seal of the pact that protects the village.'), 'liriel', 0),
        (T('Pimpim espiona para a Madrinha.', 'Pimpim spies for Granny.'), 'pimpim', 0),
        (T('Os sonhos das crianças estão em potes no casebre do charco.', "The children's dreams are in jars at the bog hut."), 'urtiga', 2),
    ],
}

"""Aventura pronta 3 — "Maré de Cinzas" (nível 3). Texto original da Forja."""
from . import T

PACK = {
    'id': 'mare-de-cinzas',
    'levels': '3',
    'sessions': '2–3',
    'art': '/art/covers/port-city.webp',
    'artFallback': '/art/backgrounds/pirate.webp',
    'theme': T('Cerco e mistério numa cidade portuária', 'Siege and mystery in a harbor city'),
    'name': T('Maré de Cinzas', 'The Ashen Tide'),
    'tagline': T('Navios queimam toda noite em Porto Corvina, e algo sobe do mar para atacar o cais.',
                 'Ships burn every night in Corvina Harbor, and something climbs out of the sea to attack the docks.'),
    'pitch': T('Há uma semana, um navio pega fogo por noite no porto de Porto Corvina, e criaturas do mar sobem pelos '
               'píeres. A capitã-do-porto decretou toque de recolher e apagou o farol; a Guilda do Sal culpa os '
               'pescadores. Um cerco noturno ao cais, becos perigosos, um armazém de piratas e um rosto conhecido que '
               'não é quem parece.',
               'For a week, one ship a night has burned in Corvina Harbor, and sea creatures climb the piers. The '
               'harbormaster declared a curfew and put out the lighthouse; the Salt Guild blames the fishers. A night '
               'siege on the docks, dangerous alleys, a pirate warehouse and a familiar face that is not who it seems.'),
    'synopsis': T(
        '{@cassio}, mestre da {@guilda}, quer arrasar a {@remos} e construir armazéns no lugar. Ele contratou os '
        'piratas das {@gaivotas} e um doppelganger. Os piratas roubaram a {@perola}, relíquia sagrada dos sahuagin do '
        'recife, e a esconderam no {@armazem}: os sahuagin agora atacam o porto toda noite para recuperá-la, e a '
        'Guilda culpa os pescadores. Os piratas também queimam navios rivais com fogo alquímico comprado de {@rubi}. '
        'O doppelganger tomou o lugar da capitã-do-porto {@isolde}, prendeu a verdadeira no porão do {@farol} e '
        'mantém o farol apagado para os navios dos piratas entrarem sem ser vistos. O grupo segura o cerco, segue as '
        'pistas até o {@armazem}, encontra a carta da Guilda e escolhe: devolver a pérola a {@ssarra} (o cerco acaba) '
        'ou lutar até o fim. O clímax é no alto do farol, contra a falsa Isolde.',
        '{@cassio}, master of the {@guilda}, wants to raze {@remos} and build warehouses in its place. He hired the '
        '{@gaivotas} pirates and a doppelganger. The pirates stole the {@perola}, a sacred relic of the reef '
        'sahuagin, and hid it in {@armazem}: the sahuagin now attack the harbor every night to get it back, and the '
        'Guild blames the fishers. The pirates also burn rival ships with alchemist\'s fire bought from {@rubi}. The '
        'doppelganger took the place of harbormaster {@isolde}, locked the real one in the cellar of the {@farol} '
        'and keeps the lighthouse dark so pirate ships slip in unseen. The party holds the siege, follows the clues '
        'to {@armazem}, finds the Guild letter and chooses: return the pearl to {@ssarra} (the siege ends) or fight '
        'to the end. The climax is at the top of the lighthouse, against the false Isolde.'),
    'hook': T(
        'Porto Corvina vive do mar: peixe, sal e navios de três reinos. Mas faz uma semana que o porto dorme com '
        'medo. Toda noite um navio pega fogo, e no meio da fumaça, criaturas de escamas sobem pelos píeres. A '
        'capitã-do-porto apagou o farol e decretou toque de recolher; a Guilda do Sal pendura cartazes acusando os '
        'pescadores. Vocês chegaram hoje — e a primeira coisa que veem do cais é um navio inteiro em chamas.',
        'Corvina Harbor lives off the sea: fish, salt and ships from three kingdoms. But for a week the harbor has '
        'slept in fear. Every night a ship catches fire, and through the smoke, scaled creatures climb the piers. The '
        'harbormaster put out the lighthouse and declared a curfew; the Salt Guild hangs posters blaming the '
        'fishers. You arrived today — and the first thing you see from the dock is a whole ship in flames.'),
    'strongStart': T(
        'Comece no cais, à noite, com o navio "A Garça Branca" em chamas. Gritos, sinos, gente pulando na água. '
        'Três sahuagin sobem pela escada do píer bem na frente dos personagens, procurando algo e rosnando uma '
        'palavra repetida: "pérola". A luta começa na hora; depois dela, a falsa Isolde chega com guardas e manda '
        'todo mundo para casa — sem perguntar nada aos heróis.',
        'Start on the dock, at night, with the ship "White Heron" in flames. Screams, bells, people jumping into the '
        'water. Three sahuagin climb the pier ladder right in front of the characters, searching for something and '
        'growling one repeated word: "pearl". The fight starts at once; afterwards the false Isolde arrives with '
        'guards and sends everyone home — without asking the heroes a single question.'),
    'tips': [
        T('Se os jogadores devolverem a {@perola} ao mar, {@ssarra} encerra o cerco: a cena do cerco vira uma '
          'negociação (Persuasão CD 14 com a pérola na mão) e o clímax fica só no farol.',
          'If the players return the {@perola} to the sea, {@ssarra} ends the siege: the siege scene becomes a '
          'negotiation (Persuasion DC 14 with the pearl in hand) and the climax is only at the lighthouse.'),
        T('Se acusarem {@cassio} sem provas, a guarda prende os personagens por uma noite — a {@carta} do armazém é '
          'a prova que convence o conselho.',
          'If they accuse {@cassio} without proof, the guard locks the characters up for a night — the {@carta} from '
          'the warehouse is the proof that convinces the council.'),
        T('Se desmascararem a falsa {@isolde} cedo (ela não bate na bússola), o doppelganger foge para o {@farol} e '
          'o clímax acontece mais cedo.',
          'If they unmask the false {@isolde} early (she never taps her compass), the doppelganger flees to the '
          '{@farol} and the climax happens sooner.'),
        T('O doppelganger lê pensamentos superficiais: use isso para ele "adivinhar" os planos do grupo e criar '
          'paranoia — mas deixe sempre uma pista honesta para os jogadores.',
          'The doppelganger reads surface thoughts: use it to "guess" the party\'s plans and create paranoia — but '
          'always leave the players an honest clue.'),
        T('Grupo mais forte (5+ jogadores ou nível 4): some 1 sahuagin a cada onda e 1 pirata no armazém.',
          'Stronger party (5+ players or level 4): add 1 sahuagin to each wave and 1 pirate in the warehouse.'),
        T('No fim, os personagens sobem para o nível 4 (marco) e ganham um aliado poderoso no porto.',
          'At the end, the characters reach level 4 (milestone) and gain a powerful ally in the harbor.'),
    ],
    'planScenes': ['n1', 'n2', 'n3', 'n4', 'n6', 'n7', 'n9'],

    'entries': [
        {'key': 'cidade', 'kind': 'place', 'data': {'placeType': 'city'},
         'name': T('Porto Corvina', 'Corvina Harbor'),
         'summary': T('Cidade portuária de casas coloridas empilhadas na encosta, sal no ar e gaivotas por toda parte.',
                      'A harbor city of colorful houses stacked up the hillside, salt in the air and gulls everywhere.'),
         'body': T('Três bairros: o Alto, onde mora quem manda; o Mercado, onde tudo se vende; e a {@remos}, onde mora '
                   'quem pesca. No fim do quebra-mar, o {@farol} está apagado pela primeira vez em cem anos.',
                   'Three districts: the Heights, where the powerful live; the Market, where everything is sold; and '
                   '{@remos}, where the fishers live. At the end of the breakwater, the {@farol} is dark for the first '
                   'time in a hundred years.'),
         'dmNotes': T('A cidade está a um passo de um motim. Cada noite sem resposta, a {@guilda} ganha mais apoio.',
                      'The city is one step from a riot. Every night without answers, the {@guilda} gains more support.'),
         'tags': T(['cidade', 'início'], ['city', 'start'])},
        {'key': 'remos', 'kind': 'place', 'parent': 'cidade', 'data': {'placeType': 'building'},
         'name': T('A Vila dos Remos', 'Oar Row'),
         'summary': T('O bairro dos pescadores: palafitas, redes secando e cheiro de peixe frito.',
                      "The fishers' quarter: stilt houses, nets drying and the smell of fried fish."),
         'body': T('Gente dura e unida. Quem manda aqui é {@joana}.', 'Tough, close-knit folk. {@joana} runs things here.'),
         'tags': T(['bairro'], ['district'])},
        {'key': 'armazem', 'kind': 'place', 'parent': 'cidade', 'data': {'placeType': 'building'},
         'name': T('O Armazém 7', 'Warehouse Seven'),
         'summary': T('Um armazém da Guilda do Sal, trancado e vigiado dia e noite.', 'A Salt Guild warehouse, locked and guarded day and night.'),
         'body': T('Portas de ferro, janelas pregadas e um guindaste que range sozinho com o vento.',
                   'Iron doors, boarded windows and a crane that creaks on its own in the wind.'),
         'dmNotes': T('Esconderijo das {@gaivotas}. Lá estão a {@perola}, barris de fogo alquímico e a {@carta}.',
                      'Hideout of the {@gaivotas}. The {@perola}, barrels of alchemist\'s fire and the {@carta} are here.'),
         'tags': T(['covil'], ['lair']), 'links': [('guilda', 'other')]},
        {'key': 'farol', 'kind': 'place', 'parent': 'cidade', 'data': {'placeType': 'landmark'},
         'name': T('O Farol da Corvina', 'The Corvina Lighthouse'),
         'summary': T('Torre branca no fim do quebra-mar. Apagada por ordem da capitã-do-porto.',
                      'A white tower at the end of the breakwater. Put out by order of the harbormaster.'),
         'body': T('O espelho de bronze do alto já guiou navios por cem anos.', 'The bronze mirror at the top has guided ships for a hundred years.'),
         'dmNotes': T('A verdadeira {@isolde} está presa no porão alagado. Reacender o farol afasta os navios piratas.',
                      'The real {@isolde} is locked in the flooded cellar. Relighting the lighthouse drives off the pirate ships.'),
         'tags': T(['farol'], ['lighthouse'])},
        {'key': 'recife', 'kind': 'place', 'parent': 'cidade', 'data': {'placeType': 'landmark'},
         'name': T('O Recife das Gargantas', 'The Gullet Reef'),
         'summary': T('Rochas afiadas fora da baía, onde os pescadores não lançam redes.',
                      'Sharp rocks beyond the bay, where fishers never cast their nets.'),
         'body': T('Na maré baixa, dá para ver arcos de coral que parecem portas.', 'At low tide you can see coral arches that look like doors.'),
         'dmNotes': T('Lar do povo de {@ssarra}. Dá para negociar aqui, de barco, com a {@perola} na mão.',
                      "Home of {@ssarra}'s people. Negotiation can happen here, by boat, with the {@perola} in hand."),
         'tags': T(['mar'], ['sea'])},
        # NPCs
        {'key': 'isolde', 'kind': 'npc', 'parent': 'cidade',
         'data': {'role': T('Capitã-do-porto', 'Harbormaster'),
                  'appearance': T('Mulher de meia-idade, casaco azul de botões de latão, uma bússola pendurada no peito.',
                                  'A middle-aged woman in a blue coat with brass buttons, a compass hanging at her chest.'),
                  'mannerism': T('Bate duas vezes na bússola antes de dar uma ordem.', 'Taps her compass twice before giving an order.'),
                  'wants': T('Ordem no porto e os culpados presos.', 'Order in the harbor and the culprits behind bars.')},
         'name': T('Isolde Vante', 'Isolde Vante'),
         'summary': T('A capitã-do-porto. Apagou o farol e decretou toque de recolher.',
                      'The harbormaster. Put out the lighthouse and declared a curfew.'),
         'body': T('Respeitada por todos os lados do porto — até a semana passada.', 'Respected on every side of the harbor — until last week.'),
         'dmNotes': T('A que está no gabinete é um Doppelganger. Não bate na bússola (Intuição CD 15 ou quem a '
                      'conhecia nota). Lê pensamentos superficiais.',
                      'The one in the office is a Doppelganger. She never taps the compass (Insight DC 15, or anyone '
                      'who knew her notices). Reads surface thoughts.'),
         'secrets': [T('A Isolde do gabinete é um doppelganger: a verdadeira nunca deixa de bater na bússola.',
                       'The Isolde in the office is a doppelganger: the real one always taps her compass.'),
                     T('A verdadeira Isolde está presa no porão do farol.', 'The real Isolde is locked in the lighthouse cellar.')],
         'tags': T(['autoridade', 'vilã?'], ['authority', 'villain?']), 'links': [('farol', 'other'), ('cassio', 'other')]},
        {'key': 'cassio', 'kind': 'npc', 'parent': 'cidade',
         'data': {'role': T('Mestre da Guilda do Sal', 'Master of the Salt Guild'),
                  'appearance': T('Homem elegante, anéis em todos os dedos e um lenço perfumado sempre no nariz.',
                                  'An elegant man with rings on every finger and a perfumed handkerchief always at his nose.'),
                  'mannerism': T('Fala em "progresso" e "futuro" a cada frase; nunca levanta a voz.',
                                 'Says "progress" and "the future" in every sentence; never raises his voice.'),
                  'wants': T('Arrasar a Vila dos Remos e construir os armazéns da Guilda.', 'To raze Oar Row and build Guild warehouses.')},
         'name': T('Cassio Doramar', 'Cassio Doramar'),
         'summary': T('Mestre da Guilda do Sal. Culpa os pescadores pelos ataques.', 'Master of the Salt Guild. Blames the fishers for the attacks.'),
         'body': T('Generoso com quem concorda com ele. Paga bem por "ajuda".', 'Generous to those who agree with him. Pays well for "help".'),
         'dmNotes': T('O mandante. Use Nobre se precisar. Se acuado, oferece ouro ao grupo (300 po) para "esquecerem". '
                      'Manda capangas atrás de quem fizer perguntas demais.',
                      'The mastermind. Use Noble if needed. If cornered, offers the party gold (300 gp) to "forget". '
                      'Sends thugs after anyone asking too many questions.'),
         'secrets': [T('Cassio pagou as Gaivotas Negras e o doppelganger.', 'Cassio paid the Black Gulls and the doppelganger.')],
         'tags': T(['vilão'], ['villain']), 'links': [('guilda', 'member'), ('gaivotas', 'employer'), ('isolde', 'enemy')]},
        {'key': 'joana', 'kind': 'npc', 'parent': 'remos',
         'data': {'role': T('Líder dos pescadores', "Fishers' leader"),
                  'appearance': T('Senhora de braços queimados de sol, lenço vermelho na cabeça e agulha de rede na mão.',
                                  'A sun-browned woman with a red headscarf and a netting needle in her hand.'),
                  'mannerism': T('Remenda redes enquanto fala e nunca levanta os olhos — até ficar brava.',
                                 'Mends nets while talking and never looks up — until she gets angry.'),
                  'wants': T('Justiça para os pescadores e o fim do toque de recolher.', 'Justice for the fishers and an end to the curfew.')},
         'name': T('Mãe Joana Rede-Forte', 'Mother Joan Strongnet'),
         'summary': T('A voz da Vila dos Remos. Ninguém fala com os pescadores sem falar com ela.',
                      'The voice of Oar Row. No one talks to the fishers without talking to her.'),
         'body': T('Criou metade do bairro. Mãe de {@tito}.', 'She raised half the quarter. Mother of {@tito}.'),
         'dmNotes': T('Desconfia do grupo até que ajudem no cerco. Sabe o que {@tito} viu, mas tem medo de expor o filho.',
                      'Distrusts the party until they help in the siege. Knows what {@tito} saw but fears exposing her son.'),
         'secrets': [T('O filho de Joana viu piratas levando um baú brilhante para o Armazém 7.',
                       "Joan's son saw pirates carrying a glowing chest into Warehouse Seven.")],
         'tags': T(['aliada'], ['ally']), 'links': [('tito', 'family'), ('cassio', 'enemy')]},
        {'key': 'tito', 'kind': 'npc', 'parent': 'remos',
         'data': {'role': T('Pescador aprendiz', 'Apprentice fisher'),
                  'appearance': T('Garoto magricela de catorze anos, descalço, com um anzol preso na orelha.',
                                  'A skinny fourteen-year-old, barefoot, with a fishhook pinned through his ear.'),
                  'mannerism': T('Fala sussurrando e olha por cima do ombro.', 'Whispers and keeps glancing over his shoulder.'),
                  'wants': T('Que a mãe se orgulhe dele.', 'For his mother to be proud of him.')},
         'name': T('Tito', 'Tito'),
         'summary': T('Filho de Mãe Joana. Viu algo que não devia.', 'Son of Mother Joan. Saw something he should not have.'),
         'body': T('Conhece cada beco e cada telhado do porto.', 'Knows every alley and rooftop in the harbor.'),
         'dmNotes': T('Viu o baú com luz azul entrando no {@armazem}. Pode guiar o grupo pelos telhados (entrada sem luta).',
                      'Saw the chest with blue light entering {@armazem}. Can guide the party over the rooftops (an entry without a fight).'),
         'tags': T(['testemunha'], ['witness'])},
        {'key': 'rubi', 'kind': 'npc', 'parent': 'cidade',
         'data': {'role': T('Alquimista', 'Alchemist'),
                  'appearance': T('Jovem de óculos de proteção na testa, sobrancelhas chamuscadas e dedos manchados.',
                                  'A young woman with goggles on her forehead, singed eyebrows and stained fingers.'),
                  'mannerism': T('Morde um lápis enquanto pensa e fala de reações químicas como se fossem fofoca.',
                                 'Chews a pencil while thinking and talks about chemical reactions like gossip.'),
                  'wants': T('Sair dessa encrenca sem ir para a forca.', 'To get out of this mess without hanging.')},
         'name': T('Rubi "Faísca"', 'Ruby "Spark"'),
         'summary': T('Dona de uma oficina de alquimia no Mercado. Muito nervosa ultimamente.',
                      'Runs an alchemy workshop in the Market. Very nervous lately.'),
         'body': T('Faz tintas, fogos de artifício e coisas que é melhor não perguntar.', 'Makes dyes, fireworks and things best not asked about.'),
         'dmNotes': T('Vendeu 20 frascos de fogo alquímico para um comprador com o selo da {@guilda}. Entrega o {@recibo} '
                      'se o grupo prometer protegê-la (Persuasão CD 13) ou a assustar (Intimidação CD 13).',
                      'Sold 20 flasks of alchemist\'s fire to a buyer with the {@guilda} seal. Hands over the {@recibo} '
                      'if the party promises protection (Persuasion DC 13) or scares her (Intimidation DC 13).'),
         'secrets': [T('Rubi vendeu 20 frascos de fogo alquímico a um comprador com o selo da Guilda.',
                       "Ruby sold 20 flasks of alchemist's fire to a buyer bearing the Guild seal.")],
         'tags': T(['testemunha'], ['witness'])},
        {'key': 'bras', 'kind': 'npc', 'parent': 'armazem',
         'data': {'role': T('Capitão pirata', 'Pirate captain'),
                  'appearance': T('Homem enorme de dente de ouro, tricórnio furado de bala e uma gaivota tatuada no pescoço.',
                                  'A huge man with a gold tooth, a bullet-holed tricorn and a gull tattooed on his neck.'),
                  'mannerism': T('Assobia cantigas do mar e sorri antes de mentir.', 'Whistles sea shanties and grins before he lies.'),
                  'wants': T('Receber o resto do pagamento e sumir antes que os sahuagin o achem.',
                             'To collect the rest of his pay and vanish before the sahuagin find him.')},
         'name': T('Capitão Brás Gaivota', 'Captain Brás Gull'),
         'summary': T('Capitão das Gaivotas Negras. Diz que está "só de passagem".', 'Captain of the Black Gulls. Says he is "just passing through".'),
         'body': T('Já foi corsário de um reino que não existe mais.', 'He was once a privateer for a kingdom that no longer exists.'),
         'dmNotes': T('Use Capitão Bandido. Covarde quando a coisa aperta: entrega {@cassio} em troca da vida '
                      '(Intimidação CD 14 com ele a menos da metade dos PV).',
                      'Use Bandit Captain. A coward when it gets tight: gives up {@cassio} in exchange for his life '
                      '(Intimidation DC 14 once he is below half HP).'),
         'secrets': [T('Brás guarda a Pérola da Maré e a carta de Cassio no Armazém 7.',
                       "Brás keeps the Pearl of the Tide and Cassio's letter in Warehouse Seven.")],
         'tags': T(['pirata'], ['pirate']), 'links': [('gaivotas', 'member'), ('cassio', 'employer')]},
        {'key': 'ssarra', 'kind': 'npc', 'parent': 'recife',
         'data': {'role': T('Sacerdotisa sahuagin', 'Sahuagin priestess'),
                  'appearance': T('Sahuagin alta de escamas verde-escuras, com uma coroa de conchas e um tridente de coral.',
                                  'A tall sahuagin with dark green scales, a crown of shells and a coral trident.'),
                  'mannerism': T('Bate os dentes antes de falar; usa poucas palavras do idioma comum.',
                                 'Clicks her teeth before speaking; uses only a few words of Common.'),
                  'wants': T('A Pérola da Maré de volta antes da lua nova.', 'The Pearl of the Tide back before the new moon.')},
         'name': T('Ssarra das Profundezas', 'Ssarra of the Deep'),
         'summary': T('A voz por trás dos ataques ao cais.', 'The voice behind the attacks on the docks.'),
         'body': T('Vê os moradores da superfície como ladrões — e esta semana, com razão.',
                   'Sees surface dwellers as thieves — and this week, rightly so.'),
         'dmNotes': T('Não quer guerra: quer a {@perola}. Se o grupo devolver, ela para os ataques e vira uma aliada '
                      'perigosa. Se o grupo mentir, ela sabe (a pérola "canta" quando está perto).',
                      'She does not want war: she wants the {@perola}. If the party returns it, she stops the attacks '
                      'and becomes a dangerous ally. If the party lies, she knows (the pearl "sings" when near).'),
         'secrets': [T('Ssarra encerra os ataques se a pérola voltar antes da lua nova.',
                       'Ssarra will end the attacks if the pearl returns before the new moon.')],
         'tags': T(['sahuagin'], ['sahuagin']), 'links': [('gaivotas', 'enemy')]},
        # facções
        {'key': 'guilda', 'kind': 'faction',
         'data': {'goal': T('Controlar todo o comércio do porto.', 'Control all trade in the harbor.'), 'symbolColor': '#c9a227'},
         'name': T('A Guilda do Sal', 'The Salt Guild'),
         'summary': T('Os mercadores mais ricos de Porto Corvina.', 'The richest merchants in Corvina Harbor.'),
         'body': T('O selo da Guilda — uma balança sobre ondas — está em metade das portas do Mercado.',
                   "The Guild seal — a scale over waves — is on half the doors in the Market."),
         'dmNotes': T('Nem todos sabem do plano de {@cassio}; alguns membros ficariam horrorizados.',
                      "Not every member knows of {@cassio}'s plan; some would be horrified."),
         'tags': T(['mercadores'], ['merchants'])},
        {'key': 'gaivotas', 'kind': 'faction',
         'data': {'goal': T('Ouro, e sair vivos do porto.', 'Gold, and leaving the harbor alive.'), 'symbolColor': '#3a3f4a'},
         'name': T('As Gaivotas Negras', 'The Black Gulls'),
         'summary': T('Tripulação pirata que anda bem-vestida demais para marinheiros comuns.',
                      'A pirate crew dressed far too well for common sailors.'),
         'body': T('Uma gaivota preta tatuada no pescoço é a marca da tripulação.', 'A black gull tattooed on the neck marks the crew.'),
         'tags': T(['piratas'], ['pirates'])},
        # lore
        {'key': 'lenda', 'kind': 'lore', 'name': T('A Pérola da Maré', 'The Pearl of the Tide'),
         'summary': T('Os velhos pescadores contam de uma pérola que "segura o mar".', 'Old fishers tell of a pearl that "holds the sea".'),
         'body': T('Diz a lenda que o povo do recife guarda uma pérola do tamanho de uma cabeça, e que enquanto ela '
                   'estiver no fundo, as tempestades poupam a baía.',
                   'Legend says the reef folk keep a pearl the size of a head, and as long as it rests on the seabed, '
                   'storms spare the bay.'),
         'dmNotes': T('Verdade. Desde o roubo da {@perola}, o mar anda mais bravo.', 'True. Since the {@perola} was stolen, the sea has grown rougher.'),
         'tags': T(['lenda'], ['legend']), 'links': [('perola', 'other'), ('ssarra', 'other')]},
        {'key': 'boato', 'kind': 'lore', 'name': T('Por que o farol apagou', 'Why the lighthouse went dark'),
         'summary': T('A capitã diz que a luz "atrai os monstros". Os velhos marinheiros não acreditam.',
                      'The harbormaster says the light "draws the monsters". Old sailors do not believe it.'),
         'body': T('"Farol nunca chamou monstro nenhum", resmunga o povo do cais. "Farol apagado só serve a quem não '
                   'quer ser visto chegando."',
                   '"A lighthouse never called a monster," the dock folk grumble. "A dark lighthouse only serves those '
                   'who don\'t want to be seen arriving."'),
         'dmNotes': T('Os marinheiros estão certos: os navios das {@gaivotas} entram de noite com o farol apagado.',
                      'The sailors are right: the {@gaivotas} ships slip in at night with the lighthouse dark.'),
         'tags': T(['boato'], ['rumor'])},
        # documentos
        {'key': 'edital', 'kind': 'handout', 'data': {'style': 'wanted', 'recipients': 'all'},
         'name': T('Edital do toque de recolher', 'Curfew decree'),
         'summary': T('Pregado em todas as esquinas, com o carimbo da capitã-do-porto.', "Nailed to every corner, stamped with the harbormaster's seal."),
         'body': T('POR ORDEM DA CAPITANIA DO PORTO\nFica proibido andar pelo cais depois do sino das nove.\nO Farol da '
                   'Corvina permanecerá apagado até segunda ordem.\nQuem abrigar pescadores suspeitos responderá à '
                   'Guilda do Sal.',
                   'BY ORDER OF THE HARBOR OFFICE\nNo one may walk the docks after the nine o\'clock bell.\nThe Corvina '
                   'Lighthouse will remain dark until further notice.\nWhoever shelters suspect fishers will answer to '
                   'the Salt Guild.'),
         'dmNotes': T('Pista: por que uma ordem da capitania ameaça em nome da Guilda?',
                      'Clue: why does a harbor-office order threaten in the Guild\'s name?'),
         'tags': T(['pista'], ['clue'])},
        {'key': 'recibo', 'kind': 'handout', 'data': {'style': 'note', 'recipients': 'all'},
         'name': T('Recibo da oficina de Rubi', "Ruby's workshop receipt"),
         'summary': T('Um papel engordurado, com um selo de cera no canto.', 'A greasy slip of paper with a wax seal in the corner.'),
         'body': T('20 frascos de fogo líquido — pago em adiantado.\nEntregar no cais norte, sem perguntas.\nRetirado por: '
                   'C. D.\n(selo: uma balança sobre ondas)',
                   '20 flasks of liquid fire — paid in advance.\nDeliver to the north dock, no questions asked.\nCollected '
                   'by: C. D.\n(seal: a scale over waves)'),
         'dmNotes': T('"C. D." é {@cassio}. O selo é da {@guilda}.', '"C. D." is {@cassio}. The seal belongs to the {@guilda}.'),
         'tags': T(['pista', 'prova'], ['clue', 'evidence'])},
        {'key': 'carta', 'kind': 'handout', 'data': {'style': 'letter', 'recipients': 'all'},
         'name': T('Carta selada da Guilda', 'Sealed Guild letter'),
         'summary': T('Papel caro, letra elegante, cheiro de perfume.', 'Expensive paper, elegant handwriting, a whiff of perfume.'),
         'body': T('Capitão,\nMais três noites. Quando a Vila dos Remos arder de vez, o conselho me dará o bairro e você '
                   'terá o resto do ouro. Mantenha a pérola escondida: enquanto ela estiver com você, os bichos do mar '
                   'farão o trabalho sujo por nós. Nossa amiga no farol cuida da luz.\n— C.',
                   'Captain,\nThree more nights. When Oar Row finally burns, the council will hand me the quarter and you '
                   'will have the rest of the gold. Keep the pearl hidden: as long as you have it, the sea beasts will do '
                   'our dirty work. Our friend at the lighthouse takes care of the light.\n— C.'),
         'dmNotes': T('No {@armazem}, na mesa de {@bras}. A prova que derruba {@cassio}.',
                      "In {@armazem}, on {@bras}'s desk. The proof that brings down {@cassio}."),
         'tags': T(['prova'], ['evidence'])},
        # item
        {'key': 'perola', 'kind': 'item',
         'data': {'rarity': T('muito rara', 'very rare'), 'attunement': False,
                  'effect': T('Brilha azul no escuro. Quem a segura respira debaixo d\'água e entende o idioma dos sahuagin.',
                              'Glows blue in the dark. Whoever holds it can breathe underwater and understands the sahuagin tongue.')},
         'name': T('A Pérola da Maré', 'The Pearl of the Tide'),
         'summary': T('Uma pérola do tamanho de uma cabeça que pulsa como um coração.', 'A pearl the size of a head that pulses like a heartbeat.'),
         'body': T('Quem encosta o ouvido nela escuta ondas que não estão ali.', 'Whoever puts an ear to it hears waves that are not there.'),
         'dmNotes': T('Pertence ao povo de {@ssarra}. Ficar com ela significa cerco toda noite.',
                      "Belongs to {@ssarra}'s people. Keeping it means a siege every night."),
         'tags': T(['artefato'], ['artifact'])},
    ],

    'nodes': [
        {'id': 'n1', 'kind': 'combat', 'x': 0, 'y': 0, 'refs': ['cidade', 'isolde', 'edital'],
         'name': T('Começo forte: a Garça Branca em chamas', 'Strong start: the White Heron ablaze'),
         'readAloud': T('O calor chega antes do barulho. No fim do píer, um navio inteiro arde, as velas virando '
                        'fitas de fogo. Gente pula na água, sinos tocam por toda a baía. E da escada do píer, bem na '
                        'frente de vocês, sobem mãos com garras e escamas molhadas, e uma voz rouca repete uma única '
                        'palavra: "Pérola."',
                        'The heat arrives before the noise. At the end of the pier a whole ship is burning, its sails '
                        'turning into ribbons of fire. People leap into the water, bells ring across the bay. And up '
                        'the pier ladder, right in front of you, come clawed hands and wet scales, and a hoarse voice '
                        'repeats a single word: "Pearl."'),
         'notes': T('Três sahuagin guerreiros. Lutam até dois caírem e mergulham. Depois chega a falsa {@isolde} '
                    'com guardas, manda todos para casa e entrega o {@edital}. Intuição CD 15: ela não bate na '
                    'bússola (os guardas estranham baixinho).',
                    'Three sahuagin warriors. They fight until two fall, then dive. Afterwards the false {@isolde} '
                    'arrives with guards, sends everyone home and hands out the {@edital}. Insight DC 15: she does not '
                    'tap her compass (the guards mutter about it).'),
         'encounter': [('sahuagin-warrior', 3)],
         'checks': [('insight', 15, T('A capitã não bate na bússola.', 'The harbormaster does not tap her compass.')),
                    ('athletics', 12, T('Tirar alguém da água a tempo.', 'Pull someone out of the water in time.')),
                    ('perception', 13, T('Ver um bote sem luz saindo do navio antes do fogo.', 'Spot an unlit rowboat leaving the ship before the fire.'))]},
        {'id': 'n2', 'kind': 'social', 'x': 320, 'y': -160, 'refs': ['isolde', 'cassio', 'boato', 'guilda'],
         'name': T('O gabinete da capitania', 'The harbor office'),
         'readAloud': T('Mapas da baía cobrem as paredes e um relógio de bronze marca as marés. Atrás da mesa, a '
                        'capitã Isolde escuta com as mãos cruzadas. Num canto, um homem perfumado de anéis em todos '
                        'os dedos sorri como se já soubesse o que vocês vão dizer.',
                        'Bay charts cover the walls and a bronze clock tracks the tides. Behind the desk, '
                        'harbormaster Isolde listens with folded hands. In a corner, a perfumed man with rings on '
                        'every finger smiles as if he already knows what you will say.'),
         'notes': T('A falsa {@isolde} e {@cassio} "agradecem" e oferecem 50 po para o grupo ajudar a guarda a '
                    'vigiar a {@remos}. Lê pensamentos superficiais: se alguém pensar em suspeitas, ela muda de '
                    'assunto. Intuição CD 15 (de novo) ou citar um hábito antigo dela que ela não reconhece.',
                    'The false {@isolde} and {@cassio} "thank" the party and offer 50 gp to help the guard watch '
                    '{@remos}. She reads surface thoughts: if anyone thinks suspicious thoughts, she changes the '
                    'subject. Insight DC 15 (again), or mention an old habit of hers she fails to recognize.'),
         'checks': [('insight', 15, T('Algo está errado com a capitã.', 'Something is off about the harbormaster.')),
                    ('deception', 14, T('Fingir que aceitam o trabalho da Guilda.', "Pretend to accept the Guild's job.")),
                    ('history', 12, T('Lembrar que o farol nunca foi apagado em cem anos.', 'Recall the lighthouse has never been dark in a hundred years.'))]},
        {'id': 'n3', 'kind': 'social', 'x': 320, 'y': 160, 'refs': ['remos', 'joana', 'tito'],
         'name': T('A Vila dos Remos', 'Oar Row'),
         'readAloud': T('Redes secam penduradas entre as palafitas. Quando vocês chegam, as conversas param. Uma '
                        'senhora de lenço vermelho continua remendando a rede sem levantar os olhos: "Veio mandar a '
                        'gente pra casa também?"',
                        'Nets hang drying between the stilt houses. When you arrive, conversations stop. A woman in a '
                        'red headscarf keeps mending her net without looking up: "Come to send us home too?"'),
         'notes': T('{@joana} desconfia. Persuasão CD 13 (ou ter lutado no cais) abre a conversa. {@tito} conta do '
                    'baú brilhante no {@armazem} e de "uma moça de óculos" que vende fogo no Mercado ({@rubi}). '
                    'Uma multidão quer marchar contra a Guilda: Persuasão CD 14 acalma.',
                    '{@joana} is suspicious. Persuasion DC 13 (or having fought on the dock) opens the talk. {@tito} '
                    'tells of the glowing chest at {@armazem} and of "a girl with goggles" who sells fire in the Market '
                    '({@rubi}). A crowd wants to march on the Guild: Persuasion DC 14 calms them.'),
         'checks': [('persuasion', 13, T('Ganhar a confiança de Mãe Joana.', "Earn Mother Joan's trust.")),
                    ('persuasion', 14, T('Acalmar a multidão.', 'Calm the crowd.')),
                    ('insight', 12, T('Tito sabe de algo e está com medo.', 'Tito knows something and is afraid.'))]},
        {'id': 'n4', 'kind': 'room', 'x': 640, 'y': 160, 'refs': ['rubi', 'recibo'],
         'name': T('A oficina de Rubi "Faísca"', 'Ruby "Spark"\'s workshop'),
         'readAloud': T('Fumaça colorida sai por baixo da porta. Lá dentro, frascos borbulham em todas as prateleiras '
                        'e uma jovem de sobrancelhas chamuscadas quase derruba um deles quando vê vocês.',
                        'Colored smoke seeps from under the door. Inside, flasks bubble on every shelf and a young '
                        'woman with singed eyebrows nearly drops one when she sees you.'),
         'notes': T('{@rubi} entrega o {@recibo} com Persuasão ou Intimidação CD 13 (ou com promessa de proteção). '
                    'Se a conversa virar briga, os frascos instáveis explodem. Ao sair, alguém observa o grupo de um '
                    'telhado (Percepção CD 14) — é a emboscada da cena seguinte.',
                    '{@rubi} hands over the {@recibo} with Persuasion or Intimidation DC 13 (or a promise of '
                    'protection). If talk turns to a fight, the unstable flasks explode. On leaving, someone watches '
                    'the party from a rooftop (Perception DC 14) — the next scene\'s ambush.'),
         'hazards': [{'name': T('Frascos instáveis', 'Unstable flasks'), 'dc': 12,
                      'effect': T('Se houver luta na oficina: todos a até 3 m da prateleira fazem salvaguarda de '
                                  'Destreza (metade do dano se passar).',
                                  'If a fight breaks out in the workshop: everyone within 10 feet of the shelf makes '
                                  'a Dexterity saving throw (half damage on a success).'),
                      'damage': '2d4'}],
         'checks': [('persuasion', 13, T('Rubi entrega o recibo.', 'Ruby hands over the receipt.')),
                    ('intimidation', 13, T('Rubi entrega o recibo, mas não ajuda mais.', 'Ruby hands over the receipt but helps no further.')),
                    ('perception', 14, T('Notar o vigia no telhado.', 'Notice the lookout on the rooftop.'))],
         'treasure': {'items': [('potionHealing', 1)]}},
        {'id': 'n5', 'kind': 'combat', 'x': 960, 'y': 160, 'refs': ['cassio', 'guilda'],
         'name': T('Emboscada nos becos do Mercado', 'Ambush in the Market alleys'),
         'readAloud': T('O beco estreita entre paredes de barris empilhados. Uma lanterna se apaga atrás de vocês, '
                        'outra à frente. Um homem de capuz cruza os braços: "O senhor Doramar manda dizer que '
                        'curiosidade afoga."',
                        'The alley narrows between walls of stacked barrels. A lantern goes out behind you, another '
                        'ahead. A hooded man folds his arms: "Master Doramar says curiosity drowns."'),
         'notes': T('Três capangas e um espião da {@guilda}. Se capturado, o espião confessa quem o pagou '
                    '(Intimidação CD 13) — mas sem papel não é prova. Derrubar os barris (Atletismo CD 13) '
                    'derruba 1d2 inimigos.',
                    'Three toughs and a spy from the {@guilda}. If captured, the spy confesses who paid him (Intimidation DC 13) '
                    '— but without paper it is no proof. Toppling the barrels (Athletics DC 13) knocks down 1d2 foes.'),
         'encounter': [('tough', 3), ('spy', 1)],
         'checks': [('athletics', 13, T('Derrubar os barris em cima dos capangas.', 'Topple the barrels onto the thugs.')),
                    ('intimidation', 13, T('O espião confessa quem pagou.', 'The spy confesses who paid him.'))],
         'treasure': {'coins': {'gp': 35}}},
        {'id': 'n6', 'kind': 'room', 'x': 1280, 'y': 0, 'refs': ['armazem', 'bras', 'gaivotas', 'perola', 'carta'],
         'name': T('O Armazém 7', 'Warehouse Seven'),
         'readAloud': T('Lá dentro, pilhas de caixotes com o selo da Guilda e, no meio deles, um baú aberto de onde '
                        'sai uma luz azul que pulsa como um coração. Piratas jogam dados em cima de barris marcados '
                        'com uma chama. Um homenzarrão de dente de ouro para de assobiar e se levanta devagar.',
                        'Inside, stacks of crates bearing the Guild seal and, in their midst, an open chest pouring out '
                        'a blue light that pulses like a heartbeat. Pirates play dice atop barrels marked with a flame. '
                        'A huge man with a gold tooth stops whistling and rises slowly.'),
         'notes': T('{@bras} (Capitão Bandido), dois piratas e três bandidos. {@tito} pode levar o grupo pelo '
                    'telhado (Furtividade CD 13 = surpresa). A {@perola} está no baú; a {@carta}, na mesa. Os barris '
                    'são de fogo alquímico: qualquer fogo ali dentro explode tudo.',
                    '{@bras} (Bandit Captain), two pirates and three bandits. {@tito} can lead the party over the roof '
                    '(Stealth DC 13 = surprise). The {@perola} is in the chest; the {@carta} on the desk. The barrels '
                    'hold alchemist\'s fire: any fire in there blows everything up.'),
         'encounter': [('bandit-captain', 1), ('pirate', 2), ('bandit', 3)],
         'hazards': [{'name': T('Barris de fogo alquímico', "Barrels of alchemist's fire"), 'dc': 13,
                      'effect': T('Se algum fogo tocar os barris: todos a até 6 m fazem salvaguarda de Destreza '
                                  '(metade se passar) e o armazém começa a pegar fogo.',
                                  'If any fire touches the barrels: everyone within 20 feet makes a Dexterity saving '
                                  'throw (half on a success) and the warehouse starts to burn.'),
                      'damage': '3d6'}],
         'checks': [('stealth', 13, T('Entrar pelo telhado e surpreender os piratas.', 'Enter via the roof and surprise the pirates.')),
                    ('intimidation', 14, T('Brás entrega Cassio para salvar a pele.', 'Brás gives up Cassio to save his skin.')),
                    ('investigation', 12, T('Achar a carta da Guilda na mesa.', 'Find the Guild letter on the desk.'))],
         'treasure': {'items': [('potionHealing', 2), ('cloakMantaRay', 1)], 'coins': {'gp': 120}}},
        {'id': 'n7', 'kind': 'combat', 'x': 1600, 'y': -160, 'refs': ['ssarra', 'perola', 'remos', 'lenda'],
         'name': T('O cerco ao cais', 'The siege of the docks'),
         'readAloud': T('A maré sobe de um jeito errado, rápida demais. A água borbulha ao longo de todo o cais, e '
                        'dezenas de olhos brilham na espuma. No meio deles, uma figura de coroa de conchas ergue um '
                        'tridente de coral, e o mar inteiro parece prender a respiração.',
                        'The tide rises wrong, far too fast. The water boils along the whole dock, and dozens of eyes '
                        'glint in the foam. Among them, a figure crowned with shells raises a coral trident, and the '
                        'whole sea seems to hold its breath.'),
         'notes': T('Se o grupo estiver com a {@perola}: {@ssarra} aceita negociar (Persuasão CD 14, ou automático '
                    'se a devolverem sem pedir nada) e o cerco acaba. Senão, ondas: quatro sahuagin e dois tubarões, '
                    'depois um merrow. Os pescadores de {@joana} ajudam se o grupo os tiver ganhado (cada turno, '
                    'derrubam 1 sahuagin ferido).',
                    'If the party has the {@perola}: {@ssarra} agrees to talk (Persuasion DC 14, or automatic if they '
                    "return it asking nothing) and the siege ends. Otherwise, waves: four sahuagin and two sharks, then "
                    "a merrow. {@joana}'s fishers help if the party won them over (each turn they drop 1 wounded sahuagin)."),
         'encounter': [('sahuagin-warrior', 4), ('reef-shark', 2), ('merrow', 1)],
         'checks': [('persuasion', 14, T('Ssarra aceita a pérola e encerra o cerco.', 'Ssarra accepts the pearl and ends the siege.')),
                    ('athletics', 12, T('Segurar a barricada do píer.', 'Hold the pier barricade.'))]},
        {'id': 'n8', 'kind': 'exploration', 'x': 1600, 'y': 160, 'refs': ['farol', 'isolde'],
         'name': T('O porão do farol', 'The lighthouse cellar'),
         'readAloud': T('A porta do farol range. Lá embaixo, a água do mar entra pelas frestas e bate na altura do '
                        'joelho. Do fundo do porão, entre caranguejos do tamanho de cães, alguém bate duas vezes em '
                        'algo de metal. Duas batidas. De novo.',
                        'The lighthouse door creaks. Below, seawater seeps through the cracks, knee-deep. From the back '
                        'of the cellar, among crabs the size of dogs, someone taps twice on something metal. Two taps. '
                        'Again.'),
         'notes': T('A verdadeira {@isolde} está acorrentada, batendo a bússola na corrente. Dois caranguejos gigantes '
                    'guardam o porão. Libertada (Atletismo CD 13 para a corrente, ou ferramentas de ladrão), ela conta '
                    'tudo e jura testemunhar contra {@cassio}.',
                    'The real {@isolde} is chained, tapping her compass against the chain. Two giant crabs guard the '
                    'cellar. Freed (Athletics DC 13 for the chain, or thieves\' tools), she tells everything and swears '
                    'to testify against {@cassio}.'),
         'encounter': [('giant-crab', 2)],
         'checks': [('athletics', 13, T('Arrebentar a corrente.', 'Break the chain.')),
                    ('medicine', 11, T('Cuidar da verdadeira Isolde (fraca e com frio).', 'Tend to the real Isolde (weak and cold).'))]},
        {'id': 'n9', 'kind': 'boss', 'x': 1920, 'y': 0, 'refs': ['farol', 'isolde', 'cassio'],
         'name': T('O alto do farol', 'The top of the lighthouse'),
         'readAloud': T('O vento uiva lá em cima. O grande espelho de bronze está coberto por uma lona preta. Ao lado '
                        'dele, a capitã Isolde levanta uma lanterna vermelha para o mar — um sinal. Ela se vira, e o '
                        'rosto dela escorre como cera, virando o rosto de cada um de vocês, um de cada vez.',
                        'The wind howls up here. The great bronze mirror is covered by a black tarp. Beside it, '
                        'harbormaster Isolde raises a red lantern toward the sea — a signal. She turns, and her face '
                        'runs like wax, becoming the face of each of you, one at a time.'),
         'notes': T('O Doppelganger, um espião e dois capangas. Ele tenta sinalizar o navio pirata: se conseguir '
                    '(3 turnos com a lanterna erguida), chegam mais 2 piratas na rodada seguinte. Puxar a lona do '
                    'espelho e acender o farol (ação + Atletismo CD 12) cega os inimigos virados para a luz.',
                    'The Doppelganger, a spy and two toughs. It tries to signal the pirate ship: if it succeeds (3 '
                    'turns with the lantern raised), 2 more pirates arrive the next round. Pulling the tarp off the '
                    'mirror and lighting the lighthouse (an action + Athletics DC 12) blinds enemies facing the light.'),
         'encounter': [('doppelganger', 1), ('spy', 1), ('tough', 2)],
         'hazards': [{'name': T('Clarão do espelho', 'Mirror flare'), 'dc': 13,
                      'effect': T('Quando o farol acende: criaturas viradas para o espelho fazem salvaguarda de '
                                  'Constituição ou ficam Cegas até o fim do próximo turno.',
                                  'When the lighthouse flares: creatures facing the mirror make a Constitution saving '
                                  'throw or are Blinded until the end of their next turn.'),
                      'damage': ''}],
         'checks': [('athletics', 12, T('Arrancar a lona e acender o farol.', 'Tear off the tarp and light the lighthouse.')),
                    ('insight', 14, T('Saber qual "companheiro" é o doppelganger.', 'Tell which "companion" is the doppelganger.'))],
         'treasure': {'items': [('potionWaterBreath', 1), ('dustDisappearance', 1), ('decanterEndlessWater', 1)], 'coins': {'gp': 80}}},
    ],
    'edges': [
        ('e1', 'n1', 'n2', 'path', T('Ir à capitania', 'Go to the harbor office'), ''),
        ('e2', 'n1', 'n3', 'path', T('Seguir os pescadores', 'Follow the fishers'), ''),
        ('e3', 'n3', 'n4', 'path', T('Tito fala da moça de óculos', 'Tito mentions the girl with goggles'), ''),
        ('e4', 'n4', 'n5', 'path', T('Sair pelos becos', 'Out through the alleys'), ''),
        ('e5', 'n5', 'n6', 'path', T('Rumo ao armazém', 'Toward the warehouse'), ''),
        ('e6', 'n3', 'n6', 'secret', T('Pelos telhados com Tito', 'Over the rooftops with Tito'), T('Furtividade CD 13', 'Stealth DC 13')),
        ('e7', 'n6', 'n7', 'path', T('A pérola chama a maré', 'The pearl calls the tide'), ''),
        ('e8', 'n2', 'n8', 'path', T('"O farol está proibido"', '"The lighthouse is off-limits"'), ''),
        ('e9', 'n7', 'n8', 'path', T('Correr para o farol', 'Run for the lighthouse'), ''),
        ('e10', 'n8', 'n9', 'stairs', T('Escada em caracol', 'Spiral stair'), ''),
    ],
    'clues': [
        (T('A capitã não bate na bússola como sempre fazia.', 'The harbormaster no longer taps her compass as she always did.'), 'isolde', 0),
        (T('O edital da capitania ameaça em nome da Guilda do Sal.', "The harbor-office decree threatens in the Salt Guild's name."), 'edital', None),
        (T('Rubi vendeu 20 frascos de fogo alquímico a "C. D." com o selo da Guilda.', 'Ruby sold 20 flasks of alchemist\'s fire to "C. D." with the Guild seal.'), 'rubi', 0),
        (T('Tito viu um baú brilhante entrar no Armazém 7.', 'Tito saw a glowing chest go into Warehouse Seven.'), 'joana', 0),
        (T('Os sahuagin só querem a Pérola da Maré de volta.', 'The sahuagin only want the Pearl of the Tide back.'), 'ssarra', 0),
        (T('Cassio pagou os piratas e o doppelganger.', 'Cassio paid the pirates and the doppelganger.'), 'cassio', 0),
        (T('A verdadeira Isolde está presa no porão do farol.', 'The real Isolde is locked in the lighthouse cellar.'), 'isolde', 1),
        (T('Farol apagado deixa os navios piratas entrarem sem ser vistos.', 'A dark lighthouse lets pirate ships slip in unseen.'), 'boato', None),
    ],
}

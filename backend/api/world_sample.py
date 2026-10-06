"""
Mundo de exemplo — a vila "Vale de Brumafria" (pt) / "Mistfrost Vale" (en).

Criado por POST /campaigns/:id/world/sample para o mestre iniciante ver um
mundo pronto e mexer: 1 lugar com mapa (pins), 3 NPCs (taverneiro,
sacerdotisa, vilão), 1 facção, 1 rumor (lore parcial), 1 segredo (lore
oculto) e 1 aventura de 3 salas ligada a esses cartões (refs). Tudo é
editável e apagável. Nada sensível nasce revelado: o vilão, a facção e o
segredo começam ocultos; a sacerdotisa e o rumor, "conhecidos de nome".

O mapa é gerado por world_assets/gen_brumafria_map.py (sem rótulos — os
nomes ficam nos pins, nas duas línguas).
"""
import base64
import os

from django.utils import timezone

from . import world_rules as R
from .models import Adventure, WorldEntry, WorldImage

MAP_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'world_assets', 'brumafria-map.webp')

TEXT = {
    'pt': {
        'village': {
            'name': 'Vale de Brumafria',
            'summary': 'Vila de pescadores à beira do rio, onde a névoa da manhã nunca se levanta de verdade.',
            'body': ('Brumafria é uma vila pequena e teimosa: casas de pedra com telhado vermelho, uma ponte de '
                     'madeira que range e um templo antigo cujo sino não toca há gerações. Todo viajante acaba na '
                     'taverna de @[Borin Pé-de-Malte]({borin}), e todo doente acaba nas mãos de @[Irmã Velna]({velna}).'),
            'dm_notes': 'Ponto de partida da campanha. A névoa fica mais densa quanto mais perto da cripta.',
            'tags': ['vila', 'início'], 'when': 'Fundada no Ano 140 da Coroa',
        },
        'borin': {
            'name': 'Borin Pé-de-Malte',
            'summary': 'Taverneiro anão do Malte Dourado — sabe de tudo, cobra por quase tudo.',
            'body': 'Dono da taverna Malte Dourado. Serve o melhor hidromel do vale e as piores piadas. Amigo antigo de @[Irmã Velna]({velna}).',
            'dm_notes': 'Bonachão, mas com medo: o irmão dele sumiu na névoa há três invernos.',
            'role': 'Taverneiro', 'appearance': 'Anão ruivo, barba trançada com contas de cobre, avental manchado.',
            'mannerism': 'Bate duas vezes no balcão antes de contar um segredo.',
            'wants': 'Descobrir o que aconteceu com o irmão, Durgan.',
            'secrets': ['Borin guarda a chave da cripta atrás do barril de hidromel — herança do irmão.'],
            'tags': ['taverna', 'aliado'],
        },
        'velna': {
            'name': 'Irmã Velna',
            'summary': 'Sacerdotisa do templo da névoa; cuida dos doentes e evita falar do sino.',
            'body': 'Jovem, séria e cansada. Mantém o templo aberto dia e noite, mesmo sem fiéis. Desconfia de forasteiros, mas nunca nega ajuda.',
            'dm_notes': 'Ela ouve o sino tocar nas noites de névoa — e tem medo de estar enlouquecendo.',
            'role': 'Sacerdotisa', 'appearance': 'Manto cinza-azulado, cabelo raspado, mãos marcadas por queimaduras de vela.',
            'mannerism': 'Fala baixo e completa as frases dos outros.',
            'wants': 'Silenciar o sino antes da próxima lua cheia.',
            'secrets': ['Velna ouve o sino do templo tocar sozinho nas noites de névoa.',
                        'Ela encontrou um símbolo de sino rachado pintado sob o altar.'],
            'tags': ['templo', 'aliada'],
        },
        'morvane': {
            'name': 'Morvane, o Tecelão de Névoa',
            'summary': 'Um nome que os velhos da vila só sussurram.',
            'body': 'Antigo sacerdote do templo, expulso por estudar a névoa como se fosse uma língua.',
            'dm_notes': ('Vilão. Vive na torre velha da colina e usa o sino afogado para chamar a névoa. Quer que a vila '
                         'inteira "durma" na névoa para sempre. Use as estatísticas de Fanático Cultista.'),
            'role': 'Vilão', 'appearance': 'Alto e magro, olhos leitosos, a barba sempre úmida de orvalho.',
            'mannerism': 'Nunca levanta a voz; a névoa parece se inclinar para ouvi-lo.',
            'wants': 'Trazer de volta a "grande névoa" do Ano 312.',
            'secrets': ['Morvane é o irmão mais velho de Irmã Velna.'],
            'tags': ['vilão'],
        },
        'faction': {
            'name': 'Círculo do Sino Mudo',
            'summary': 'Seita que acredita que a névoa guarda os mortos da vila.',
            'body': 'Encontram-se de capuz cinza na cripta, à meia-noite, e deixam velas apagadas nas portas.',
            'dm_notes': 'Três membros na vila — um deles trabalha na taverna de Borin.',
            'goal': 'Fazer o sino afogado tocar de novo na lua cheia.', 'color': '#6b7a8f',
            'tags': ['seita'],
        },
        'rumor': {
            'name': 'A névoa que canta',
            'summary': 'Dizem que, nas noites mais frias, dá para ouvir um sino debaixo do rio.',
            'body': 'Pescadores juram que a névoa canta. Quem segue o som nunca volta igual — ou nunca volta.',
            'dm_notes': 'Verdade parcial: o som vem da cripta, não do rio.',
            'tags': ['rumor'], 'when': 'Há três invernos',
        },
        'secret': {
            'name': 'A verdade sobre o sino afogado',
            'summary': 'O que realmente aconteceu com o sino do templo.',
            'body': ('No Ano 312 o sino do templo foi arrancado da torre e jogado no rio para acabar com a grande névoa. '
                     'Ele nunca foi recuperado… oficialmente.'),
            'dm_notes': 'O Círculo resgatou o sino e o escondeu na cripta. Se ele tocar na lua cheia, a névoa volta.',
            'secrets': ['O sino nunca ficou no rio: está escondido na cripta sob o templo.',
                        'Tocar o sino três vezes ao contrário quebra o encanto.'],
            'tags': ['segredo', 'sino'], 'when': 'Ano 312 da Coroa — a grande névoa',
        },
        'pins': {'tavern': 'Taverna Malte Dourado', 'temple': 'Templo da Névoa',
                 'crypt': 'Cripta do Sino', 'tower': 'Torre velha'},
        'adventure': {
            'name': 'O Sino Afogado',
            'summary': 'Aventura curta de mistério para o nível 1: a névoa está voltando a Brumafria.',
            'rooms': [
                ('Taverna Malte Dourado', 'social',
                 'O calor da lareira contrasta com a névoa que gruda nas janelas. Borin enxuga o mesmo copo há minutos, olhando para a porta.',
                 'Borin conta o rumor da névoa que canta. Se os PJs ganharem a confiança dele, entrega a chave da cripta.'),
                ('Templo da Névoa', 'exploration',
                 'Bancos vazios, cheiro de cera e um silêncio pesado. Lá no alto, onde deveria estar o sino, só há uma corda balançando.',
                 'Irmã Velna pede ajuda. Teste de Investigação CD 13 revela o alçapão sob o altar.'),
                ('Cripta do Sino', 'boss',
                 'Degraus úmidos descem até uma câmara onde um sino de bronze, coberto de algas, repousa sobre um altar de velas apagadas.',
                 'Cultistas do Círculo protegem o sino. Morvane pode aparecer como uma voz na névoa.'),
            ],
            'edge1': 'Rua da ponte', 'edge2': 'Alçapão sob o altar', 'cond2': 'Investigação CD 13',
            'cultist': 'Cultista', 'specter': 'Sombra Espectral', 'check': 'Investigação para achar o alçapão',
        },
    },
    'en': {
        'village': {
            'name': 'Mistfrost Vale',
            'summary': 'A riverside fishing village where the morning mist never truly lifts.',
            'body': ('Mistfrost is a small, stubborn village: stone houses with red roofs, a creaking wooden bridge, '
                     'and an old temple whose bell has not rung in generations. Every traveler ends up at '
                     '@[Borin Maltfoot]({borin})\'s tavern, and every sick soul ends up in the hands of @[Sister Velna]({velna}).'),
            'dm_notes': 'Starting point of the campaign. The mist grows thicker the closer you get to the crypt.',
            'tags': ['village', 'start'], 'when': 'Founded in Year 140 of the Crown',
        },
        'borin': {
            'name': 'Borin Maltfoot',
            'summary': 'Dwarven keeper of the Golden Malt — knows everything, charges for almost everything.',
            'body': 'Owner of the Golden Malt tavern. Serves the best mead in the vale and the worst jokes. An old friend of @[Sister Velna]({velna}).',
            'dm_notes': 'Jolly, but afraid: his brother vanished into the mist three winters ago.',
            'role': 'Innkeeper', 'appearance': 'Red-haired dwarf, beard braided with copper beads, stained apron.',
            'mannerism': 'Knocks twice on the counter before telling a secret.',
            'wants': 'To learn what happened to his brother, Durgan.',
            'secrets': ['Borin keeps the crypt key behind the mead barrel — his brother\'s keepsake.'],
            'tags': ['tavern', 'ally'],
        },
        'velna': {
            'name': 'Sister Velna',
            'summary': 'Priestess of the mist temple; tends the sick and avoids talking about the bell.',
            'body': 'Young, serious and tired. She keeps the temple open day and night, even without worshippers. Wary of outsiders, but never refuses help.',
            'dm_notes': 'She hears the bell ring on misty nights — and fears she is going mad.',
            'role': 'Priestess', 'appearance': 'Blue-grey robe, shaved head, hands scarred by candle burns.',
            'mannerism': 'Speaks softly and finishes other people\'s sentences.',
            'wants': 'To silence the bell before the next full moon.',
            'secrets': ['Velna hears the temple bell ring by itself on misty nights.',
                        'She found a cracked-bell symbol painted under the altar.'],
            'tags': ['temple', 'ally'],
        },
        'morvane': {
            'name': 'Morvane, the Mist Weaver',
            'summary': 'A name the village elders only whisper.',
            'body': 'A former priest of the temple, cast out for studying the mist as if it were a language.',
            'dm_notes': ('Villain. Lives in the old tower on the hill and uses the drowned bell to call the mist. He wants the '
                         'whole village to "sleep" in the mist forever. Use the Cult Fanatic stat block.'),
            'role': 'Villain', 'appearance': 'Tall and gaunt, milky eyes, beard always damp with dew.',
            'mannerism': 'Never raises his voice; the mist seems to lean in to listen.',
            'wants': 'To bring back the "great mist" of Year 312.',
            'secrets': ['Morvane is Sister Velna\'s older brother.'],
            'tags': ['villain'],
        },
        'faction': {
            'name': 'Circle of the Silent Bell',
            'summary': 'A sect that believes the mist keeps the village dead.',
            'body': 'They meet in grey hoods in the crypt at midnight and leave snuffed candles on doorsteps.',
            'dm_notes': 'Three members in the village — one of them works at Borin\'s tavern.',
            'goal': 'To ring the drowned bell again on the full moon.', 'color': '#6b7a8f',
            'tags': ['sect'],
        },
        'rumor': {
            'name': 'The singing mist',
            'summary': 'They say that on the coldest nights you can hear a bell beneath the river.',
            'body': 'Fishers swear the mist sings. Whoever follows the sound never comes back the same — or never comes back.',
            'dm_notes': 'Half true: the sound comes from the crypt, not the river.',
            'tags': ['rumor'], 'when': 'Three winters ago',
        },
        'secret': {
            'name': 'The truth about the drowned bell',
            'summary': 'What really happened to the temple bell.',
            'body': ('In Year 312 the temple bell was torn from the tower and thrown into the river to end the great mist. '
                     'It was never recovered… officially.'),
            'dm_notes': 'The Circle recovered the bell and hid it in the crypt. If it rings on the full moon, the mist returns.',
            'secrets': ['The bell never stayed in the river: it is hidden in the crypt under the temple.',
                        'Ringing the bell three times backwards breaks the spell.'],
            'tags': ['secret', 'bell'], 'when': 'Year 312 of the Crown — the great mist',
        },
        'pins': {'tavern': 'Golden Malt Tavern', 'temple': 'Temple of the Mist',
                 'crypt': 'Bell Crypt', 'tower': 'Old tower'},
        'adventure': {
            'name': 'The Drowned Bell',
            'summary': 'A short level 1 mystery: the mist is returning to Mistfrost.',
            'rooms': [
                ('Golden Malt Tavern', 'social',
                 'The warmth of the hearth contrasts with the mist clinging to the windows. Borin has been drying the same cup for minutes, eyes on the door.',
                 'Borin tells the rumor of the singing mist. If the PCs earn his trust, he hands over the crypt key.'),
                ('Temple of the Mist', 'exploration',
                 'Empty pews, the smell of wax and a heavy silence. High above, where the bell should be, only a rope sways.',
                 'Sister Velna asks for help. A DC 13 Investigation check reveals the trapdoor under the altar.'),
                ('Bell Crypt', 'boss',
                 'Damp steps lead down to a chamber where a bronze bell, covered in algae, rests on an altar of snuffed candles.',
                 'Cultists of the Circle guard the bell. Morvane may appear as a voice in the mist.'),
            ],
            'edge1': 'Bridge street', 'edge2': 'Trapdoor under the altar', 'cond2': 'Investigation DC 13',
            'cultist': 'Cultist', 'specter': 'Specter', 'check': 'Investigation to find the trapdoor',
        },
    },
}


def _map_image():
    try:
        with open(MAP_FILE, 'rb') as fh:
            return 'data:image/webp;base64,' + base64.b64encode(fh.read()).decode('ascii')
    except OSError:
        return ''


def _secrets(texts):
    return [{'id': f's{i + 1}', 'text': t, 'revealed': False} for i, t in enumerate(texts)]


def create_sample_world(campaign, lang='pt'):
    """Cria as entradas e a aventura. Chamar dentro de transaction.atomic()."""
    T = TEXT['en' if lang == 'en' else 'pt']
    now = timezone.now()

    def make(kind, key, visibility, sort, data=None, parent=None, when_order=None):
        t = T[key]
        return WorldEntry.objects.create(
            campaign=campaign, kind=kind, name=t['name'], summary=t['summary'], body=t['body'],
            dm_notes=t.get('dm_notes', ''), secrets=_secrets(t.get('secrets', [])),
            visibility=visibility, parent=parent, tags=t.get('tags', []), data=data or {},
            when_label=t.get('when', ''), when_order=when_order, sort=sort,
            revealed_at=now if visibility != 'hidden' else None,
        )

    def npc_data(key):
        t = T[key]
        return {k: t[k] for k in ('role', 'appearance', 'mannerism', 'wants')}

    village = make('place', 'village', 'revealed', 1, {'placeType': 'village'}, when_order=140)
    borin = make('npc', 'borin', 'revealed', 2, npc_data('borin'), parent=village)
    velna = make('npc', 'velna', 'partial', 3, npc_data('velna'), parent=village)
    morvane = make('npc', 'morvane', 'hidden', 4, npc_data('morvane'), parent=village)
    faction = make('faction', 'faction', 'hidden', 5,
                   {'goal': T['faction']['goal'], 'symbolColor': T['faction']['color']})
    rumor = make('lore', 'rumor', 'partial', 6, when_order=900)
    secret = make('lore', 'secret', 'hidden', 7, when_order=312)

    # Corpos com @menções precisam dos ids; links explícitos entre cartões.
    fmt = {'borin': borin.id, 'velna': velna.id}
    village.body = T['village']['body'].format(**fmt)
    borin.body = T['borin']['body'].format(**fmt)
    borin.links = [{'to': velna.id, 'rel': 'ally', 'note': ''}, {'to': village.id, 'rel': 'located_in', 'note': ''}]
    velna.links = [{'to': borin.id, 'rel': 'ally', 'note': ''}, {'to': morvane.id, 'rel': 'family', 'note': ''}]
    morvane.links = [{'to': faction.id, 'rel': 'member', 'note': ''}, {'to': velna.id, 'rel': 'family', 'note': ''}]
    faction.links = [{'to': secret.id, 'rel': 'other', 'note': ''}]
    rumor.links = [{'to': secret.id, 'rel': 'other', 'note': ''}]
    P = T['pins']
    village.data = {'placeType': 'village', 'map': {'pins': [
        {'id': 'p1', 'entryId': borin.id, 'x': 0.45, 'y': 0.55, 'visible': True, 'label': P['tavern']},
        {'id': 'p2', 'entryId': velna.id, 'x': 0.6, 'y': 0.36, 'visible': True, 'label': P['temple']},
        {'id': 'p3', 'entryId': secret.id, 'x': 0.7, 'y': 0.28, 'visible': False, 'label': P['crypt']},
        {'id': 'p4', 'entryId': morvane.id, 'x': 0.82, 'y': 0.2, 'visible': False, 'label': P['tower']},
    ]}}
    for e in (village, borin, velna, morvane, faction, rumor):
        e.save()

    image = _map_image()
    if image and len(image) <= R.MAX_IMAGE_CHARS:
        WorldImage.objects.create(entry=village, data=image)
        WorldEntry.objects.filter(pk=village.pk).update(image_ver=R.image_version(image))

    A = T['adventure']
    rooms = A['rooms']
    nodes = [
        {'id': 'n1', 'name': rooms[0][0], 'kind': rooms[0][1], 'x': 0, 'y': 0,
         'readAloud': rooms[0][2], 'notes': rooms[0][3], 'tags': [], 'image': '',
         'encounter': [], 'hazards': [], 'checks': [], 'treasure': {'items': [], 'coins': {}},
         'refs': [borin.id, rumor.id]},
        {'id': 'n2', 'name': rooms[1][0], 'kind': rooms[1][1], 'x': 320, 'y': -60,
         'readAloud': rooms[1][2], 'notes': rooms[1][3], 'tags': [], 'image': '',
         'encounter': [], 'hazards': [],
         'checks': [{'skill': 'investigation', 'dc': 13, 'note': A['check']}],
         'treasure': {'items': [], 'coins': {}},
         'refs': [velna.id, village.id]},
        {'id': 'n3', 'name': rooms[2][0], 'kind': rooms[2][1], 'x': 640, 'y': 0,
         'readAloud': rooms[2][2], 'notes': rooms[2][3], 'tags': [], 'image': '',
         'encounter': [{'monsterId': 'cultist', 'name': A['cultist'], 'crNum': 0.125, 'count': 3},
                       {'monsterId': 'specter', 'name': A['specter'], 'crNum': 1, 'count': 1}],
         'hazards': [], 'checks': [], 'treasure': {'items': [], 'coins': {'gp': 25}},
         'refs': [morvane.id, faction.id, secret.id]},
    ]
    edges = [
        {'id': 'e1', 'from': 'n1', 'to': 'n2', 'kind': 'path', 'label': A['edge1'], 'condition': '', 'oneWay': False},
        {'id': 'e2', 'from': 'n2', 'to': 'n3', 'kind': 'secret', 'label': A['edge2'], 'condition': A['cond2'], 'oneWay': False},
    ]
    adventure = Adventure.objects.create(
        campaign=campaign, name=A['name'], summary=A['summary'], status='draft',
        data={'version': 1, 'nodes': nodes, 'edges': edges},
        play={'current': None, 'visited': [], 'unlocked': []},
    )
    return {'adventureId': adventure.id,
            'entryIds': [village.id, borin.id, velna.id, morvane.id, faction.id, rumor.id, secret.id]}

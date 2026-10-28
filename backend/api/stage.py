"""
Palco da Tela (`Campaign.state.stage`) — a regra de uma frase:
"A Tela mostra a última coisa que você mandou. ✕ tira e volta para o fundo:
o combate, se houver; senão, a capa."

Chave de SERVIDOR (só POST /campaigns/:id/stage escreve; nunca imagem nem lista
longa: o `state` inteiro vai ao mestre a cada poll e cada escrita faz todos os
jogadores rebaixarem a campanha):

    { v: 1,
      bg:    'auto' | 'map' | 'dark',          auto = combate se houver, senão a capa
      lit:   'auto' | 'map'                    o fundo de antes de ◐ Escurecer (◑ Acender volta a ele)
      front: null
           | {kind:'card',  entryId, secretIds?, label, ver}
           | {kind:'image', ref:{entryId}|{mapOf: entryId}|{advId, nodeId}, caption?, label, hidden, ver}
           | {kind:'scene', title, text?, sceneId?, ref?:{advId,nodeId}, image?:{advId,nodeId}, label, ver?}
           | {kind:'text',  text, label}
           | {kind:'recap', label}               o texto fica em state.stageRecap (até 5000)
      focus: true,                             false = "Guardar para depois do combate"
      prev:  {bg, front, focus} | null,        ↶ Desfazer
      prefs: {players, dm, monsters, initiative, party, sheets},
      at: iso }

`label` é o nome que SÓ o mestre lê (o cartão oculto mostrado como "só a
imagem" leva o nome dele aqui). A projeção pública (`public_stage`) nunca usa
`label` e passa pelas regras da Tela: oculto e privado nunca levam nome nem
texto; a imagem da frente sai por uma URL que só vale enquanto ela é a frente
(`ver` muda a cada "mostrar", então trocar a frente mata a URL antiga).

Compatibilidade (1 versão): o palco também grava `state.screenCard` para
cartão, cena de sala e "Anteriormente em…", para uma TV aberta com o JS
antigo não quebrar.
"""
import hashlib
import json

from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from .campaign_state import update_state
from .screen_card import entry_card, is_private_handout

STAGE_KEY = 'stage'
RECAP_KEY = 'stageRecap'
BGS = ('auto', 'map', 'dark')
OPS = ('show', 'clear', 'back', 'undo', 'dark', 'bg', 'prefs')
FRONT_KINDS = ('card', 'image', 'scene', 'text', 'recap')
# sheets (V15): as rolagens das FICHAS dos jogadores vão à Tela na sessão ao vivo (padrão ligado)
PREFS_DEFAULT = {'players': 'crits', 'dm': 'secret', 'monsters': 'shown', 'initiative': True, 'party': True,
                 'sheets': True}
PREFS_CHOICES = {'players': ('all', 'crits', 'off'), 'dm': ('secret', 'shown'), 'monsters': ('shown', 'secret')}
PUBLIC_PREFS = ('initiative', 'party')

MAX_LABEL = 80
MAX_CAPTION = 140
MAX_TEXT = 1000
MAX_TITLE = 120
MAX_RECAP_TITLE = 200
MAX_RECAP_TEXT = 5000
MAX_SECRET_IDS = 20
MAX_STAGE_BYTES = 4000   # frente + a anterior (↶) + preferências; o normal é < 1 KB


def _bad(code):
    raise ValidationError({'error': code})


def _int_id(v, code):
    if not isinstance(v, int) or isinstance(v, bool) or v < 1:
        _bad(code)
    return v


def _str(v, limit, code):
    if v is None:
        return ''
    if not isinstance(v, str):
        _bad(code)
    v = v.strip()
    if len(v) > limit:
        _bad(f'{code}_too_long')
    return v


def _short_id(v, code):
    if not isinstance(v, str) or not v or len(v) > 40:
        _bad(code)
    return v


def _now():
    return timezone.now().isoformat()


def _ver(*parts):
    """Versão da imagem da frente: muda a cada "mostrar" (a URL velha morre)."""
    raw = '|'.join(str(p) for p in parts)
    return hashlib.sha1(raw.encode('utf-8')).hexdigest()[:12]


def _json_len(v):
    return len(json.dumps(v, ensure_ascii=False, separators=(',', ':')))


# ------------------------------------------------------------------ leitura do estado
def legacy_front(state):
    """Campanha de antes do palco (só `screenCard`): a frente equivalente, guardada
    para depois do combate como era (focus False). Sem migração: vale até o
    primeiro toque do mestre na Tela, que grava o palco de verdade."""
    card = (state or {}).get('screenCard') if isinstance(state, dict) else None
    if not isinstance(card, dict):
        return None
    kind = card.get('type')
    if kind == 'entry' and isinstance(card.get('entryId'), int):
        front = {'kind': 'card', 'entryId': card['entryId'], 'label': ''}
        if card.get('secretIds'):
            front['secretIds'] = list(card['secretIds'])
        return front
    if kind == 'recap':
        return {'kind': 'recap', 'label': (card.get('title') or 'Anteriormente…')[:MAX_LABEL]}
    if kind == 'scene' and card.get('adventureId') and card.get('nodeId'):
        title = str(state.get('scene') or '')[:MAX_TITLE]
        front = {'kind': 'scene', 'title': title, 'label': title[:MAX_LABEL],
                 'ref': {'advId': card['adventureId'], 'nodeId': card['nodeId']}}
        if state.get('sceneText'):
            front['text'] = str(state['sceneText'])[:MAX_TEXT]
        return front
    return None


def get_stage(state):
    """Palco normalizado (com os padrões), a partir do `state` cru."""
    raw = (state or {}).get(STAGE_KEY) if isinstance(state, dict) else None
    if not isinstance(raw, dict):
        legacy = legacy_front(state)
        raw = {'front': legacy, 'focus': False} if legacy else {}
    front = raw.get('front') if isinstance(raw.get('front'), dict) else None
    if front and front.get('kind') not in FRONT_KINDS:
        front = None
    prefs = dict(PREFS_DEFAULT)
    if isinstance(raw.get('prefs'), dict):
        prefs.update({k: v for k, v in raw['prefs'].items() if k in PREFS_DEFAULT})
    out = {
        'v': 1,
        'bg': raw.get('bg') if raw.get('bg') in BGS else 'auto',
        'front': front,
        'focus': raw.get('focus') is not False,
        'prev': raw.get('prev') if isinstance(raw.get('prev'), dict) else None,
        'prefs': prefs,
        'at': raw.get('at'),
    }
    if raw.get('lit') in ('auto', 'map'):
        out['lit'] = raw['lit']
    return out


def _snapshot(stage):
    return {'bg': stage['bg'], 'front': stage['front'], 'focus': stage['focus']}


def _same_front(a, b):
    """A mesma coisa na frente? (ignora `ver`/`label`, que mudam a cada envio)."""
    if not a or not b:
        return a == b
    skip = ('ver', 'label', 'hidden')
    return {k: v for k, v in a.items() if k not in skip} == {k: v for k, v in b.items() if k not in skip}


# ------------------------------------------------------------------ validação do alvo
def _entry(campaign, entry_id):
    from .models import WorldEntry
    entry = (WorldEntry.objects.filter(campaign=campaign, pk=entry_id)
             .only('id', 'name', 'kind', 'visibility', 'image_ver', 'data').first())
    if not entry:
        raise NotFound('entry_not_found')
    return entry


def _node(campaign, adv_id, node_id):
    adv = campaign.adventures.filter(pk=adv_id).only('id', 'data').first()
    node = next((n for n in ((adv.data or {}).get('nodes') or []) if n.get('id') == node_id), None) if adv else None
    if not node:
        raise NotFound('scene_not_found')
    return node


def _plan_scene(campaign, scene_id):
    settings = campaign.dm_settings if isinstance(campaign.dm_settings, dict) else {}
    plan = settings.get('sessionPlan') if isinstance(settings, dict) else None
    scenes = (plan or {}).get('scenes') if isinstance(plan, dict) else None
    scene = next((s for s in scenes or [] if isinstance(s, dict) and s.get('id') == scene_id), None)
    if not scene:
        raise NotFound('scene_not_found')
    return scene


def node_scene_front(campaign, adv_id, node_id, *, with_text=True):
    """A sala de uma aventura como cena na frente (Conduzir: "Nome" ou "Nome + texto")."""
    front = _node_scene(campaign, adv_id, node_id)
    if not with_text:
        front.pop('text', None)
    return front


def _node_scene(campaign, adv_id, node_id, scene_id=None):
    node = _node(campaign, adv_id, node_id)
    title = (node.get('name') or '').strip()[:MAX_TITLE]
    front = {'kind': 'scene', 'title': title, 'ref': {'advId': adv_id, 'nodeId': node_id}, 'label': title[:MAX_LABEL]}
    text = (node.get('readAloud') or '').strip()[:MAX_TEXT]
    if text:
        front['text'] = text
    if scene_id:
        front['sceneId'] = scene_id
    if node.get('image'):
        front['image'] = {'advId': adv_id, 'nodeId': node_id}
        front['ver'] = _ver('node', adv_id, node_id, len(node['image']), _now())
    return front


def clean_target(campaign, target, caption=None):
    """Valida o `target` do op 'show' e devolve a frente pronta para gravar.

    {kind:'card', entryId, secretIds?}      cartão revelado ou conhecido de nome
    {kind:'image', ref:{entryId}|{mapOf}|{advId,nodeId}, caption?}
                                            "só a imagem" (o cartão pode estar oculto)
    {kind:'scene', sceneId} | {kind:'scene', advId, nodeId}
    {kind:'text', text}
    {kind:'recap', title, text}             → (frente, {title, text})
    Devolve (front, recap|None)."""
    if not isinstance(target, dict):
        _bad('invalid_target')
    kind = target.get('kind')
    if kind == 'card':
        entry = _entry(campaign, _int_id(target.get('entryId'), 'invalid_entryId'))
        if entry.visibility == 'hidden':
            # Mostrar não revela: para um oculto, o mestre escolhe "só a imagem" ou revela antes.
            _bad('entry_hidden')
        if is_private_handout(entry):
            _bad('handout_private')
        secret_ids = target.get('secretIds') or []
        if not isinstance(secret_ids, list) or len(secret_ids) > MAX_SECRET_IDS \
                or not all(isinstance(s, str) and 0 < len(s) <= 40 for s in secret_ids):
            _bad('invalid_secretIds')
        front = {'kind': 'card', 'entryId': entry.id, 'label': entry.name[:MAX_LABEL], 'ver': entry.image_ver or ''}
        if secret_ids:
            front['secretIds'] = list(dict.fromkeys(secret_ids))
        return front, None
    if kind == 'image':
        ref = target.get('ref')
        if not isinstance(ref, dict):
            _bad('invalid_ref')
        cap = _str(caption if caption is not None else target.get('caption'), MAX_CAPTION, 'caption')
        if 'advId' in ref or 'nodeId' in ref:
            adv_id = _int_id(ref.get('advId'), 'invalid_ref')
            node_id = _short_id(ref.get('nodeId'), 'invalid_ref')
            node = _node(campaign, adv_id, node_id)
            if not node.get('image'):
                _bad('no_image')
            front = {'kind': 'image', 'ref': {'advId': adv_id, 'nodeId': node_id},
                     'label': (node.get('name') or '')[:MAX_LABEL], 'hidden': False,
                     'ver': _ver('node', adv_id, node_id, len(node['image']), _now())}
        else:
            key = 'mapOf' if 'mapOf' in ref else 'entryId'
            entry = _entry(campaign, _int_id(ref.get(key), 'invalid_ref'))
            if is_private_handout(entry):
                # Documento com destinatário nunca vai à Tela, nem a imagem.
                _bad('handout_private')
            if not entry.image_ver:
                _bad('no_image')
            front = {'kind': 'image', 'ref': {key: entry.id}, 'label': entry.name[:MAX_LABEL],
                     'hidden': entry.visibility == 'hidden', 'ver': _ver(key, entry.id, entry.image_ver, _now())}
        if cap:
            front['caption'] = cap
        return front, None
    if kind == 'scene':
        if target.get('sceneId') is not None:
            # A cena do plano (V7): o nome dela (a 1ª linha; o resto é anotação do mestre) e o que
            # ela tem para a Tela — o texto para ler e a imagem, da cena solta ou da sala ligada.
            scene_id = _short_id(target.get('sceneId'), 'invalid_scene')
            return plan_scene_front(campaign, _plan_scene(campaign, scene_id), scene_id)[0], None
        adv_id = _int_id(target.get('advId'), 'invalid_scene')
        node_id = _short_id(target.get('nodeId'), 'invalid_scene')
        return _node_scene(campaign, adv_id, node_id), None
    if kind == 'text':
        text = _str(target.get('text'), MAX_TEXT, 'text')
        if not text:
            _bad('empty_text')
        return {'kind': 'text', 'text': text, 'label': text.split('\n', 1)[0][:60]}, None
    if kind == 'recap':
        title = _str(target.get('title'), MAX_RECAP_TITLE, 'recap')
        text = target.get('text') or ''
        if not isinstance(text, str):
            _bad('invalid_recap')
        if len(text) > MAX_RECAP_TEXT:
            _bad('recap_too_long')
        if not (title or text.strip()):
            _bad('empty_recap')
        return {'kind': 'recap', 'label': (title or 'Anteriormente…')[:MAX_LABEL]}, {'title': title, 'text': text}
    _bad('invalid_target')


def clean_prefs(raw):
    if not isinstance(raw, dict) or not raw:
        _bad('invalid_prefs')
    out = {}
    for key, value in raw.items():
        if key in PREFS_CHOICES:
            if value not in PREFS_CHOICES[key]:
                _bad(f'invalid_{key}')
        elif key in ('initiative', 'party', 'sheets'):
            if not isinstance(value, bool):
                _bad(f'invalid_{key}')
        else:
            _bad('invalid_prefs')
        out[key] = value
    return out


def clean_stage_op(campaign, body):
    """Valida o corpo de POST /stage. Faz as leituras (cartão, sala, plano) fora
    da trava. → {op, front?, recap?, focus?, bg?, on?, prefs?}"""
    body = body if isinstance(body, dict) else {}
    op = body.get('op')
    if op not in OPS:
        _bad('invalid_op')
    out = {'op': op}
    if op == 'show':
        front, recap = clean_target(campaign, body.get('target'), body.get('caption'))
        out['front'], out['recap'] = front, recap
        focus = body.get('focus', True)
        if not isinstance(focus, bool):
            _bad('invalid_focus')
        out['focus'] = focus
    elif op == 'dark':
        on = body.get('on', True)
        if not isinstance(on, bool):
            _bad('invalid_on')
        out['on'] = on
    elif op == 'bg':
        if body.get('bg') not in ('auto', 'map'):
            _bad('invalid_bg')
        out['bg'] = body['bg']
    elif op == 'prefs':
        out['prefs'] = clean_prefs(body.get('prefs'))
    return out


# ------------------------------------------------------------------ escrita
def next_stage(stage, op):
    """Aplica o op (já validado) sobre o palco normalizado. Puro.
    → (novo palco, mudou?)"""
    new = dict(stage)
    snap = _snapshot(stage)
    kind = op['op']
    lit = stage.get('lit') if stage.get('lit') in ('auto', 'map') else 'auto'
    if kind == 'show':
        front, focus = op['front'], op['focus']
        dark = stage['bg'] == 'dark'
        if _same_front(stage['front'], front) and stage['focus'] == focus and not dark:
            return stage, False
        # Mandar algo com a Tela escurecida acende de novo (a Tela mostra a última coisa mandada).
        if dark:
            new['bg'] = lit
            new.pop('lit', None)
        new.update(front=front, focus=focus, prev=snap)
    elif kind == 'back':
        if not stage['front']:
            return stage, False
        new.update(front=None, focus=True, prev=snap)
    elif kind == 'clear':
        if not stage['front']:
            return stage, False   # o teste sai à parte (CheckRequest), sem gravar o palco
        new.update(front=None, focus=True, prev=snap)
    elif kind == 'undo':
        prev = stage.get('prev')
        if not prev:
            return stage, False
        new.update(bg=prev.get('bg') if prev.get('bg') in BGS else 'auto',
                   front=prev.get('front') if isinstance(prev.get('front'), dict) else None,
                   focus=prev.get('focus') is not False, prev=snap)
        if new['bg'] == 'dark':
            new['lit'] = lit
        else:
            new.pop('lit', None)
    elif kind == 'dark':
        if op['on']:
            if stage['bg'] == 'dark':
                return stage, False
            new.update(bg='dark', lit=stage['bg'], prev=snap)
        else:
            if stage['bg'] != 'dark':
                return stage, False
            new.update(bg=lit, prev=snap)
            new.pop('lit', None)
    elif kind == 'bg':
        if stage['bg'] == op['bg']:
            return stage, False
        new.update(bg=op['bg'], prev=snap)
        new.pop('lit', None)
    elif kind == 'prefs':
        prefs = {**stage['prefs'], **op['prefs']}
        if prefs == stage['prefs']:
            return stage, False
        new['prefs'] = prefs
    new['at'] = _now()
    if _json_len(new) > MAX_STAGE_BYTES:
        # A frente anterior (↶) é a única coisa que pode ser descartada sem perder a Tela.
        new['prev'] = None
        if _json_len(new) > MAX_STAGE_BYTES:
            _bad('stage_too_large')
    return new, True


def compat_card(front, state):
    """`screenCard` que a TV antiga entende para esta frente (ou None)."""
    if not front:
        return None
    old = (state or {}).get('screenCard') if isinstance(state, dict) else None
    old = old if isinstance(old, dict) else {}
    kind = front.get('kind')
    if kind == 'card':
        card = {'type': 'entry', 'entryId': front['entryId'], 'secretIds': front.get('secretIds') or []}
    elif kind == 'scene' and isinstance(front.get('ref'), dict):
        card = {'type': 'scene', 'adventureId': front['ref']['advId'], 'nodeId': front['ref']['nodeId']}
    elif kind == 'recap':
        recap = (state or {}).get(RECAP_KEY) or {}
        card = {'type': 'recap', 'title': recap.get('title') or '', 'text': recap.get('text') or ''}
    else:
        return None
    # A mesma coisa de antes mantém o `at` (o celular do jogador não avisa de novo).
    if {k: old.get(k) for k in card} == card and old.get('at'):
        return old
    return {**card, 'at': _now()}


def apply_stage_op(campaign, op, extra=None):
    """Grava o op (POST /stage). Não escreve nada se o palco não mudou (cada
    escrita muda `updated_at` e faz todos rebaixarem a campanha). `extra` são
    chaves do `state` gravadas na mesma escrita (ex.: o nome da cena).
    → (palco normalizado, mudou?) — "mudou" é a Tela (palco ou texto do
    "Anteriormente em…"), não as chaves de `extra`: sem mudança na Tela, o aviso
    não oferece ↶ Desfazer (que desfaria a mudança anterior)."""
    from .models import Campaign, CheckRequest
    if op['op'] == 'clear':
        # 🧹 Limpar a Tela: tira também o teste (uma chamada só).
        CheckRequest.objects.filter(campaign=campaign, show_on_screen=True).update(show_on_screen=False, screen_at=None)
    current = Campaign.objects.filter(pk=campaign.pk).values_list('state', flat=True).first() or {}
    _, changed = next_stage(get_stage(current), op)
    recap_changed = bool(op['op'] == 'show' and op.get('recap') and (current.get(RECAP_KEY) or {}) != op['recap'])
    if not changed and not extra and not recap_changed:
        return get_stage(current), False
    legacy_name = _legacy_card_name(campaign, current)
    seen = {'moved': False}

    def fn(state):
        stage, moved = next_stage(_named_legacy(get_stage(state), state, legacy_name), op)
        seen['moved'] = moved
        patch = {**(extra or {}), STAGE_KEY: stage}
        if op['op'] == 'show' and op.get('recap'):
            patch[RECAP_KEY] = op['recap']
            state = {**state, RECAP_KEY: op['recap']}
        patch['screenCard'] = compat_card(stage['front'], state)
        if op['op'] == 'show' and moved:
            sessions = shown_in_session(state, op['front'])
            if sessions is not None:
                patch['diarySessions'] = sessions
        return patch

    state = update_state(campaign, fn)
    return get_stage(state), seen['moved'] or recap_changed


def _legacy_card_name(campaign, state):
    """Campanha de antes do palco cuja frente antiga é um cartão: o nome dele (1
    leitura, só no 1º toque na Tela), para o ↶ dizer "Voltar para: Borin" — o
    `screenCard` antigo não guardava o nome. None quando não precisa."""
    from .models import WorldEntry
    if not isinstance(state, dict) or isinstance(state.get(STAGE_KEY), dict):
        return None
    front = legacy_front(state)
    if not front or front.get('kind') != 'card' or front.get('label'):
        return None
    name = WorldEntry.objects.filter(campaign=campaign, pk=front['entryId']).values_list('name', flat=True).first()
    return (name or '')[:MAX_LABEL] or None


def _named_legacy(stage, state, name):
    """O palco montado do `screenCard` antigo, com o nome do cartão na frente."""
    front = stage.get('front')
    if not name or isinstance((state or {}).get(STAGE_KEY), dict) or not front \
            or front.get('kind') != 'card' or front.get('label'):
        return stage
    return {**stage, 'front': {**front, 'label': name}}


def shown_in_session(state, front):
    """diarySessions com o que foi mostrado na sessão ao vivo (`shown`: [{t, k}],
    as 20 últimas), para o rascunho do Resumo da sessão. None = nada a gravar.
    "Só a imagem" de cartão oculto grava a legenda (ou 'Imagem') e `h: true`,
    nunca o nome: o rascunho do resumo vai à Tela."""
    import re
    if not (isinstance(state, dict) and state.get('live') and front):
        return None
    m = re.search(r'\d+', str(state.get('session') or ''))
    meta = state.get('diarySessions') if isinstance(state.get('diarySessions'), dict) else {}
    if not m or m.group() not in meta or not isinstance(meta[m.group()], dict):
        return None
    key = m.group()
    if front.get('kind') == 'image' and front.get('hidden'):
        item = {'t': str(front.get('caption') or 'Imagem')[:60], 'k': 'image', 'h': True}
    else:
        item = {'t': str(front.get('label') or front.get('title') or '')[:60], 'k': front.get('kind')}
    shown = [x for x in (meta[key].get('shown') or []) if isinstance(x, dict)]
    if shown and shown[-1] == item:
        return None
    return {**meta, key: {**meta[key], 'shown': (shown + [item])[-20:]}}


def stage_from_screen_card(campaign, card):
    """O POST /screen-card antigo vira um op do palco (mesma validação de antes:
    cartão oculto → 400 entry_hidden). `card` já passou por clean_screen_card."""
    if card is None:
        return {'op': 'back'}
    if card['type'] == 'entry':
        target = {'kind': 'card', 'entryId': card['entryId'], 'secretIds': card.get('secretIds') or []}
    elif card['type'] == 'recap':
        target = {'kind': 'recap', 'title': card.get('title') or '', 'text': card.get('text') or ''}
    else:
        target = {'kind': 'scene', 'advId': card['adventureId'], 'nodeId': card['nodeId']}
    front, recap = clean_target(campaign, target)
    return {'op': 'show', 'front': front, 'recap': recap, 'focus': True}


# ------------------------------------------------------------------ ▶ Começar esta cena (V7)
# POST /campaigns/:id/stage/scene {sceneId, show?, focus?, log?}: a cena do plano vira a
# "cena agora" numa chamada — o nome em state.scene (o que os jogadores, a capa e a TV
# leem), o id em state.sceneId (só o mestre), a sala da cena ligada vira a sala atual da
# aventura ("O grupo entrou aqui", com o registro na Crônica se pedido — com o nome da
# cena), a cena que estava "agora" fica feita no plano e, com "Mostrar ao começar", a cena
# vai à frente da Tela com o título, o texto e a versão da imagem GRAVADOS no palco (a TV
# não abre a aventura a cada leitura). A resposta traz `undo`: o que o ↶ Desfazer manda de
# volta ({undo: …}) para voltar tudo — o nome, o id, a Tela, a cena feita, a sala atual e
# o registro.
MAX_SCENE_NAME = 200      # o mesmo teto de state.scene
MAX_SCENE_TEXT = 5000     # o de state.sceneText (o texto lido que a Mesa do jogador mostra)


def _scene_name(scene):
    return ((scene.get('text') or '').strip().split('\n', 1)[0]).strip()


def _first_ref_image(campaign, ids):
    """O 1º cartão com imagem de uma lista de ids (na ordem dela), sem documento privado."""
    from .models import WorldEntry
    ids = [i for i in ids or [] if isinstance(i, int) and not isinstance(i, bool)][:20]
    if not ids:
        return None
    rows = {e.id: e for e in WorldEntry.objects.filter(campaign=campaign, pk__in=ids).only('id', 'kind', 'data', 'image_ver')}
    for i in ids:
        e = rows.get(i)
        if e and e.image_ver and not is_private_handout(e):
            return e
    return None


def _maybe_node(campaign, adv_id, node_id):
    try:
        return _node(campaign, adv_id, node_id)
    except NotFound:
        return None


def plan_scene_front(campaign, scene, scene_id):
    """A frente "cena" de uma cena do plano, com o que ela tem (um lugar por dado, §3.3):
    cena solta → `scene.read` e `scene.show`; cena ligada → o texto e a imagem da SALA (o
    1º cartão com imagem da sala, senão a imagem dela; nenhuma com `showOff`). Sala apagada:
    fica só o que é do plano. → (frente, texto inteiro, sala|None, (aventura, sala)|None)"""
    ref = scene.get('nodeRef') if isinstance(scene.get('nodeRef'), dict) else None
    node = room = None
    if ref and isinstance(ref.get('adventureId'), int) and isinstance(ref.get('nodeId'), str):
        node = _maybe_node(campaign, ref['adventureId'], ref['nodeId'])
        room = (ref['adventureId'], ref['nodeId']) if node is not None else None
    name = _scene_name(scene) or ((node or {}).get('name') or '').strip()
    if not name:
        _bad('empty_scene')
    front = {'kind': 'scene', 'sceneId': scene_id, 'title': name[:MAX_TITLE], 'label': name[:MAX_LABEL]}
    image, image_ver = None, ''
    if node is not None:
        text = node.get('readAloud') or ''
        front['ref'] = {'advId': room[0], 'nodeId': room[1]}
        if not scene.get('showOff'):
            e = _first_ref_image(campaign, node.get('refs'))
            if e:
                image, image_ver = {'entryId': e.id}, e.image_ver
            elif node.get('image'):
                image, image_ver = {'advId': room[0], 'nodeId': room[1]}, len(node['image'])
    else:
        text = scene.get('read') if isinstance(scene.get('read'), str) else ''
        show = scene.get('show') if isinstance(scene.get('show'), dict) else {}
        if show.get('kind') == 'entry' and isinstance(show.get('id'), int):
            e = _first_ref_image(campaign, [show['id']])
            if e:
                image, image_ver = {'entryId': e.id}, e.image_ver
        elif show.get('kind') == 'node' and isinstance(show.get('advId'), int) and isinstance(show.get('nodeId'), str):
            n = _maybe_node(campaign, show['advId'], show['nodeId'])
            if n and n.get('image'):
                image, image_ver = {'advId': show['advId'], 'nodeId': show['nodeId']}, len(n['image'])
    text = str(text or '').strip()
    if text:
        front['text'] = text[:MAX_TEXT]
    if image:
        front['image'] = image
        front['ver'] = _ver('scene', scene_id, json.dumps(image, sort_keys=True), image_ver, _now())
    return front, text[:MAX_SCENE_TEXT], node, room


def set_scene_done(campaign, scene_id, done):
    """Marca (ou desmarca) uma cena do plano como feita, com a trava do dm_settings e o
    `_rev`/`planRev` subindo como num PUT do plano. → True se mudou."""
    from django.db import transaction
    from .campaign_state import locked_dm_settings
    from .models import Campaign
    from .world_rules import bump_session_plan
    with transaction.atomic():
        settings = locked_dm_settings(campaign.pk)
        plan = settings.get('sessionPlan') if isinstance(settings.get('sessionPlan'), dict) else None
        scenes = plan.get('scenes') if plan else None
        if not isinstance(scenes, list):
            return False
        hit = False
        out = []
        for sc in scenes:
            if isinstance(sc, dict) and sc.get('id') == scene_id and bool(sc.get('done')) != bool(done):
                sc = {**sc, 'done': bool(done)}
                hit = True
            out.append(sc)
        if not hit:
            return False
        state = Campaign.objects.filter(pk=campaign.pk).values_list('state', flat=True).first() or {}
        settings['sessionPlan'] = bump_session_plan({**plan, 'scenes': out}, state)
        settings['planRev'] = _now()   # o pulso do mestre (V4) lê só isto
        Campaign.objects.filter(pk=campaign.pk).update(dm_settings=settings)
    campaign.dm_settings = settings
    return True


def _enter_room(campaign, room, *, name='', log=True, user=None):
    """A sala da cena ligada vira a sala atual da aventura (o "O grupo entrou aqui" do modo
    Na mesa, com o mesmo registro na Crônica). → o que o ↶ precisa para voltar
    ({advId, nodeId, current, visited, status, diaryId?}) ou None (já era a sala atual)."""
    from django.db import transaction
    from .diary import log_diary
    from .models import Adventure
    from .views_adventures import _clean_play
    adv_id, node_id = room
    with transaction.atomic():
        adv = Adventure.objects.select_for_update().filter(campaign=campaign, pk=adv_id).first()
        if not adv:
            return None
        play = _clean_play(adv.play, adv.data or {})
        if play['current'] == node_id:
            return None
        back = {'advId': adv.id, 'nodeId': node_id, 'current': play['current'],
                'visited': node_id in play['visited'], 'status': adv.status}
        play['current'] = node_id
        if node_id not in play['visited']:
            play['visited'].append(node_id)
        if adv.status == 'draft':
            adv.status = 'playing'
        adv.play = play
        adv.save(update_fields=['play', 'status', 'updated_at'])
    if log:
        entry = log_diary(campaign, 'custom', f'O grupo entrou em {name}'[:200], '',
                          {'adventureId': adv.id, 'adventureName': adv.name, 'nodeId': node_id}, user=user)
        if entry:
            back['diaryId'] = entry.id
    return back


def _leave_room(campaign, back):
    """↶ da sala: a sala atual de antes, o "visitado" e a situação de antes; o registro sai."""
    from django.db import transaction
    from .models import Adventure, DiaryEntry
    from .views_adventures import _clean_play
    with transaction.atomic():
        adv = Adventure.objects.select_for_update().filter(campaign=campaign, pk=back['advId']).first()
        if adv:
            play = _clean_play(adv.play, adv.data or {})
            node_ids = {n.get('id') for n in (adv.data or {}).get('nodes') or []}
            play['current'] = back['current'] if back['current'] in node_ids else None
            if not back['visited']:
                play['visited'] = [v for v in play['visited'] if v != back['nodeId']]
            if back.get('status') in ('draft', 'playing', 'done'):
                adv.status = back['status']
            adv.play = play
            adv.save(update_fields=['play', 'status', 'updated_at'])
    if back.get('diaryId'):
        DiaryEntry.objects.filter(campaign=campaign, pk=back['diaryId'], subtype='custom').delete()


def _bool_opt(body, key, default):
    v = body.get(key, default)
    if v is None:
        return default
    if not isinstance(v, bool):
        _bad(f'invalid_{key}')
    return v


def start_scene(campaign, body, *, user=None):
    """▶ Começar esta cena. body: {sceneId, show?, focus?, log?}
      show  — mostrar na Tela (padrão: o "Mostrar ao começar" da cena, quando ela tem
              imagem ou texto para ler; sem nada disso, só o nome vai a state.scene)
      focus — false = "Guardar para depois do combate"
      log   — registrar na Crônica a entrada na sala da cena ligada (padrão sim)
    → {stage, changed, shown, scene, sceneId, doneId, undo}"""
    from .campaign_state import merge_state
    from .models import Campaign
    body = body if isinstance(body, dict) else {}
    scene_id = _short_id(body.get('sceneId'), 'invalid_scene')
    show_opt = body.get('show')
    if show_opt is not None and not isinstance(show_opt, bool):
        _bad('invalid_show')
    focus = _bool_opt(body, 'focus', True)
    log = _bool_opt(body, 'log', True)
    scene = _plan_scene(campaign, scene_id)
    front, full_text, node, room = plan_scene_front(campaign, scene, scene_id)
    has_media = bool(front.get('text') or front.get('image'))
    show = show_opt if isinstance(show_opt, bool) else (scene.get('showOnStart') is not False and has_media)
    current = Campaign.objects.filter(pk=campaign.pk).values_list('state', flat=True).first() or {}
    prev_id = current.get('sceneId') if isinstance(current.get('sceneId'), str) else None
    undo = {
        'scene': str(current.get('scene') or '')[:MAX_SCENE_NAME],
        'sceneId': prev_id,
        'sceneText': current.get('sceneText') if isinstance(current.get('sceneText'), str) else None,
    }
    extra = {'scene': front['title'][:MAX_SCENE_NAME], 'sceneId': scene_id,
             # o texto lido (a Mesa do jogador mostra) só quando a cena vai à Tela com ele
             'sceneText': full_text if show and full_text else None}
    if show:
        stage, changed = apply_stage_op(campaign, {'op': 'show', 'front': front, 'recap': None, 'focus': focus}, extra=extra)
    else:
        merge_state(campaign, extra)
        stage, changed = get_stage(campaign.state), False
    done_id = prev_id if prev_id and prev_id != scene_id and set_scene_done(campaign, prev_id, True) else None
    # o registro diz o nome da CENA (o mesmo de state.scene, da capa e da Tela), nunca o
    # nome interno da sala: a Crônica é lida pelos jogadores
    room_back = _enter_room(campaign, room, name=front['title'], log=log, user=user) if room else None
    undo.update(stage=changed, doneId=done_id, room=room_back)
    return {'stage': stage, 'changed': changed, 'shown': show, 'scene': extra['scene'], 'sceneId': scene_id,
            'doneId': done_id, 'undo': undo}


def _clean_undo(raw):
    if not isinstance(raw, dict):
        _bad('invalid_undo')
    scene = raw.get('scene')
    if not isinstance(scene, str) or len(scene) > MAX_SCENE_NAME:
        _bad('invalid_undo')
    out = {'scene': scene, 'stage': raw.get('stage') is True}
    for key in ('sceneId', 'doneId'):
        v = raw.get(key)
        out[key] = _short_id(v, 'invalid_undo') if v is not None else None
    text = raw.get('sceneText')
    if text is not None and (not isinstance(text, str) or len(text) > MAX_SCENE_TEXT):
        _bad('invalid_undo')
    out['sceneText'] = text
    room = raw.get('room')
    if room is not None:
        if not isinstance(room, dict):
            _bad('invalid_undo')
        cur = room.get('current')
        diary = room.get('diaryId')
        out['room'] = {
            'advId': _int_id(room.get('advId'), 'invalid_undo'),
            'nodeId': _short_id(room.get('nodeId'), 'invalid_undo'),
            'current': _short_id(cur, 'invalid_undo') if cur is not None else None,
            'visited': room.get('visited') is True,
            'status': room.get('status') if room.get('status') in ('draft', 'playing', 'done') else None,
            'diaryId': _int_id(diary, 'invalid_undo') if diary is not None else None,
        }
    else:
        out['room'] = None
    return out


def undo_scene_start(campaign, raw):
    """↶ Desfazer do ▶ Começar esta cena: o `undo` que a resposta trouxe.
    → {stage, changed, scene, sceneId}"""
    from .campaign_state import merge_state
    u = _clean_undo(raw)
    extra = {'scene': u['scene'], 'sceneId': u['sceneId'], 'sceneText': u['sceneText']}   # None tira a chave
    if u['stage']:
        stage, changed = apply_stage_op(campaign, {'op': 'undo'}, extra=extra)
    else:
        merge_state(campaign, extra)
        stage, changed = get_stage(campaign.state), False
    if u['doneId']:
        set_scene_done(campaign, u['doneId'], False)
    if u['room']:
        _leave_room(campaign, u['room'])
    return {'stage': stage, 'changed': changed, 'scene': u['scene'], 'sceneId': u['sceneId']}


# ------------------------------------------------------------------ projeção pública
def stage_image_url(campaign, front, *, token=None):
    ver = front.get('ver')
    if not ver:
        return None
    if token:
        return f'/api/screen/{token}/stage-image?v={ver}'
    return f'/api/campaigns/{campaign.id}/stage-image?v={ver}'


def public_front(campaign, front, state, *, token=None, card=None):
    """A frente como a TV e os jogadores podem ver (sem `label`, sem nome de
    oculto). None quando a frente deixou de poder aparecer. `card` = o
    screenCard já resolvido (compatibilidade) da mesma entrada: evita ler o
    cartão duas vezes no mesmo pedido."""
    from .models import WorldEntry
    if not front:
        return None
    kind = front.get('kind')
    if kind == 'card':
        if not (isinstance(card, dict) and card.get('type') == 'entry' and card.get('entryId') == front.get('entryId')
                and (card.get('secretIds') is None)):
            entry = (WorldEntry.objects.filter(campaign=campaign, pk=front.get('entryId'))
                     .only('id', 'name', 'kind', 'visibility', 'summary', 'body', 'secrets', 'image_ver', 'data',
                           'revealed_at').first())
            if not entry or entry.visibility == 'hidden' or is_private_handout(entry):
                return None
            card = entry_card(entry, front.get('secretIds') or [], token=token)
        return {'kind': 'card', 'entryKind': card['kind'], 'entryId': card['entryId'], 'title': card['title'],
                'kindLabel': card['kindLabel'], 'kindLabelEn': card['kindLabelEn'], 'text': card['text'],
                'imageUrl': card['imageUrl'], 'partial': card['partial']}
    if kind == 'image':
        out = {'kind': 'image', 'imageUrl': stage_image_url(campaign, front, token=token)}
        if front.get('caption'):
            out['caption'] = front['caption']
        if isinstance(front.get('ref'), dict) and 'mapOf' in front['ref']:
            out['map'] = True
        return out
    if kind == 'scene':
        out = {'kind': 'scene', 'title': front.get('title') or '', 'text': front.get('text') or ''}
        if front.get('image'):
            out['imageUrl'] = stage_image_url(campaign, front, token=token)
        return out
    if kind == 'text':
        return {'kind': 'text', 'text': front.get('text') or ''}
    if kind == 'recap':
        recap = (state or {}).get(RECAP_KEY)
        if not isinstance(recap, dict):
            # Antes do palco o texto morava só no screenCard.
            old = (state or {}).get('screenCard') or {}
            recap = old if isinstance(old, dict) and old.get('type') == 'recap' else {}
        return {'kind': 'recap', 'title': recap.get('title') or '', 'text': recap.get('text') or ''}
    return None


def public_stage(campaign, *, token=None, test=None, card=None):
    """Projeção pública do palco (irmã de `public_state`): vai à TV (/api/screen)
    e ao GET da campanha do jogador. `card`: o screenCard resolvido no mesmo
    pedido (com as mesmas URLs), reaproveitado quando é a mesma entrada.
    {bg, front:{kind, title?, text?, imageUrl?, caption?, …}|null, focus, overlays:{test}, prefs:{initiative, party}, at}"""
    stage = get_stage(campaign.state)
    front = stage['front']
    if card and front and front.get('kind') == 'card':
        raw = (campaign.state or {}).get('screenCard') or {}
        # Só serve se o cartão gravado pediu os mesmos segredos que a frente.
        if (raw.get('secretIds') or []) != (front.get('secretIds') or []):
            card = None
        else:
            card = {k: v for k, v in card.items() if k != 'secretIds'}
    return {
        'bg': stage['bg'],
        'front': public_front(campaign, front, campaign.state, token=token, card=card),
        'focus': stage['focus'],
        'overlays': {'test': test},
        'prefs': {k: stage['prefs'][k] for k in PUBLIC_PREFS},
        'at': stage['at'],
    }


def with_combat_now(qs):
    """Anota no queryset da campanha as 2 colunas do combate que a regra da Tela
    usa (LEFT JOIN no mesmo SELECT: nenhuma consulta a mais, e os tokens com
    imagem não saem do banco)."""
    from django.db.models import F
    return qs.annotate(_combat_active=F('combat__active'), _combat_round=F('combat__round_number'))


def combat_now(campaign):
    """Resumo mínimo do combate para a regra da Tela ({active, round}). Usa a
    anotação de `with_combat_now` quando veio; senão, 1 consulta de 2 colunas."""
    from .models import CombatInstance
    if hasattr(campaign, '_combat_active'):
        row = (campaign._combat_active, campaign._combat_round) if campaign._combat_active is not None else None
    else:
        row = (CombatInstance.objects.filter(campaign=campaign)
               .values_list('active', 'round_number').first())
    if not row:
        return {'active': False, 'round': None}
    return {'active': bool(row[0]), 'round': row[1] if row[0] else None}


def dm_stage(campaign, card=None):
    """O palco do MESTRE (cru, com os nomes) para o GET da campanha. Numa campanha
    de antes do palco, o nome do cartão vem do screenCard já resolvido.

    A Tela nunca mente (princípio 7): um cartão na frente que depois foi ocultado
    (ou apagado) não aparece na TV nem para os jogadores — o screenCard dele
    resolve para None no mesmo pedido —, então a frente do mestre leva
    `gone: True` ("Irmã Velna · não aparece na Tela (oculto ou apagado)"), sem
    consulta a mais."""
    stage = get_stage(campaign.state)
    front = stage['front']
    if front and not front.get('label') and isinstance(card, dict) and card.get('title'):
        stage['front'] = front = {**front, 'label': card['title'][:MAX_LABEL]}
    if front and front.get('kind') == 'card' and card is None:
        raw = (campaign.state or {}).get('screenCard')
        if isinstance(raw, dict) and raw.get('type') == 'entry' and raw.get('entryId') == front.get('entryId'):
            stage['front'] = {**front, 'gone': True}
    return stage


def stage_image_data(campaign, ver):
    """(data URL, ver) da imagem que está na frente AGORA, ou None. Só a frente
    atual e só com a versão certa: trocou a frente, a URL antiga dá 404."""
    from .models import WorldImage
    front = get_stage(campaign.state)['front']
    if not front or not ver or front.get('ver') != ver:
        return None
    if front.get('kind') == 'image':
        ref = front.get('ref') or {}
    elif front.get('kind') == 'scene' and isinstance(front.get('image'), dict):
        ref = front['image']
    else:
        return None
    if ref.get('advId') is not None:
        adv = campaign.adventures.filter(pk=ref.get('advId')).only('id', 'data').first()
        node = next((n for n in ((adv.data or {}).get('nodes') or []) if n.get('id') == ref.get('nodeId')), None) if adv else None
        data = (node or {}).get('image')
        return (data, ver) if data else None
    entry_id = ref.get('entryId') or ref.get('mapOf')
    entry = _entry_or_none(campaign, entry_id)
    if not entry or not entry.image_ver or is_private_handout(entry):
        return None
    img = WorldImage.objects.filter(entry=entry).only('data').first()
    return (img.data, ver) if img and img.data else None


def _entry_or_none(campaign, entry_id):
    from .models import WorldEntry
    if not isinstance(entry_id, int):
        return None
    return (WorldEntry.objects.filter(campaign=campaign, pk=entry_id)
            .only('id', 'kind', 'data', 'image_ver').first())

"""
Cartão "Mostrar agora" do telão (contrato C2 · ScreenCard).

Entrada (POST /campaigns/:id/screen-card, só mestre), gravada em state.screenCard:
    {type:'entry', entryId, secretIds?:[]}
  | {type:'recap', title, text}
  | {type:'scene', adventureId, nodeId}
  | null                                   (tira o cartão)

Saída resolvida (telão e celular do jogador), só com dados públicos:
    {type, title, kindLabel, text, imageUrl, at, entryId?, kind?, kindLabelEn?}

A resolução acontece na LEITURA: se o mestre esconder a entrada depois de
mostrar, o cartão some; segredos só aparecem se já estiverem revelados.
"""
import re

from django.utils import timezone
from rest_framework.exceptions import ValidationError, NotFound

KIND_LABELS = {
    'place': ('Lugar', 'Place'),
    'npc': ('Personagem', 'Character'),
    'faction': ('Facção', 'Faction'),
    'item': ('Item', 'Item'),
    'lore': ('Lenda', 'Lore'),
    'handout': ('Documento', 'Handout'),
}
MAX_RECAP_TITLE = 200
MAX_RECAP_TEXT = 5000
MAX_SECRET_IDS = 20
_MENTION = re.compile(r'@\[([^\]]{1,120})\]\(\d+\)')


def _bad(code):
    raise ValidationError({'error': code})


def plain_text(text):
    """Corpo público sem a marcação de menção: '@[Velna](5)' → 'Velna'."""
    return _MENTION.sub(r'\1', text or '')


def clean_screen_card(campaign, body):
    """Valida o corpo do POST e devolve o que vai para state.screenCard (ou None)."""
    if isinstance(body, dict) and 'card' in body:   # aceita {card: {...} | null}
        body = body['card']
    if body is None or body == {}:
        return None
    if not isinstance(body, dict):
        _bad('invalid_card')
    if body.get('type') in (None, 'none'):
        return None
    kind = body.get('type')
    now = timezone.now().isoformat()
    if kind == 'entry':
        from .models import WorldEntry
        entry_id = body.get('entryId')
        if not isinstance(entry_id, int) or isinstance(entry_id, bool):
            _bad('invalid_entryId')
        entry = WorldEntry.objects.filter(campaign=campaign, pk=entry_id).first()
        if not entry:
            raise NotFound('entry_not_found')
        if entry.visibility == 'hidden':
            # Mostrar no telão não revela sozinho: o mestre revela antes (um clique dele).
            _bad('entry_hidden')
        secret_ids = body.get('secretIds') or []
        if not isinstance(secret_ids, list) or len(secret_ids) > MAX_SECRET_IDS \
                or not all(isinstance(s, str) and 0 < len(s) <= 40 for s in secret_ids):
            _bad('invalid_secretIds')
        return {'type': 'entry', 'entryId': entry.id, 'secretIds': list(dict.fromkeys(secret_ids)), 'at': now}
    if kind == 'recap':
        title = body.get('title') or ''
        text = body.get('text') or ''
        if not isinstance(title, str) or not isinstance(text, str):
            _bad('invalid_recap')
        if len(title) > MAX_RECAP_TITLE or len(text) > MAX_RECAP_TEXT:
            _bad('recap_too_long')
        if not (title.strip() or text.strip()):
            _bad('empty_recap')
        return {'type': 'recap', 'title': title.strip(), 'text': text, 'at': now}
    if kind == 'scene':
        adventure_id = body.get('adventureId')
        node_id = body.get('nodeId')
        if not isinstance(adventure_id, int) or isinstance(adventure_id, bool) \
                or not isinstance(node_id, str) or not node_id:
            _bad('invalid_scene')
        adv = campaign.adventures.filter(pk=adventure_id).first()
        if not adv or not any(n.get('id') == node_id for n in (adv.data or {}).get('nodes') or []):
            raise NotFound('scene_not_found')
        return {'type': 'scene', 'adventureId': adv.id, 'nodeId': node_id, 'at': now}
    _bad('invalid_card')


def _entry_image_url(entry, *, token=None):
    if not entry.image_ver:
        return None
    if token:
        return f'/api/screen/{token}/image/{entry.id}?v={entry.image_ver}'
    return f'/api/world/{entry.id}/image?v={entry.image_ver}'


def resolve_screen_card(campaign, *, token=None):
    """Cartão público resolvido ou None. `token` → URLs de imagem do telão
    (sem login); sem token → URLs autenticadas (celular do jogador)."""
    raw = (campaign.state or {}).get('screenCard')
    if not isinstance(raw, dict):
        return None
    kind = raw.get('type')
    at = raw.get('at')
    if kind == 'entry':
        from .models import WorldEntry
        entry = WorldEntry.objects.filter(campaign=campaign, pk=raw.get('entryId')).first()
        if not entry or entry.visibility == 'hidden':
            return None
        labels = KIND_LABELS.get(entry.kind, ('', ''))
        if entry.visibility == 'revealed':
            text = plain_text(entry.body) or entry.summary
            wanted = set(raw.get('secretIds') or [])
            secrets = [s.get('text', '') for s in (entry.secrets or [])
                       if isinstance(s, dict) and s.get('id') in wanted and s.get('revealed')]
            if secrets:
                text = '\n\n'.join([t for t in [text] + secrets if t])
        else:  # partial: só o que se conhece de nome
            text = entry.summary
        return {
            'type': 'entry', 'entryId': entry.id, 'kind': entry.kind,
            'title': entry.name, 'kindLabel': labels[0], 'kindLabelEn': labels[1],
            'text': text or '', 'imageUrl': _entry_image_url(entry, token=token),
            'partial': entry.visibility == 'partial', 'at': at,
        }
    if kind == 'recap':
        return {'type': 'recap', 'title': raw.get('title') or '', 'kindLabel': 'Anteriormente…',
                'kindLabelEn': 'Previously…', 'text': raw.get('text') or '', 'imageUrl': None, 'at': at}
    if kind == 'scene':
        adv = campaign.adventures.filter(pk=raw.get('adventureId')).first()
        node = next((n for n in ((adv.data or {}).get('nodes') or []) if n.get('id') == raw.get('nodeId')), None) if adv else None
        if not node:
            return None
        state = campaign.state or {}
        return {'type': 'scene', 'title': node.get('name') or state.get('scene') or '',
                'kindLabel': 'Cena', 'kindLabelEn': 'Scene',
                'text': state.get('sceneText') or '', 'imageUrl': None, 'at': at}
    return None

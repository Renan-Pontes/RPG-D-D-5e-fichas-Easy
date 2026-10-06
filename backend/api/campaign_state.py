"""
Estado de mesa da campanha (`Campaign.state`) — escrita com merge no servidor.

Antes o cliente mandava o `state` inteiro a partir de uma cópia velha do último
poll, e o servidor (diário, aventura) também escrevia no mesmo JSON: last write
wins e chaves sumiam. Agora toda escrita passa por `merge_state(campaign, patch)`,
que relê o estado dentro de uma transação já com o lock de escrita e aplica só
as chaves do patch.

Whitelists:
  - PATCHABLE_KEYS: o que o mestre pode mudar por PATCH /campaigns/:id/state.
  - SERVER_KEYS: chaves que só o servidor escreve (diarySessions, screenCard).
  - SCREEN_KEYS: o que vai para o telão público (sem login).
  - PLAYER_KEYS: o que o jogador recebe no GET da campanha.

Nada de mundo (segredos, NPCs) mora aqui: isso fica em WorldEntry.
"""
import json

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

PATCHABLE_KEYS = (
    'session', 'scene', 'sceneText', 'weather', 'live', 'nudges', 'concentration',
    'endOfEncounterWizard', 'levelingMode', 'allowMulticlass',
)
SERVER_KEYS = ('diarySessions', 'screenCard')
SCREEN_KEYS = ('session', 'scene', 'sceneText', 'weather', 'live')
PLAYER_KEYS = SCREEN_KEYS + ('levelingMode', 'allowMulticlass')

MAX_JSON_VALUE = 20_000      # nudges / concentration (JSON serializado)
_TEXT_LIMITS = {'session': 40, 'scene': 200, 'sceneText': 5000, 'weather': 120}


def _bad(code):
    raise ValidationError({'error': code})


def _json_len(v):
    return len(json.dumps(v, ensure_ascii=False, separators=(',', ':')))


def clean_state_value(key, value):
    """Valida um valor do patch. None remove a chave (devolve None)."""
    if value is None:
        return None
    if key in _TEXT_LIMITS:
        if key == 'session' and isinstance(value, int) and not isinstance(value, bool):
            value = str(value)
        if not isinstance(value, str):
            _bad(f'invalid_{key}')
        if len(value) > _TEXT_LIMITS[key]:
            _bad(f'{key}_too_long')
        return value
    if key in ('live', 'endOfEncounterWizard', 'allowMulticlass'):
        if not isinstance(value, bool):
            _bad(f'invalid_{key}')
        return value
    if key == 'levelingMode':
        if value not in ('xp', 'milestone'):
            _bad('invalid_levelingMode')
        return value
    if key in ('nudges', 'concentration'):
        if not isinstance(value, (dict, list)):
            _bad(f'invalid_{key}')
        if _json_len(value) > MAX_JSON_VALUE:
            _bad(f'{key}_too_large')
        return value
    _bad('invalid_key')


def clean_state_patch(patch):
    """Valida o corpo `{key: value}` do PATCH. Chave fora da whitelist → 400."""
    if not isinstance(patch, dict) or not patch:
        _bad('invalid_patch')
    out = {}
    for key, value in patch.items():
        if key not in PATCHABLE_KEYS:
            raise ValidationError({'error': 'invalid_key', 'key': str(key)[:40]})
        out[key] = clean_state_value(key, value)
    return out


def merge_state(campaign, patch, *, remove=()):
    """Aplica `patch` (chave → valor; None remove) sobre o estado ATUAL do banco.

    Atômico: primeiro pega o lock de escrita (UPDATE em updated_at — no SQLite
    isso serializa os escritores; no Postgres trava a linha), depois relê o
    estado e grava. Assim duas escritas concorrentes em chaves diferentes
    preservam as duas. Não valida: quem chama valida antes (clean_state_patch)
    ou é código do servidor. Atualiza `campaign.state` em memória e devolve o
    novo estado.
    """
    from .models import Campaign
    with transaction.atomic():
        now = timezone.now()
        Campaign.objects.filter(pk=campaign.pk).update(updated_at=now)
        current = (Campaign.objects.select_for_update()
                   .filter(pk=campaign.pk).values_list('state', flat=True).first())
        state = dict(current or {}) if isinstance(current, dict) else {}
        for key, value in (patch or {}).items():
            if value is None:
                state.pop(key, None)
            else:
                state[key] = value
        for key in remove:
            state.pop(key, None)
        Campaign.objects.filter(pk=campaign.pk).update(state=state, updated_at=now)
    campaign.state = state
    campaign.updated_at = now
    return state


def update_state(campaign, fn):
    """Variante para quem precisa ler-e-escrever (ex.: diarySessions): `fn(state)`
    recebe uma cópia do estado atual (já com lock) e devolve o patch a aplicar."""
    from .models import Campaign
    with transaction.atomic():
        now = timezone.now()
        Campaign.objects.filter(pk=campaign.pk).update(updated_at=now)
        current = (Campaign.objects.select_for_update()
                   .filter(pk=campaign.pk).values_list('state', flat=True).first())
        state = dict(current or {}) if isinstance(current, dict) else {}
        patch = fn(dict(state)) or {}
        for key, value in patch.items():
            if value is None:
                state.pop(key, None)
            else:
                state[key] = value
        Campaign.objects.filter(pk=campaign.pk).update(state=state, updated_at=now)
    campaign.state = state
    campaign.updated_at = now
    return state


def public_state(state, keys=SCREEN_KEYS):
    """Recorte do estado por whitelist (telão ou jogador)."""
    state = state if isinstance(state, dict) else {}
    return {k: state[k] for k in keys if k in state}

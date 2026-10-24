"""
Registro de edições da ficha para o mestre (só em campanha).

Quando o DONO muda pelo PUT /characters/<id> um campo registrado
(LOGGED_FIELDS) de uma ficha que está numa campanha, o servidor anexa uma
entrada em data.editLog (sem migração: mora dentro de Character.data):

    {at, by, byId, field, added: [...], removed: [...]}   campo lista (idiomas)
    {at, by, byId, field, from, to}                        campo simples

O registro é do servidor: o cliente nunca o escreve. O PUT do dono e o
/dm-edit ignoram o editLog que vier no corpo e mantêm o salvo (não dá 403:
um app com cópia velha da ficha continua salvando o resto normalmente), e a
criação da ficha começa sem registro. Fora de campanha nada é anotado.
Guarda só as últimas MAX_ENTRIES entradas.

Uso (views_characters.character_detail):
    s.save(data=edit_log.owner_put(obj.data, incoming, request.user, in_camp))
"""
from django.utils import timezone

EDIT_LOG_KEY = 'editLog'
# Campos da ficha com registro. Para registrar outro, basta pôr o nome aqui
# (lista vira added/removed; o resto, from/to).
LOGGED_FIELDS = ('languages',)
MAX_ENTRIES = 100   # teto do registro (as mais antigas saem)
MAX_ITEMS = 40      # itens por entrada (added/removed)
MAX_TEXT = 80       # tamanho de cada texto guardado

_MISSING = object()


def _text(v):
    return str(v)[:MAX_TEXT]


def _as_items(v):
    """Lista de textos únicos, na ordem (None/ausente = lista vazia)."""
    if v is _MISSING or v is None:
        return []
    out = []
    for x in v:
        if isinstance(x, (str, int, float)) and not isinstance(x, bool):
            s = _text(x)
            if s and s not in out:
                out.append(s)
    return out


def _scalar(v):
    if v is _MISSING:
        return None
    if isinstance(v, (str, int, float, bool)) or v is None:
        return _text(v) if isinstance(v, str) else v
    return _text(v)


def diff_entry(field, old, new):
    """O que mudou num campo: {added, removed} ou {from, to}; None se nada mudou."""
    is_list = lambda v: v is _MISSING or v is None or isinstance(v, (list, tuple))
    if is_list(old) and is_list(new):
        a, b = _as_items(old), _as_items(new)
        added = [x for x in b if x not in a][:MAX_ITEMS]
        removed = [x for x in a if x not in b][:MAX_ITEMS]
        # Só reordenou (ou repetiu um item): não é edição.
        return {'added': added, 'removed': removed} if added or removed else None
    if old == new:
        return None
    return {'from': _scalar(old), 'to': _scalar(new)}


def _who(user):
    prof = getattr(user, 'profile', None)
    name = getattr(prof, 'display_name', '') if prof else ''
    return name or (user.email.split('@')[0] if getattr(user, 'email', '') else user.username)


def entries_for(old_data, new_data, user, now=None):
    """Entradas novas do registro para a troca old_data → new_data. O PUT troca a ficha
    inteira: campo registrado que sumiu do corpo foi mesmo apagado (entra como removido)."""
    old_data = old_data if isinstance(old_data, dict) else {}
    at = (now or timezone.now()).isoformat()
    out = []
    for field in LOGGED_FIELDS:
        d = diff_entry(field, old_data.get(field, _MISSING), new_data.get(field, _MISSING))
        if d:
            out.append({'at': at, 'by': _who(user), 'byId': user.id, 'field': field, **d})
    return out


def saved_log(data):
    log = data.get(EDIT_LOG_KEY) if isinstance(data, dict) else None
    return [e for e in log if isinstance(e, dict)] if isinstance(log, list) else []


def without_log(data):
    """Corpo vindo do cliente sem o editLog (criação da ficha, /dm-edit)."""
    if not isinstance(data, dict) or EDIT_LOG_KEY not in data:
        return data
    return {k: v for k, v in data.items() if k != EDIT_LOG_KEY}


def owner_put(old_data, new_data, user, in_campaign):
    """Ficha que o PUT do dono vai gravar: o editLog do cliente é descartado, o salvo
    fica, e em campanha ganha as entradas desta edição (teto MAX_ENTRIES)."""
    if not isinstance(new_data, dict):
        return new_data
    out = without_log(new_data)
    log = saved_log(old_data)
    if in_campaign:
        log = (log + entries_for(old_data, new_data, user))[-MAX_ENTRIES:]
    if log:
        out = {**out, EDIT_LOG_KEY: log}
    return out

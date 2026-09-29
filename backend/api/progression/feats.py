"""
Talentos do catálogo na subida de nível. Espelha frontend/src/progression/feat-rules.js.

O catálogo (FEATS) vem de catalog.json, gerado por scripts/sync-rules.mjs a
partir de frontend/data/feats.js, só com os campos de validação: id, rules,
category, repeatable/repeatKey, prereq numérico (nível, atributos, talentos,
Estilo de Luta), asi e choices. Pré-requisitos de proficiência, conjuração e
espécie ficam só na interface.
"""
from .rules import FEATS_BY_ID, prof_bonus

ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha']


def _score(character, k):
    base = (character.get('abilities') or {}).get(k) or 10
    bonus = (character.get('raceBonus') or {}).get(k) or 0
    return base + bonus


def feat_rules(character):
    return '2024' if character.get('rulesVersion') == '2024' else '2014'


def feat_categories(rules, kind, has_fighting_style=False):
    """Categorias aceitas numa vaga ('asi', 'epic' ou 'origin')."""
    if rules != '2024':
        return [] if kind == 'origin' else ['feat']
    if kind == 'origin':
        return ['origin']
    cats = ['general', 'origin'] + (['fightingStyle'] if has_fighting_style else [])
    return ['epicBoon'] + cats if kind == 'epic' else cats


def _feat_ids(character):
    return [f.get('id') for f in (character.get('feats') or []) if isinstance(f, dict) and f.get('id')]


def _has_feat(character, fid):
    return any(x == fid or (FEATS_BY_ID.get(x) or {}).get('base') == fid for x in _feat_ids(character))


def prereq_issues(character, feat, level, has_fighting_style=False):
    out = []
    p = feat.get('prereq') or {}
    if p.get('level') and level < p['level']:
        out.append(f"Nível {p['level']}+")
    for k, v in (p.get('abilities') or {}).items():
        if _score(character, k) < v:
            out.append(f'{k.upper()} {v}+')
    anyab = p.get('anyAbility') or {}
    if anyab and not any(_score(character, k) >= v for k, v in anyab.items()):
        out.append(' / '.join(f'{k.upper()} {v}' for k, v in anyab.items()) + '+')
    for fid in p.get('feats') or []:
        if not _has_feat(character, fid):
            out.append(f'Talento {fid}')
    if p.get('feature') == 'fightingStyle' and not has_fighting_style:
        out.append('Estilo de Luta')
    return out


def taken_issue(character, feat, picks):
    same = [f for f in (character.get('feats') or []) if isinstance(f, dict) and f.get('id') == feat['id']]
    if not same:
        return None
    if not feat.get('repeatable'):
        return 'Talento já escolhido'
    key = feat.get('repeatKey')
    if key and isinstance(picks, dict) and picks.get(key) is not None \
            and any((f.get('picks') or {}).get(key) == picks[key] for f in same):
        return 'Talento já escolhido com esta opção'
    return None


def asi_issues(character, feat, asi):
    issues = []
    if asi is None:
        asi = {}
    if not isinstance(asi, dict):
        return ['Aumento de atributo inválido']
    keys = [k for k, v in asi.items() if v]
    spec = feat.get('asi')
    if not spec:
        if keys:
            issues.append('Este talento não aumenta atributo')
        return issues
    choose = spec.get('choose') or ABILITIES
    amount = spec.get('amount', 1)
    split = spec.get('split', False)
    top = spec.get('max', 20)
    if any(k not in choose for k in keys):
        issues.append('Atributo não permitido por este talento')
        return issues
    vals = [asi[k] for k in keys]
    if any(not isinstance(v, int) or isinstance(v, bool) or v < 0 or v > amount for v in vals):
        issues.append(f'Cada atributo recebe até +{amount}')
        return issues
    if not split and len(keys) > 1:
        issues.append('Escolha um só atributo')
    total = sum(vals)
    room = any(_score(character, k) < top for k in choose)
    if total != amount and not (total == 0 and not room):
        issues.append('Escolha o atributo do +1' if amount == 1 else f'Distribua exatamente {amount} pontos')
    if any(_score(character, k) + asi[k] > top for k in keys):
        issues.append(f'Atributo não pode passar de {top}')
    return issues


def picks_issues(feat, picks, level):
    """Sub-escolhas completas (mesmas regras de featPicksIssues)."""
    issues = []
    if picks is None:
        picks = {}
    if not isinstance(picks, dict) or len(picks) > 20:
        return ['Escolhas do talento inválidas']
    for key, spec in (feat.get('choices') or {}).items():
        if key == 'spellAbility' and spec == 'asi':
            continue
        v = picks.get(key)
        if isinstance(spec, list):
            if not isinstance(v, str) or v not in spec:
                issues.append(f'Escolha: {key}')
            continue
        if key in ('spellList', 'spellAbility', 'variant'):
            continue
        raw = spec if isinstance(spec, int) else (spec or {}).get('count') if isinstance(spec, dict) else None
        count = prof_bonus(level) if raw == 'pb' else raw if isinstance(raw, int) and not isinstance(raw, bool) else 1
        arr = [x for x in v if isinstance(x, str) and x.strip()] if isinstance(v, list) else []
        options = spec.get('from') if isinstance(spec, dict) else None
        if len(arr) != count or (isinstance(v, list) and len(v) != len(arr)):
            issues.append(f'Escolha {count} em {key}')
        elif len(set(arr)) != len(arr):
            issues.append(f'Repetido em {key}')
        elif options and any(x not in options for x in arr):
            issues.append(f'Opção inválida em {key}')
        elif any(len(x) > 60 for x in arr):
            issues.append(f'Opção inválida em {key}')
    return issues


def validate_feat_choice(character, level, choice, kind='asi', has_fighting_style=False):
    """Lista de problemas de um talento do catálogo escolhido numa vaga."""
    feat = FEATS_BY_ID.get(choice.get('featId')) if isinstance(choice.get('featId'), str) else None
    if not feat:
        return ['Talento desconhecido']
    issues = []
    if feat['rules'] != feat_rules(character):
        issues.append('Talento de outra versão das regras')
    if feat['category'] not in feat_categories(feat_rules(character), kind, has_fighting_style):
        issues.append('Talento não permitido nesta vaga')
    pre = prereq_issues(character, feat, level, has_fighting_style)
    if pre:
        issues.append('Pré-requisito: ' + ', '.join(pre))
    taken = taken_issue(character, feat, choice.get('picks'))
    if taken:
        issues.append(taken)
    issues.extend(asi_issues(character, feat, choice.get('asi')))
    issues.extend(picks_issues(feat, choice.get('picks'), level))
    return issues


def with_feat_asi(character, asi, sign=1):
    """Soma (ou tira) o aumento do talento nos atributos-base."""
    if not isinstance(asi, dict):
        return character
    items = [(k, v) for k, v in asi.items() if k in ABILITIES and isinstance(v, int) and not isinstance(v, bool) and v]
    if not items:
        return character
    abilities = dict(character.get('abilities') or {})
    for k, v in items:
        abilities[k] = (abilities.get(k) or 10) + sign * v
    return {**character, 'abilities': abilities}


def feat_entry(choice, level):
    """Registro em character.feats."""
    note = choice.get('note') if isinstance(choice.get('note'), str) else ''
    entry = {'name': choice['feat'].strip(), 'level': level, 'note': note[:500]}
    if isinstance(choice.get('featId'), str) and choice['featId'] in FEATS_BY_ID:
        entry = {'name': entry['name'], 'id': choice['featId'], 'level': level, 'note': entry['note']}
        if isinstance(choice.get('picks'), dict) and choice['picks']:
            entry['picks'] = choice['picks']
        if isinstance(choice.get('asi'), dict) and choice['asi']:
            entry['asi'] = choice['asi']
    return entry

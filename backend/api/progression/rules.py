"""Generated rules snapshot. Edit frontend rules, then run scripts/sync-rules.mjs."""
import json
from pathlib import Path


def _numeric_keys(pairs):
    return {int(k) if k.isdigit() else k: v for k, v in pairs}


_CATALOG = json.loads(
    Path(__file__).with_name('catalog.json').read_text(encoding='utf-8'),
    object_pairs_hook=_numeric_keys,
)
PROGRESSION_RULES = _CATALOG['legacy']
PROGRESSION_RULES_2024 = _CATALOG['current']


def rules_for(character):
    catalog = PROGRESSION_RULES_2024 if character.get('rulesVersion') == '2024' else PROGRESSION_RULES
    return catalog.get(character.get('className'))


def prof_bonus(level):
    return 6 if level >= 17 else 5 if level >= 13 else 4 if level >= 9 else 3 if level >= 5 else 2

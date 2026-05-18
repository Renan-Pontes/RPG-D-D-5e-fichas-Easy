"""
Engine de progressão portada para Python. Espelha frontend/src/progression/.

Usada server-side para validar level-ups e aplicar mudanças após aprovação.

A fonte da verdade são as regras: vide frontend/src/progression/rules.js.
Aqui repetimos apenas o suficiente pra validar e aplicar; o frontend tem
todas as features pra renderizar a UI.
"""
from .engine import (
    prof_bonus,
    compute_progression,
    apply_autos,
    validate_level_up,
    apply_approval_to_character,
)

"""
Segredo do dado viciado.

O mestre pode preparar valores (DiceRig) ou forçar o valor de uma rolagem.
Isso é segredo do mestre, como dm_notes: o jogador e o telão NUNCA recebem
se uma rolagem foi viciada, de onde veio o valor nem que foi forçado.

Toda resposta que serializa rolagens para quem não é o mestre passa por
`scrub_dice` (remove as chaves secretas em qualquer nível do JSON).
"""

# Chaves que denunciam rolagem viciada/forçada.
#   rigged   → valor veio da fila do mestre (DiceRig) ou foi forçado
#   forced   → combat.roll_d20/resolve_attack com valor imposto
#   override → mestre digitou o valor exibido (roll_resolve)
#   source   → id da DiceRig consumida (views_dice)
SECRET_DICE_KEYS = frozenset({'rigged', 'forced', 'override', 'source'})


def scrub_dice(obj, keys=SECRET_DICE_KEYS):
    """Cópia de `obj` sem as chaves secretas de dado, em qualquer profundidade."""
    if isinstance(obj, dict):
        return {k: scrub_dice(v, keys) for k, v in obj.items() if k not in keys}
    if isinstance(obj, (list, tuple)):
        return [scrub_dice(v, keys) for v in obj]
    return obj

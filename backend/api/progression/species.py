"""
Truques e magias concedidos pela espécie (linhagem élfica/gnômica, legado do
tiferino, Aasimar, drow…). Espelha speciesGrants() de
frontend/src/progression/species.js, só a parte de magias usada em apply_autos.

A tabela vem de catalog.json['species'] (gerada por scripts/sync-rules.mjs a
partir de frontend/data/species-2024.js):
  { '2024': { raceId: { cantrips, spells: { nível: [ids] }, options: { chave: { opção: {…} } }, cantrip: { when, default } } }, '2014': … }
"""
from .rules import _CATALOG

SPECIES_SPELLS = _CATALOG.get('species', {})


def _table(version):
    # rules._numeric_keys converte chaves numéricas ("2024") em int.
    return SPECIES_SPELLS.get(version) or SPECIES_SPELLS.get(str(version)) or {}


def _row(character):
    race = character.get('race')
    if not race:
        return None
    if character.get('rulesVersion') == '2024' and race in _table(2024):
        return _table(2024)[race]
    return _table(2014).get(race)


def species_spell_ids(character):
    """Ids de truques + magias já liberadas pelo nível do personagem (sem repetição)."""
    row = _row(character)
    if not row:
        return []
    choices = character.get('speciesChoices') or {}
    if not isinstance(choices, dict):
        choices = {}
    level = character.get('level') or 1
    out = []

    def add(src):
        out.extend(src.get('cantrips') or [])
        for lv, ids in (src.get('spells') or {}).items():
            if level >= int(lv):
                out.extend(ids)

    add(row)
    for key, opts in (row.get('options') or {}).items():
        opt = opts.get(choices.get(key))
        if opt:
            add(opt)
    cantrip = row.get('cantrip')
    if cantrip is not None and all(choices.get(k) == v for k, v in (cantrip.get('when') or {}).items()):
        cid = choices.get('cantrip')
        cid = cid if isinstance(cid, str) and cid else cantrip.get('default')
        if cid:
            out.append(cid)
    seen, uniq = set(), []
    for sid in out:
        if sid not in seen:
            seen.add(sid)
            uniq.append(sid)
    return uniq

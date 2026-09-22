"""Import licensed SRD 5.2.1 tables and spells from pdftotext output.

Usage: python scripts/import_srd.py /tmp/forja-srd.txt /tmp/forja-srd-layout.txt
Source: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf
The generated data is CC-BY-4.0; see RULES.md for attribution.
"""
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
raw = Path(sys.argv[1]).read_text()
layout = Path(sys.argv[2]).read_text()
pages = raw.split('\f')
clean = re.sub(r'\n\d+\n\nSystem Reference Document 5\.2\.1\n', '\n', raw)


def ident(name):
    words = re.findall(r'[A-Za-z0-9]+', name.replace('’', '').replace("'", ''))
    return words[0].lower() + ''.join(w.title() for w in words[1:])


rules = {}
class_pages = {'barbarian': 28, 'bard': 31, 'cleric': 36, 'druid': 41,
               'fighter': 47, 'monk': 49, 'paladin': 53, 'ranger': 57,
               'rogue': 61, 'sorcerer': 64, 'warlock': 70, 'wizard': 77}
for cls, page in class_pages.items():
    ordered = list(class_pages.items())
    next_page = ordered[ordered.index((cls, page)) + 1][1] if cls != 'wizard' else 83
    class_text = '\n'.join(pages[page-1:next_page])
    core_start = class_text.find('Core ' + cls.title() + ' Traits')
    if core_start >= 0:
        class_text = class_text[core_start:]
    found = None
    for start in re.finditer(r'^\s{0,8}' + cls.title() + r' Features\s*$', layout, re.M):
        chunk = layout[start.end():start.end()+8500]
        matches = list(re.finditer(r'^\s*(\d{1,2})\s+\+[2-6]\s+(.+)$', chunk, re.M))[:20]
        if [int(m[1]) for m in matches] == list(range(1, 21)):
            found = matches
            break
    assert found, f'Missing table: {cls}'
    per_level = {}
    for index, match in enumerate(found):
        level = int(match[1])
        columns = re.split(r'\s{2,}', match[2].strip())
        title = columns[0]
        # Wrapped class-feature titles occupy the same column on the next line.
        rest = chunk[match.end():].splitlines()[1:3]
        for line in rest:
            if not line.strip() or re.match(r'\s*\d+\s+\+', line):
                break
            continuation = line.strip()
            if re.fullmatch(r'[A-Za-z’, ()-]+', continuation) and len(continuation) < 45:
                title += ' ' + continuation
        names = [n.strip() for n in title.split(',') if n.strip() not in ('—', 'Subclass feature')]
        node = {'features': []}
        for name in names:
            pattern = r'Level ' + str(level) + r': ' + re.escape(name) + r'\s*\n+([^\n]+(?:\n[^\n]+)*)'
            description = re.search(pattern, class_text)
            desc = re.sub(r'\s+', ' ', description[1]).strip() if description else f'SRD 5.2.1, {cls.title()}, page {page}.'
            node['features'].append({'id': ident(name), 'name': name, 'desc': desc, 'sourcePage': page})
        if level == 3:
            node['subclassChoice'] = True
        if 'Ability Score Improvement' in title:
            node['asiOrFeat'] = True
        if 'Epic Boon' in title:
            node['epicBoon'] = True
        if 'Extra Attack' in title:
            node['extraAttacks'] = 3 if 'Three' in title else 2 if 'Two' in title else 1
        if 'Expertise' in title:
            node['expertiseChoice'] = 2
        if 'Fighting Style' in title:
            node['fightingStyleChoice'] = 1
        numbers = re.findall(r'(?<![A-Za-z])\b\d+\b|—', ' '.join(columns[1:]))
        values = [0 if v == '—' else int(v) for v in numbers]
        if cls in ['bard', 'cleric', 'druid', 'sorcerer', 'wizard']:
            assert len(values) >= 11, (cls, level, columns)
            node.update(cantripsKnown=values[-11], spellsPrepared={'formula': values[-10]}, spellSlots=values[-9:])
        elif cls in ['paladin', 'ranger']:
            node.update(spellsPrepared={'formula': values[-6]}, spellSlots=values[-5:] + [0]*4)
        elif cls == 'warlock':
            invocations, cantrips, prepared, slots, slot_level = values
            row = [0]*9
            row[slot_level-1] = slots
            node.update(cantripsKnown=cantrips, spellsPrepared={'formula': prepared}, spellSlots=row, invocations=invocations)
        per_level[level] = node
    subclasses = {}
    subclass_ids = {'barbarian':'berserker', 'bard':'lore', 'cleric':'life', 'druid':'land', 'fighter':'champion', 'monk':'openhand', 'paladin':'devotion', 'ranger':'hunter', 'rogue':'thief', 'sorcerer':'draconic', 'warlock':'fiend', 'wizard':'evocation'}
    sub_start = class_text.find(cls.title() + ' Subclass:')
    if sub_start >= 0:
        sub_text = class_text[sub_start:]
        next_core = re.search(r'Core \w+ Traits', sub_text)
        if next_core:
            sub_text = sub_text[:next_core.start()]
        sub_nodes = {}
        headings = list(re.finditer(r'Level (\d+): ([^\n]+)', sub_text))
        for idx, heading in enumerate(headings):
            body = sub_text[heading.end():headings[idx+1].start() if idx+1 < len(headings) else len(sub_text)].strip()
            name = heading[2].strip()
            # The first paragraph is a preview; link to the complete licensed rules.
            desc = re.sub(r'\s+', ' ', body.split('\n\n')[0]).strip()
            node = sub_nodes.setdefault(int(heading[1]), {'features': []})
            node['features'].append({'id': ident(name), 'name': name, 'desc': desc, 'sourcePage': page})
        subclasses[subclass_ids[cls]] = sub_nodes
    rules[cls] = {'classId': cls, 'perLevel': per_level, 'subclassPerLevel': subclasses, 'source': 'SRD 5.2.1'}

# Spell headers provide authoritative level, school and class membership.
spell_text = '\n'.join(pages[106:175])
spell_text = re.sub(r'\n\d+\n\nSystem Reference Document 5\.2\.1\n', '\n', spell_text)
pattern = r'^([^\n]+)\n+(?:Level ([1-9]) (\w+)|(\w+) Cantrip)\s*\(([^)]+)\)\s*\n'
spell_text = re.sub(r'^System Reference Document 5\.2\.1\s*$|^\d+\s*$', '', spell_text, flags=re.M)
spell_text = re.sub(r'\n{3,}', '\n\n', spell_text)
matches = list(re.finditer(pattern, spell_text, re.M))
spells = []
for index, match in enumerate(matches):
    name, level, school, cantrip_school, classes = match.groups()
    body = spell_text[match.end():matches[index+1].start() if index+1 < len(matches) else len(spell_text)].strip()
    fields = {}
    for label, key in [('Casting Time','castingTime'),('Range','range'),('Components','components'),('Duration','duration')]:
        field = re.search(label + r': (.*?)(?=\n(?:Casting Time|Range|Components|Duration):|\n\n|$)', body, re.S)
        fields[key] = re.sub(r'\s+', ' ', field[1]).strip() if field else ''
    duration = re.search(r'Duration: [^\n]+\n', body)
    desc = body[duration.end():].strip() if duration else body
    desc = re.sub(r'(?<=\w)-\n(?=\w)', '', desc)
    desc = re.sub(r'(?<!\n)\n(?!\n)', ' ', desc)
    spells.append({'id': ident(name), 'name': {'pt': name, 'en': name}, 'level': int(level or 0),
                   'school': (school or cantrip_school).lower(), 'classes': re.sub(r'\s+', ' ', classes).lower().split(', '),
                   **fields, 'ritual': 'Ritual' in fields['castingTime'],
                   'concentration': 'Concentration' in fields['duration'],
                   'desc': {'pt': desc, 'en': desc}, 'rulesVersion': '2024', 'source': 'SRD 5.2.1'})
assert len(spells) >= 300, f'Only {len(spells)} spells parsed'
assert len({s['id'] for s in spells}) == len(spells), 'Duplicate spell IDs'
out = ROOT / 'frontend/data'
(out/'srd2024-rules.json').write_text(json.dumps(rules, ensure_ascii=False, indent=2)+'\n')
(out/'srd2024-spells.json').write_text(json.dumps(spells, ensure_ascii=False, indent=2)+'\n')
print(f'Imported {len(rules)} classes (levels 1–20) and {len(spells)} spells.')

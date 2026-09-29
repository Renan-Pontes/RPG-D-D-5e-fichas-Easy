"""Extrai o mapa de campos da ficha preenchível oficial de D&D 5e (3 páginas).

Uso: python3 scripts/extract_dnd5e_sheet_layout.py 5E_CharacterSheet_Fillable.pdf

O PDF não fica no repositório. Gravamos só nomes de campos e retângulos em
frontend/src/pdf/dnd5e-layout.js: a exportação desenha a própria ficha com
campos nas mesmas posições e com os mesmos nomes, então o PDF gerado abre em
qualquer ferramenta que conheça a ficha oficial, e a importação lê as duas.
"""
import json
import sys
from pathlib import Path

import pypdf

OUT = Path(__file__).resolve().parent.parent / 'frontend/src/pdf/dnd5e-layout.js'


def widgets(reader):
    seen = set()
    for page_index, page in enumerate(reader.pages):
        for annot in page.get('/Annots') or []:
            a = annot.get_object()
            if a.get('/Subtype') != '/Widget':
                continue
            parent = a.get('/Parent').get_object() if a.get('/Parent') else {}
            name = str(a.get('/T') or parent.get('/T'))
            kind = str(a.get('/FT') or parent.get('/FT'))
            rect = [round(float(x), 1) for x in a['/Rect']]
            key = (page_index, name, tuple(rect))
            if key in seen:
                continue
            seen.add(key)
            flags = int(a.get('/Ff') or parent.get('/Ff') or 0)
            yield {
                'page': page_index, 'name': name,
                'type': 'text' if kind == '/Tx' else 'check' if 'Check Box' in name else 'image',
                'rect': rect, 'multiline': bool(flags & 4096),
                'align': int(a.get('/Q') or 0),
            }


def spell_blocks(fields):
    """Agrupa as linhas de magia da pág. 3 por nível (0 = truques)."""
    page = [f for f in fields if f['page'] == 2]
    slots = [f for f in page if f['name'].startswith('SlotsTotal ')]
    spells = [f for f in page if f['name'].startswith('Spells ')]
    checks = [f for f in page if f['type'] == 'check']
    # SlotsTotal 19..27 = níveis 1..9; cada bloco fica abaixo do seu contador, na mesma coluna.
    blocks = {0: []}
    heads = []
    for s in slots:
        level = int(s['name'].split()[1]) - 18
        blocks[level] = []
        heads.append((level, s))
    for sp in spells:
        x, top = sp['rect'][0], sp['rect'][3]
        best = None
        for level, head in heads:
            same_col = abs(head['rect'][0] - x) < 60 or head['rect'][0] - 70 < x < head['rect'][2]
            if same_col and head['rect'][1] > top and (best is None or head['rect'][1] < best[1]['rect'][1]):
                best = (level, head)
        # Truques ficam no topo da primeira coluna, acima do contador do 1º nível.
        level = best[0] if best else 0
        prep = None
        for c in checks:
            if 0 < sp['rect'][0] - c['rect'][2] < 20 and abs((c['rect'][1] + c['rect'][3]) / 2 - (sp['rect'][1] + sp['rect'][3]) / 2) < 6:
                prep = c['name']
        blocks[level].append({'field': sp['name'], 'prepared': prep, 'top': top})
    return {lvl: [{'field': r['field'], 'prepared': r['prepared']} for r in sorted(rows, key=lambda r: -r['top'])]
            for lvl, rows in sorted(blocks.items())}


def main(path):
    reader = pypdf.PdfReader(path)
    fields = list(widgets(reader))
    p1 = [f for f in fields if f['page'] == 0]
    # Caixas de proficiência: 11,18..22 = salvaguardas FOR..CAR; 23..40 = perícias em ordem alfabética.
    layout = {
        'source': '5E_CharacterSheet_Fillable.pdf (Wizards of the Coast) — só nomes e posições',
        'pageSize': [float(reader.pages[0].mediabox.width), float(reader.pages[0].mediabox.height)],
        'fields': fields,
        'saveChecks': ['Check Box 11', 'Check Box 18', 'Check Box 19', 'Check Box 20', 'Check Box 21', 'Check Box 22'],
        'skillChecks': [f'Check Box {n}' for n in range(23, 41)],
        'deathSuccess': ['Check Box 12', 'Check Box 13', 'Check Box 14'],
        'deathFail': ['Check Box 15', 'Check Box 16', 'Check Box 17'],
        'spells': spell_blocks(fields),
    }
    assert len(p1) > 100
    OUT.write_text('// Gerado por scripts/extract_dnd5e_sheet_layout.py — não editar à mão.\nexport default ' + json.dumps(layout, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(OUT, len(fields), {k: len(v) for k, v in layout['spells'].items()})


if __name__ == '__main__':
    main(sys.argv[1])

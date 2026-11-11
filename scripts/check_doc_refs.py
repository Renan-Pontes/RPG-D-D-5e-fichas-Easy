"""Confere as referências dos .md contra o repositório.

Para cada link relativo `[..](caminho)` e cada caminho entre crases que comece em
`backend/`, `frontend/`, `scripts/`, `docs/` ou `.github/`, o arquivo tem de existir.
Para `arquivo.py::nome` e `arquivo.py` seguido de `::nome`, a função ou classe tem de existir.

    python scripts/check_doc_refs.py            # todos os .md da raiz e de docs/
    python scripts/check_doc_refs.py ROADMAP.md # só os que forem passados

Sai com código 1 se achar referência quebrada. Âncoras (#...) e URLs externas são ignoradas.
Caminhos com `*`, `<...>` ou `{...}` são padrões, não arquivos, e também são ignorados;
`arquivo:123` vale como `arquivo`. Linhas que anunciam um arquivo a criar (new, novo, nova,
create, criar, a criar, gerado, extract, extrair, planned, planejado, `→`) não são conferidas.
"""
import pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LINK = re.compile(r"\]\(([^)#\s]+)(?:#[^)]*)?\)")
CODE = re.compile(r"`((?:backend|frontend|scripts|docs|\.github)/[^`\s]+?)`")
PLAN = re.compile(r"\b(?:new|novo|nova|novos|create[sd]?|criar|extract(?:ed)?|extrair|planned|planejad[oa]|gerad[oa]|generated|future|futuro|split|dividir)\b|→|\$\\to\$", re.I)
SYM = re.compile(r"((?:[\w.-]+/)*[\w.-]+\.(?:py|js|jsx))::(\w+)")


def ignored(path):
    """Arquivos do .gitignore (`.env`, `dist/`) existem só na máquina de cada um."""
    # uma pasta que não existe só casa com `dist/` se olharmos um arquivo dentro dela
    return any(subprocess.run(['git', 'check-ignore', '-q', p], cwd=ROOT, stderr=subprocess.DEVNULL).returncode == 0
               for p in (path, path.rstrip('/') + '/x'))


def check(md):
    bad = []
    text = '\n'.join(l for l in md.read_text(encoding='utf-8').split('\n') if not PLAN.search(l))
    refs = [(m.group(1), md.parent) for m in LINK.finditer(text)]
    refs += [(m.group(1), ROOT) for m in CODE.finditer(text)]
    for ref, base in refs:
        if re.match(r"[a-z]+:", ref) or any(c in ref for c in '*<>{}') or not re.search(r"[/.]", ref):
            continue
        path = re.sub(r":\d+(?:[-–]\d+)?$", '', ref.split('::')[0]).rstrip('.,;:')
        if not (base / path).exists() and not (ROOT / path).exists() and not ignored(path):
            bad.append(f'{md.relative_to(ROOT)}: não existe {ref}')
    for f, name in SYM.findall(text):
        p = ROOT / f
        if not p.exists():  # só o nome do arquivo: procura no repositório (tem de ser único)
            hits = [h for h in ROOT.glob(f'**/{pathlib.Path(f).name}') if 'node_modules' not in h.parts]
            p = hits[0] if len(hits) == 1 else p
        if p.exists() and not re.search(rf"(?:def|class|function|const|let)\s+{name}\b", p.read_text(encoding='utf-8')):
            bad.append(f'{md.relative_to(ROOT)}: {f} não define {name}')
    return bad


def main(args):
    files = [ROOT / a for a in args] or sorted(ROOT.glob('*.md')) + sorted((ROOT / 'docs').glob('*.md'))
    bad = [b for f in files for b in check(f)]
    print('\n'.join(bad) or f'{len(files)} arquivos, nenhuma referência quebrada')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

#!/usr/bin/env python3
"""End-to-end Graphify & token-saving automation CLI for DND_HeroesForge.

Subcommands:
  status        Compact repo, version, monolith budget & graph health pulse
  graph-sync    Build or incrementally update graphify-out/ (--update | --full)
  graph-query   Vocab-expanded BFS/DFS graph traversal with strict token budget
  graph-path    Shortest path between two concepts/symbols in graphify-out/
  graph-explain Neighborhood & file:line citations for a single node
  graph-gods    Top connected hub nodes in the knowledge graph
  outline       Exact Lstart-Lend symbol/section map for monoliths (sheet, tabs, css, combat...)
  trace-api     End-to-end route -> Django view -> React caller -> test tracer
  data-peek     Safe record lookup inside giant/denied SRD & catalog files
  impact        Map changed files to exact affected frontend/backend tests & sync gates
  verify        Token-condensed verification runner (--quick | --full | --sync)
"""
from __future__ import annotations

import argparse
import ast
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# Resolve repo root whether invoked from root or .agents/skills/heroesforge-ops/scripts/
_HERE = Path(__file__).resolve()
ROOT = _HERE.parents[4] if _HERE.parts[-4:-1] == (".agents", "skills", "heroesforge-ops") else Path.cwd().resolve()
if not (ROOT / "frontend").is_dir() and (Path.cwd() / "frontend").is_dir():
    ROOT = Path.cwd().resolve()

GRAPH_DIR = ROOT / "graphify-out"

OUTLINE_ALIASES = {
    "sheet": "frontend/components/Sheet.jsx",
    "sheet-hero": "frontend/src/sheet/hero/SheetHero.jsx",
    "belt": "frontend/src/sheet/belt/BeltHive.jsx",
    "play": "frontend/src/sheet/tabs/SheetPlay.jsx",
    "skills": "frontend/src/sheet/tabs/SheetSkillsSection.jsx",
    "features": "frontend/src/sheet/tabs/SheetFeaturesSection.jsx",
    "tabs": "frontend/components/SheetTabs.jsx",
    "spells": "frontend/src/sheet/spells/SpellViews.jsx",
    "inv": "frontend/src/sheet/inventory/SheetInventoryTab.jsx",
    "story": "frontend/src/sheet/story/SheetStoryTab.jsx",
    "css": "frontend/src/sheet/ficha.css",
    "polish-css": "frontend/src/sheet/css/sheet-polish.css",
    "tabs-css": "frontend/src/sheet/ficha-tabs.css",
    "cond-css": "frontend/src/sheet/condition-fx.css",
    "styles": "frontend/styles.css",
    "app": "frontend/app.jsx",
    "creator": "frontend/components/Creator.jsx",
    "dice": "frontend/components/DiceRoller.jsx",
    "combat": "backend/api/views_combat.py",
    "campaigns": "backend/api/views_campaigns.py",
    "characters": "backend/api/views_characters.py",
    "world": "backend/api/world_rules.py",
    "models": "backend/api/models.py",
    "urls": "backend/api/urls.py",
}

MONOLITH_BUDGETS = [
    ("frontend/src/sheet/ficha.css", 800),
    ("frontend/components/Sheet.jsx", 500),
    ("backend/api/views_combat.py", 600),
    ("frontend/styles.css", 800),
    ("frontend/components/SheetTabs.jsx", 450),
    ("frontend/src/campaigns/url-monster-importer.js", 500),
    ("backend/api/world_rules.py", 550),
    ("frontend/src/prep/NextSession.jsx", 500),
]


def _run(cmd: list[str], cwd: Path = ROOT, timeout: int = 300, extra_env: dict[str, str] | None = None) -> subprocess.CompletedProcess:
    env = None
    if extra_env:
        env = os.environ.copy()
        env.update(extra_env)
    return subprocess.run(
        cmd,
        cwd=str(cwd),
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )


def _resolve_graphify_python() -> str:
    marker = GRAPH_DIR / ".graphify_python"
    if marker.is_file():
        cand = marker.read_text(encoding="utf-8-sig").strip()
        if cand and Path(cand).is_file():
            return cand
    # Check Windows uv tool standard location first (fast, no subprocess)
    appdata = os.environ.get("APPDATA", "")
    if appdata:
        uv_win = Path(appdata) / "uv" / "tools" / "graphifyy" / "Scripts" / "python.exe"
        if uv_win.is_file():
            return str(uv_win)
    uv_bin = shutil.which("uv")
    if uv_bin:
        r = _run([uv_bin, "tool", "run", "--from", "graphifyy", "python", "-c", "import sys; print(sys.executable)"], timeout=20)
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip().splitlines()[-1].strip()
    return sys.executable


def _resolve_backend_python() -> str:
    for rel in (
        "backend/.venv/Scripts/python.exe",
        "backend/venv/Scripts/python.exe",
        "backend/.venv/bin/python",
        "backend/venv/bin/python",
    ):
        p = ROOT / rel
        if p.is_file():
            return str(p)
    return sys.executable


def _resolve_npm() -> str:
    return shutil.which("npm.cmd") or shutil.which("npm") or "npm"


def _resolve_node() -> str:
    return shutil.which("node.exe") or shutil.which("node") or "node"


def _latest_version_info() -> tuple[str, str, str]:
    r = _run(["git", "log", "-n", "10", "--oneline"])
    head = r.stdout.splitlines()[0] if r.stdout.strip() else "(unknown)"
    m = re.search(r"\(v1\.0\.(\d+)\)", r.stdout)
    cur_n = int(m.group(1)) if m else 0
    return head, f"v1.0.{cur_n}", f"v1.0.{cur_n + 1}"


# ---------------------------------------------------------------------------
# 1. STATUS
# ---------------------------------------------------------------------------
def cmd_status(_args: argparse.Namespace) -> int:
    head, cur_v, next_v = _latest_version_info()
    st = _run(["git", "status", "-sb"]).stdout.strip().splitlines()
    branch_line = st[0] if st else "## unknown"
    dirty = len(st) - 1

    print(f"Repo:       {ROOT}")
    print(f"Branch:     {branch_line} ({dirty} modified/untracked)")
    print(f"HEAD:       {head}")
    print(f"Version:    current={cur_v} -> next commit suffix=({next_v})")

    gjson = GRAPH_DIR / "graph.json"
    if gjson.is_file():
        data = json.loads(gjson.read_text(encoding="utf-8"))
        nodes = data.get("nodes", [])
        links = data.get("links", data.get("edges", []))
        comms = {n.get("community") for n in nodes if n.get("community") is not None}
        mtime = datetime.fromtimestamp(gjson.stat().st_mtime, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        print(f"Graphify:   READY ({len(nodes)} nodes, {len(links)} edges, {len(comms)} communities; built {mtime})")
    else:
        print("Graphify:   MISSING (run `python .agents/skills/heroesforge-ops/scripts/hf_ops.py graph-sync --full`)")

    fe_tests = len(list((ROOT / "frontend/tests").glob("*.test.js")))
    be_tests = len(list((ROOT / "backend/api/tests").glob("test_*.py")))
    print(f"Test files: frontend={fe_tests} suites | backend={be_tests} modules")
    print("Monolith budgets (lines vs target):")
    for rel, budget in MONOLITH_BUDGETS:
        p = ROOT / rel
        if p.is_file():
            n = sum(1 for _ in p.open(encoding="utf-8", errors="replace"))
            flag = "OVER" if n > budget else "OK"
            print(f"  [{flag:4s}] {n:5d} / {budget:4d}  {rel}")
    return 0


# ---------------------------------------------------------------------------
# 2. GRAPHIFY SYNC & QUERIES
# ---------------------------------------------------------------------------
_GRAPH_SYNC_CODE = r"""
import json, sys
from datetime import datetime, timezone
from pathlib import Path
from graphify.detect import detect, detect_incremental, save_manifest
from graphify.extract import collect_files, extract
from graphify.build import build_from_json, build_merge
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.diagnostics import diagnose_extraction
from graphify.report import generate
from graphify.export import to_json, to_html
from graphify.cli import _stamped_manifest_files

mode = sys.argv[1]
root = Path(sys.argv[2]).resolve()
out = root / "graphify-out"
out.mkdir(parents=True, exist_ok=True)
(out / ".graphify_root").write_text(str(root), encoding="utf-8")
(out / ".graphify_python").write_text(sys.executable, encoding="utf-8")

graph_path = out / "graph.json"
labels_path = out / ".graphify_labels.json"
prior_labels = {}
if labels_path.is_file():
    try:
        prior_labels = {int(k): v for k, v in json.loads(labels_path.read_text(encoding="utf-8")).items()}
    except Exception:
        prior_labels = {}

def auto_label_communities(G, communities):
    labels = {}
    for cid, nids in communities.items():
        # Name community from top-2 highest-degree source directories / labels
        dirs = {}
        top_nodes = sorted(nids, key=lambda n: G.degree(n), reverse=True)[:5]
        for n in nids:
            sf = (G.nodes[n].get("source_file") or "").replace("\\", "/")
            parts = [p for p in sf.split("/") if p and p not in ("frontend", "src", "components", "backend", "api")]
            bucket = parts[0] if parts else (Path(sf).stem if sf else "core")
            dirs[bucket] = dirs.get(bucket, 0) + 1
        top_dir = sorted(dirs.items(), key=lambda kv: kv[1], reverse=True)[0][0] if dirs else f"Cluster {cid}"
        lead = G.nodes[top_nodes[0]].get("label", "") if top_nodes else ""
        clean_dir = top_dir.replace("_", " ").replace("-", " ").replace(".py", "").replace(".jsx", "").replace(".js", "").title()
        labels[cid] = f"{clean_dir} ({lead[:24]})" if lead and lead.lower() != clean_dir.lower() else clean_dir
    return labels

if mode == "update" and graph_path.is_file():
    inc = detect_incremental(root, gitignore=True)
    new_total = inc.get("new_total", 0)
    deleted = list(inc.get("deleted_files", []))
    if new_total == 0 and not deleted:
        print("Graphify up-to-date: 0 changed/deleted files.")
        sys.exit(0)
    code_files = []
    for f in inc.get("new_files", {}).get("code", []):
        p = Path(f)
        code_files.extend(collect_files(p) if p.is_dir() else [p])
    ast_res = extract(code_files, cache_root=root, root=root, parallel=False) if code_files else {"nodes": [], "edges": [], "input_tokens": 0, "output_tokens": 0}
    new_ext = {"nodes": ast_res["nodes"], "edges": ast_res["edges"], "hyperedges": [], "input_tokens": 0, "output_tokens": 0}
    G = build_merge([new_ext], graph_path=str(graph_path), prune_sources=deleted or None, root=str(root), directed=False)
    det_for_report = {
        "files": inc.get("files", {}),
        "total_files": inc.get("total_files", 0),
        "total_words": inc.get("total_words", 0),
        "skipped_sensitive": inc.get("skipped_sensitive", []),
    }
    manifest_files = _stamped_manifest_files(inc["files"], new_ext, root)
    scan_set = {f for fl in inc["files"].values() for f in fl}
    save_manifest(manifest_files, root=str(root), scan_corpus=scan_set)
    force_write = bool(deleted)
else:
    import re as _re
    det = detect(root, gitignore=True)
    code_files = []
    for f in det.get("files", {}).get("code", []):
        p = Path(f)
        code_files.extend(collect_files(p) if p.is_dir() else [p])
    ast_res = extract(code_files, cache_root=root, root=root, parallel=False) if code_files else {"nodes": [], "edges": [], "input_tokens": 0, "output_tokens": 0}

    # Zero-token deterministic Doc -> Code semantic bridge:
    # Indexes every .md doc + ADR headings and links cited files/symbols directly to AST nodes!
    by_src_file = {}
    by_label_lower = {}
    for n in ast_res["nodes"]:
        sf = (n.get("source_file") or "").replace("\\", "/")
        if sf.startswith(str(root).replace("\\", "/") + "/"):
            sf = sf[len(str(root)) + 1 :]
        by_src_file.setdefault(sf, []).append(n["id"])
        lbl = (n.get("label") or "").lower()
        if len(lbl) >= 4:
            by_label_lower.setdefault(lbl, []).append(n["id"])

    doc_nodes, doc_edges = [], []
    code_ref_re = _re.compile(r"`((?:backend|frontend|scripts|docs|\.github)/[^`\s:*<>{}]+?)`")
    sym_ref_re = _re.compile(r"([\w./-]+\.(?:py|js|jsx))::(\w+)")
    adr_re = _re.compile(r"^##\s+(ADR-\d{4}:\s+.+)$", _re.M)

    for df in det.get("files", {}).get("document", []):
        dp = Path(df)
        if dp.suffix.lower() != ".md" or not dp.is_file():
            continue
        rel_doc = dp.relative_to(root).as_posix()
        stem_id = "doc_" + _re.sub(r"[^a-z0-9]+", "_", rel_doc.lower()).strip("_")
        txt = dp.read_text(encoding="utf-8", errors="replace")
        title_m = _re.search(r"^#\s+(.+)$", txt, _re.M)
        doc_label = f"{rel_doc} ({title_m.group(1).strip()[:48]})" if title_m else rel_doc
        doc_nodes.append({
            "id": stem_id,
            "label": doc_label,
            "file_type": "document",
            "source_file": str(dp),
            "source_location": "L1",
            "_origin": "semantic",
        })
        linked_targets = set()
        for m in code_ref_re.finditer(txt):
            clean_p = _re.sub(r":\d+(?:[-–]\d+)?$", "", m.group(1).split("::")[0]).rstrip(".,;:")
            for tid in by_src_file.get(clean_p, [])[:3]:
                linked_targets.add(tid)
        for fpart, sym in sym_ref_re.findall(txt):
            for tid in by_label_lower.get(sym.lower(), [])[:2]:
                linked_targets.add(tid)
        for tid in sorted(linked_targets):
            doc_edges.append({
                "source": stem_id,
                "target": tid,
                "relation": "references",
                "confidence": "EXTRACTED",
                "confidence_score": 1.0,
                "source_file": str(dp),
                "weight": 1.0,
                "_origin": "semantic",
            })
        if dp.name == "ADR.md":
            for idx_line, line in enumerate(txt.splitlines(), start=1):
                am = adr_re.match(line)
                if am:
                    adr_title = am.group(1).strip()
                    adr_id = "adr_" + _re.sub(r"[^a-z0-9]+", "_", adr_title[:12].lower()).strip("_")
                    doc_nodes.append({
                        "id": adr_id,
                        "label": adr_title[:72],
                        "file_type": "rationale",
                        "source_file": str(dp),
                        "source_location": f"L{idx_line}",
                        "_origin": "semantic",
                    })
                    doc_edges.append({
                        "source": stem_id,
                        "target": adr_id,
                        "relation": "contains",
                        "confidence": "EXTRACTED",
                        "confidence_score": 1.0,
                        "source_file": str(dp),
                        "weight": 1.0,
                        "_origin": "semantic",
                    })

    seen = {n["id"] for n in ast_res["nodes"]}
    merged_nodes = list(ast_res["nodes"]) + [n for n in doc_nodes if n["id"] not in seen]
    merged = {
        "nodes": merged_nodes,
        "edges": ast_res["edges"] + doc_edges,
        "hyperedges": [],
        "input_tokens": 0,
        "output_tokens": 0,
    }
    G = build_from_json(merged, root=str(root), directed=False)
    det_for_report = det
    manifest_files = _stamped_manifest_files(det["files"], merged, root)
    scan_set = {f for fl in det["files"].values() for f in fl}
    save_manifest(manifest_files, root=str(root), scan_corpus=scan_set)
    force_write = True

if G.number_of_nodes() == 0:
    print("ERROR: Graph has 0 nodes.")
    sys.exit(1)

communities = cluster(G)
cohesion = score_all(G, communities)
labels = auto_label_communities(G, communities)
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
questions = suggest_questions(G, communities, labels)
tokens = {"input": 0, "output": 0}

wrote = to_json(G, communities, str(graph_path), community_labels=labels, force=force_write)
if not wrote:
    to_json(G, communities, str(graph_path), community_labels=labels, force=True)

report = generate(G, communities, cohesion, labels, gods, surprises, det_for_report, tokens, str(root), suggested_questions=questions)
(out / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
labels_path.write_text(json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False, indent=2), encoding="utf-8")
try:
    import os as _os
    _os.environ.setdefault("GRAPHIFY_VIZ_NODE_LIMIT", "15000")
    to_html(G, communities, str(out / "graph.html"), community_labels=labels)
except Exception as exc:
    print(f"Note: HTML export skipped ({exc})")

print(f"Graph synced ({mode}): {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities -> {out}")
"""


def cmd_graph_sync(args: argparse.Namespace) -> int:
    gpy = _resolve_graphify_python()
    mode = "full" if args.full or not (GRAPH_DIR / "graph.json").is_file() else "update"
    r = subprocess.run([gpy, "-c", _GRAPH_SYNC_CODE, mode, str(ROOT)], cwd=str(ROOT), text=True, encoding="utf-8")
    return r.returncode


def _load_graph_data() -> dict:
    gjson = GRAPH_DIR / "graph.json"
    if not gjson.is_file():
        print("ERROR: graphify-out/graph.json missing. Run `hf_ops.py graph-sync --full` first.", file=sys.stderr)
        raise SystemExit(1)
    return json.loads(gjson.read_text(encoding="utf-8"))


def _expand_vocab_terms(data: dict, raw_query: str) -> list[str]:
    vocab: set[str] = set()
    for n in data.get("nodes", []):
        for chunk in re.findall(r"[^\W\d_]+", (n.get("label") or "") + " " + (n.get("source_file") or ""), re.UNICODE):
            parts = re.findall(r"[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+", chunk) or [chunk]
            for p in parts:
                tl = p.lower()
                if 3 <= len(tl) <= 30:
                    vocab.add(tl)
    q_parts = []
    for raw in re.findall(r"[A-Za-z0-9_]+", raw_query):
        subs = re.findall(r"[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+", raw) or [raw]
        q_parts.extend(s.lower() for s in subs if len(s) >= 3)
    matched = []
    for qt in q_parts:
        if qt in vocab and qt not in matched:
            matched.append(qt)
        else:
            # prefix/stem match against actual graph vocab only
            stem = qt.rstrip("s")
            if len(stem) >= 3 and stem in vocab and stem not in matched:
                matched.append(stem)
            else:
                for vt in sorted(vocab):
                    if (vt.startswith(qt) or qt.startswith(vt)) and abs(len(vt) - len(qt)) <= 3:
                        if vt not in matched:
                            matched.append(vt)
                            break
    return matched[:12]


def cmd_graph_query(args: argparse.Namespace) -> int:
    data = _load_graph_data()
    terms = _expand_vocab_terms(data, args.question)
    print(f"Vocab-expanded tokens ({len(terms)}): {terms}")
    if not terms:
        print("No matching vocabulary tokens in graph.")
        return 0

    gpy = _resolve_graphify_python()
    code = r"""
import json, sys
from pathlib import Path
from networkx.readwrite import json_graph

root = Path(sys.argv[1])
terms = json.loads(sys.argv[2])
mode = sys.argv[3]
depth_limit = int(sys.argv[4])
budget = int(sys.argv[5])

data = json.loads((root / "graphify-out/graph.json").read_text(encoding="utf-8"))
G = json_graph.node_link_graph(data, edges="links" if "links" in data else "edges")

scored = []
for nid, nd in G.nodes(data=True):
    hay = ((nd.get("label") or "") + " " + (nd.get("source_file") or "")).lower()
    sc = sum(2 if t in (nd.get("label") or "").lower() else 1 for t in terms if t in hay)
    if sc > 0:
        scored.append((sc, G.degree(nid), nid))
scored.sort(reverse=True)
seeds = [nid for _, _, nid in scored[:4]]
if not seeds:
    print("No matching start nodes.")
    sys.exit(0)

sub = set(seeds)
if mode == "dfs":
    stack = [(n, 0) for n in reversed(seeds)]
    visited = set()
    while stack:
        n, d = stack.pop()
        if n in visited or d > depth_limit:
            continue
        visited.add(n)
        sub.add(n)
        for nb in G.neighbors(n):
            if nb not in visited:
                stack.append((nb, d + 1))
else:
    frontier = set(seeds)
    for _ in range(depth_limit):
        nxt = set()
        for n in frontier:
            for nb in G.neighbors(n):
                if nb not in sub:
                    nxt.add(nb)
        sub.update(nxt)
        frontier = nxt

def rel_score(nid):
    nd = G.nodes[nid]
    hay = ((nd.get("label") or "") + " " + (nd.get("source_file") or "")).lower()
    is_doc = (nd.get("file_type") or "") == "document"
    return (0 if is_doc else 1, sum(1 for t in terms if t in hay), G.degree(nid))

ranked = sorted(sub, key=rel_score, reverse=True)
lines = [f"Traversal={mode.upper()} depth={depth_limit} seeds={[G.nodes[s].get('label', s) for s in seeds]} subgraph={len(sub)} nodes"]
for nid in ranked:
    nd = G.nodes[nid]
    loc = f":{nd.get('source_location')}" if nd.get("source_location") else ""
    lines.append(f"  NODE {nd.get('label', nid)} [{nd.get('source_file', '')}{loc}] (comm={nd.get('community_name', nd.get('community', ''))})")
for u, v, ed in G.subgraph(sub).edges(data=True):
    if u != v:
        lines.append(f"  EDGE {G.nodes[u].get('label', u)} --{ed.get('relation', 'links')} [{ed.get('confidence', '')}]--> {G.nodes[v].get('label', v)}")

out = "\n".join(lines)
char_cap = budget * 4
if len(out) > char_cap:
    out = out[:char_cap] + f"\n... [capped at ~{budget} tokens]"
print(out)
"""
    return subprocess.run(
        [gpy, "-c", code, str(ROOT), json.dumps(terms), args.mode, str(args.depth), str(args.budget)],
        cwd=str(ROOT),
        text=True,
        encoding="utf-8",
    ).returncode


def cmd_graph_path(args: argparse.Namespace) -> int:
    _load_graph_data()
    gpy = _resolve_graphify_python()
    code = r"""
import json, sys, networkx as nx
from pathlib import Path
from networkx.readwrite import json_graph

data = json.loads((Path(sys.argv[1]) / "graphify-out/graph.json").read_text(encoding="utf-8"))
G = json_graph.node_link_graph(data, edges="links" if "links" in data else "edges")

def pick(term):
    tl = term.lower().split()
    sc = sorted(
        [(sum(2 if w in (G.nodes[n].get("label") or "").lower() else 1
              for w in tl if w in ((G.nodes[n].get("label") or "") + " " + (G.nodes[n].get("source_file") or "")).lower()),
          G.degree(n), n) for n in G.nodes()],
        reverse=True,
    )
    return sc[0][2] if sc and sc[0][0] > 0 else None

u, v = pick(sys.argv[2]), pick(sys.argv[3])
if not u or not v:
    print(f"Could not match endpoints: {sys.argv[2]!r} -> {u}, {sys.argv[3]!r} -> {v}")
    sys.exit(0)
UG = G.to_undirected() if G.is_directed() else G
try:
    path = nx.shortest_path(UG, u, v)
    print(f"Shortest path ({len(path) - 1} hops):")
    for i, n in enumerate(path):
        nd = G.nodes[n]
        loc = f":{nd.get('source_location')}" if nd.get("source_location") else ""
        if i < len(path) - 1:
            raw = UG[n][path[i + 1]]
            ed = next(iter(raw.values()), {}) if isinstance(UG, nx.MultiGraph) else raw
            print(f"  {nd.get('label', n)} [{nd.get('source_file', '')}{loc}] --{ed.get('relation', '')}-->")
        else:
            print(f"  {nd.get('label', n)} [{nd.get('source_file', '')}{loc}]")
except nx.NetworkXNoPath:
    print("No path connects those two nodes.")
"""
    return subprocess.run([gpy, "-c", code, str(ROOT), args.source, args.target], cwd=str(ROOT), text=True, encoding="utf-8").returncode


def cmd_graph_explain(args: argparse.Namespace) -> int:
    _load_graph_data()
    gpy = _resolve_graphify_python()
    code = r"""
import json, sys, networkx as nx
from pathlib import Path
from networkx.readwrite import json_graph

data = json.loads((Path(sys.argv[1]) / "graphify-out/graph.json").read_text(encoding="utf-8"))
G = json_graph.node_link_graph(data, edges="links" if "links" in data else "edges")
tl = sys.argv[2].lower().split()
sc = sorted(
    [(sum(2 if w in (G.nodes[n].get("label") or "").lower() else 1
          for w in tl if w in ((G.nodes[n].get("label") or "") + " " + (G.nodes[n].get("source_file") or "")).lower()),
      G.degree(n), n) for n in G.nodes()],
    reverse=True,
)
if not sc or sc[0][0] == 0:
    print(f"No node matching {sys.argv[2]!r}")
    sys.exit(0)
nid = sc[0][2]
nd = G.nodes[nid]
print(f"NODE: {nd.get('label', nid)}")
print(f"  file:      {nd.get('source_file', '')} ({nd.get('source_location') or 'file-level'})")
print(f"  community: {nd.get('community_name', nd.get('community', ''))}")
print(f"  degree:    {G.degree(nid)}")
print("  neighbors (up to 30):")
for nb in list(G.neighbors(nid))[:30]:
    raw = G[nid][nb]
    ed = next(iter(raw.values()), {}) if isinstance(G, (nx.MultiGraph, nx.MultiDiGraph)) else raw
    nbd = G.nodes[nb]
    print(f"    --{ed.get('relation', '')}--> {nbd.get('label', nb)} [{nbd.get('source_file', '')}]")
"""
    return subprocess.run([gpy, "-c", code, str(ROOT), args.node], cwd=str(ROOT), text=True, encoding="utf-8").returncode


def cmd_graph_gods(args: argparse.Namespace) -> int:
    data = _load_graph_data()
    deg: dict[str, int] = {}
    for e in data.get("links", data.get("edges", [])):
        s, t = e.get("source"), e.get("target")
        if s and t and s != t:
            deg[s] = deg.get(s, 0) + 1
            deg[t] = deg.get(t, 0) + 1
    by_id = {n["id"]: n for n in data.get("nodes", [])}
    ranked = sorted(deg.items(), key=lambda kv: kv[1], reverse=True)[: args.top]
    print(f"Top {len(ranked)} architectural hub (god) nodes:")
    for nid, d in ranked:
        nd = by_id.get(nid, {})
        loc = f":{nd.get('source_location')}" if nd.get("source_location") else ""
        print(f"  deg={d:4d}  {nd.get('label', nid):36s}  [{nd.get('source_file', '')}{loc}]")
    return 0


# ---------------------------------------------------------------------------
# 3. MONOLITH SURGICAL OUTLINE
# ---------------------------------------------------------------------------
def _outline_python(path: Path) -> list[tuple[int, int, str, str]]:
    src = path.read_text(encoding="utf-8", errors="replace")
    tree = ast.parse(src, filename=str(path))
    items = []
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            kind = "class" if isinstance(node, ast.ClassDef) else "def"
            decos = []
            for d in getattr(node, "decorator_list", []):
                if isinstance(d, ast.Call) and getattr(d.func, "id", "") == "api_view":
                    decos.append("@api_view")
            prefix = (" ".join(decos) + " ") if decos else ""
            items.append((node.lineno, getattr(node, "end_lineno", node.lineno), f"{prefix}{kind}", node.name))
    return items


def _outline_js(path: Path) -> list[tuple[int, int, str, str]]:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    decl_re = re.compile(
        r"^(?:export\s+(?:default\s+)?)?(?:(async\s+function|function|class)\s+([A-Za-z0-9_$]+)|(const|let)\s+([A-Za-z0-9_$]+)\s*=\s*(?:React\.(?:memo|forwardRef)\(|useMemo\(|async\s*\(|\(\s*\{?|\([^)]*\)\s*=>|[A-Za-z0-9_$]+\s*=>|\{|\[))"
    )
    raw = []
    for idx, line in enumerate(lines, start=1):
        m = decl_re.match(line)
        if m:
            kind = (m.group(1) or m.group(3) or "decl").strip()
            name = m.group(2) or m.group(4) or "?"
            raw.append((idx, kind, name))
    items = []
    for i, (start, kind, name) in enumerate(raw):
        end = (raw[i + 1][0] - 1) if i + 1 < len(raw) else len(lines)
        items.append((start, end, kind, name))
    return items


def _outline_css(path: Path) -> list[tuple[int, int, str, str]]:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    sec_re = re.compile(r"^\s*/\*+\s*(?:[-═─=]{2,}\s*)?(.+?)(?:\s*[-═─=]{2,})?\s*\*+/")
    raw = []
    for idx, line in enumerate(lines, start=1):
        m = sec_re.match(line)
        if m:
            title = m.group(1).strip()
            if len(title) >= 4 and ("v1." in title or "──" in line or "--" in line or title[0].isupper()):
                raw.append((idx, "section", title[:80]))
    items = []
    for i, (start, kind, name) in enumerate(raw):
        end = (raw[i + 1][0] - 1) if i + 1 < len(raw) else len(lines)
        items.append((start, end, kind, name))
    return items


def cmd_outline(args: argparse.Namespace) -> int:
    rel = OUTLINE_ALIASES.get(args.target, args.target)
    p = (ROOT / rel).resolve()
    if not p.is_file():
        print(f"File not found: {rel}. Known aliases: {', '.join(sorted(OUTLINE_ALIASES))}", file=sys.stderr)
        return 1
    total = sum(1 for _ in p.open(encoding="utf-8", errors="replace"))
    suf = p.suffix.lower()
    if suf == ".py":
        items = _outline_python(p)
    elif suf == ".css":
        items = _outline_css(p)
    else:
        items = _outline_js(p)

    rx = re.compile(args.filter, re.I) if args.filter else None
    if rx:
        items = [it for it in items if rx.search(it[3]) or rx.search(it[2])]

    print(f"{p.relative_to(ROOT).as_posix()} ({total} lines) — {len(items)} entries:")
    for s, e, kind, name in items:
        print(f"  L{s:4d}-L{e:<4d} ({e - s + 1:4d}L)  {kind:14s}  {name}")
    return 0


# ---------------------------------------------------------------------------
# 4. END-TO-END API TRACER
# ---------------------------------------------------------------------------
def cmd_trace_api(args: argparse.Namespace) -> int:
    needle = args.term.lower()
    urls_py = (ROOT / "backend/api/urls.py").read_text(encoding="utf-8")
    route_re = re.compile(r"path\(\s*['\"]([^'\"]+)['\"]\s*,\s*([A-Za-z0-9_.]+)")
    matches = []
    for route, target in route_re.findall(urls_py):
        if needle in route.lower() or needle in target.lower():
            matches.append((route, target))

    print(f"=== 1. BACKEND ROUTES matching {args.term!r} ({len(matches)}) ===")
    view_names = set()
    for route, target in matches:
        parts = target.split(".")
        mod_name, fn_name = (parts[0], parts[1]) if len(parts) == 2 else ("views", parts[0])
        view_names.add(fn_name)
        mod_file = ROOT / "backend/api" / f"{mod_name}.py"
        loc = ""
        if mod_file.is_file():
            for s, e, _, nm in _outline_python(mod_file):
                if nm == fn_name:
                    loc = f":L{s}-L{e}"
                    break
        print(f"  /api/{route:44s} -> backend/api/{mod_name}.py{loc} :: {fn_name}")

    print(f"=== 2. FRONTEND CALL SITES ===")
    fe_hits = []
    tokens_to_find = {needle} | {r.split("/")[0].lower() for r, _ in matches if r.split("/")[0]}
    for js in sorted((ROOT / "frontend").rglob("*")):
        if not js.is_file() or js.suffix not in {".js", ".jsx"} or "node_modules" in js.parts or "dist" in js.parts:
            continue
        if js.parent == ROOT / "frontend/data":
            continue
        txt = js.read_text(encoding="utf-8", errors="replace")
        if "/api/" not in txt and "request(" not in txt and "api." not in txt:
            continue
        for idx, line in enumerate(txt.splitlines(), start=1):
            ll = line.lower()
            if needle in ll and any(k in ll for k in ("/api/", "fetch", "request(", "api.", "post", "get", "patch", "put", "delete")):
                fe_hits.append(f"  {js.relative_to(ROOT).as_posix()}:L{idx}: {line.strip()[:110]}")
    for h in fe_hits[:25]:
        print(h)
    if not fe_hits:
        print("  (none matched directly; try broader route segment)")

    print(f"=== 3. RELATED TESTS ===")
    for tf in sorted((ROOT / "frontend/tests").glob("*.test.js")) + sorted((ROOT / "backend/api/tests").glob("test_*.py")):
        txt = tf.read_text(encoding="utf-8", errors="replace").lower()
        if needle in tf.name.lower() or needle in txt or any(vn.lower() in txt for vn in view_names):
            print(f"  {tf.relative_to(ROOT).as_posix()}")
    return 0


# ---------------------------------------------------------------------------
# 5. SAFE DATA PEEK (for denied/huge catalog files)
# ---------------------------------------------------------------------------
def cmd_data_peek(args: argparse.Namespace) -> int:
    cat = args.catalog
    q = args.query.lower()
    limit = args.limit

    json_map = {
        "spells-2024": ["frontend/data/srd2024-spells-core.json", "frontend/data/srd2024-spells-pt-core.json"],
        "spells-2024-full": ["frontend/data/srd2024-spells.json", "frontend/data/srd2024-spells-pt.json"],
        "spells-2014": ["frontend/data/srd51-spells-meta.json", "frontend/data/spells-2014-text.json"],
        "spell-tags": ["frontend/data/spell-tags.json", "frontend/data/spell-mechanics.json"],
        "feats-text": ["frontend/data/srd-feats-text.json"],
        "catalog": ["backend/api/progression/catalog.json"],
    }

    if cat in json_map:
        shown = 0
        for rel in json_map[cat]:
            p = ROOT / rel
            if not p.is_file():
                continue
            obj = json.loads(p.read_text(encoding="utf-8"))
            print(f"--- {rel} ---")
            if isinstance(obj, dict):
                for k, v in obj.items():
                    hay = f"{k} {json.dumps(v, ensure_ascii=False)[:300]}".lower()
                    if q in hay:
                        snippet = json.dumps(v, ensure_ascii=False)
                        if len(snippet) > args.max_chars:
                            snippet = snippet[: args.max_chars] + "..."
                        print(f"  [{k}]: {snippet}")
                        shown += 1
                        if shown >= limit:
                            break
            elif isinstance(obj, list):
                for item in obj:
                    hay = json.dumps(item, ensure_ascii=False).lower()
                    if q in hay:
                        snippet = json.dumps(item, ensure_ascii=False)
                        if len(snippet) > args.max_chars:
                            snippet = snippet[: args.max_chars] + "..."
                        print(f"  {snippet}")
                        shown += 1
                        if shown >= limit:
                            break
        return 0

    js_eval_map = {
        "feats": ("./frontend/data/feats.js", "FEATS"),
        "items": ("./frontend/data/items.js", "ITEMS"),
        "monsters": ("./frontend/data/bestiary.js", "BESTIARY"),
        "species": ("./frontend/data/species-2024.js", "SPECIES_2024"),
        "class-options": ("./frontend/data/class-options/index.js", "CLASS_OPTIONS"),
    }
    if cat in js_eval_map:
        mod_path, export_name = js_eval_map[cat]
        node_code = f"""
import * as M from '{mod_path}';
const src = M['{export_name}'] || M.default || M;
const q = {json.dumps(q)};
const limit = {limit};
const maxChars = {args.max_chars};
const items = Array.isArray(src) ? src : Object.entries(src).map(([k, v]) => ({{ _key: k, ...(typeof v === 'object' ? v : {{ value: v }}) }}));
let n = 0;
for (const it of items) {{
  const s = JSON.stringify(it);
  if (s.toLowerCase().includes(q)) {{
    console.log(s.length > maxChars ? s.slice(0, maxChars) + '...' : s);
    if (++n >= limit) break;
  }}
}}
if (n === 0) console.log('No records matched.');
"""
        r = _run([_resolve_node(), "--input-type=module", "-e", node_code], cwd=ROOT)
        print(r.stdout.strip() or r.stderr.strip())
        return r.returncode

    print(f"Unknown catalog {cat!r}. Choose from: {', '.join(sorted(list(json_map) + list(js_eval_map)))}", file=sys.stderr)
    return 1


# ---------------------------------------------------------------------------
# 6. IMPACT MAPPER & CONDENSED VERIFIER
# ---------------------------------------------------------------------------
def _changed_files(explicit: list[str]) -> list[str]:
    if explicit:
        return [f.replace("\\", "/") for f in explicit]
    r = _run(["git", "status", "--porcelain"])
    out = []
    for line in r.stdout.splitlines():
        if len(line) > 3:
            path = line[3:].strip().split(" -> ")[-1].strip('"')
            out.append(path.replace("\\", "/"))
    return out


def _compute_impact(files: list[str]) -> dict:
    fe_tests: set[str] = set()
    be_tests: set[str] = set()
    gates: set[str] = set()

    stems = set()
    for f in files:
        p = Path(f)
        if f.endswith(".md"):
            gates.add("check_doc_refs")
        if f.startswith("frontend/tests/") and f.endswith(".test.js"):
            fe_tests.add(f)
        elif f.startswith("backend/api/tests/") and p.name.startswith("test_") and f.endswith(".py"):
            be_tests.add(f"api.tests.{p.stem}")
        elif f.startswith("frontend/"):
            stems.add(p.stem.lower())
            if any(k in f for k in ("progression/", "class-options/", "feats.js", "species-2024.js", "items/packs.js")):
                gates.add("sync_rules")
            if "srd2024-spells" in f and "core" not in f:
                gates.add("slim_spells")
                gates.add("spell_tags")
        elif f.startswith("backend/"):
            stems.add(p.stem.replace("views_", "").lower())
            if "models.py" in f or "migrations/" in f:
                gates.add("makemigrations_check")

    if stems:
        for tf in (ROOT / "frontend/tests").glob("*.test.js"):
            txt = tf.read_text(encoding="utf-8", errors="replace").lower()
            tname = tf.stem.replace(".test", "").lower()
            if any(st in tname or f"/{st}." in txt or f"/{st}'" in txt for st in stems if len(st) >= 4):
                fe_tests.add(tf.relative_to(ROOT).as_posix())
        for bt in (ROOT / "backend/api/tests").glob("test_*.py"):
            bname = bt.stem.replace("test_", "").lower()
            txt = bt.read_text(encoding="utf-8", errors="replace").lower()
            if any(st in bname or st in txt for st in stems if len(st) >= 4):
                be_tests.add(f"api.tests.{bt.stem}")

    return {
        "changed": files,
        "fe_tests": sorted(fe_tests),
        "be_tests": sorted(be_tests),
        "gates": sorted(gates),
    }


def cmd_impact(args: argparse.Namespace) -> int:
    files = _changed_files(args.files)
    imp = _compute_impact(files)
    print(f"Changed files ({len(imp['changed'])}): {', '.join(imp['changed'][:15]) or '(clean working tree)'}")
    print(f"Sync/lint gates ({len(imp['gates'])}): {', '.join(imp['gates']) or '(none)'}")
    print(f"Affected frontend tests ({len(imp['fe_tests'])}):")
    for t in imp["fe_tests"][:25]:
        print(f"  {t}")
    print(f"Affected backend tests ({len(imp['be_tests'])}):")
    for b in imp["be_tests"][:25]:
        print(f"  {b}")
    return 0


def _condense_tap(stdout: str, stderr: str) -> tuple[bool, str]:
    combined = stdout + ("\n" + stderr if stderr else "")
    summary = []
    failures = []
    lines = combined.splitlines()
    for i, line in enumerate(lines):
        if line.startswith("not ok "):
            chunk = "\n".join(lines[i : min(i + 12, len(lines))])
            failures.append(chunk)
        elif re.match(r"^# (tests|suites|pass|fail|duration_ms)\b", line):
            summary.append(line)
    ok = not failures and any(s.startswith("# fail 0") for s in summary)
    out_parts = []
    if failures:
        out_parts.append("FAILURES:\n" + "\n---\n".join(failures[:10]))
    if summary:
        out_parts.append(" | ".join(s.lstrip("# ") for s in summary))
    elif not ok:
        out_parts.append(combined[-1500:])
    return ok, "\n".join(out_parts)


def cmd_verify(args: argparse.Namespace) -> int:
    node = _resolve_node()
    npm = _resolve_npm()
    bpy = _resolve_backend_python()
    exit_code = 0

    if args.sync:
        print("[sync] Regenerating backend rules snapshot + slim spells...")
        for sc in (["scripts/sync-rules.mjs"], ["frontend/scripts/slim-spells.mjs"]):
            r = _run([node, *sc])
            if r.returncode != 0:
                print(f"  FAIL {sc}: {r.stderr.strip()}")
                return 1
        print("  OK synced.")

    # 1. Always run fast contract gates (<2s total)
    r_rules = _run([node, "scripts/sync-rules.mjs", "--check"])
    print(f"[gate] sync-rules --check: {'PASS' if r_rules.returncode == 0 else 'FAIL'}")
    if r_rules.returncode != 0:
        print("  " + r_rules.stderr.strip())
        exit_code = 1

    r_docs = _run([sys.executable, "scripts/check_doc_refs.py"])
    print(f"[gate] check_doc_refs.py:  {'PASS' if r_docs.returncode == 0 else 'FAIL'} ({r_docs.stdout.strip().splitlines()[0] if r_docs.stdout.strip() else ''})")
    if r_docs.returncode != 0:
        print(r_docs.stdout.strip())
        exit_code = 1

    if args.full:
        # Full frontend suite
        r_fe = _run([npm, "--prefix", "frontend", "test"], timeout=240)
        ok, digest = _condense_tap(r_fe.stdout, r_fe.stderr)
        print(f"[fe]   npm test:           {'PASS' if r_fe.returncode == 0 else 'FAIL'} ({digest})")
        if r_fe.returncode != 0:
            exit_code = 1

        # Clean Vite build to temp dir so working tree stays clean
        with tempfile.TemporaryDirectory(prefix="forja-build-") as tmp_out:
            r_build = _run([node, "./node_modules/vite/bin/vite.js", "build", "--outDir", tmp_out], cwd=ROOT / "frontend", timeout=180)
            built_line = next((l for l in reversed(r_build.stdout.splitlines()) if "built in" in l), "")
            print(f"[fe]   vite build:         {'PASS' if r_build.returncode == 0 else 'FAIL'} ({built_line})")
            if r_build.returncode != 0:
                print(r_build.stderr[-1500:] or r_build.stdout[-1500:])
                exit_code = 1

        # Backend migrations + full suite
        r_mig = _run([bpy, "manage.py", "makemigrations", "--check", "--dry-run"], cwd=ROOT / "backend", timeout=60)
        print(f"[be]   makemigrations:     {'PASS' if r_mig.returncode == 0 else 'FAIL'} ({r_mig.stdout.strip()})")
        if r_mig.returncode != 0:
            print(r_mig.stderr.strip())
            exit_code = 1

        r_be = _run([bpy, "manage.py", "test", "api", "--noinput", "-v", "0"], cwd=ROOT / "backend", timeout=300, extra_env={"FORJA_FAST_TEST_HASHER": "1"})
        be_tail = "\n".join((r_be.stderr or r_be.stdout).strip().splitlines()[-4:])
        print(f"[be]   manage.py test api: {'PASS' if r_be.returncode == 0 else 'FAIL'} ({be_tail.replace(chr(10), ' | ')})")
        if r_be.returncode != 0:
            print((r_be.stderr or r_be.stdout)[-2000:])
            exit_code = 1
    else:
        # Quick targeted verification based on dirty files
        imp = _compute_impact(_changed_files(args.files))
        if imp["fe_tests"]:
            rel_tests = [t.removeprefix("frontend/") for t in imp["fe_tests"][:20]]
            r_fe = _run([node, "--test", *rel_tests], cwd=ROOT / "frontend", timeout=120)
            ok, digest = _condense_tap(r_fe.stdout, r_fe.stderr)
            print(f"[fe]   targeted ({len(rel_tests)} files): {'PASS' if r_fe.returncode == 0 else 'FAIL'} ({digest})")
            if r_fe.returncode != 0:
                exit_code = 1
        else:
            print("[fe]   targeted:           SKIP (0 impacted frontend test files)")

        if imp["be_tests"]:
            mods = imp["be_tests"][:15]
            r_be = _run([bpy, "manage.py", "test", *mods, "--noinput", "-v", "0"], cwd=ROOT / "backend", timeout=180, extra_env={"FORJA_FAST_TEST_HASHER": "1"})
            be_tail = "\n".join((r_be.stderr or r_be.stdout).strip().splitlines()[-3:])
            print(f"[be]   targeted ({len(mods)} mods):  {'PASS' if r_be.returncode == 0 else 'FAIL'} ({be_tail.replace(chr(10), ' | ')})")
            if r_be.returncode != 0:
                print((r_be.stderr or r_be.stdout)[-1500:])
                exit_code = 1
        else:
            print("[be]   targeted:           SKIP (0 impacted backend test modules)")

    return exit_code


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="HeroesForge End-to-End Graphify & Token-Economy CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("status", help="Repo version, graph readiness & monolith budget summary")

    gs = sub.add_parser("graph-sync", help="Build or incrementally update graphify-out/")
    gs.add_argument("--full", action="store_true", help="Force full AST + cached semantic rebuild")
    gs.add_argument("--update", action="store_true", help="Incremental update (default when graph exists)")

    gq = sub.add_parser("graph-query", help="Vocab-expanded BFS/DFS traversal of graphify-out/graph.json")
    gq.add_argument("question", help="Keywords or natural-language query")
    gq.add_argument("--mode", choices=["bfs", "dfs"], default="bfs")
    gq.add_argument("--depth", type=int, default=2)
    gq.add_argument("--budget", type=int, default=1200)

    gp = sub.add_parser("graph-path", help="Shortest path between two graph nodes")
    gp.add_argument("source")
    gp.add_argument("target")

    ge = sub.add_parser("graph-explain", help="Explain a node and its immediate connections")
    ge.add_argument("node")

    gg = sub.add_parser("graph-gods", help="List highest-degree hub nodes in the graph")
    gg.add_argument("--top", type=int, default=15)

    ol = sub.add_parser("outline", help="List exact Lstart-Lend spans for functions/components/CSS sections")
    ol.add_argument("target", help=f"File path or alias ({', '.join(sorted(OUTLINE_ALIASES))})")
    ol.add_argument("--filter", default="", help="Regex filter on symbol/section name")

    ta = sub.add_parser("trace-api", help="Trace /api/ route -> Django view -> React callers -> tests")
    ta.add_argument("term", help="Endpoint path fragment or view name (e.g. pulse, stage, rest, versions)")

    dp = sub.add_parser("data-peek", help="Inspect records inside giant/denied SRD & catalog files")
    dp.add_argument("catalog", help="spells-2024|spells-2014|spell-tags|feats|items|monsters|species|class-options|catalog")
    dp.add_argument("query", help="ID or substring to match")
    dp.add_argument("--limit", type=int, default=5)
    dp.add_argument("--max-chars", type=int, default=500)

    im = sub.add_parser("impact", help="Map modified files to affected frontend/backend tests & sync gates")
    im.add_argument("files", nargs="*", help="Optional explicit file list (defaults to git status)")

    vf = sub.add_parser("verify", help="Run token-condensed verification (--quick | --full | --sync)")
    vf.add_argument("--full", action="store_true", help="Run full frontend + Vite build + full Django suite")
    vf.add_argument("--sync", action="store_true", help="Regenerate catalog.json & slim-spells before verifying")
    vf.add_argument("files", nargs="*", help="Optional explicit file list for --quick mode")

    return p


DISPATCH = {
    "status": cmd_status,
    "graph-sync": cmd_graph_sync,
    "graph-query": cmd_graph_query,
    "graph-path": cmd_graph_path,
    "graph-explain": cmd_graph_explain,
    "graph-gods": cmd_graph_gods,
    "outline": cmd_outline,
    "trace-api": cmd_trace_api,
    "data-peek": cmd_data_peek,
    "impact": cmd_impact,
    "verify": cmd_verify,
}


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return DISPATCH[args.cmd](args)


if __name__ == "__main__":
    raise SystemExit(main())

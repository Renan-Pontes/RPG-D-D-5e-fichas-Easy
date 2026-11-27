---
name: heroesforge-ops
description: >-
  End-to-end codebase navigation, Graphify knowledge-graph operations, monolith surgical outlining,
  API contract tracing, safe SRD data inspection, impact mapping, and token-condensed test/build
  verification for DND_HeroesForge (Forja de Heróis). Activate whenever exploring, editing, testing,
  syncing rules/docs, or preparing commits in f:\AI_Resources\DND_HeroesForge.
---

# HeroesForge End-to-End Operations (`heroesforge-ops`)

Use this workspace skill and its bundled CLI (`scripts/hf_ops.py`) to operate across `DND_HeroesForge` (`frontend/` Vite+React 18 + `backend/` Django 5 DRF) at minimal token cost.

## 1. Golden Token-Saving Rules

1. **Graph & Outline Before Reading**:
   - Query `graphify` (`graphify` MCP tools with `project_path: "f:\\AI_Resources\\DND_HeroesForge"`, or `hf_ops.py graph-query`) before multi-file exploration.
   - Run `hf_ops.py outline <alias>` before reading `Sheet.jsx` (`sheet`), `SheetTabs.jsx` (`tabs`), `ficha.css` (`css`), `views_combat.py` (`combat`), `views_campaigns.py` (`campaigns`), `views_characters.py` (`characters`), or `world_rules.py` (`world`), then call `read_file` with exact `StartLine`–`EndLine` (`<= 150` lines).
2. **Never Read Giant Data Blobs**:
   - Never open `frontend/data/*.json`, `srd.js`, `magic-items-srd.js`, `monsters-srd521.js`, `spells-extra.js`, `expanded-*.js`, `backend/api/progression/catalog.json`, or `frontend/public/rules/*.pdf`. Inspect records via `hf_ops.py data-peek`.
3. **Condensed Verification**:
   - Never dump raw `npm test` (330+ KB TAP output) during iterative work. Use `hf_ops.py verify` (targeted + condensed) during edits and `hf_ops.py verify --full` once before committing.
4. **Repo Conventions**:
   - Commit format: `type(scope): clear English sentence describing user-facing effect (v1.0.N)` — increment `N` from `hf_ops.py status`; no AI co-author trailers.
   - New sheet CSS appends to the end of `frontend/src/sheet/ficha.css` under `/* ---------- v1.0.N · topic ---------- */`.
   - Planned/unbuilt file paths mentioned in any `.md` file MUST include `*(a criar)*` on the same line so `scripts/check_doc_refs.py` (enforced in CI) passes.

## 2. Bundled Automation CLI (`scripts/hf_ops.py`)

Run from repository root (`f:\AI_Resources\DND_HeroesForge`) via `py .agents/skills/heroesforge-ops/scripts/hf_ops.py <subcommand>`:

```powershell
# 1. Pulse check: git state, next (v1.0.N), graph readiness & monolith budgets
py .agents/skills/heroesforge-ops/scripts/hf_ops.py status

# 2. Knowledge Graph (Graphify AST + community clustering, 0 LLM tokens on code updates)
py .agents/skills/heroesforge-ops/scripts/hf_ops.py graph-sync --update   # incremental (--full for clean rebuild)
py .agents/skills/heroesforge-ops/scripts/hf_ops.py graph-gods --top 15   # core architectural hubs
py .agents/skills/heroesforge-ops/scripts/hf_ops.py graph-query "spell slots rest warlock" --budget 1000
py .agents/skills/heroesforge-ops/scripts/hf_ops.py graph-path "SheetSpells" "character_rest"
py .agents/skills/heroesforge-ops/scripts/hf_ops.py graph-explain "FeatureTimeline"

# 3. Monolith Surgical Outliner (exact Lstart-Lend spans)
# Aliases: sheet, tabs, css, tabs-css, cond-css, styles, app, creator, dice, combat, campaigns, characters, world, models, urls
py .agents/skills/heroesforge-ops/scripts/hf_ops.py outline sheet --filter "Timeline|Hero|Belt"
py .agents/skills/heroesforge-ops/scripts/hf_ops.py outline combat --filter "undo|turn"
py .agents/skills/heroesforge-ops/scripts/hf_ops.py outline css

# 4. End-to-End API Tracer (urls.py -> views_*.py:line -> frontend callers -> tests)
py .agents/skills/heroesforge-ops/scripts/hf_ops.py trace-api pulse

# 5. Safe Catalog Record Lookup (0 bloat from multi-MB JSON/SRD files)
# Catalogs: spells-2024, spells-2014, spell-tags, feats, items, monsters, species, class-options, catalog
py .agents/skills/heroesforge-ops/scripts/hf_ops.py data-peek spells-2024 "fireball"
py .agents/skills/heroesforge-ops/scripts/hf_ops.py data-peek species "tiefling"

# 6. Impact Analysis & Token-Condensed Verification
py .agents/skills/heroesforge-ops/scripts/hf_ops.py impact
py .agents/skills/heroesforge-ops/scripts/hf_ops.py verify                # fast: impacted FE/BE tests + check:rules + check_doc_refs
py .agents/skills/heroesforge-ops/scripts/hf_ops.py verify --sync --full  # full release gate: sync snapshots + all FE/BE suites + clean Vite build
```

## 3. Graphify MCP Direct Integration

Because `graphify-out/graph.json` is maintained at the workspace root, you can also call the `graphify` MCP server tools (`query_graph`, `get_node`, `get_neighbors`, `god_nodes`, `graph_stats`, `shortest_path`) directly by passing:
`project_path: "f:\\AI_Resources\\DND_HeroesForge"`.

After committing code changes, keep the graph current with `py .agents/skills/heroesforge-ops/scripts/hf_ops.py graph-sync --update` (automatically triggered if the git post-commit hook is installed via `graphify hook install`).

## 4. Deep References (Load Only When Needed)

- **System layers, sync generators, security invariants & high-risk cascades**: read [references/architecture-and-cascades.md](./references/architecture-and-cascades.md).
- **Token-saving patterns & local GPU/Ollama offload commands**: read [references/token-economy-runbook.md](./references/token-economy-runbook.md).

# Token-Economy & Local Offload Runbook for DND_HeroesForge

## 1. Hard Read Prohibitions (Save 50k–500k Tokens/Turn)

NEVER call `read_file` on whole monoliths or generated data blobs:

| Forbidden Full Read | Token-Free Replacement |
|---|---|
| `frontend/components/Sheet.jsx` (5.5k lines) | `py .agents/skills/heroesforge-ops/scripts/hf_ops.py outline sheet --filter <Name>` -> `read_file` exact `StartLine`–`EndLine` |
| `frontend/components/SheetTabs.jsx` (2.6k lines) | `py .agents/skills/heroesforge-ops/scripts/hf_ops.py outline tabs --filter <Name>` -> `read_file` exact `StartLine`–`EndLine` |
| `frontend/src/sheet/ficha.css` (7.4k lines) | `py .agents/skills/heroesforge-ops/scripts/hf_ops.py outline css` -> append new rules at EOF under `/* ---------- v1.0.N · topic ---------- */` |
| `backend/api/views_combat.py` (2.7k lines) | `py .agents/skills/heroesforge-ops/scripts/hf_ops.py outline combat` -> `read_file` exact function lines |
| `frontend/data/*.json`, `srd.js`, `monsters-srd521.js`, `magic-items-srd.js`, `spells-extra.js`, `expanded-*.js`, `catalog.json` | `py .agents/skills/heroesforge-ops/scripts/hf_ops.py data-peek <catalog> "<query>"` |
| `ADR.md` (131 KB), `HANDOFF.md`, `docs/sync-ledger.md` | `rg -n "<keyword>" ADR.md` -> read `<= 80` lines around match |
| Multi-file call-path hunting | `graphify` MCP (`query_graph` / `get_neighbors` / `shortest_path` with `project_path: "f:\\AI_Resources\\DND_HeroesForge"`) or `hf_ops.py graph-query` / `trace-api` |
| Raw `npm test` (334 KB TAP output) during iteration | `py .agents/skills/heroesforge-ops/scripts/hf_ops.py verify` (targeted + condensed to <10 lines) |

---

## 2. Four-Step Low-Token Execution Loop

1. **Locate (0 file reads)**:
   - Run `hf_ops.py status`, `hf_ops.py graph-query "<topic>"`, `hf_ops.py trace-api "<endpoint>"`, or `hf_ops.py outline <alias>` in a single batched shell call.
   - Or invoke `graphify` MCP tools (`query_graph`, `get_node`, `shortest_path`) passing `project_path: "f:\\AI_Resources\\DND_HeroesForge"`.
2. **Read Narrowly (`<= 150` lines per file)**:
   - Batch all `read_file(Path, StartLine, EndLine)` calls in one parallel turn using the exact line spans from Step 1.
3. **Edit & Sync Deterministically**:
   - Batch all `edit_file` calls in one turn.
   - If rules/spells/docs changed, include `py .agents/skills/heroesforge-ops/scripts/hf_ops.py verify --sync` in the verification command.
4. **Verify & Refresh Graph Once**:
   - Run `py .agents/skills/heroesforge-ops/scripts/hf_ops.py verify` (or `--full` before commit/push) chained with `py .agents/skills/heroesforge-ops/scripts/hf_ops.py graph-sync --update`.

---

## 3. Offloading Bulk Work to Local / Zero-Cost Ecosystem Lanes

When a task involves bulk translation, repetitive test generation, mechanical catalog linting, or pre-flight prompt compression, offload from paid cloud context to the local AI pipeline (`C:\Users\Administrador\.agents\local-ai-pipeline\bin\`):

- **Fast 100% GPU Local Agents (GTX 1070 8 GB VRAM)**:
  - `pwsh -NoProfile -File C:\Users\Administrador\.agents\local-ai-pipeline\bin\Invoke-OfflineAgent.ps1 -Agent qwen -Tier local -Project f:\AI_Resources\DND_HeroesForge -Prompt "<tight mechanical brief>" -SkipRoute` (uses `bonsai-2:16k` / `bonsai-2:32k` / `lfm3-vl:16k`).
- **Prompt Compression**:
  - `python C:\Users\Administrador\.agents\local-ai-pipeline\bin\prompt_optimizer.py` (`caveman` + `[[Pn]]` exact-token masking + `all-minilm` cosine guard).
- **D&D 5e Rules & Mechanical Verification**:
  - Query the offline SRD 5.1 / 5.2.1 corpus via `python C:\Users\Administrador\.agents\skills\ttrpg-gm-craft\scripts\corpus\dnd5e_lookup.py "<term>" --ruleset 5.2.1 --limit 5` instead of reading raw JSON/PDF files.

# DND_HeroesForge — Agent Operating & Token-Economy Contract

Maintain **Forja de Heróis** (dual-edition D&D 5e `2024`/`2014` character creator, campaign Mesa, tactical VTT, and TV stage) and its frontend/backend API contracts with minimal token spend.

## 1. Mandatory Token-Saving Workflow (`heroesforge-ops` + `graphify`)
- **Activate workspace skill**: Load `.agents/skills/heroesforge-ops/SKILL.md` for end-to-end automation via `py .agents/skills/heroesforge-ops/scripts/hf_ops.py`.
- **Graph-first exploration**: Query `graphify` MCP (`project_path: "f:\\AI_Resources\\DND_HeroesForge"`) or `py .agents/skills/heroesforge-ops/scripts/hf_ops.py graph-query "<terms>"` / `trace-api <route>` before multi-file reads. Keep `graphify-out/` fresh via `hf_ops.py graph-sync --update` after code edits.
- **Never read monoliths or giant data blobs whole**:
  - For `Sheet.jsx` (`sheet`), `SheetTabs.jsx` (`tabs`), `ficha.css` (`css`), `views_combat.py` (`combat`), `views_campaigns.py` (`campaigns`), or `world_rules.py` (`world`), run `hf_ops.py outline <alias> --filter <regex>` first, then `read_file` only exact `StartLine`–`EndLine` (`<= 150` lines).
  - Never read `frontend/data/*.json`, `srd.js`, `magic-items-srd.js`, `monsters-srd521.js`, `spells-extra.js`, `expanded-*.js`, `backend/api/progression/catalog.json`, `frontend/public/rules/*.pdf`, or full `ADR.md` / `HANDOFF.md`. Use `hf_ops.py data-peek <catalog> "<query>"` or targeted `rg -n`.
- **Local offload**: Route mechanical bulk passes (translations, boilerplate, preflight compression) through `C:\Users\Administrador\.agents\local-ai-pipeline\bin\Invoke-OfflineAgent.ps1` (`bonsai-2:16k`/`32k`, `lfm3-vl:16k`) and `prompt_optimizer.py` (`caveman`). For D&D 5e rules, query `ttrpg-gm-craft` (`dnd5e_lookup.py`) and declare edition (`2014-5e` / `2024-5e` / `dual-5e`).

## 2. Verification, Sync & Commit Gates
- **Trace full contracts**: Trace changes across API serialization (`backend/api/views_*.py`, `serializers.py`, `views_pulse.py`), client validation, progression (`applyAutosToCharacter`), PDF roundtrip, and regex-guarded frontend tests before editing. Preserve existing character data and `2014`/`2024` compatibility.
- **Condensed verification**: During iteration run `py .agents/skills/heroesforge-ops/scripts/hf_ops.py verify` (targeted FE/BE tests + `check:rules` + `check_doc_refs.py`, condensed output) instead of raw `npm test`. Before committing, run `hf_ops.py verify --sync --full` (and verify interactive UI changes in a browser when applicable).
- **Conventions**:
  - Commits: `type(scope): English sentence describing user-visible effect (v1.0.N)` (increment `N` from `hf_ops.py status`; no AI co-author trailers).
  - New sheet CSS goes at the end of `frontend/src/sheet/ficha.css` under `/* ---------- v1.0.N · topic ---------- */`.
  - Any unbuilt file path mentioned in `.md` docs must carry `*(a criar)*` on the same line so `scripts/check_doc_refs.py` passes in CI.

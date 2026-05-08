# Inkwell 2 Current State

Updated: 2026-05-08

## Current Progress

- Frontend workflow is in a usable prototype state and is not the current focus.
- Backend prototype is running through `server/zhuque-server.cjs`.
- Orchestrator has two modes:
  - `deterministic`: local deterministic fallback provider, default mode.
  - `live`: real model provider mode with deterministic fallback.
- Zhuque integration is present for AI detection, login QR capture, and artifact screenshots/HTML.
- Model provider layer has been added in `server/providers.cjs`.
- Provider health, cooldown, and recent-call logging are now implemented in memory.
- Frontend workflow nodes now preserve and display provider trace metadata.
- Frontend workflow page now includes a Provider diagnostics panel backed by `/api/orchestrator/logs`.
- Candidate generation now preserves provider trace metadata in frontend state.
- Live prompts now use per-node Chinese role prompts, quality rules, and JSON-only contracts.
- Live JSON parsing now falls through to the next provider when a model returns invalid JSON.
- Live JSON schema validation now also falls through to the next provider when a model returns the wrong top-level shape.
- Live rewrite now merges returned paragraph patches by `paragraphId`, so partial rewrite output cannot drop untouched paragraphs.
- Zhuque `ai_risk` results are converted into rewrite review input, including AIGC score, verdict, summary, and report text excerpt.
- Backend project snapshots are now available through `/api/project-state` with atomic local JSON writes.
- Frontend sidebar now has manual save, restore, and delete controls for backend project snapshots.
- Browser `localStorage` persistence now uses `partialize` to avoid saving transient loading, QR, and status-message fields.
- A strict live E2E script now verifies the whole model chain from candidates to memory.
- The live E2E script has strict mode by default and an explicit fallback-allowed mode via `INKWELL_E2E_ALLOW_FALLBACK=true`.

## Live Model Pool

Currently verified and wired into live provider mode:

- `deepseek/deepseek-v4-pro`
- `minimax-portal/MiniMax-M2.7-highspeed`
- `minimax-portal/MiniMax-M2.7`
- `yunwu/claude-opus-4-7`
- `yunwu/gpt-5.5`

`sub2/openai gpt-5.5` is not wired into the main chain yet. Its key can authenticate and `/v1/models` returns models, but generation calls currently return `502 Upstream request failed`.

## Backend Entry Points

Default deterministic backend:

```powershell
npm run backend:server
```

Mock Zhuque backend:

```powershell
npm run backend:server:mock
```

Live provider backend:

```powershell
npm run backend:server:live
```

Contract check:

```powershell
npm run backend:contract
```

Strict live E2E check:

```powershell
npm run backend:e2e:live
```

Frontend build:

```powershell
npm run build
```

## Important Files

- `server/providers.cjs`: real model clients and role-based provider selection.
- `server/orchestrator.cjs`: workflow logic, live mode routing, deterministic fallback.
- `server/zhuque-server.cjs`: unified local backend server.
- `server/project-state.cjs`: local project snapshot persistence.
- `tools/backend-contract.cjs`: backend contract smoke test.
- `tools/live-e2e.cjs`: strict live provider E2E smoke test.
- `src/services/orchestratorClient.ts`: frontend client for orchestrator endpoints.
- `src/store/useProjectStore.ts`: current store path for workflow state and backend calls.
- `src/components/WorkflowCanvas.tsx`: workflow node/provider trace display.
- `src/components/ProviderDebugPanel.tsx`: frontend provider health and recent-call diagnostics.
- `src/services/projectStateClient.ts`: frontend client for backend snapshot save/load/delete.
- `README.md`: setup notes and live provider documentation.

## Verification Completed

- `node --check server/providers.cjs server/orchestrator.cjs server/zhuque-server.cjs tools/backend-contract.cjs`
- Deterministic backend contract passed on temporary port `8797`.
- Live mode smoke passed on temporary port `8798`.
  - Provider status detected 5 configured providers.
  - Candidate generation used `deepseek/deepseek-v4-pro`.
  - No provider fallback occurred in that smoke test.
- `npm run build` passed.
- Provider hardening pass:
  - per-provider health state
  - consecutive failure counter
  - short cooldown after repeated failures
  - sanitized recent-call logs via `/api/orchestrator/logs`
  - `providerTrace` attached to live workflow responses
- Frontend trace display pass:
  - node card shows provider/model, latency, fallback marker
  - node detail shows provider, latency, fallback, attempts, and short errors
  - draft/review/memory artifacts retain source model trace
- Prompt/schema pass:
  - live nodes now share `jsonMessages()`
  - each node has Chinese persona, task, quality rules, and output schema examples
  - review nodes use a shared review schema helper
- Strict live E2E passed on temporary port `8799`.
  - Candidates: `deepseek/deepseek-v4-pro`
  - Draft: `deepseek/deepseek-v4-pro`
  - Structure audit: `yunwu/claude-opus-4-7`
  - Style audit: `minimax-portal/MiniMax-M2.7-highspeed`
  - Judge: `yunwu/claude-opus-4-7`
  - Rewrite: `deepseek/deepseek-v4-pro`
  - Memory: `minimax-portal/MiniMax-M2.7-highspeed`
  - No deterministic fallback occurred in that run.
- Frontend workflow progression fix:
  - structure audit passed -> advances to AI style audit
  - style audit failed -> returns to rewrite instead of advancing judge
  - final judge failed -> returns to rewrite
- Frontend diagnostics pass:
  - candidate generation provider trace is preserved in state and displayed on the candidate board
  - workflow page fetches `/api/orchestrator/logs?limit=20`
  - provider health cards and recent sanitized calls are visible in the workflow page
- Verification pass on 2026-05-08:
  - `npm run build` passed.
  - `npm run backend:contract` passed on temporary port `8798`.
  - `node --check` passed for `server/providers.cjs`, `server/orchestrator.cjs`, `server/zhuque-server.cjs`, `tools/backend-contract.cjs`, and `tools/live-e2e.cjs`.
- High-risk closure pass on 2026-05-08:
  - Strict live E2E passed on temporary port `8805` with no deterministic fallback.
  - Forced fallback live E2E passed on temporary port `8806` with `INKWELL_MODEL_TIMEOUT_MS=1` and `INKWELL_E2E_ALLOW_FALLBACK=true`.
  - Deterministic contract passed on temporary port `8807`.
  - `node --check` passed again after provider timeout/schema changes.
- Xhigh persistence pass on 2026-05-08:
  - `server/project-state.cjs` saves a single-slot project snapshot to `.local/project-state.json` by default.
  - Writes use same-directory temp files, backup copy, and atomic rename.
  - `GET/POST/DELETE /api/project-state` are covered by `tools/backend-contract.cjs`.
  - Contract also checks invalid schema 400, bad content type 415, oversized request 413, delete behavior, and non-local Origin rejection.
  - `npm run build` passed after sidebar snapshot controls and Zustand `partialize`.
  - Backend contract passed on temporary port `8816` with `INKWELL_PROJECT_STATE_PATH=E:\inkwell-2\.local\contract-project-state.json`.

## Current Provider Strategy

Role routing in live mode:

- Candidates: DeepSeek first, MiniMax/Yunwu fallback.
- Draft: DeepSeek first, Yunwu GPT-5.5 and MiniMax fallback.
- Structure audit: Yunwu Opus 4.7 first, DeepSeek fallback.
- Style / AI-flavor audit: MiniMax first, Yunwu fallback.
- Final judge: Yunwu Opus 4.7 first, DeepSeek fallback.
- Rewrite: DeepSeek first, Yunwu GPT-5.5 and MiniMax fallback.
- Memory: MiniMax first, DeepSeek fallback.

Each live call expects JSON for workflow nodes. If a live model fails, times out, returns invalid JSON, or returns JSON with the wrong schema shape, the backend now tries the next provider for that role. If all live providers fail, it returns the deterministic result and may include `providerFallback`.

Provider diagnostics:

- `GET /api/orchestrator/status` includes provider health.
- `GET /api/orchestrator/logs?limit=50` returns sanitized recent provider attempts.
- Live node responses can include `providerTrace` with `attempts`, `latencyMs`, `provider/model`, and fallback status.
- The workflow UI now exposes provider health and recent calls without displaying keys or raw config.
- Default model timeout is now 60s (`INKWELL_MODEL_TIMEOUT_MS`) because MiniMax can exceed the old 45s limit during style audit.

Project snapshot persistence:

- `GET /api/project-state` returns snapshot status and the saved snapshot.
- `POST /api/project-state` saves `{ snapshot }` after light schema validation.
- `DELETE /api/project-state` removes the active snapshot after writing a `.bak`.
- Default storage path is `.local/project-state.json`; override with absolute `INKWELL_PROJECT_STATE_PATH`.
- Snapshot endpoints reject non-local browser Origins and never return API keys or raw OpenClaw config.

## Known Issues / Caveats

- `E:\inkwell-2` is not a git repository, so `git status` does not work here.
- `rg.exe` was blocked with access denied earlier; use PowerShell `Select-String` / `Get-ChildItem` if needed.
- Some older Chinese text in local files appears mojibake in terminal output, but the app/build currently works.
- MiniMax M2.7 can emit `thinking` blocks before text. Parser in `providers.cjs` only uses `content[].type === "text"`.
- MiniMax needs enough `max_tokens`; too small can return thinking only.
- `sub2api.yuchat.top` docs say Codex CLI uses root base URL with `wire_api = "responses"` and recommends `gpt-5.4`; actual generation currently returns upstream 502.
- Browser Use in-app backend was unavailable earlier. Playwright from `C:/Users/WIT_User/.agents/skills/browser-automation/node_modules/playwright` works as fallback.

## Next Suggested Tasks

1. Tune retry/cooldown thresholds after more live workflow runs.
2. Consider persisted provider stats if runtime diagnostics need to survive server restarts.
3. Add multi-project/library management on top of the single-slot snapshot.
4. Revisit `sub2` later and wire it as low-priority experimental provider after generation succeeds.
5. Add deeper prompt/schema validation if live models start drifting from the current JSON contracts.

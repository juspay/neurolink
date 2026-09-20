# Proxy history truncation — corrected implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or
> superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bound what the proxy actually sends upstream, per model, so long sessions stop
paying for (and stop being refused for) full history — without trading a local refusal for
an upstream 400.

**Spec:** `docs/superpowers/specs/2026-09-20-codex-fallback-compaction-design.md`

**Status of prior work:** `f6bda9ba4` implements the truncator and wires it into the shared
preflight. That code is correct for the Codex shape and is _not_ safe to enable on the
Vertex/Anthropic shape until Task 1 lands. The previous version of this plan assumed a
single 700k/650k setting was right for every model. It is not.

---

## Verified facts (each checked in source or against the live host)

| #       | Fact                                                                                                                                                                                                                                                                                                                                                                                                                 | Evidence                                                                                                                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1      | All three dispatch paths call the shared preflight **and dispatch `prepared.body`**, so one hook covers them                                                                                                                                                                                                                                                                                                         | `claudeProxyRoutes.ts:384` (body swapped :392); `proxyTranslationEngine.ts:665` (dispatched :756); `codexProxyRoutes.ts:799` (`body = preparedContext.body` :805)                               |
| F2      | The context-window **refusal** can only fire where a window was registered at runtime                                                                                                                                                                                                                                                                                                                                | `getRuntimeContextWindow` reads `RUNTIME_CONTEXT_WINDOWS` (`contextWindows.ts:416`); registered only by `openaiChatCompletionsBase.ts:494`, `litellm/client.ts:222`, `codexProxyRoutes.ts:1463` |
| F3      | Neither `anthropic` nor `vertex` ever registers a window → they were never refused locally. Only Codex was.                                                                                                                                                                                                                                                                                                          | same as F2 — this is the full explanation of the original bug's blast radius                                                                                                                    |
| F4      | The static `MODEL_CONTEXT_WINDOWS` table (which lists opus-4-6 at 1M) is **not** what preflight reads                                                                                                                                                                                                                                                                                                                | `contextWindows.ts:132,222` vs. `:416`                                                                                                                                                          |
| F5      | Installed 12.17.4 **rejects** `compactAtTokens`/`compactToTokens`; allowed model keys are `["contextWindow","maxOutputTokens"]`                                                                                                                                                                                                                                                                                      | `proxy-packages/12.17.4/.../dist/proxy/proxyContextPreflight.js:74`                                                                                                                             |
| F6      | The worktree parser accepts and validates the new fields (`compactAt < contextWindow`, `compactTo < compactAt`, both required together)                                                                                                                                                                                                                                                                              | `src/lib/proxy/proxyContextPreflight.ts:120-136`                                                                                                                                                |
| F7      | On the translated (Vertex) path history is `conversationMessages: Array<{role: string; content: string}>` — **content is a flattened string, with no `tool_use`/`tool_result` blocks**                                                                                                                                                                                                                               | `types/proxy.ts:298`; built at `proxyTranslationEngine.ts:255,304`                                                                                                                              |
| F8      | Vertex Claude goes through `@anthropic-ai/vertex-sdk` and sends **no `anthropic-beta` header**                                                                                                                                                                                                                                                                                                                       | `providers/googleVertex/client.ts`; `providers/anthropic/client.ts:916`                                                                                                                         |
| ~~F8a~~ | ~~Inferred from F8 that Vertex Opus is therefore capped at 200,000 input tokens.~~ **DISPROVEN — see F15.**                                                                                                                                                                                                                                                                                                          | superseded                                                                                                                                                                                      |
| F15     | **Vertex Opus 4.6 accepts ≥210,000 input tokens.** Proven end-to-end through the live proxy: a 420,211-byte request with a unique needle at the very START returned HTTP 200 and the model echoed the needle exactly. Full input was processed; no Codex fallthrough (`gpt-5.6-sol` counter unchanged). The missing beta header does **not** impose a 200k cap here.                                                 | live needle probe, 20/09 ~10:38 IST                                                                                                                                                             |
| F16     | **Vertex hop verified working.** Two small probes returned HTTP 200 with `provider: vertex`, and `proxy_tokens_input` for `claude-opus-4-6` moved 5 → 17 → 29, exactly +12 each, matching the reported `input_tokens`.                                                                                                                                                                                               | OpenObserve `proxy_tokens_input`, `curator` routing_decision                                                                                                                                    |
| ~~F17~~ | ~~Token accounting is broken on the Vertex/translated path.~~ **DISPROVEN — I was reading the wrong counter.** Anthropic reports `input_tokens` as the uncached remainder only (`client.ts:5019`, `:6580`); the volume landed in `cache_creation` (806,710) and `cache_read` (386,175), and `proxy_cost_usd_total` moved $2.62 → $5.25, correctly billing both probes. Accounting is sound.                          | corrected by cache-counter query                                                                                                                                                                |
| F9      | Live host: 12.17.4, PID 74182, up since 2026-09-19T19:47:34Z, healthy                                                                                                                                                                                                                                                                                                                                                | `/health`, `/status`                                                                                                                                                                            |
| F10     | The proxy's local JSON journal keeps only the **last 20** records — but it is not the telemetry system. A live otelcol-contrib (PID 1157) → OpenObserve (PID 1177) pipeline holds **5,820,639 log docs (~124 GB)**, 546,904 traces and 22 metric streams, all current to 04:17–04:21Z today. Full history is available.                                                                                              | `~/.neurolink/telemetry-native/`, OpenObserve `:5080`                                                                                                                                           |
| F12     | **Before/after, from `proxy_errors_total` (structured, per counter series):** client-400s on `claude-opus-5` were 22 + 8 + 3 + **64** across the runs from 00:03 to 00:33 IST; `gpt-5.6-sol` 2; `gpt-6-astra` 2 + 19. After the 01:17 IST restart (~8 h) the total is **1** (gpt-6-astra), zero on `claude-opus-5`. Corroborated in logs: the last `request_final` with status 400 was **01:21:11 IST**, none since. | OpenObserve `proxy_errors_total`, `curator`                                                                                                                                                     |
| F13     | **`vertex/claude-opus-4-6` has never served real traffic**: `proxy_tokens_input` shows 1,756 samples but a cumulative total of **5 input tokens**, against 228,320,772 for `gpt-5.6-sol` and 1,446,782 for `claude-opus-5`. The chain's new first hop is completely unexercised.                                                                                                                                     | OpenObserve `proxy_tokens_input`                                                                                                                                                                |
| F14     | Full-text `body LIKE` counts on `curator` are **contaminated and must never be used**: a 36 h search for the error code returned 3,725 hits that are this session's own 486–488 KB `client_request`/`upstream_request` bodies quoting the string. Structured fields only. Such GROUP BY queries also exceed the 5-minute client timeout.                                                                             | verified by pulling the matching records                                                                                                                                                        |
| F11     | Auto-update installs via `pnpm add -g @juspay/neurolink@<v>`, records `installedVersion`, and honours a `suppressedVersions` skip list. It already overwrote one hand-patched `dist/` (12.17.3 → 12.17.4 at 2026-09-19T18:56:31Z).                                                                                                                                                                                   | `~/.neurolink/update-state.json`; `dist/proxy/update*.js`                                                                                                                                       |

## Consequences the previous plan missed

**C1 — Vertex thresholds are unresolved.** The 200,000 premise here was disproven by
F15: Vertex accepted 800,000 input tokens, needle-verified. Its usable window is not the
constraint, so its trigger and target are a cost decision and stay open until Task 4b picks
them from telemetry. The Codex 700,000/650,000 pair does not transfer to it.

**C2 — Truncation can produce an invalid Anthropic request.** Units are grouped by
tool-pair closure, never by role. Dropping the oldest units can leave a leading
`assistant` message, which the Messages API rejects ("first message must use the user
role"). By F7 this hits the Vertex path, where every message is its own unit. No existing
test covers it.

**C3 — `1_000_000` is a ceiling, not a cost.** It is only the refusal threshold; it bills
nothing by itself. The cost lever is the trigger/target pair, which is exactly what is
missing from the live host by F5.

**C4 — Truncation moves the cached prefix**, so every truncation event is a full
prompt-cache miss on Anthropic/Vertex. The trigger/target gap _is_ the hysteresis: a 50k
gap means the boundary moves about once per 50k tokens of growth rather than every turn.
Keep the gap wide; do not narrow it to "save" tokens.

**C5 — Client compaction beats proxy truncation.** Codex compacts semantically
(summarises); the proxy drops. Set the client's limit _below_ the proxy trigger so the
proxy only ever acts as a backstop.

## Global constraints

- Truncation is opt-in per `provider/model` key. A key with no `compactAtTokens` behaves
  exactly as today.
- Never enable on `anthropic/*`: those accounts are subscription-billed (no per-token
  saving) and Claude Code already compacts client-side. Silent proxy-side dropping there
  is pure downside.
- Instructions, tool definitions and schema are never touched.
- The newest unit always survives.
- No outbound model call may be added to the reduction path.

## Target configuration

| key                      | contextWindow | compactAtTokens | compactToTokens | basis                                                                                                                                                                                                        |
| ------------------------ | ------------: | --------------: | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `codex/gpt-5.6-sol`      |     1,000,000 |         700,000 |         650,000 | 900,022 input tokens accepted upstream and through the live proxy                                                                                                                                            |
| `vertex/claude-opus-4-6` |      **open** |        **open** |        **open** | F15 killed the 200k premise. The cap is ≥210k and its ceiling is unmeasured, so these must now be chosen as a **cost** policy, not a capacity one — Opus is the only per-token-billed hop. Needs a decision. |
| `anthropic/*`            |             — |               — |               — | deliberately absent (see constraints)                                                                                                                                                                        |

Client-side, in `~/.codex/config.toml`: `model_auto_compact_token_limit` 800,000 → 640,000,
so Codex summarises before the proxy truncates. (The client clamps its own limit to 90% of
the resolved window, currently 784,800.)

---

### Task 1: Keep truncated history dispatchable

**Files:** modify `src/lib/proxy/proxyHistoryTruncation.ts`;
modify `test/continuous-test-suite-proxy-context-preflight.ts`

**Interfaces:** unchanged — `truncateHistoryForBudget` keeps its signature.

- [ ] Write a failing test: `conversationMessages` = [user, assistant, user, assistant,
      user] with a target that forces two units out; assert the first kept message has
      `role === "user"`.
- [ ] Write a failing test for the `messages` shape with a Claude tool pair, asserting
      both that the head is a user message and that no `tool_result` is orphaned.
- [ ] Run the suite; expect both to fail on the leading-role assertion.
- [ ] After the budget loop, advance `removedUnits` by whole units while the first kept
      item is a role-bearing object whose role is not `user`, stopping before the last
      unit. Whole units only, so pairing stays intact.
- [ ] Items with no `role` field (the Codex item array) must be unaffected — assert this
      with a Codex-shaped test so the fix cannot silently change that path.
- [ ] Run the suite; expect green.
- [ ] Commit.

### Task 2: Stop stale multimodal state from disabling the ceiling

**Files:** modify `src/lib/proxy/proxyContextPreflight.ts`;
modify `test/continuous-test-suite-proxy-context-preflight.ts`

- [ ] Failing test: history whose **removed** portion holds an image, kept portion text
      only; assert `evidence.multimodalEstimate === false` and that an over-ceiling
      request still raises `proxy_context_window_exceeded`.
- [ ] Run; expect failure (the refusal is currently skipped, because `state.multimodal`
      stays true once set and the throw is guarded by `!state.multimodal`).
- [ ] Recompute the post-truncation estimate against a fresh state object and use that
      state for the evidence and the guard.
- [ ] Run; expect green. Commit.

### Task 3: Prove the policy parses and the reduction is valid, before any restart

**Files:** create `scripts/` — none; this task is verification only, run from the worktree.

- [ ] `pnpm run build`, then load `dist/proxy/proxyContextPreflight.js` and call
      `parseProxyContextPolicy` with the exact JSON destined for `.env`. Expect no throw.
- [ ] Feed a captured oversized body (Codex item array) through
      `truncateHistoryForBudget`; assert estimate ≤ target, no orphan `call_id`, newest
      unit retained.
- [ ] Repeat for a `conversationMessages` body; assert head role is `user`.
- [ ] Record all three outputs in the ledger. Do not proceed past a single failure.

### Task 4: Stage the build on the live host

**Files:** `~/.neurolink/proxy-packages/<staged>/…`, `~/.neurolink/proxy-packages/selections.json`,
`~/.neurolink/bin/neurolink-proxy`, `~/.neurolink/.env`

- [ ] Back up `selections.json`, `bin/neurolink-proxy` and `.env` with dated suffixes.
- [ ] `npm pack` the built worktree; materialise it as a new `proxy-packages/<version>`
      directory with the same layout as 12.17.4.
- [ ] Point `selections.json.active` at the staged entry, leaving `previous` on 12.17.4,
      and regenerate the launcher for the staged path.
- [ ] Add the Codex policy row to `.env`. No Vertex row until Task 4b selects its values.
- [ ] Restart once via `launchctl kickstart -k`. Poll `/health` until `ready: true`;
      do not declare success on the restart command's exit code.
- [ ] Send one real request per path and confirm HTTP 200.
- [ ] Confirm no `invalid_context_policy` appears in `/status` terminal errors.
- [ ] Confirm a truncation actually occurred: `contextPreflight.historyModified === true`
      with `historyUnitsRemoved > 0` on an oversized session.

**Rollback:** restore `.env`, flip `selections.json` back to 12.17.4, regenerate the
launcher, restart. Every input to this task has a dated backup.

**Known risk (F11):** the updater will replace a staged local package as soon as npm
carries a newer version. This staging is a bridge, not the destination.

### Task 4a: Exercise the Vertex Opus hop — **DONE**

- [x] Small probe: HTTP 200, `provider: vertex`, counter +12 twice (F16).
- [x] Window probe: ≥210,000 tokens accepted and processed, proven by needle (F15).
- [x] Probe routing added and **reverted**; chain and health re-verified.
- [ ] **Open:** the true Vertex ceiling above 210k is unmeasured. Only worth another
      paid probe if thresholds are to be set from capacity rather than cost.

### Task 4c: Cost methodology — **RESOLVED, no code change**

Accounting was never broken (F17 struck). The correction is to the _method_: any
cost figure must sum `input + cache_read + cache_creation` weighted by their
different rates, never `proxy_tokens_input` alone. Task 7 is rewritten accordingly.

- [x] Root cause identified: Anthropic reports `input_tokens` as the uncached
      remainder only.
- [x] Verified against `proxy_cost_usd_total` ($2.62 → $5.25 across two probes).

### Task 4b: Derive the thresholds from telemetry instead of judgement

The pipeline carries `proxy_request_body_bytes_bucket`, `proxy_tokens_input`,
`proxy_tokens_cache_read`, `proxy_tokens_cache_creation` and `proxy_cost_usd_total`.
The 700k/650k pair should come from the observed distribution, not from feel.

- [ ] Reconstruct the per-model input-token distribution, separating counter series by
      `start_time` so process restarts do not corrupt the cumulative counters.
- [ ] Set `compactAtTokens` at the knee of that distribution per model; keep the
      trigger/target gap wide enough to preserve the C4 cache hysteresis.
- [ ] Record the chosen numbers and the distribution they came from.

### Task 5: Lower the Codex client's own compaction limit

**Files:** `~/.codex/config.toml`

- [ ] Back up with a dated suffix.
- [ ] Set `model_auto_compact_token_limit = 640000`.
- [ ] Confirm in a live Codex session that compaction happens client-side and that
      `historyModified` stays false on the proxy for that session — the proxy is the
      backstop, and a backstop that fires constantly means this value is wrong.

### Task 6: Land it properly

- [ ] Push `fix/codex-fallback-compaction` **only after explicit approval**.
- [ ] Open the PR against `release`; include the F-table above as the rationale.
- [ ] Rebase-and-merge (`gh pr merge <n> --rebase --delete-branch`).
- [ ] After semantic-release publishes, let auto-update converge the host, then delete the
      staged package directory and re-verify `/health` and the policy.

### Task 7: Measure the saving rather than assert it

- [ ] Capture `proxy_cost_usd_total` per model for a fixed window before the change —
      dollars, not token counts, since the three token streams bill at different rates.
- [ ] Capture the same window after, and report the delta per model, noting the
      cache-miss cost from C4 as a debit against the input-token saving.
- [ ] A saving that does not show up in `proxy_cost_usd_total` did not happen.

---

## What is explicitly out of scope

- Any summarising/semantic compaction inside the proxy (adds a model call to the requests
  this exists to make cheaper).
- Enabling truncation on `anthropic/*`.
- Gemini's `contents` shape — not a configured fallback.
- Raising Vertex to 1M. That needs `context-1m-2025-08-07` plumbed through
  `googleVertex/client.ts` plus proof the account is entitled; it is a separate change.

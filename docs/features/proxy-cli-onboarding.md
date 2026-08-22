# Onboarding a New AI Coding CLI onto the NeuroLink Proxy

## Status: Understanding document — no code changes proposed yet

This document maps what it actually costs to add a fourth, fifth or sixth AI coding
CLI to the NeuroLink proxy. It is the result of verifying an earlier audit (performed
against **v11.2.2**, commit `0e935499`) line by line against **v11.2.3**, commit
`8728bbb3`.

Everything below was re-read in this worktree. Where the earlier audit was wrong or
imprecise, §2 says so plainly. Line numbers are from `8728bbb3` and were checked with
`grep -n` / `sed -n`; they will drift.

> **Branch state, as of the audit (2026-08-21):** `feat/cli-support` carried
> **zero** commits of its own — `git log origin/release..HEAD` was empty and
> `origin/release` was one commit _ahead_ (`67386e95`, `.releaserc.json` only).
> Recorded as the starting point this audit worked from; it is a historical
> snapshot, not a claim about the branch today.

---

## Contents

1. [The shape of the problem](#1-the-shape-of-the-problem)
2. [Corrections to the v11.2.2 audit](#2-corrections-to-the-v1122-audit)
3. [Touch points: a config-writer-only CLI](#3-touch-points-a-config-writer-only-cli)
4. [Touch points: a new-wire-format CLI](#4-touch-points-a-new-wire-format-cli)
5. [What the existing machinery gives you — and where it stops](#5-what-the-existing-machinery-gives-you--and-where-it-stops)
6. [Position: the account namespace is not a prerequisite](#6-position-the-account-namespace-is-not-a-prerequisite)
7. [The observability / routing split](#7-the-observability--routing-split)
8. [Defects](#8-defects)
9. [Repo conventions this work must follow](#9-repo-conventions-this-work-must-follow)

---

## 1. The shape of the problem

The proxy is a Hono app bound to `127.0.0.1:55669` by default (`proxy.ts:3864`,
`:4532`, `:5590`; port default `55669` at `:4536`). It terminates a CLI's own OAuth
token, swaps in one from a pooled account, forwards upstream, and relays SSE back.

It exposes **three wire surfaces**:

| Door                                | Factory                                                 | Upstream                                |
| ----------------------------------- | ------------------------------------------------------- | --------------------------------------- |
| `POST /v1/messages`                 | `createClaudeProxyRoutes` (`claudeProxyRoutes.ts:8316`) | `api.anthropic.com`                     |
| `POST /v1/chat/completions`         | `createOpenAIProxyRoutes` (`openaiProxyRoutes.ts:351`)  | translation engine / Anthropic loopback |
| `POST /backend-api/codex/responses` | `createCodexProxyRoutes` (`codexProxyRoutes.ts:568`)    | `chatgpt.com/backend-api`               |

Dispatch is **by URL path**. A CLI is "onboarded" by writing _that CLI's own config
file_ so it points at the right door. Three such writers exist, hand-authored, sharing
no abstraction:

| CLI         | Writer                                        | Restore                                 | Target                             |
| ----------- | --------------------------------------------- | --------------------------------------- | ---------------------------------- |
| Claude Code | `setClaudeProxySettings` `proxy.ts:625-652`   | `clearClaudeProxySettings` `:654`       | `~/.claude/settings.json` (`:248`) |
| OpenCode    | `setOpenCodeProxySettings` `proxy.ts:734-784` | `clearOpenCodeProxySettings` `:786-843` | `opencode.json` (`:722`)           |
| Codex       | `setCodexProxySettings` `proxy.ts:922-994`    | `clearCodexProxySettings` `:996`        | `~/.codex/config.toml` (`:857`)    |

**`/v1/chat/completions` is the important door and nothing is pointed at it.**
`/v1/chat/completions` speaks plain OpenAI Chat Completions and requires **no inbound
authentication at all** — `grep` for `authorization` in `openaiProxyRoutes.ts` returns
nothing. The OpenCode writer supplies a placeholder `apiKey: proxyKey ||
"neurolink-proxy"` (`proxy.ts:778`) purely because the AI SDK demands a non-empty
string. Any CLI that can be told a base URL and an arbitrary API key lands here with
zero protocol work.

### Coverage, verified on this machine

| CLI          | Installed                     | Verdict                   | Mechanism                                                    |
| ------------ | ----------------------------- | ------------------------- | ------------------------------------------------------------ |
| Claude Code  | yes                           | **live**                  | `ANTHROPIC_BASE_URL`                                         |
| Codex        | yes                           | **live**                  | `config.toml` `base_url` + `wire_api="responses"`            |
| OpenCode     | 1.3.13                        | **live**                  | `provider.neurolink` in `opencode.json` (fixed: #1366/#1367) |
| Qwen Code    | `@qwen-code/qwen-code@0.17.0` | **live**                  | `security.auth.baseUrl` → `/v1/chat/completions`             |
| Copilot CLI  | `@github/copilot@1.0.56`      | **live**                  | `COPILOT_PROVIDER_*` via a sourceable env script             |
| Hermes Agent | no                            | easy (unverified on disk) | `ANTHROPIC_BASE_URL` / `OPENAI_BASE_URL`                     |
| Gemini CLI   | `@google/gemini-cli@0.53.0`   | moderate                  | `GOOGLE_GEMINI_BASE_URL`, API-key mode only                  |
| Cursor       | `cursor-agent` 2026.05.28     | **refuted**               | env vars are dead code — proven by live test                 |
| Antigravity  | 1.107.0                       | hard                      | proprietary Cascade protobuf                                 |
| Grok CLI     | no                            | unconfirmed               | not installed                                                |
| Kiro CLI     | no                            | hard                      | fixed AWS hosts, OAuth device flow                           |

Near-term: **2 live → 6** — five of those are now live (Claude Code, Codex, OpenCode, Qwen Code, Copilot CLI), with config-writer work only and zero new route modules. The remaining one is Hermes Agent, which the table above marks easy but unverified on disk.

> The eleven-CLI roster above is PokeTokenBar's list plus Qwen Code, which this
> audit added after verifying it directly. It is still not the whole field: SARA
> tracks **Amp**, which neither of the others does, while PokeTokenBar tracks
> Hermes, Kiro, Antigravity and Grok, which SARA does not. **The union is 12.**
> Scope coverage against the union, not any single list.

---

## 2. Corrections to the v11.2.2 audit

The earlier audit's structural claims hold. Five of its specific claims do not.

### 2.1 The cost defect is attributed to the wrong route — and the failure mode is different

**Claimed:** `proxyTracer.ts:497` and `:826` hard-code `calculateCost("anthropic", …)`,
so Codex traffic to `chatgpt.com` is costed against Anthropic's price table.

**Actually:**

- There are **four** hard-coded `"anthropic"` sites, not two: `proxyTracer.ts:497`,
  `:826`, `:874` (all `calculateCost`) and `:883`
  (`TelemetryService.recordAIRequest("anthropic", …)`).
- **`codexProxyRoutes.ts` never imports `ProxyTracer` and never calls
  `calculateCost`.** Its `logRequest()` object literal (`:322-339`) has no token keys
  at all, and it never parses `usage` out of the SSE stream. Codex traffic is not
  mis-priced — it is **entirely unaccounted**. Fixing it starts with parsing `usage`,
  not with the pricing call.
- The hard-coded provider actually mis-prices **`/v1/chat/completions`**, which routes
  through `ModelRouter` to any provider.
- The failure mode is usually **$0, not a wrong number**. `findRates` returns
  `undefined` when nothing matches, and `calculateCost` then returns `0`
  (`pricing.ts:755-758`). The `anthropic` table (`pricing.ts:26-161`) has **no
  `_default`** sentinel — the first one is at `:406`. So `findRates("anthropic",
"gpt-4o")` → `undefined` → **$0**. Real mis-pricing only happens when a
  _Claude-named_ model is routed elsewhere (e.g. a `claude-*` alias mapped to Vertex
  Gemini), which prices Gemini traffic at Sonnet rates.
- Compounding it: `ProxyTracer.model` is `private readonly` (`proxyTracer.ts:248`),
  fixed at construction to the model the **client asked for**.
  `setModelSubstitution()` only writes span attributes. So even with a correct
  provider string, cost is computed against the requested model, not the served one.

**Good news:** `pricing.ts` already ships 18 provider tables including `openai` with a
`"gpt-5.1-codex"` entry (`:162+`). For the `/v1/chat/completions` path this is a
parameter change, not new pricing data.

### 2.2 "Nothing identifies the calling CLI at request time" is false — and this is an onboarding hazard

**Claimed:** `detectClientApp()` (`proxyTracer.ts:226-235`) is the only User-Agent
sniff and it only labels trace spans.

**Actually:** there is a second sniff that drives **real request behaviour**.
`isLikelyClaudeClient()` (`claudeProxyRoutes.ts:2341-2350`) tests
`headers["user-agent"]?.startsWith("claude-cli/")` (among other signals), and its
result gates:

1. which OAuth beta header set is sent — `CLAUDE_CODE_OAUTH_BETAS` vs
   `NON_CLAUDE_OAUTH_BETAS` (`:7221-7236`);
2. whether `polyfillOAuthBody()` preserves the client's own system-prompt / agent
   identity blocks verbatim or strips and relocates them;
3. `maybeRefreshClaudeSnapshot()` (`:2398`).

**This matters directly for CLI #4 and #5.** Any non-Claude CLI pointed at
`/v1/messages` via `ANTHROPIC_BASE_URL` — Hermes is exactly this case — takes the
`NON_CLAUDE_OAUTH_BETAS` branch and a different system-prompt path. That is probably
correct behaviour, but it is behaviour, and it must be tested rather than assumed.

### 2.3 "314,116 requests and no ledger" is overstated

`usageStats.ts` (1,478 lines, zero occurrences of `inputTokens` / `outputTokens` /
`totalTokens` / `cost`) is confirmed. But `neurolink proxy analyze` is a real, wired
command (`src/cli/parser.ts:260`) and `proxyAnalysis.ts:437-527` reads the same
`proxy-YYYY-MM-DD.jsonl` files `requestLogger.ts` writes and sums `inputTokens`,
`cacheReadTokens` and `cacheCreationTokens` per window.

The gap is narrower and more specific than "no ledger": **`outputTokens` and `cost`
are absent from `proxyAnalysis.ts` entirely**, and nothing aggregates the Codex engine
at all (§2.1).

### 2.4 OpenCode is two bugs, not a one-line fix

The path bug is confirmed and is genuinely one line — but a path-only fix leaves a
second, independent bug in place.

- `getOpenCodeConfigDir()` (`proxy.ts:711-720`) returns
  `~/Library/Application Support/opencode` on darwin. The installed OpenCode 1.3.13
  binary embeds the **unmodified `xdg-basedir` npm package**
  (`XDG_CONFIG_HOME || join(homedir, ".config")`) with **no platform branch at all**.
  Empirically: `~/.config/opencode/opencode.json` exists (2,640 bytes, holds a working
  custom provider that `opencode models` confirms is loaded);
  `~/Library/Application Support/opencode` does not exist. Deleting the `darwin`
  branch is the whole fix.
- **The second bug survives that.** `setOpenCodeProxySettings` returns `Promise<void>`
  (`:734`) and the call sites print `✓ Auto-configured OpenCode settings`
  **unconditionally** (`:3491-3493`, `:5403-5405`). `setCodexProxySettings` returns
  `Promise<boolean>` and its `✓` is gated on it (`:3502`, `:5413`). So even after the
  path fix, a user without OpenCode installed still gets a success message for work
  that did not happen.

**Origin of the mistake:** the OpenCode binary _does_ contain the literal
`/Library/Application Support/opencode` — as `systemManagedConfigDir()`, an MDM /
enterprise policy tier at the **filesystem root** (no `$HOME`), paired with
`/etc/opencode` and `%ProgramData%\opencode`. Someone found that string and read it as
the per-user path.

**It is also baked into our own docs.** `docs/features/opencode-proxy-support.md:67`
asserts the macOS path is `~/Library/Application Support/opencode/opencode.json`,
while `:313-323` of the same file shows resolution code with no darwin branch that
would compute `~/.config/opencode`. The doc contradicts itself, and it is titled
_"Implemented & Verified"_.

**How it escaped verification:** §11's E2E playbook runs the dev proxy with `--dev`,
which by its own option description performs "no client auto-configuration"
(`proxy.ts:3910-3917`), and hand-copies a fixture to
`/tmp/opencode-proxy-test/opencode.json`. The writer is never executed. There is also
zero automated coverage — `grep` for `setOpenCodeProxySettings` across `test/` returns
nothing; only two unused fixture JSON files mention OpenCode.

### 2.5 Smaller drifts

| Claim                                                   | Correction                                                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RouteGroup` at `types/server.ts:395-448`               | `RouteGroup` is `:443-458`. `:395-431` is `RouteDefinition`.                                                                                                            |
| Copilot works via `OPENAI_API_KEY`+`OPENAI_BASE_URL`    | True **only** with `COPILOT_ENABLE_ALT_PROVIDERS=true` (`app.js:6119`). The `COPILOT_PROVIDER_*` path has no such gate.                                                 |
| Gemini OAuth is pinned to `cloudcode-pa.googleapis.com` | Pinned _by default_, but `CODE_ASSIST_ENDPOINT` overrides it unconditionally (`getBaseUrl()`, chunk `:309590-309592`), documented by Google as dev/test-only.           |
| Claude writer range `622-651`                           | Function is `625-652`; `:623` is `PROXY_MANAGED_KEYS`, correct.                                                                                                         |
| Cursor refutation                                       | **Upheld, and strengthened.** A live run with `CURSOR_LOCAL_AGENT_BASE_URL` set returned `Authentication required` — the env vars had zero effect. Do not build for it. |

---

## 3. Touch points: a config-writer-only CLI

**This section described eleven edits. It is now two.**

The writers moved behind a `CliProxyClientConfigurator` contract
(`src/lib/types/proxyClient.ts`), one module per client under
`src/cli/proxy-clients/`, assembled by `registry.ts`. The four duplicated
call-site blocks in `proxy.ts` collapsed into `applyAllClients()` and
`restoreAllClients()`.

To add a CLI that only needs to be told a base URL:

| #   | File                                | What to do                                                                                                                                                                                                                              |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/cli/proxy-clients/<cli>.ts`    | Implement `CliProxyClientConfigurator`: `id`, `displayName`, `detect()`, `apply(proxyBaseUrl)`, `restore(proxyBaseUrl)`. Snapshot the user's prior config before overwriting, and return `false` from `apply` when nothing was written. |
| 2   | `src/cli/proxy-clients/registry.ts` | Add it to `PROXY_CLIENT_CONFIGURATORS`.                                                                                                                                                                                                 |

Plus a test and a doc entry, as for any change. Nothing in `proxy.ts` is
touched at all.

### The one client that needs a shell, not a file

Copilot CLI reads its provider settings from `process.env` only — `app.js`
resolves `COPILOT_PROVIDER_BASE_URL` and siblings directly, and
`~/.copilot/config.json` (which announces itself as "managed automatically")
carries no provider block. **There is no file the proxy can write that Copilot
will read.**

Rather than edit a shell profile — which lives outside the proxy's blast radius
and runs on every shell — the configurator writes
`~/.neurolink/copilot-env.sh` and expects one line in your profile:

```sh
[ -f ~/.neurolink/copilot-env.sh ] && . ~/.neurolink/copilot-env.sh
```

The proxy deletes the script on stop, and the `-f` guard makes a missing file a
no-op, so no NEW shell picks up a stale export. A shell that already sourced it
keeps the variables for its own lifetime — deleting a file cannot unset
variables in a running process. Run `unset COPILOT_PROVIDER_URL
COPILOT_PROVIDER_API_KEY` (or start a new shell) if you stopped the proxy in a
session that had it loaded.

Note also that Copilot's `OPENAI_API_KEY` + `OPENAI_BASE_URL` path works only
with `COPILOT_ENABLE_ALT_PROVIDERS=true`; the `COPILOT_PROVIDER_*` path has no
such gate, which is why it is the one used.

### What the contract enforces

Three defects came from the writers disagreeing with each other. The contract
makes each one unrepresentable:

- **`detect()` is required**, so a writer cannot create config for a CLI that
  was never installed — the bug Claude Code shipped with.
- **`apply()` returns `boolean`**, so a caller cannot print `✓` for work that
  did not happen — the bug OpenCode shipped with.
- **The base-URL suffix belongs to the client** (`/v1` for OpenAI-compatible
  clients, bare origin for Codex), so no call site has to remember it.

### Behaviour the loops preserve

`applyAllClients` wraps each client independently: one failing can neither stop
the others nor abort shutdown. The daemon-start path reports failures at debug
level and the setup wizard prints a visible warning — deliberately different,
and both preserved. The `proxy guard` path still keys its `cleared` flag off
Claude Code specifically.

## 4. Touch points: a new-wire-format CLI

For Gemini CLI, which needs Google's `generateContent` shape and `usageMetadata`
translation. Everything in §3 **plus**:

| #   | File                                           | Lines                  | What to do                                                                                                                                                                                                              |
| --- | ---------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `src/lib/server/routes/<cli>ProxyRoutes.ts`    | new                    | `create<Cli>ProxyRoutes(basePath = ""): RouteGroup`. Model it on `codexProxyRoutes.ts` (self-contained) rather than `claudeProxyRoutes.ts` (8,300+ lines).                                                              |
| B   | `src/cli/commands/proxy.ts`                    | `:1978-1983`           | Add the dynamic import alongside the other three.                                                                                                                                                                       |
| C   | `src/cli/commands/proxy.ts`                    | `:2121-2145`           | Add to the hand-assembled `allProxyRoutes` array. Mounting at `:2148-2150` is generic and needs no change.                                                                                                              |
| D   | **`src/lib/server/routes/index.ts`**           | `:11-29`, `:36-66`     | **The second seam.** Import, re-export, and add to `createAllRoutes` — otherwise the door is CLI-only, as Codex is today.                                                                                               |
| E   | `src/lib/types/server.ts`                      | `:1401-1409`           | Add a `CreateRoutesOptions` flag if the door should be independently toggleable.                                                                                                                                        |
| F   | `docs/guides/server-adapters/api-reference.md` | `:657-660`, `:680-686` | **Now documented** — the `proxy`/`claudeProxy`/`openaiProxy` flags and all three proxy factories are listed. Keep it current when a door is added, or the next provider repeats the drift that made this row necessary. |
| G   | `src/lib/proxy/modelRouter.ts`                 | `resolve()`, `:50-65`  | Only if model-name prefixes need extending (`gemini-` → vertex, `claude-` → anthropic). Codex bypasses `ModelRouter` entirely.                                                                                          |
| H   | `<cli>OAuth.ts` + `<cli>AccountUsage.ts`       | new                    | Only if the CLI brings its own subscription pool. See §6.                                                                                                                                                               |

**Two things you do _not_ need to touch**, contrary to reasonable expectation:

- `src/lib/proxy/proxyDispatcher.ts` — installs one global undici keep-alive `Agent`
  process-wide. No provider or path names appear in the file.
- `ProviderTransportCoordinator` — provider-agnostic, but instantiated **only** inside
  `claudeProxyRoutes.ts:249`. There is no global instance to register into; a new door
  may optionally construct its own.

**A naming trap:** there are two unrelated `ModelRouter` classes.
`src/lib/proxy/modelRouter.ts` is the HTTP one; `src/lib/utils/modelRouter.ts` is an
unrelated task-classification router. Grepping without checking the import path finds
the wrong one.

---

## 5. What the existing machinery gives you — and where it stops

### What `RouteGroup` genuinely provides

`RouteGroup` (`types/server.ts:443-458`) is `{ prefix, routes: RouteDefinition[],
middleware?, auth?, roles? }`, and `RouteDefinition` (`:395-431`) carries `method`,
`path`, `handler`, plus optional schemas, auth, rate limits and streaming config.

The real payoff is at the mount: `proxy.ts:2148-2150` iterates
`allProxyRoutes` and calls `app[method](route.path, …)` generically, wrapping every
route in the same draining check, request-metadata tracking and error envelope. **A
new door inherits all of that for free** simply by being in the array. That is a
genuine, load-bearing abstraction.

### Where it stops — "registry" overstates it

- **There is no plugin loader, manifest, or dynamic registry for route groups.** The
  array at `proxy.ts:2121-2145` is hand-edited, and `createAllRoutes` in
  `routes/index.ts` is a second hand-edited list. The two are not derived from each
  other, which is exactly why Codex exists in one and not the other.
- **The config writers had no abstraction — since fixed; kept here as the
  finding that motivated the fix.** They now sit behind a
  `CliProxyClientConfigurator` contract with one module per client under
  `src/cli/proxy-clients/`, assembled by `registry.ts` (see the section above).
  What follows is what the audit found at the time, which is why the strategies
  still differ per client: Claude and OpenCode do JSON round-trips with an
  inline snapshot key (`__proxy_original_env`, `__proxy_original_neurolink`);
  Codex does regex-driven TOML text manipulation with a marker-delimited block
  **and** a separate sidecar snapshot at
  `~/.neurolink/codex-proxy-snapshot.json`. At the time this was a notable
  departure from the codebase's own stated Factory+Registry convention for
  providers,
  processors, chunkers and rerankers.
- **The SDK seam is untested by this repo's own CLI.** `neurolink proxy` never calls
  `createAllRoutes`; `neurolink server` calls it but never passes any proxy flag
  (`grep -i proxy src/cli/commands/server.ts` → nothing). The `proxy` / `claudeProxy`
  / `openaiProxy` options exist solely for external SDK consumers, and no code in this
  repo exercises them.

**The single highest-leverage refactor was extracting a `ClientConfigurator`
registry** — `{ id, detect(), apply(baseUrl), restore(baseUrl) }` — so the four
duplicated call-site blocks collapse into one loop. **This has since been done**:
the writers live under `src/cli/proxy-clients/` behind
`CliProxyClientConfigurator`, and the call sites are `applyAllClients()` /
`restoreAllClients()`. It turned "eleven edits across one huge file" into "one
new file plus one registry line," and it is what would have prevented both
halves of the OpenCode bug. Do not re-extract it; onboarding a new CLI now
means adding a module and a registry line.

---

## 6. Position: the account namespace is not a prerequisite

The earlier audit's headline recommendation was to generalise the account-key
namespace _before_ CLI #5 and #6. **I disagree, and the code says so.**

### The facts are right

`accountSelection.ts` is 52 lines and entirely Anthropic-shaped —
`LEGACY_ANTHROPIC_ACCOUNT_KEY`, `ENV_ANTHROPIC_ACCOUNT_KEY`,
`normalizeAnthropicAccountKey()`, `anthropicAccountKeysEqual()`, all normalising to an
`anthropic:` prefix. Codex runs a parallel namespace via `CODEX_ACCOUNT_PREFIX =
"codex:"` (`codexAccountUsage.ts:29`). `codexProxyRoutes.ts` imports **nothing** from
`accountSelection.ts` — verified, zero hits. Pooling really is written twice.

### But it does not block a config-writer CLI — at all

Trace an inbound `/v1/chat/completions` request:

- If `ModelRouter` resolves the model to `anthropic`, the handler forwards it by
  loopback to the proxy's **own `/v1/messages`** (`openaiProxyRoutes.ts:396`, bridge at
  `:141-148`). Its comment is explicit: this "reuses the full Claude passthrough path
  (OAuth account rotation, retry, SSE interception, etc.)". The request rides the
  **existing Anthropic pool, unchanged**.
- Otherwise it falls through to the translation engine and
  `ctx.neurolink.stream()` — normal SDK credential resolution, **no account pool
  involved at all**.

Either way, `accountSelection.ts`, `accountCooldown.ts`, `accountQuota.ts` and the
token store are untouched. Reinforcing this: account selection **has no concept of
caller identity**. `clientApp` exists but is telemetry-only. Pooling is scoped by
provider key prefix, never by which CLI called. A new caller is invisible to that
subsystem _by construction_, not by luck.

**So: Copilot CLI, Hermes and a fixed OpenCode need zero namespace work.** Sequencing
a refactor ahead of them would be pure delay.

### And for a CLI that _does_ bring its own pool

Copy the Codex pattern. The repo's own `CLAUDE.md` already prescribes it — "a new
`<provider>OAuth.ts`, a `<provider>AccountUsage.ts` quota parser, and a
`<provider>ProxyRoutes.ts` engine — do not modify the Anthropic hot path" — and the
code supports it cheaply: `accountCooldown.ts` (162 lines) and the storage half of
`accountQuota.ts` (`:500-541`) are already provider-agnostic `Record<string, T>` keyed
by an opaque `accountKey`, with no prefix branching. `tokenStore.listByPrefix()` is
generic. Cost: roughly three new files, ~800–1,000 lines, zero risk to the Anthropic
hot path.

Generalising the namespace _first_ would also mean confronting the migration
`CLAUDE.md` explicitly defers: Anthropic quota is keyed by **bare label** and persisted
that way in every user's `~/.neurolink/account-quotas.json`, so re-keying means either
discarding every stored snapshot or shipping a tolerate-both migration for a release.

**Recommended sequence:**

1. Fix OpenCode (path + boolean return + the doc). Smallest possible change, restores a
   feature users already believe they have.
2. Add Copilot CLI. Env-var only, existing door, no new route module.
3. Add Qwen Code and Hermes. Qwen is the same shape as Copilot (`OPENAI_BASE_URL`,
   existing door). Hermes needs the `isLikelyClaudeClient` branch (§2.2) tested
   deliberately, since it lands on `/v1/messages` without a `claude-cli/` User-Agent.
4. **Then** extract the `ClientConfigurator` registry, with four real implementations
   to generalise from rather than three.
5. Only when a CLI with its own subscription pool arrives, copy the Codex pattern —
   and revisit the namespace only if a _fourth_ pool appears after that.

---

## 7. The observability / routing split

These are independent capabilities with different ceilings, and treating them as one
thing has hidden how cheap the second is.

**Routing tops out at 5–6 of 10.** It depends on vendors shipping base-URL overrides
nobody here controls. Kiro and Antigravity are structurally closed. Cursor looked like
the cleanest win in the matrix and turned out to be dead code.

**Reading each CLI's own local logs reaches 10 of 10.** No auth, no vendor
cooperation, no proxy in the request path. It works for CLIs that can never be routed,
and it recovers months of history the proxy can never see. It is also an independent
source of truth — it would have caught §2.1 immediately.

### Prior art — start with SARA, not PokeTokenBar

**The file-walking layer already exists in TypeScript, one repo over.** SARA
(the `sara` project, a sibling checkout) ships an eight-CLI session reader registry
at `packages/agents/src/sessions/`:

- `registry.ts:171-213` — dedicated lazy-factory readers for Claude, Codex, OpenCode
  and Gemini, registered via `registerReader(id, async () => …)` with dynamic imports —
  the same shape as `providerRegistry.ts`.
- `registry.ts:228` — a generic `ProviderSpec` loop covering Cursor, Amp, Qwen and
  Copilot, with the specs in `jsonlReaders.ts:94-200`.
- Per-CLI on-disk paths already resolved: `~/.cursor/projects/…`,
  `~/.local/share/amp/threads`, `~/.qwen/projects/…`, `~/.copilot/session-state`.
- `registry.ts:252` keeps `const VERIFIED = ["claude", "codex"]` and exposes it as
  `verified` on each descriptor (`:272`) — an honesty marker separating readers
  confirmed against real data from ones written to spec. **Worth copying that idea
  regardless of what else we take.**

**What SARA does not do is extract usage.** Only `claudeReader.ts` touches tokens at
all (18 hits for `token`/`usage`/`cost`; `codexReader.ts`, `geminiReader.ts`,
`opencodeReader.ts` and `jsonlReaders.ts` each have **zero**) — and it does so only to
compute current context-window occupancy, deliberately non-cumulative so it
self-corrects after compaction (`claudeReader.ts:52-69`). The other readers parse
transcript parts and stop.

**So the split is:** take file-walking, path resolution, provider detection and the
registry shape from SARA — same language, already written. Take the _token extraction
and aggregation_ semantics from PokeTokenBar, which is the part SARA lacks and the part
that is actually hard.

The `poketokenbar` project is ~3,600 lines of Swift covering
these ten formats: `LocalUsageReader.swift` (1,264), `LocalUsageCache.swift`
(373), `LocalAdditionalUsageProvider.swift` (1,077),
`LocalAntigravityUsageReader.swift` (542), `LocalUsageProvider.swift` (171).

A TypeScript port is **smaller than a transliteration**, because Node needs neither
Swift's actor/`NSLock` concurrency scaffolding nor `BinaryLocator.swift` (230 lines
that exist only so a Finder-launched `.app` can see shell exports).

Per-format estimates: Claude ~120 lines, Gemini ~80, Hermes ~70, OpenCode ~150,
Grok ~180, Cursor ~180 + ~150 shared incremental-SQLite scaffolding. **Risk
concentrates in two:** Codex (~600 lines — a session-DAG/prefix-match reconciliation
algorithm, not a file parse) and Antigravity (a mini protobuf codec with no schema).
Budget and review those separately from the other eight.

Three things a port must decide up front:

1. **A tri-state cost field.** Claude/Gemini/Grok/OpenCode/Hermes report real or
   well-modelled cost; Cursor/Copilot/Antigravity are flat-rate and report none; Kiro's
   numbers are a _byte heuristic_ and must never be shown with the same confidence.
   This maps onto the existing `jsonRepaired` / `jsonTruncated` "exact or salvaged"
   convention in `CLAUDE.md` rule 3 — reuse it rather than invent one.
2. **Dedup is per-format, not generic.** Claude/Grok/OpenCode use content-hash
   keep-max; Gemini needs last-write-wins because `message_update` records
   intentionally supersede; Cursor/Copilot need SQLite rowid high-water marks _plus_ a
   `didReset` full-rescan fallback for post-`VACUUM`. Codex needs the DAG resolution.
3. **SQLite is a real dependency decision.** Six of ten formats need it. `package.json`
   lists `sqlite3` in `onlyBuiltDependencies` but the lockfile shows it is not actually
   installed — the only SQLite reference is `better-sqlite3` as an _unmet optional_
   peer of `@juspay/hippocampus`. Given this repo's recent CI commits specifically
   about avoiding unnecessary native binaries (`6f839235`, `a3490501`), `node:sqlite`
   (Node 22.5+) deserves serious consideration over a native module.

Only **4 of 10** formats are testable against real data on this machine today: Claude
(16,830 `.jsonl` files), Codex (122 rollouts), Gemini (9 files), OpenCode (a 305 MB
`opencode.db`). PokeTokenBar's own per-format test fixtures are worth reusing for the
other six. Note also that `~/.copilot/session-store.db` on this machine has **no
`assistant_usage_events` table** — PokeTokenBar's Copilot reader targets a schema that
has since changed, so "the file exists" is not evidence a format is portable.

### Where it belongs

**Not on this branch.** `feat/cli-support` is about routing — config writers and route
modules. Local-log reading shares no code with any of it: it never touches
`proxy.ts`, `routes/`, or the account pools, and it is explicitly _not_ a modification
of `accountUsage.ts` (which polls providers' **remote** usage APIs for accounts in
NeuroLink's own pool, covering only Anthropic and Codex).

It should be its own branch and its own subsystem — a new `src/lib/localUsage/` with
one reader per CLI behind a lazy dynamic-import registry mirroring
`providerRegistry.ts`, and types in `src/lib/types/localUsage.ts` per rule 2. One
wrinkle worth designing for early: PokeTokenBar is a long-running menu-bar app, so it
keeps Kiro's and Codex's cross-scan merge state in memory. A CLI invocation has no
equivalent, so that state must be persisted to disk.

---

## 7b. Feasibility, verified live (2026-08-22)

Four rows the audit left unresolved were tested against a real proxy on this
machine rather than reasoned about. The method is the one that refuted Cursor:
start `neurolink proxy start --port 9911`, point the CLI's documented override
at it, run one trivial command, and see whether anything arrives.

| CLI                    | Override                 | Result                                                                          |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| **Gemini CLI** 0.53.0  | `GOOGLE_GEMINI_BASE_URL` | **Honoured — traffic arrives.** Verdict upgraded from assumed to verified.      |
| **Amp** 0.0.1780291930 | `AMP_URL`                | **Honoured — but not a config-writer CLI.**                                     |
| **Hermes Agent**       | —                        | Cannot be verified: not installed, no binary and no config dir on this machine. |
| **Grok CLI**           | —                        | Cannot be verified: not installed; two rival npm packages claim the name.       |

### Gemini CLI — the override is real; the door is what is missing

With `GOOGLE_GEMINI_BASE_URL=http://127.0.0.1:9911` the CLI reached the proxy
and failed with `ModelNotFoundError: 404 Not Found` from
`classifyGoogleError`. That is the correct answer from a proxy with no
`generateContent` route: the redirect worked, and there was nothing to answer
it.

So the remaining work is exactly §4's new-wire-format list and nothing more —
no vendor cooperation is needed, and the override does not have to be
discovered or negotiated. Two operational notes for whoever builds it: the CLI
refuses to run outside a trusted directory (`--skip-trust` or
`GEMINI_CLI_TRUST_WORKSPACE=true` for headless testing), and it issues a
`generateJson` call during startup, so the door has to answer more than just
the user's turn.

### Amp — override honoured, but it brings its own front door

`AMP_URL` is genuinely live, unlike Cursor's inert variables: pointed at the
proxy, Amp built its login URL against it —
`http://127.0.0.1:9911/auth/cli-login?authToken=…` — and waited for a code.

That is also the finding. Amp does not authenticate with a bearer token the way
the five live CLIs do; it expects an OAuth-style CLI login flow at its own
endpoint before any API traffic. Onboarding it therefore means implementing
Amp's auth surface, not writing a config file, which puts it in the
new-wire-format class with Gemini rather than the config-writer class. Its
bundle vendors Google's GenAI SDK, so `generateContent` strings inside it
describe a dependency and not Amp's own wire — worth knowing before someone
greps for them and concludes otherwise.

### Hermes and Grok — unverifiable here, and that is the finding

Neither is installed: no binary on `PATH`, no `~/.hermes` or `~/.config/hermes`,
nothing under any package root. The audit's "easy (unverified on disk)" verdict
for Hermes remains exactly that — it was never validated, and the
`ANTHROPIC_BASE_URL` claim comes from documentation rather than from a bundle.

Recording this rather than leaving the rows ambiguous: the blocker is
availability, not difficulty, and the first step for either is installing it —
not writing a configurator against a guessed config surface.

---

## 8. Defects

Eleven filed on `juspay/neurolink`. Eight are fixed and released (v11.13.0 and
v11.14.0, via #1399-#1402); three remain open.

| #   | Defect                                                                                      | Location                                     | Issue                                                    | Status                                |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------- | ------------------------------------- |
| 1a  | OpenCode writer targets a path OpenCode never reads on macOS                                | `proxy.ts:711-720`                           | [#1366](https://github.com/juspay/neurolink/issues/1366) | **fixed**                             |
| 1b  | `✓ Auto-configured OpenCode` prints unconditionally — survives 1a's fix                     | `proxy.ts:734`, `:3491`, `:5403`             | [#1367](https://github.com/juspay/neurolink/issues/1367) | **fixed**                             |
| 1c  | The same wrong path is asserted in our own docs, which contradict themselves                | `opencode-proxy-support.md:67` vs `:313-323` | [#1366](https://github.com/juspay/neurolink/issues/1366) | **fixed**                             |
| 1d  | Zero test coverage for the writers; §11's playbook uses `--dev`, which skips them           | `test/`                                      | [#1368](https://github.com/juspay/neurolink/issues/1368) | **fixed** — all three writers covered |
| 2a  | Codex engine has no token/cost accounting at all — never parses `usage`                     | `codexProxyRoutes.ts:322-339`                | [#1369](https://github.com/juspay/neurolink/issues/1369) | **fixed**                             |
| 2b  | Provider hard-coded `"anthropic"` at four sites                                             | `proxyTracer.ts:497`, `:826`, `:874`, `:883` | [#1370](https://github.com/juspay/neurolink/issues/1370) | **fixed**                             |
| 2c  | Cost computed against the _requested_ model, not the served one                             | `proxyTracer.ts:248`                         | [#1370](https://github.com/juspay/neurolink/issues/1370) | **fixed**                             |
| 3   | `proxyAnalysis.ts` aggregates no `outputTokens` and no cost                                 | `proxyAnalysis.ts:437-527`                   | [#1371](https://github.com/juspay/neurolink/issues/1371) | **fixed**                             |
| 4   | SDK server-adapter docs omit all three proxy factories and the `proxy` flags                | `api-reference.md:657-686`                   | [#1372](https://github.com/juspay/neurolink/issues/1372) | **docs written**, issue still open    |
| 5   | Codex CLI model discovery 404s — proxy has `/responses` but not `/backend-api/codex/models` | `codexProxyRoutes.ts:615`                    | [#1383](https://github.com/juspay/neurolink/issues/1383) | open                                  |
| 6   | Client config writers: no locking or atomic writes between apply and restore                | `src/cli/proxy-clients/`                     | [#1384](https://github.com/juspay/neurolink/issues/1384) | open                                  |

**Security note, not a defect:** the proxy takes no inbound authentication on any door.
That is defensible at the `127.0.0.1` default, but `--host` accepts `0.0.0.0`, which
would expose pooled OAuth subscription tokens to the network. Any new writer must not
assume an auth layer exists.

---

## 9. Repo conventions this work must follow

- **`CLAUDE.md` rules 2, 7–15 are ESLint-enforced.** Most relevant here: types go in
  `src/lib/types/` only (rule 2); `type`, never `interface` (rule 7); barrel-only
  internal type imports (rule 13); no double assertions (rule 14).
- **Rule 15 — tests are end-to-end only.** Import from `dist/index.js`, or drive
  `node dist/cli/index.js`. Never mix `dist` and `src` in one suite. Both
  `test/continuous-test-suite-proxy.ts` and `-codex.ts` are on the `e2e-tests-only`
  `allow` list in `eslint.config.js:262-291` with written justifications, and the codex
  suite deliberately keeps its last two cases driving the built CLI. A new proxy suite
  should follow that shape, and adding to the allow list is a review decision.
- **Keep payloads out of assertion messages.** `defineSuite` downgrades a failure to
  SKIP when the message matches `isExpectedProviderError()`, so quoting a payload
  containing `502` or `ECONNREFUSED` turns a real failure green. Sanity-check any new
  suite by breaking one assertion on purpose.
- **CI has six jobs, not two.** `CLAUDE.md`'s note is incomplete: alongside `test` and
  `provider-safety-net` there are `build-check`, **`proxy-performance`** ("Proxy
  Performance Gates", runs `pnpm run proxy:performance` against `proxyLifecycle.ts` /
  `proxyActivity.ts`), `quality-gate` (validate, commit-message validation,
  `tsc --noEmit --strict`) and `semantic-release-validation`. `provider-safety-net` also
  runs a third suite the pre-push hook does not — `test:error-classifier-contract`.
  **A new proxy engine can trip `proxy-performance`.**
- **Docs PRs are gated.** `docs-pr-validation.yml` triggers on `docs/**` and runs a
  Docusaurus typecheck and build **without** `continue-on-error`. Frontmatter and link
  checks are soft.
- **Decide the orphaning question deliberately.** `codex-proxy-support.md` and
  `opencode-proxy-support.md` have no frontmatter, are absent from
  `docs-site/scripts/sync-docs.ts`, and are unlinked from `docs/features/index.md`.
  Following that precedent exactly means a new doc is not published and not
  discoverable. This document follows the precedent; that should be revisited.
- **Branch naming: no ticket numbers here.** The global `<type>/BZ-<n>-<desc>`
  convention is Juspay-internal Bitbucket. This OSS repo uses plain
  `<type>/<kebab-description>` — `feat/cli-support`, `fix/adjust-body-after-400`.
  Conventional commits; never commit directly to `release`.
- **⚠️ `docs/development/contributing.md` is stale** — it teaches `interface` types
  (`:161`) and vitest `describe/it` (`:169-172`), both of which contradict enforced
  rules 7 and 15. Do not cite it as authoritative.

---

## Appendix: verification method

Eight independent auditors, one per claim cluster, each required to cite `file:line`
actually read and to report corrections rather than agree. Findings that could be
checked against this machine were checked against installed binaries and live config,
not documentation — including a live `cursor-agent` run that confirmed its env vars are
inert, and a `opencode models` run that confirmed which config file is really loaded.

Claims that did not survive are listed in §2 rather than quietly dropped.

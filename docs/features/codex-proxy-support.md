# Codex (ChatGPT) Support for NeuroLink Proxy

## Status: Implemented — request path verified, quota path unverified

Codex is supported as a **second subscription pool engine** alongside Claude. The proxy pools multiple ChatGPT accounts and rotates between them automatically, so you never have to switch accounts by hand when one hits its limit.

Verified end-to-end against Codex CLI 0.144.4: a pooled request through the proxy authenticates with a pooled account, passes OpenAI's anti-abuse checks, and streams a live SSE response back from the ChatGPT backend.

---

## 1. Overview

Codex signs in with a ChatGPT account over OAuth and talks to the **ChatGPT backend Responses API** at `https://chatgpt.com/backend-api/codex/responses` — not the standard `api.openai.com` platform API, and not chat-completions.

The proxy exposes that same endpoint locally:

```
POST http://127.0.0.1:<port>/backend-api/codex/responses
```

Point the Codex CLI at it and the proxy takes over account selection:

```
Codex CLI  →  proxy /backend-api/codex/responses
                 ├─ strips the client's own OAuth token
                 ├─ picks a pooled `codex:*` account (fill-first, quota-aware)
                 ├─ attaches that account's Bearer + matching chatgpt-account-id
                 ├─ forwards to chatgpt.com/backend-api/codex
                 └─ relays the SSE stream back unchanged
```

On a 429 the proxy rotates accounts. An explicitly exhausted session or weekly
window cools until its reset. A structured `usage_limit_reached` response is
classified as quota exhaustion even without quota headers. Its reported reset
and scope are retained in attempt telemetry. When the scope is unknown or
model-specific, the account cooldown is bounded to 15 minutes; the proxy does
not infer an account-wide multi-day limit from a reset timestamp alone.

Missing utilization is `unknown`, not zero usage or permission to send. Unknown
windows remain eligible for probing, but do not advertise remaining percentages.
Numeric quota fields retain their legacy shape; consumers must check the window
status before interpreting those fields. Header snapshots identify their source
as `headers`, and explicit usage refreshes use `usage-api`.

### Usage accounting

Native Codex input includes cached input, and output includes reasoning tokens.
Final OTel records mark native usage with `inputIncludesCachedTokens: true` and
retain the reasoning breakdown only when the provider reports it. Totals and
cost estimates count these subsets once. Dollar values are API-price estimates,
not a measurement of ChatGPT subscription credits or remaining allowance.
Custom span fields use disjoint buckets: `ai.tokens.input` excludes cache reads
and writes, which have separate attributes. The standard
`gen_ai.usage.input_tokens` includes both cache buckets. Reasoning remains a
breakdown of output and is not added to the total again.
The offline `proxy analyze` report also uses disjoint buckets:
`cache.inputTokens` excludes its separate `cacheReadTokens` and
`cacheCreationTokens` columns, so their sum with output matches total usage.

The Claude fallback translates input into Claude's separate uncached-input and
cache buckets, for both JSON and streaming responses. Its final record identifies
the upstream model in `model`, the client alias in `requestedModel`, and disjoint
usage with `inputIncludesCachedTokens: false`. Native Codex SSE bytes remain
unchanged. The offline analyzer also recognizes legacy native Codex paths when
the accounting marker is absent.

---

## 2. Adding accounts

Codex login works by **importing the credential the Codex CLI already holds**. Log into Codex normally, then import:

```bash
codex login                                  # sign in as account A
neurolink auth login codex --label work      # import it into the pool

codex login                                  # sign in as account B
neurolink auth login codex --label personal  # import that one too
```

Each import reads `~/.codex/auth.json`, decodes the account id / plan / email from the token, and stores it under a `codex:<label>` key in `~/.neurolink/tokens.json`. If you omit `--label`, the account email is used.

List the pool (Codex and Anthropic accounts appear together):

```bash
neurolink auth list
neurolink auth list --refresh    # also fetch fresh usage windows
```

Remove Codex accounts:

```bash
neurolink auth logout codex
```

> Only ChatGPT subscription login (`auth_mode: "chatgpt"`) can be pooled. An API-key Codex install is rejected with a clear message.

---

## 3. Client auto-configuration

When `neurolink proxy start` runs (non-dev), it configures the Codex CLI the same way it configures Claude Code and OpenCode. It appends a marker-delimited block to `~/.codex/config.toml`:

```toml
model_provider = "neurolink"

# >>> neurolink-proxy (managed) >>>
[model_providers.neurolink]
name = "NeuroLink Proxy"
base_url = "http://127.0.0.1:55669/backend-api/codex"
wire_api = "responses"
requires_openai_auth = true
# <<< neurolink-proxy (managed) <<<
```

Your original `model_provider` value is snapshotted to `~/.neurolink/codex-proxy-snapshot.json` and restored on shutdown, so the edit is fully reversible even if the proxy crashes. The managed block is delimited by markers and removed cleanly on clear. If `~/.codex/config.toml` doesn't exist, the step is skipped silently.

Restart Codex after starting the proxy for it to pick up the new provider.

---

## 4. Quota and routing

Codex reports two rate-limit windows — **primary** (short) and **secondary** (weekly) — which map onto the shared `AccountQuota` model as the session and weekly fields respectively. That means Codex reuses the existing cooldown, persistence, and display code rather than duplicating it.

Account ordering is fill-first and quota-aware:

1. Accounts on cooldown sort last.
2. Within the same cooldown state, accounts with a rejected unified quota sort after accounts without known rejection, even when their session usage is low or unknown.
3. Within each group, accounts with **no session quota measurement sort first** — they get probed so they become comparable, rather than being starved.
4. Otherwise, least session utilization first. Rejected accounts remain eligible after preferred accounts so stale rejection evidence cannot permanently prevent a recovery probe.

Cooldown reasons map to the shared vocabulary: a rejected weekly window cools until its real reset (`weekly`), a rejected primary window until its reset (`session`), and a plain burst limit gets a bounded `transient` cooldown (60 s floor, 15 min ceiling).

Quota and cooldown state are keyed by the **full `codex:` account key**, so a Codex account and an Anthropic account that share a bare label never collide.

---

## 5. Response headers

A response served by the Codex pool carries these attribution headers. A
response served by the [outbound fallback](#9-outbound-fallback-codex-request--claude-engine)
carries only `x-neurolink-served-by`: the account, attempt and quota headers
describe a Codex account, and none served that turn.

| Header                               | Meaning                                                                                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x-neurolink-account`                | Which pooled account served the request                                                                                                                                            |
| `x-neurolink-account-type`           | Always `codex-oauth`                                                                                                                                                               |
| `x-neurolink-served-by`              | `codex`, or `codex-outbound-fallback:anthropic` / `codex-outbound-fallback:vertex` when the [outbound fallback](#9-outbound-fallback-codex-request--claude-engine) served the turn |
| `x-neurolink-attempt`                | Which attempt succeeded (1 = first account tried)                                                                                                                                  |
| `x-neurolink-quota-source`           | `live` when the backend reported quota, else `none`                                                                                                                                |
| `x-neurolink-quota-session-left-pct` | Remaining primary-window headroom                                                                                                                                                  |
| `x-neurolink-quota-weekly-left-pct`  | Canonical remaining secondary-window headroom                                                                                                                                      |
| `x-neurolink-weekly-left-pct`        | Compatibility alias for the canonical weekly header                                                                                                                                |

---

## 6. Error handling

| Condition                    | Behaviour                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No Codex accounts configured | `401` with a message pointing at `neurolink auth login codex`                                                                                                                    |
| All accounts cooling         | Terminal `response.failed` SSE event (200, `retry-after` computed from the soonest recovery) instead of a bare `429`, so the CLI shows a real error instead of "Reconnecting..." |
| All accounts auth-cooling    | The same terminal event with code `server_error` instead of `insufficient_quota` (every account is parked by an auth failure), so it is not reported as spent quota              |
| `401` / `403` from upstream  | One forced token refresh, then rotate; a failed refresh disables the account until re-login                                                                                      |
| `429`                        | Cool the account per its reported window, then rotate                                                                                                                            |
| `5xx` / network              | Rotate to the next account                                                                                                                                                       |

Access tokens are refreshed proactively when within 5 minutes of expiry, and the rotated refresh token is written back to the store.

---

## 7. Implementation map

| File                                        | Role                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/lib/types/codex.ts`                    | Codex auth-file, token, and rate-limit types                                              |
| `src/lib/auth/codexOAuth.ts`                | Endpoints/constants, `auth.json` import, token refresh, JWT decode, account-id resolution |
| `src/lib/proxy/codexAccountUsage.ts`        | Account enumeration, usage fetch, quota normalisation, header parsing                     |
| `src/lib/server/routes/codexProxyRoutes.ts` | The pool engine: load → order → forward → rotate                                          |
| `src/cli/commands/auth.ts`                  | `auth login codex`, Codex rows in `auth list --refresh`                                   |
| `src/cli/commands/proxy.ts`                 | Route registration, `/backend-api/*` request tracking, `~/.codex/config.toml` management  |

The Anthropic engine in `claudeProxyRoutes.ts` is untouched. The Codex engine is deliberately leaner: it does pre-commit rotation but not the full transient-retry-budget or admission-lease machinery.

---

## 8. Caveats

- **Model ids matter.** The ChatGPT backend rejects models that aren't available to Codex-with-a-ChatGPT-account (e.g. `gpt-5-codex` returns a 400). Use the model your Codex config already uses.
- **Terms of service.** Pooling multiple personal ChatGPT subscriptions through one client fingerprint is the kind of pattern subscription anti-abuse systems are built to detect. The `originator`, `installation_id`, user-agent, and turn-metadata headers are all correlatable. Pooling your own accounts is materially different from sharing across people — weigh the account-ban risk accordingly.
- **Native browser login is not implemented.** The verified path is importing an existing `codex login` credential. The OAuth constants (authorize URL, PKCE, scopes) are present in `codexOAuth.ts` for a future native flow.
- **Quota-aware ordering is unverified against the live backend.** The usage endpoint and the rate-limit header shape were reconstructed from a capture, not confirmed end to end. If either is wrong, `fetchCodexAccountUsage` returns no quota, `x-neurolink-quota-source` reads `none`, and ordering degenerates to insertion order while every 429 falls back to the 15-minute transient cooldown. Rotation still works; it is simply not quota-aware. Verify with `neurolink auth list --refresh` — a `codex usage …` error line per account means the quota path is not live.
- **SSE usage-limit signals are not acted on.** Only an HTTP 429 triggers a cooldown and rotation. A `200` response whose SSE stream carries `usage_limit_reached` (or the workspace-credit variants) is relayed to the client untouched, so the account is neither cooled nor rotated away from. HTTP-level exhaustion is handled; in-stream exhaustion is not.
- **Client fingerprint is forwarded verbatim.** The proxy replaces the caller's credentials but does not regenerate `originator`, `installation_id`, `session-id`, or turn metadata per account, so every pooled account shares the client's fingerprint. This is what makes the terms-of-service point above concrete.

## Model discovery

The Codex CLI refreshes its model list on every invocation:

```
GET /backend-api/codex/models?client_version=<cli-version>
```

The proxy relays that upstream to `chatgpt.com/backend-api/codex/models` using a
pooled account, forwarding the CLI's own query parameters.

**It relays rather than synthesises**, unlike the Claude and OpenAI `/v1/models`
routes, which build their lists locally from the model router. Which Codex
models an account can reach is a property of that account — plan tier, rollout
state — not something this proxy knows, so a locally-built list would be a guess
that reads as authoritative.

Two details matter to anyone touching it:

- **`client_version` is required upstream.** Omit it and ChatGPT answers `400`
  with a pydantic `Field required` on `('query', 'client_version')`. The query
  is rebuilt from `ctx.query`; `ctx.path` carries no query string, and reading it
  from there drops the parameter silently.
- **Discovery is side-effect free.** No cooldown is recorded and no quota is
  consumed, so the once-per-invocation refresh cannot influence routing for real
  traffic. A cooling account is still allowed to answer it — being rate-limited
  for completions does not make an account unable to say which models exist.

Before this route existed the request 404'd, and the CLI printed
`failed to refresh available models: unexpected status 404 Not Found` on every
run before silently falling back to a default model — quietly ignoring the model
the user had configured.

---

## 9. Outbound fallback (Codex request → Claude engine)

### Status: implemented, default OFF, request-shape verified only — see "Live validation" below

Sections 1-8 above cover the **inbound** direction: a Codex CLI request served
by the Codex/ChatGPT pool engine. This section covers the opposite direction —
a native Codex `/backend-api/codex/responses` request that, when every Codex
account is exhausted or otherwise ineligible, is **translated** into an
Anthropic Messages request and served by either the Anthropic OAuth pool (via
an in-process loopback, no extra network hop to this same proxy) or a
Vertex-Claude passthrough account, then translated back into the Codex
Responses wire shape the CLI expects. It is a third direction alongside the
two-engine matrix in the rest of this document, not a replacement for either.

### 9.1 Enabling it

The kill switch defaults to **off**. Nothing changes for an existing Codex
pool setup until you opt in:

```yaml
# proxy-config.yaml
routing:
  codex-outbound-fallback-enabled: true
  # Ordered list of engines to try once Codex itself is exhausted; the first
  # entry with a healthy pooled account wins. At most 8 entries.
  codex-outbound-fallback-targets:
    - provider: anthropic
      model: claude-sonnet-4-5
    - provider: vertex
      model: claude-sonnet-4-5
  # Optional: remap a Codex-side model id to a different target-side model id
  # per target provider (falls back to the target's own `model` above when a
  # request's model has no matching entry).
  codex-outbound-fallback-model-mappings:
    - from: gpt-5-codex
      to: claude-opus-4-1
      provider: anthropic
```

or via environment variable, which overrides the YAML key:

```bash
NEUROLINK_PROXY_CODEX_OUTBOUND_FALLBACK=true
```

`codex-outbound-fallback-targets` is required (non-empty) for the fallback to
ever fire — the kill switch alone is not enough. `provider` must be `anthropic`
or `vertex`; up to 8 targets are accepted and validated at config-load time.
With the flag off, or with no targets configured, an exhausted Codex request
behaves exactly as it did before this feature existed: the same terminal
`response.failed` SSE / `401` behaviour documented in section 6 above, byte-
for-byte.

**The `anthropic` target needs the CLI proxy's in-process loopback.** Dispatch
to an `anthropic` target goes through an in-process loopback
(`127.0.0.1:<loopbackPort>` plus an unforgeable `internalDispatch` marker, see
§9.3) rather than a second network hop, and only `neurolink proxy start` (the
CLI proxy command) wires that loopback through today. `createAllRoutes` /
`registerAllRoutes` — the generic SDK route surface in
`src/lib/server/routes/index.ts`, used when embedding the proxy routes in your
own server — does **not** thread `loopbackPort`/`internalDispatch` into
`createCodexProxyRoutes`, so enabling this feature there with an `anthropic`
target configured cannot actually dispatch: route creation logs one warning
and every such request falls through to the normal Codex-exhaustion behaviour
in section 6, indistinguishable on the wire from the feature being off. A
`vertex` target has no such gap — it dispatches over `executeVertexAnthropicFallback`
regardless of which route surface created the routes. If you need the
`anthropic` target from the SDK route surface, run the CLI proxy alongside
your server, or wait for `loopbackPort`/`internalDispatch` to be threaded
through `CreateRoutesOptions` (not yet implemented — see the doc comments on
`createAllRoutes` and `CreateRoutesOptions.runtimeConfigProvider`).

### 9.2 When it triggers

`attemptCodexOutboundFallback` (module-private in `codexProxyRoutes.ts`) is
consulted only after every Codex account has been tried and failed, and only
when all of the following hold, in this order — any one failing gate means
"not attempted", and the request falls through to the normal Codex-exhaustion
behaviour in section 6:

1. The inbound request is not itself already a fallback leg (see loop
   prevention below).
2. `runtimeConfigProvider` is configured (the proxy is running with the
   runtime-config feature enabled at all).
3. `classifyCodexOutboundFailure` judges the failure itself eligible — a total
   function, not a heuristic guess, over the terminal Codex failure class.
4. The kill switch (`codexOutboundFallbackEnabled`) is on.
5. `codexOutboundFallbackTargets` is non-empty.
6. The native Codex request body parses (`parseCodexNativeRequest`) — a
   request the translator cannot even parse is never a candidate.

When the account loop runs out, the last attempt decides eligibility. A
401/403 across the whole pool is a Codex credential failure and falls back, as
do 429 and 5xx. A content-policy or invalid-request error code
(`classifyProxyFailureCode`), or any other 4xx, rejects the request itself and
is returned unchanged.

The Anthropic loopback has a 5-minute timeout that covers the connection until
its response headers arrive. After that the stream runs as long as the turn
does; a client disconnect still ends it.

### 9.3 Loop prevention

Two independent guards, so a defect in one does not remove the bound:

- **Marker guard.** The moment every gate above has passed and a real
  dispatch attempt is about to begin, `codexProxyRoutes.ts` sets
  `ctx.metadata["neurolink.codexOutboundFallbackAttempted"] = true` on the
  request context. Gate 1 above checks this same key, so a request that has
  already crossed engines once can never be offered a second outbound-fallback
  attempt within the same client request. This is a single flag, not a
  per-target counter, because at most one crossing is ever allowed regardless
  of how many of the internal dispatch call sites reach this function.
- **Depth counter (defense-in-depth).** `ctx.metadata["neurolink.fallbackHopDepth"]`
  is incremented on every engine crossing (never on a same-engine account
  rotation) and checked against `MAX_ENGINE_CROSSINGS = 1`, independent of the
  marker check above. The invariant this enforces: the ordered sequence of
  engines serving any one client request has length ≤ 2 with no repeat — only
  `[codex]`, `[anthropic]`, `[codex,anthropic]`, `[anthropic,codex]` are
  possible. A leg that is itself already an inner fallback of the other engine
  can never itself fall outbound again.

A request that reaches this point already carrying a forged
`codexOutboundFallbackAttempted`-shaped marker from outside is not trusted —
the key lives on the server-side request context (`ctx.metadata`), not on
anything the client can set on the wire, so there is no client-controlled way
to spoof past gate 1.

### 9.4 What gets translated

Request translation (`src/lib/proxy/codexOutboundFallback.ts`):

- Codex `additional_tools` namespaces (`functions`, `collaboration`, …) are
  flattened into one Claude `tools` array, preserving declaration order —
  namespace order, then tool order within each namespace — never regrouped or
  resorted by tool kind.
- A tool's kind (`function` vs `custom`) is read from the tool declaration's
  own `type` field, never inferred from which namespace it was declared under.
- Function-tool JSON Schemas are dereferenced with `inlineJsonSchema`: plain,
  resolvable `$ref`/`$defs` (draft-07 `definitions` and 2020-12 `$defs`) are
  flattened into the inline schema and the pointer keys stripped entirely.
  A genuinely circular `$ref` degrades to `{type: "object"}` and is counted
  under the `circular_ref_flattened` degrade reason (see metrics below); a
  plain non-circular `$ref` is not.
- Grammar/custom tools (Lark grammar, regex format) have no JSON Schema
  equivalent, so they are wrapped as a single `{input: string}` parameter, with
  the response mapped back to a `custom_tool_call` item. This is lossy and
  explicitly flagged in code, and is the shipped behavior — see "Sign-off
  status" below.
- Reasoning effort (`minimal`/`low`/`medium`/`high`/`xhigh`/`max` on the Codex
  side) maps to an Anthropic thinking budget via `mapCodexReasoningToThinking`:
  low→4096, medium→8192, high→16384, xhigh→24576, max→32768, clamped to
  `[1024, max_tokens - 1024]`. Thinking is left off when `tool_choice` is
  forced, or when the immediately preceding assistant turn called a tool.
- A non-object `function_call_output`/`custom_tool_call_output` argument falls
  back to `{input: raw}` in the translated history rather than failing the
  translation.

Response translation (`codexResponsesFormat.ts` / `codexToAnthropicFallback.ts`)
converts the Claude response — including SSE streaming — back into the Codex
Responses wire shape the CLI expects, so a client cannot tell, from the wire
alone, that its request was served by a different engine underneath.

### 9.5 Accounting

A translated request is billed and recorded exactly like any other proxied
request on the serving engine — the same OTel usage record, cache/reasoning
buckets, and cost estimate described in [Usage accounting](#usage-accounting)
(section 1) apply, attributed to the Anthropic or Vertex account that actually
served it, not to a Codex account. There is no separate "fallback" ledger; look
at the served-by account's own usage.

The Codex route's final record names what served the turn: `provider`,
`model`, `account` and `accountType` are the Claude target's, and
`requestedModel` stays the Codex model the client asked for. With the Anthropic
target, the loopback's own `/v1/messages` record owns the usage, and the Codex
record points to it through `usageOwnerRequestId`, so the call is counted once.
With Vertex there is no child record, so the Codex record carries the usage and
is priced from the Vertex table.

The translated request marks its stable prefix with a 1-hour cache TTL. 1-hour
writes (`usage.cache_creation.ephemeral_1h_input_tokens`) are recorded as
`cacheCreation1hTokens`, a subset of the cache-write total, and priced at 2x
base input, Anthropic's 1-hour rate on every Claude model. The rest of the
cache writes keep the 5-minute rate (1.25x).

The token/cost metrics carry an `origin` attribute (`ProxyRequestOrigin`:
`"native" | "codex-fallback"`), but **only when it is not `"native"`** — a
plain Codex or Claude request emits the exact same label set it always has,
with no `origin` key at all, so existing dashboards and alerts over these
metrics are unaffected. Only a request actually served by this outbound-fallback
path carries `origin="codex-fallback"`, set via
`tracer.setRequestOrigin("codex-fallback")` once a target has been dispatched
and will serve the turn (both the Anthropic-loopback and Vertex targets); a
request whose every target fails keeps `"native"`. A Codex-outbound request served by
a Vertex target is attributed as account `vertex/<model>`, accountType
`"vertex"` — the same shape the native Claude-to-Vertex fallback leg already
reports, not a synthetic "codex" sentinel.

### 9.6 Metrics

Two Codex-outbound-specific OTel counters, both emitted from
`src/lib/proxy/proxyTracer.ts`:

| Metric                                         | Labels               | Meaning                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `proxy_codex_outbound_schema_degraded_total`   | `{reason, toolName}` | A tool declaration's JSON Schema needed flattening or lost a feature on the way to a Claude tool. `reason` is one of `circular_ref_flattened` (a genuine cycle degraded to `{type:"object"}`) or `strict_mode_flag_dropped` (the Codex tool's `strict` flag has no Claude equivalent and was dropped). |
| `proxy_codex_outbound_unsupported_field_total` | `{field}`            | A Codex-outbound request field this repo cannot faithfully represent in the Claude request was dropped rather than failing the translation.                                                                                                                                                            |

Every other proxy metric in the existing dashboard (`proxy_request_duration_ms`,
`proxy_tokens_*`, `proxy_errors_total`, `proxy_fallback_attempts_total`,
`proxy_fallback_success_total`, `proxy_fallback_failure_total`, …) also fires
for a Codex-outbound-fallback request, on the serving engine, same as any other
proxied call.

**`proxy_cost_usd_total` is a cumulative counter, not a gauge.** Like every
other `*_total` metric here, it is an OTel `Counter` — it only ever increases
for the life of the process, and its value at any instant is the running sum
since proxy start, not "cost since the last scrape" or "cost of the last
request." Reading it as a point-in-time cost, or diffing two absolute reads
without accounting for a process restart (which resets it to zero), produces a
meaningless number. Compute a rate or a delta over the scrape interval when
building a dashboard against it, and treat a lower absolute value after a
restart as expected, not as a data-loss bug.

### 9.7 Sign-off status

The following were flagged in the original design as behavior-changing choices
needing product sign-off. All three were **signed off 2026-09-28** and ship as
designed, not as placeholders awaiting approval:

- The lossy grammar/custom-tool → single `{input: string}` parameter mapping
  (§9.4 above), with `custom_tool_call` on the way back.
- The `{input: raw}` non-JSON-argument history fallback and its downstream
  effect on tool execution.
- The reasoning-effort → thinking-budget table in §9.4 above.

See `docs/superpowers/specs/2026-09-27-codex-outbound-fallback-design.md` for
the full design record and rulings.

### 9.8 Live validation (after the Codex quota resets 2026-10-03)

Everything above has been verified at the request/response **shape** level —
translation correctness, config validation, metrics, loop-prevention logic —
using synthetic and characterization fixtures (including a redacted real Codex
CLI wire capture). None of it has been exercised against **live** Codex, Vertex
or Anthropic traffic end to end, because the Codex account available to this
work is quota-rejected until 2026-10-03. The validation plan's Part B live
matrix (`stage-d-validation.md` §4) is the run to do once quota is back; its
scenarios, unchanged from the plan:

- [ ] **B1 — Cold start, single turn** (`gpt-5.6-sol` → Anthropic): if the
      Section-0 tool policy permits dispatch, `proxy_tokens_input` rises by
      roughly the translated prefix token count and `proxy_tokens_cache_creation`
      rises above 0; if the policy is fail-closed, a Codex-shaped diagnostic
      with no dispatch attempted is the correct, expected outcome — not a bug.
- [ ] **B2 — Warm second turn, same session/account** (`gpt-5.6-sol` →
      Anthropic): confirm both turns were served by the same account (query
      `proxy_cost_usd_total`'s `account` label) before drawing any cache
      conclusion, then confirm `proxy_tokens_cache_read` rises by ≥80% of the
      prior turn's `cache_creation` delta with the second turn's own
      `cache_creation` delta near zero — the live proof that A.6's byte-
      stability requirement (already fixture-verified offline) holds against
      a real cache hop.
- [ ] **B3 — Functions-namespace tool call** (`gpt-6-astra` → Anthropic):
      `read_file` alongside the ever-present `exec`/`request_review`
      collaboration tools; the client-visible stream carries a well-formed
      `function_call` the Codex CLI can execute, `proxy_fallback_success_total{provider='anthropic'}`
      increments by exactly 1, and there is no Anthropic 400 on the
      accompanying custom-tool schema.
- [ ] **B4 — Parallel tool calls** (`gpt-6-astra` → Anthropic): both
      `function_call` items carry distinct `toolu_`-derived `call_id`s, and
      the real Codex CLI's next-turn `function_call_output` pair is accepted
      with no 400 — the live proof of the tool-id passthrough choice, and the
      check that would settle the design doc's `call_id` UNRESOLVED item.
- [ ] **B5 — 6+ turn conversation crossing a fallback boundary mid-thread**
      (`gpt-5.6-terra` → Vertex): pre-boundary turns carry an Anthropic OAuth
      account, post-boundary turns a `vertex/<model>` account shape, no
      protocol error at the boundary turn.
- [ ] **B6 — Forced quota rejection** (`gpt-5.6-sol` → Anthropic):
      `proxy_fallback_attempts_total{provider='anthropic'}` increments; either
      success on the next leg, or a client-visible 429 that is still
      Codex-shaped, never a raw Anthropic error passed through.
- [ ] **B7a/B7b — Mid-stream failure before/after first byte**
      (`gpt-5.6-terra` → Anthropic): B7a expects a clean fallback with no
      visible interruption; B7b expects the stream to terminate with an
      in-band Codex-shaped terminal frame, never a second provider's bytes
      appended to the same stream — the live proof of the commitment/loop-
      prevention rule (A.9/A.10).

Also unresolved and needing this same live run to close (design doc §10,
carried in `stage-d-validation.md` §6):

- [ ] **UNRESOLVED-1 — reasoning wire shape**: the exact Codex Responses wire
      shape for a reasoning output item is not established anywhere in this
      repo's types, fixtures, or the redacted reference sample; settle it with
      a live capture of a real `reasoning.effort` turn (part of B1-B4 above).
- [ ] **UNRESOLVED-2 — `call_id` server-side validation**: whether the real
      ChatGPT Codex backend validates `function_call.call_id` format
      server-side; the check that settles it is B4 above.
- [ ] **UNRESOLVED-3 — §0 policy fail-closed vs. lossy**: whether the chosen
      `additional_tools.collaboration` policy is fail-closed or lossy in
      practice against a live backend — every one of B1-B7b inherently
      exercises this, since `exec` rides along on every real Codex request
      regardless of what the operator typed; a fail-closed observation on all
      seven is a valid, expected outcome under that policy, not a failure.

Once Part B runs, Part C (`stage-d-validation.md` §5) — the red-green defect
injection matrix — should also be run once, live, in addition to the offline
runs already exercised by this stage's test suites, to confirm rows 5-8
(trigger-policy totality, loop prevention, commitment rule, and the
`additional_tools.collaboration` mishandling case) fail the way the table
predicts against a real backend, not only against fixtures.

Until these run, treat the outbound-fallback feature as shape-verified and
unit/characterization-tested, not production-validated — which is also why the
kill switch defaults to off.

# Codex Outbound Fallback — Design

> Status: design complete; implementation shipped on `feat/codex-outbound-fallback-rollout`
> in four staged local commits (build order PRs 1-8, landed as one branch rather than eight
> separate PRs — see the branch's own commit history for the stage-by-stage breakdown: cache
> and request/response codecs, config + kill switch, trigger policy + route wiring + loop
> prevention + accounting, then this stage's test-matrix closure and docs). The feature ships
> **OFF by default**, gated end-to-end by `routing.codex-outbound-fallback-enabled` /
> `NEUROLINK_PROXY_CODEX_OUTBOUND_FALLBACK`; turning it on for the live proxy is a separate,
> operator-approved config change, not part of this work. All three items previously flagged
> "needs product sign-off" below (grammar/custom-tool wrapping, the `{input: raw}` history
> fallback, and the reasoning-effort-to-thinking-budget table) were signed off 2026-09-28 and
> are shipped as designed. Live validation against real Codex traffic is blocked on account
> quota until 2026-10-03 and is tracked separately (see the "Live validation" checklist in
> `docs/features/codex-proxy-support.md`). Produced by 22 parallel agents
> (6 grounding, 8 design, 8 adversarial review) plus 8 resolution passes; every design
> claim below was checked against the code by a reviewer whose brief was to refute it.

## Goal

A native Codex client request that its own account pool cannot serve currently fails to the
client. This design gives the Codex engine an outbound fallback chain to the Anthropic OAuth
pool and to Vertex, so the request is served instead — with prompt caching preserved across
the hop, tool calls translated faithfully in both directions, and no client-visible protocol
anomaly.

## Evidence

- `src/lib/server/routes/codexProxyRoutes.ts` has no outbound fallback. Its only `fallback`
  references are a string-default helper (line 138) and code recognising when the Codex engine
  is itself invoked as an _inner_ Anthropic fallback (lines 666, 817, `CODEX_FALLBACK_METADATA_KEY`
  at 109). On pool exhaustion it returns a terminal error: `buildCodexErrorResponse`
  (1458-1462), or `buildCodexQuotaExhaustedResponse` (909-914) when every account is already
  cooling.
- Three directions exist and work: Claude Code → Anthropic pool; Claude/Anthropic → Codex
  (`executeClaudeCodexFallback`, `claudeProxyRoutes.ts:5499`, called at 6131, in-process — no
  HTTP hop); Claude/Anthropic → Vertex (`vertexAnthropicFallback.ts:611`, gated on
  `isVertexAnthropicModel`, 576).
- Three do not exist: **Vertex → Anthropic**, **native Codex → Anthropic**, **native Codex →
  Vertex**. PR #1782 fixed translation defects in the existing Claude → Vertex direction; it
  did not add a reverse path.
- Codex prompt caching is live but partial. `proxy_tokens_cache_read` by model:
  `gpt-5.6-sol` 566,657,536; `gpt-6-astra` 3,285,888; `gpt-5.6-terra` 490,752;
  `gpt-5.6-luna` 5,888. `proxy_tokens_cache_creation` is 0 for every Codex series, which is
  correct — OpenAI caching is automatic and has no explicit write.
- The caching asymmetry is the central design constraint. Anthropic caching is **explicit**:
  up to 4 `cache_control` breakpoints over a `tools → system → messages` prefix, write at
  1.25x base input (5-minute TTL) or 2x (1-hour), read at 0.1x, and **each account holds its
  own cache**. A Codex request translated to Anthropic arrives with **no breakpoints at all**,
  so it would be cached not at all unless the translator inserts them deliberately.
- Since Claude-on-Vertex speaks the Anthropic Messages wire format, one Codex→Anthropic
  translator covers both targets. There is no smaller Vertex-only variant of this work.

## Build order

Dependency-ordered; each step is one reviewable PR under the one-commit-per-PR policy. Default
off at every step, so behaviour is byte-for-byte unchanged until the final enable.

| #   | PR                                                                  | Depends on | Gate                                         |
| --- | ------------------------------------------------------------------- | ---------- | -------------------------------------------- |
| 1   | IR types + codec contract (`src/lib/types/proxyIR.ts`)              | —          | typecheck; exhaustiveness is a compile error |
| 2   | Request codec Codex → Anthropic (`codexOutboundFallback.ts`)        | 1          | offline shape suite                          |
| 3   | Response/stream codec Anthropic → Codex                             | 1          | offline event-order suite                    |
| 4   | Tool fidelity + id correlation                                      | 2, 3       | offline round-trip suite                     |
| 5   | Cache breakpoints + prefix byte-stability (`codexOutboundCache.ts`) | 2          | byte-stability assertion across two turns    |
| 6   | Trigger policy, commitment rule, loop prevention, accounting        | 2-4        | totality + commitment suites                 |
| 7   | Config keys, kill switch, metrics                                   | 6          | config validation suite                      |
| 8   | Enable + live model matrix                                          | all        | live pass criteria                           |

## Open questions gating the build

Every one needs the same thing: **real captured native Codex traffic**. The repo has 4 synthetic
fixtures, one real single-turn capture (`~/.neurolink/reference/codex-cli-wire-sample.json`,
captured 2026-09-21), a real usage-frame capture (`test/fixtures/codex-response-usage.sse`,
captured 2026-08-21), and one real controlled bisection experiment against the actual
`codex_exec/0.155.1` binary (`scripts/codex-replay-listener.ts`, `test/fixtures/sse-bisection-findings.md`,
run 2026-09-27). Two questions are now settled; the rest are listed here because they can still
invalidate a whole section, so they should be settled before the PRs that depend on them are
written.

| Question                                                                                       | Blocks  | Settled by                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does the real Codex CLI accept a `call_id` it did not mint (a `toolu_`-shaped id)?             | PR 4    | **SETTLED (2026-09-27) — yes, verbatim.** `codex-replay-listener.ts --script tool-call` against real `codex_exec/0.155.1`: the CLI's follow-up `function_call_output` carried `call_id: "toolu_replay0000000000000000"` unmodified (own `id` field is CLI-minted `fco_`-prefixed; `call_id` is untouched). See `test/fixtures/sse-bisection-findings.md`, "`tool-call` script — real result". |
| Does Anthropic/Vertex accept a non-`toolu_`-shaped `tool_use.id` in history?                   | PR 4    | one live call with such an id in history — still open; the bisection listener above can't test this direction (it stands in for the Codex backend, not Anthropic's)                                                                                                                                                                                                                           |
| Are the developer-role prefix blocks byte-identical turn to turn?                              | PR 5    | capture 2 turns of one session, diff `input[0..4]` — still open; the 2026-09-21 capture is single-turn                                                                                                                                                                                                                                                                                        |
| Does a genuine first-turn request omit all of `prompt_cache_key` / `thread_id` / `session_id`? | PR 5    | **SETTLED — no, it does not omit them.** The 2026-09-21 capture is a confirmed first turn (zero `function_call`/`function_call_output` items, tool-fidelity §6) and carries `prompt_cache_key`, and `client_metadata.thread_id`/`session_id`, all present.                                                                                                                                    |
| Does native Codex ever send top-level `tools` / `reasoning` / `stream:false`?                  | PR 2    | **Partially settled.** The 2026-09-21 capture confirms `reasoning` is sent with a non-default effort (`{"effort":"xhigh","context":"all_turns"}`) and confirms no top-level `tools` field exists (only nested `additional_tools`, consistent with the corrected shape). `stream:false` is still unconfirmed — that capture has `stream:true`.                                                 |
| Is a resumed session's `input` full-history or incremental?                                    | PR 2, 5 | capture two turns of a resumed session — still open; the 2026-09-21 capture is first-turn, not resumed                                                                                                                                                                                                                                                                                        |

## Contents

1. [Translation layer: canonical IR and codec contract](#translation-layer-canonical-ir-resolved-types-and-codec-contract)
2. [Request translation: Codex Responses → Anthropic Messages](#request-translation-codex-responses-request--clauderequest)
3. [Response translation: Anthropic → Codex wire format](#response-translation-anthropic--codex-wire-format)
4. [Tool-call fidelity in both directions](#tool-call-fidelity-codex-outbound-fallback--resolved)
5. [Preserving prompt caching across the hop](#codexanthropic-fallback-preserving-prompt-caching-across-the-hop)
6. [Trigger policy, commitment safety, loop prevention, accounting](#codex-outbound-fallback--trigger-policy-in-flight-commitment-safety-loop-prevention-accounting)
7. [Configuration surface and staged rollout](#configuration-surface-staged-rollout--codex-outbound-fallback)
8. [Validation plan](#codex-outbound-fallback-validation-plan)

## Consolidated unresolved items

- **ir-and-types** — whether native Codex ever sends top-level `reasoning`/`tools` on a genuine inbound request — **settled for `reasoning`** by the 2026-09-21 capture, which is exactly the check this item asked for (see the gating table above): it is sent with a non-default effort (`{"effort":"xhigh","context":"all_turns"}`). That captured request has no top-level `tools` field, only the nested `additional_tools` item, but one first-turn capture cannot show that no request ever carries one. Still open from the same gating row: whether it ever sends `stream:false`.
- **ir-and-types** — whether Anthropic's live API ever rejects consecutive same-role messages in some edge case — the one check that would settle it is a probe request against the real API with two consecutive `user` messages.
- **ir-and-types** — the storage/lifetime contract for a _resumed_ session's id map spanning multiple proxy requests — the one check that would settle it is reading how `originSessionId`/`originThreadId` are persisted by the session-affinity
- **ir-and-types** — above.
- **request-translation** — in §10. It converts an unknown into a loud, caller-visible failure instead of a silent one, which is what the "nothing may break silently" requirement demands even without live traffic.
- **request-translation** — whether `additional_tools`/`developer` items can appear anywhere other than before the first `user` item in real traffic — the one check that would settle it: capture one real Codex CLI multi-turn session with a mid-conv
- **request-translation** — whether a resumed-session request's `input` is genuinely full-history or incremental — the one check that would settle it: capture one real resumed-session Codex Responses request (the referenced `~/.neurolink/reference/
- **request-translation** — whether `tool_choice` or `reasoning` ever appear on genuine inbound requests at all (absent from all 4 fixtures) — **settled**: the 2026-09-21 capture carries both, `tool_choice: "auto"` and `reasoning` as quoted in the first item of this list.
- **request-translation** — whether more than one `additional_tools` item can appear in one request — the one check that would settle it: same real-traffic capture as (1).
- **response-translation** — a genuine live-captured native Codex Responses SSE transcript (text, tool-call, incomplete/error cases) — the check that would settle it is running a real Codex client through this proxy in observe-only mode and saving t
- **response-translation** — whether the real ChatGPT backend accepts a non-`call_`-prefixed `call_id` on a _later_ turn served by a real, non-fallback Codex backend directly — the check that would settle it is replaying a captured multi-turn Codex
- **tool-fidelity** — whether the real Codex CLI validates/enforces any format on a `function_call.call_id` it did not itself mint — the linchpin of Design 1 (§6). The one check that would settle it: serve a turn through this fallback so Anth
- **tool-fidelity** — whether Anthropic's real Messages API enforces any format constraint on an inbound (history) `tool_use.id`/`tool_result.tool_use_id`. The one check that would settle it: a live call with a deliberately non-`toolu_`-shape
- **tool-fidelity** — whether Vertex's Claude backend has the same tolerance as #2. The one check that would settle it: the same live-id test run against the Vertex path specifically.
- **tool-fidelity** — whether OpenAI's real custom-tool `format` union has variants beyond the single `{type:"grammar", syntax:"lark", definition}` observed. The one check that would settle it: a second real capture containing a custom tool d
- **tool-fidelity** — whether a genuine Codex CLI ever nests a namespace inside another, or declares more than the two observed (`functions`, `collaboration`). The one check that would settle it: a real capture from a session with MCP servers
- **tool-fidelity** — whether tool-list content is truly stable turn-over-turn in one thread (§6, downgraded this pass from "confirmed" to "assumed"). The one check that would settle it: a real multi-turn capture (2+ turns, same thread) to di
- **cache-preservation** — whether the four developer-role blocks (persona/sandbox/tool-usage/output-formatting) and the tools array are byte-identical turn-to-turn on live traffic — the one real capture is a single turn, not two turns of the same
- **cache-preservation** — whether a genuinely first-turn native Codex request ever omits all three — the one real sample has all three populated. The check that would settle it: capture one real first-turn (no prior `/backend-api/codex` call in t
- **cache-preservation** — ) — if it is ever genuinely absent, concurrent distinct conversations sharing one Codex agent config collide into the same prefix-derived affinity bucket until each gets its own id.
- **trigger-safety-accounting** — whether a genuine native Codex client ever sends `stream:false` — the repo shows `convertClaudeRequestToCodex` always setting `stream:true` for the existing, opposite-direction leg, but nothing in this repo constrains wh
- **trigger-safety-accounting** — the exact `Response`-vs-plain-object status of `tryConfiguredClaudeFallbackChain`'s own `.response` field was not traced to its own terminal builder in this pass (time-bounded); §4's `result instanceof Response` / captur
- **rollout-and-config** — which suite file already covers `validateProxyConfig`/`parseRoutingConfig` unit cases for
- **rollout-and-config** — the account-label string PR 4/5 passes to `setServedAccount` for a Codex-outbound-served
- **rollout-and-config** — whether `proxy_errors_total`'s label set can filter to "codex route only" for a
- **rollout-and-config** — (genuinely open per §H): whether PR 3 exports a new `handleClaudeMessagesRequest`-shaped
- **validation-plan** — the exact Codex Responses wire shape for a reasoning output item (whether OpenAI's `{type:"reasoning", ...}` with encrypted or summarized content applies here) is not established anywhere in this repo's types, fixtures,
- **validation-plan** — whether the real ChatGPT Codex backend validates `call_id` format server-side is
- **validation-plan** — -2 below.
- **validation-plan** —
- **validation-plan** — -1: exact wire shape for a Codex reasoning output item (A.2) — see A.2 above; the
- **validation-plan** — -2: whether the real ChatGPT Codex backend validates `function_call.call_id`
- **validation-plan** — -3: whether Section 0's policy choice ((a)/(b)/(c)) is fail-closed or lossy —

---

### Translation layer (canonical IR): resolved types and codec contract

### Decision (kept)

Single canonical IR, not `ClaudeRequest`-as-hub, not pairwise codecs. Verified: `openaiFormat.ts`/`geminiFormat.ts` already use `ClaudeRequest` as an implicit hub only because it is _also_ the literal Anthropic wire type; `codexFallback.ts` already needs a role cast (`(message.role as string) !== "system"`, line 154) to special-case Claude Code's inline-system convention inside a converter meant to be neutral. A new file, `src/lib/types/proxyIR.ts`, holds a real wire-neutral IR. `ClaudeRequest`/`ClaudeResponse` (`proxy.ts:154`, `:187`) stay untouched — the Anthropic hot path (`claudeProxyRoutes.ts`) never changes.

Vertex needs no separate codec. Confirmed: `executeVertexAnthropicFallback` (`vertexAnthropicFallback.ts:605-665`) forwards the upstream body/stream untouched with a code comment that it is "already Anthropic-shaped"; `buildVertexAnthropicPayload` (line 399) only strips `UNSUPPORTED_FIELDS = ["model", "context_management"]` (line 42). Vertex reuses `anthropicMessagesIRCodec.buildRequest`'s output as-is.

### `codexFallback.ts`: left unrefactored this PR

It already implements, in the new vocabulary, the codex-responses request **builder** (`convertClaudeRequestToCodex`, line 407) and response **parser** (`parseCodexFallbackSSE` line 592, `createCodexFallbackStream` line 719) — never a request parser or response renderer, since Codex there is a fallback target, not a served client. Deferred to a named follow-up PR (one-commit-per-PR; mixing a mechanical port with new functional work is out of scope). Coexistence cost: `convertClaudeRequestToCodex` and the new `anthropicMessagesIRCodec`/`codexNativeRequestCodec` independently implement the same `tool_choice` bijection (`any`↔`required`, `tool`↔`function`) and the same reasoning-effort concept in reverse; a fix to one will not propagate until the follow-up ports `codexFallback.ts` onto the same 4 capabilities, verified byte-for-byte against `test/continuous-test-suite-codex.ts`.

### Grounding notes from the fixtures (all 4 read in full)

`test/fixtures/codex-request-{exec-mode,interactive-mode,resumed-session,tool-result-turn}.json`. Each fixture's `body.input[0]` is one `{type:"additional_tools", role:"developer", tools:{functions:[...], collaboration:[...]}}` item. **Correction to the original design's blanket claim** ("no Anthropic tool shape maps to `collaboration`, genuinely unmappable"): the `collaboration` bucket is **not** grammar-only. In all 4 fixtures it holds exactly two tools — `exec` (`type:"custom"`, has a `grammar` string, no `parameters`) and `request_review` (no `type` tag, has a plain JSON-Schema `parameters` object, no `grammar` — structurally identical to a `functions` entry, just filed under the wrong bucket on the wire). Mappability is a **per-tool** fact keyed on presence of `grammar`, never inferable from which array a tool sits in.

`function_call.arguments` is not guaranteed JSON: `codex-request-tool-result-turn.json`'s `function_call` (`call_id:"call_synthetic_0001"`, `name:"exec"`) has `arguments: "ls -la"` — a bare string, since `exec` is grammar-typed. `codexFallback.ts`'s `parseFunctionArguments` (line 466) throws today on exactly this input (`JSON.parse("ls -la")` fails, hits `catch`, throws) — confirmed by reading the function. A tool-call IR part therefore needs `argumentsRaw: string` as the source of truth always, `argumentsJson` only when it happens to parse as an object.

All 4 fixtures: `additional_tools` is the single, first `input` item; 4 contiguous `developer`-role `message` items follow (indices 1-4); then 2 consecutive `user`-role `message` items (confirmed non-hypothetical — `tool-result-turn`'s second user item carries an `<environment_context>` block, not a second real user turn); `tool-result-turn` additionally has one `function_call`/`function_call_output` pair. No fixture shows an `assistant`-role message item, even `resumed-session`. Top-level `body` keys across all 4: `{model, stream, store, input}` plus `{session_id, thread_id}` only on `resumed-session` — never top-level `tools` or `reasoning`.

### Exact IR types — new file `src/lib/types/proxyIR.ts` (barrel-exported via `src/lib/types/index.ts`)

```ts
export type ProxyIRWireFormat = "anthropic-messages" | "codex-responses";
// Distinct from the existing ProxyFormat = "claude"|"openai"|"gemini" (src/lib/types/proxy.ts:3934,
// a different subsystem) — no name collision, but do not conflate the two enums.

export type ProxyIRRole = "system" | "developer" | "user" | "assistant";

/** Mirrors ClaudeCacheControl (proxy.ts:73); attaches only where Anthropic's wire actually allows it. */
export type ProxyIRCacheHint = { ttl?: "5m" | "1h" };

export type ProxyIRTextPart = {
  kind: "text";
  text: string;
  cacheHint?: ProxyIRCacheHint;
};
export type ProxyIRThinkingPart = {
  kind: "thinking";
  text: string;
  signature?: string;
}; // signature: reserved, unused
export type ProxyIRImagePart = {
  kind: "image";
  encoding: "base64" | "url";
  mediaType?: string;
  data: string;
};
export type ProxyIRToolCallPart = {
  kind: "tool_call";
  callId: string;
  toolName: string;
  argumentsRaw: string;
  argumentsJson?: Record<string, unknown>;
};
export type ProxyIRToolResultPart = {
  kind: "tool_result";
  callId: string;
  content: (ProxyIRTextPart | ProxyIRImagePart)[];
  isError?: boolean;
  cacheHint?: ProxyIRCacheHint;
};
export type ProxyIRUnmappedPart = {
  kind: "unmapped";
  sourceKind: string;
  reason: string;
  raw: unknown; // wire text/object always preserved verbatim
};
export type ProxyIRContentPart =
  | ProxyIRTextPart
  | ProxyIRThinkingPart
  | ProxyIRImagePart
  | ProxyIRToolCallPart
  | ProxyIRToolResultPart
  | ProxyIRUnmappedPart;

export type ProxyIRMessage = {
  role: ProxyIRRole;
  content: ProxyIRContentPart[];
};
// system/developer messages stay inside this ordered array (no separate systemSegments bucket) —
// matches native Codex's own wire of separate developer-role message items, verified: 4 contiguous
// developer items precede 2 user items in every one of the 4 fixtures.

export type ProxyIRFunctionToolDeclaration = {
  kind: "function";
  name: string;
  description?: string;
  parametersSchema: Record<string, unknown>;
  cacheHint?: ProxyIRCacheHint;
};
export type ProxyIRCustomGrammarToolDeclaration = {
  kind: "custom_grammar";
  name: string;
  description?: string;
  grammar: string;
};
export type ProxyIRToolDeclaration =
  | ProxyIRFunctionToolDeclaration
  | ProxyIRCustomGrammarToolDeclaration;

export type ProxyIRToolChoice =
  | { kind: "auto" }
  | { kind: "none" }
  | { kind: "any" }
  | { kind: "named"; toolName: string };

// Reuses existing CodexReasoningEffort (src/lib/types/codex.ts) verbatim, confirmed:
// "none"|"minimal"|"low"|"medium"|"high"|"xhigh"|"max".
export type ProxyIRReasoning =
  | { source: "none" }
  | { source: "anthropic_thinking"; type: string; budgetTokens?: number }
  | { source: "codex_effort"; effort: CodexReasoningEffort };

export type ProxyIRRequest = {
  sourceFormat: ProxyIRWireFormat;
  sourceModel: string;
  originSessionId?: string;
  originThreadId?: string;
  messages: ProxyIRMessage[];
  tools: ProxyIRToolDeclaration[];
  toolChoice?: ProxyIRToolChoice;
  reasoning: ProxyIRReasoning;
  stream: boolean;
  promptCachePrefixKey?: string; // routing hint only, never serialized to any wire
};
export type ProxyIRRequestTargetOptions = {
  model: string;
  reasoningEffort?: CodexReasoningEffort;
};

export type ProxyIRProviderError = {
  code: string;
  httpStatus?: number;
  retryable?: boolean;
  message?: string;
};

// Widened per review + code check: ClaudeResponse.stop_reason and SSEMessageDelta.delta.stop_reason
// are both `string | null` (proxy.ts:191, :245), NOT a closed union — the codebase already deliberately
// left this open. A closed finishReason union combined with assertProxyIRExhaustive's throw-on-default
// would crash on any legitimate but unmodeled Anthropic stop_reason. Fixed here:
export type ProxyIRTerminalOutcome =
  | {
      status: "completed";
      finishReason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
    }
  | { status: "completed"; finishReason: "other"; rawFinishReason: string }
  | { status: "failed"; error: ProxyIRProviderError }
  | { status: "incomplete"; reason: string };

export type ProxyIRResponseEvent =
  | { kind: "text_delta"; text: string }
  | { kind: "thinking_delta"; text: string }
  | { kind: "tool_call_start"; callId: string; toolName: string }
  | {
      kind: "tool_call_arguments_delta";
      callId: string;
      partialArguments: string;
    }
  | { kind: "tool_call_done"; callId: string }
  | { kind: "item_done" }
  | { kind: "usage"; usage: UsageContext } // reused unchanged from src/lib/types/proxy.ts:2254
  | { kind: "terminal"; outcome: ProxyIRTerminalOutcome };

export type ProxyIROutputItem =
  | { kind: "text"; text: string }
  | { kind: "thinking"; text: string }
  | {
      kind: "tool_call";
      callId: string;
      toolName: string;
      argumentsRaw: string;
      argumentsJson?: Record<string, unknown>;
    };

export type ProxyIRResponse = {
  items: ProxyIROutputItem[];
  usage?: UsageContext;
  outcome: ProxyIRTerminalOutcome;
};
```

`UsageContext` reused verbatim (confirmed at `src/lib/types/proxy.ts:2254`): `{inputIncludesCachedTokens?, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, cacheReadTokensObserved?, cacheCreationTokensObserved?, reasoningTokens?, rateLimitAfter5h?, rateLimitAfter7d?}` — do not reshape it; `proxyTokenUsage()` (`src/lib/proxy/proxyTokenUsage.ts`) already consumes this exact shape and stays provider-agnostic.

### Codec contract — 4 independent capability types (not one monolith)

```ts
export type ProxyIRRequestParser<TWireRequest> = {
  format: ProxyIRWireFormat;
  parseRequest(wire: TWireRequest): ProxyIRRequest;
};
export type ProxyIRRequestBuilder<TWireRequest> = {
  format: ProxyIRWireFormat;
  buildRequest(
    ir: ProxyIRRequest,
    target: ProxyIRRequestTargetOptions,
  ): TWireRequest;
};
export type ProxyIRResponseParser = {
  format: ProxyIRWireFormat;
  parseBufferedResponse(wireText: string): ProxyIRResponse;
  parseResponseStream(
    upstream: Response,
  ): AsyncGenerator<ProxyIRResponseEvent, ProxyIRResponse>;
};
export type ProxyIRResponseRenderer = {
  format: ProxyIRWireFormat;
  renderResponseEvent(event: ProxyIRResponseEvent): string[];
  renderTerminalOutcome(
    outcome: ProxyIRTerminalOutcome,
    usage?: UsageContext,
  ): string[];
};
export type ProxyIRUnmappableValue = {
  proxyIRUnmappable: true;
  sourceKind: string;
  reason: string;
  raw: unknown;
};
```

Matches what is true per format today: Anthropic needs a parser+builder+response-parser+renderer (all net new — grep confirms zero existing outbound-fallback or `additional_tools`/`session_id`/`developer`-role parsing anywhere in `src/lib/server/routes/codexProxyRoutes.ts`); Codex-native needs a parser (net new) and a renderer (net new, `CodexResponsesStreamSerializer`) but never a builder or a buffered/stream response parser in this PR (Codex is never dispatched _to_ as the IR target here, only received _from_).

### Native-Codex request wire type — superseded by the tool-fidelity section's corrected types

**Reconciliation (post-review):** this subsection originally proposed `CodexNativeToolFunction`, `CodexNativeGrammarTool`, `CodexNativeAdditionalToolsItem`, `CodexNativeMessageItem`, `CodexNativeFunctionCallItem`, `CodexNativeFunctionCallOutputItem`, `CodexNativeInputItem` and `CodexNativeRequestBody`, grounded only against the 4 synthetic fixtures. The tool-call-fidelity section later read the real captured wire sample (`~/.neurolink/reference/codex-cli-wire-sample.json`) and found two of this block's assumptions wrong: `additional_tools.tools` is an array of `{type:"namespace", ...}` objects, not a flat `{functions, collaboration}` object, and the identity fields (`session_id`/`thread_id`) live nested inside `client_metadata`, never at the top level `CodexNativeRequestBody` claimed. Its own "§8. Types — exact, corrected" is the single authoritative version (`CodexNativeRole`, `CodexNativeMessageInputItem`, `CodexNativeFunctionToolDeclaration`, `CodexNativeCustomToolFormat`, `CodexNativeCustomToolDeclaration`, `CodexNativeToolDeclaration`, `CodexNativeToolNamespace`, `CodexNativeAdditionalToolsInputItem`, `CodexNativeFunctionCallInputItem`, `CodexNativeFunctionCallOutputInputItem`, `CodexNativeInputItem`, `CodexNativeToolChoice`, `CodexNativeRequest`) — reuse those names verbatim; nothing in this subsection's original block ships.

This PR (PR 1, already merged) never added any of these types in the first place — only the wire-neutral IR (`src/lib/proxy/proxyIR.ts`, `src/lib/types/proxyIR.ts`) shipped. The Codex-native wire types belong to PR 4 (tool fidelity) and are added there, in their corrected form, not here.

No collisions: `CodexContentPart`, `CodexResponsesInputItem`, `CodexReasoningEffort`, `CodexResponsesRequest`, `CodexFallbackResult`/`CodexFallbackStream` are all distinct existing exports (confirmed via full read of `src/lib/types/codex.ts`, 218 lines) and stay untouched regardless of which generation of Codex-native types lands.

**Unresolved, provisional**: whether `additional_tools` is always exactly one item and always first — 4 synthetic fixtures agree, no live capture confirms it. Also provisional: `codexProxyRoutes.ts` reads `body.reasoning.effort` (line 672) and `Array.isArray(body.tools)` (lines 686, ~706) defensively at the top level on the _same route_ — confirmed by reading the file — but both feed only `writeFinalLog`/tracer metadata (`toolCount`, `reasoningEffort`), never codec dispatch, and that route's body there is the reverse-fallback shape (`CodexResponsesRequest`, which legitimately has top-level `tools`/`reasoning`), not a genuine native-inbound capture. `CodexNativeRequestBody` omitting top-level `tools`/`reasoning` is left as-is, marked provisional. UNRESOLVED: whether native Codex ever sends top-level `reasoning`/`tools` on a genuine inbound request — the one check that would settle it is a live-captured native Codex CLI request with non-default reasoning effort set.

### Exhaustiveness and the 3 tiers of explicit unmappable handling

New runtime module `src/lib/proxy/proxyIR.ts`:

```ts
export function assertProxyIRExhaustive(value: never, context: string): never {
  throw new Error(
    `Unhandled ProxyIR variant in ${context}: ${JSON.stringify(value)}`,
  );
}
export const UNPARSED_TOOL_ARGUMENTS_KEY =
  "__proxyIRUnparsedArguments" as const;
export class ProxyIRUnmappableRequestError extends Error {
  constructor(
    readonly sourceFormat: ProxyIRWireFormat,
    readonly targetFormat: ProxyIRWireFormat,
    readonly reason: string,
  ) {
    super(`Cannot map ${sourceFormat} request to ${targetFormat}: ${reason}`);
    this.name = "ProxyIRUnmappableRequestError";
  }
}
export function assertProxyIRRequestMappable(
  ir: ProxyIRRequest,
  target: ProxyIRWireFormat,
): void {
  if (target !== "anthropic-messages") return;
  for (const tool of ir.tools) {
    if (
      tool.kind === "custom_grammar" &&
      !isDegradableSingleArgGrammar(tool.grammar)
    ) {
      throw new ProxyIRUnmappableRequestError(
        ir.sourceFormat,
        target,
        `tool "${tool.name}" is a structured custom_grammar tool with no JSON Schema equivalent`,
      );
    }
  }
}
```

**Blocker resolved (adopted, refined by code check)**: the review is right that blanket Tier-1-fatal rejection of every `custom_grammar` tool defeats the feature on almost all real traffic — `exec` is present in all 4 fixtures and its grammar (`start: command\ncommand: WORD (" " ARG)*`) is a single free-text argument. Adopt the review's fix with one refinement the code check surfaced: `request_review`, despite living in the wire's `collaboration` bucket, is **not** a `custom_grammar` tool at all — it has `parameters`, not `grammar`, so it already maps as `ProxyIRFunctionToolDeclaration` and never reaches this gate. So the gate only ever needs to special-case tools that genuinely carry a `grammar` field:

- Tier 1 (fatal, whole-request, pre-dispatch): a `custom_grammar` tool whose `grammar` is NOT a single free-text argument (`isDegradableSingleArgGrammar` — a narrow EBNF check for exactly one `WORD`/`ARG`-style free-text production; anything with more structure is rejected). Thrown before `buildRequest` runs, before any account slot or Vertex call is spent — joins the existing pre-dispatch gate list in `proxyTranslationEngine.ts` next to `ProxyContextPreflightError` (`proxyContextPreflight.ts:17`) and `getProxyTokenBudgetError` (`proxyTokenBudget.ts:56`) — both confirmed present and already checked together at multiple sites in that engine.
- Degraded-but-working mapping (new, adopted from the review): a `custom_grammar` tool that IS a single free-text argument (covers `exec` in all 4 fixtures) maps to `{kind:"function", name, description, parametersSchema:{type:"object", properties:{command:{type:"string"}}, required:["command"], additionalProperties:false}}`. `anthropicMessagesIRCodec.buildRequest` renders this as an ordinary `ClaudeTool`; the reverse mapping on tool-call parsing keeps the single argument as the raw command string under `argumentsRaw`.
- Tier 2 (per-field, non-fatal, explicit sentinel): unparsed tool-call arguments and any `ProxyIRUnmappedPart` — raw wire bytes are always kept, marked via `UNPARSED_TOOL_ARGUMENTS_KEY`, following the repo's own `xObserved` boolean convention (`UsageContext.cacheReadTokensObserved` etc., confirmed at `proxy.ts:2268-2269`) rather than inventing a new idiom. A tool-call IR part with non-JSON-parseable `argumentsRaw` (verified real case: `"ls -la"` in `tool-result-turn`'s `function_call`) renders into `ClaudeToolUseBlock.input` as `{[UNPARSED_TOOL_ARGUMENTS_KEY]: argumentsRaw}`, never a bare empty object — this directly fixes `codexFallback.ts`'s current hard throw on the same input class, though the fix lands only in the new codec, not in `codexFallback.ts` itself this PR.
- Tier 3 (verified-uncertain, honestly held back): Anthropic thinking content served to a Codex client — no live-captured native Codex Responses SSE sample exists here to confirm the real reasoning output-item wire shape. `renderResponseEvent` on `codex-responses` never folds a `thinking_delta` into a plain text delta (would leak reasoning as the answer) and never silently drops it — withhold and log once, pending a live sample. Stated open gap, not resolved.

**Superseded by the 2026-09-28 sign-off (ruling 7):** no Tier-1 grammar guard ships. Every custom/grammar tool is wrapped as a single `{input: string}` parameter, with `custom_tool_call` on the way back, whatever its grammar. A Codex custom tool always takes one raw string, so the wrapping keeps its interface; only grammar enforcement is lost, and the grammar text goes into the tool description. The redacted real Codex CLI capture (`test/fixtures/codex-cli-wire-sample-redacted.json`) also shows why the narrow check above cannot ship: its `exec` grammar is `start: pragma_source | plain_source` with `PRAGMA_LINE`/`NEWLINE`/`SOURCE` productions, not the single `WORD (" " ARG)*` production of the synthetic fixtures, so the guard would reject the real `exec` tool, which every captured Codex request carries.

### Developer/system-role hoisting (major finding — adopted in full)

**Resolved**: confirmed by reading `codexFallback.ts:134-148` (`buildSystemInstructions` joins all system/developer text with `"\n\n"`, discarding position — the review correctly ties this to the repo's own prior ~41% caching-hit-rate regression) and by the fixture read (4 separate contiguous `developer`-role items in every fixture). Adopted rule for `codexNativeRequestCodec.parseRequest` → `ProxyIRRequest.messages`, and for `anthropicMessagesIRCodec.buildRequest`'s IR→`ClaudeRequest.system` step:

- `ClaudeMessage.role` is a closed `"user" | "assistant"` union (confirmed, `proxy.ts:132-135`) with no system/developer member, so hoisting is mandatory, not optional.
- Developer/system-role IR messages are hoisted to `ClaudeRequest.system` as an **array of one `ClaudeTextBlock` per original segment** (never one joined string), preserving segment boundaries so `applyClaudeRequestCacheBreakpoints` (`anthropicCacheBreakpoints.ts:217`, confirmed pure, clone-based, idempotent via `countAnthropicCacheMarkers` at line 97) can mark the correct sub-boundary.
- Position rule: a developer-role IR message NOT contiguous at the head (position 0) is a protocol violation for this PR's scope — `parseRequest` throws `ProxyIRUnmappableRequestError` naming the offending index, rather than silently merging-forward or reordering. All 4 fixtures show developer messages contiguous at head only, so this is a documented refusal for a shape nothing here has observed, not a live-traffic-blocking restriction today.

### Consecutive same-role messages (minor finding — adopted)

**Resolved**: confirmed non-hypothetical (`tool-result-turn.json` input indices 5-6, both `role:"user"`, the second carrying an `<environment_context>` block). Rule: `anthropicMessagesIRCodec.buildRequest` does **not** merge adjacent same-role IR messages — it emits separate consecutive `ClaudeMessage` entries. Anthropic's Messages API accepts consecutive same-role messages (no strict alternation requirement), and merging would invent a content-block-join rule with no wire precedent; separate entries are the identity mapping and the lower-risk default. UNRESOLVED: whether Anthropic's live API ever rejects consecutive same-role messages in some edge case — the one check that would settle it is a probe request against the real API with two consecutive `user` messages.

### Tool-call id correlation (major finding — adopted, scoped)

**Resolved**: confirmed gap — `CodexResponsesInputItem`'s `function_call`/`function_call_output` variants (codex.ts:155-165) and the tool-fidelity section's corrected `CodexNativeFunctionCallInputItem`/`CodexNativeFunctionCallOutputInputItem` are both keyed by a single opaque `call_id` string; nothing in `codex.ts` types an id-translation record, and `tool-result-turn.json` (`call_id:"call_synthetic_0001"`) must round-trip unchanged across the pair while also surviving translation to/from an Anthropic `toolu_*` id on the fallback hop. `ProxyIRToolCallPart.callId` is scoped to **this section only** as the id the IR received from its source wire — never reused as the id sent to a different target wire. Add:

```ts
/** One row per tool call crossing a codec boundary; keyed by the id-issuing side's own id so a tool_result
 *  naming an id the far side never issued is a lookup miss, not a silent mismatch. */
export type ProxyIRToolCallIdMap = {
  inboundWireId: string;
  outboundWireId?: string;
};
```

Substitution boundary: `anthropicMessagesIRCodec.buildRequest` mints a fresh `toolu_*` id per tool call via the existing `generateToolUseId` (confirmed exported from `claudeFormat.ts`, already imported by `codexFallback.ts`) and records `{inboundWireId: irPart.callId, outboundWireId: mintedId}`; the response codec looks up by `outboundWireId` to restore `inboundWireId` before rendering a `tool_call_done`/`function_call_output` pair to the original Codex client. The map is request-scoped only — cross-turn/resumed-session persistence is out of scope here. UNRESOLVED: the storage/lifetime contract for a _resumed_ session's id map spanning multiple proxy requests — the one check that would settle it is reading how `originSessionId`/`originThreadId` are persisted by the session-affinity design (`cache-anthropic`/`cache-codex-prefix`, named below).

### Stream serializer reuse (major finding — adopted, FILES corrected)

**Resolved**: confirmed by reading `claudeFormat.ts:441-530` — `ClaudeStreamSerializer`'s constructor takes `(model, inputTokens)` and `ensureMessageStarted` emits `message_start`/`ping` events shaped exactly like the Anthropic Messages API (`SSEMessageStart` wrapping a `ClaudeResponse`-shaped `message`). It is **not** reused for the native-Codex-inbound direction, since that direction never emits Anthropic-shaped SSE — a native Codex client only ever needs Codex-Responses-shaped SSE. Corrected FILES entry: `claudeFormat.ts` is reused only for its `generateToolUseId` helper (already imported by `codexFallback.ts`) and stays otherwise untouched; the outbound-to-Codex-client stream is rendered exclusively by the new `CodexResponsesStreamSerializer` inside `codexNativeRequestCodec.ts`.

### Files

| Path                                        | Action | Purpose                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/types/proxyIR.ts`                  | create | Canonical wire-neutral request/response IR types + 4-capability codec contract                                                                                                                                                                                                                                             |
| `src/lib/types/codex.ts`                    | modify | Add `CodexNative*` types, additive only; existing types untouched                                                                                                                                                                                                                                                          |
| `src/lib/types/index.ts`                    | modify | Add `export * from "./proxyIR.js";` per barrel-only rule 10                                                                                                                                                                                                                                                                |
| `src/lib/proxy/proxyIR.ts`                  | create | `assertProxyIRExhaustive`, `assertProxyIRRequestMappable`, `ProxyIRUnmappableRequestError`, `UNPARSED_TOOL_ARGUMENTS_KEY`, `isDegradableSingleArgGrammar`                                                                                                                                                                  |
| `src/lib/proxy/codexNativeRequestCodec.ts`  | create | codex-responses `parseRequest` (net new) + `renderResponseEvent`/`renderTerminalOutcome` (net new `CodexResponsesStreamSerializer`)                                                                                                                                                                                        |
| `src/lib/proxy/anthropicMessagesIRCodec.ts` | create | anthropic-messages `buildRequest` (ends with mandatory `applyClaudeRequestCacheBreakpoints` call, matching the existing call site at `openaiFormat.ts:722` inside `convertOpenAIToClaudeRequest`), `parseRequest` (faithful, not the lossy `ParsedClaudeRequest`), `parseBufferedResponse`/`parseResponseStream` (net new) |

Untouched, reused as-is: `codexFallback.ts`, `claudeFormat.ts` (only `generateToolUseId`, not `ClaudeStreamSerializer` — see correction above), `anthropicCacheBreakpoints.ts`, `proxyTokenUsage.ts`.

### Tests

All assertions below live in one new file, `test/continuous-test-suite-proxy-ir-codec.ts` — a new determinism-exception suite (pure translation-table functions; header names the exception per the repo's own convention documented for the vector-store suites):

- Golden-fixture round-trip for all 4 `test/fixtures/codex-request-*.json`: `codexNativeRequestCodec.parseRequest` → `ProxyIRRequest` → `anthropicMessagesIRCodec.buildRequest` → exactly one `cache_control` marker present on the last system-derived `ClaudeTextBlock`, and 1:1 tool/message order preservation (array length and per-index role/kind match input).
- A `custom_grammar` tool with a multi-token grammar (a synthetic fixture variant, not `exec`) must throw `ProxyIRUnmappableRequestError` before `buildRequest`/`parseResponseStream` is ever called — assert via a spy/counter that the downstream call was never invoked, not just that the throw happened.
- `exec`'s `function_call` (`arguments: "ls -la"`) from `codex-request-tool-result-turn.json` renders through `anthropicMessagesIRCodec` as `ClaudeToolUseBlock.input = {[UNPARSED_TOOL_ARGUMENTS_KEY]: "ls -la"}` — assert the exact key and value, never an empty object and never a thrown error.
- `request_review` (from any fixture's `collaboration` array) is classified as `ProxyIRFunctionToolDeclaration`, not `ProxyIRCustomGrammarToolDeclaration` — assert `tool.kind === "function"` and `tool.parametersSchema` matches its fixture `parameters` object verbatim.
- The 4 contiguous `developer` messages in `codex-request-exec-mode.json` map to 4 distinct `ClaudeTextBlock` entries in `ClaudeRequest.system` (array length 4), never one joined string.
- The 2 consecutive `user` messages in `codex-request-tool-result-turn.json` map to 2 separate `ClaudeMessage` entries (array length 2 at that position), not one merged message.
- Exhaustiveness: a `ProxyIRContentPart` variant added to the union without a matching `case` in every consumer switch must fail `tsc`, verified by a `// @ts-expect-error` fixture asserting `assertProxyIRExhaustive` is the reachable default branch.
- `ProxyIRTerminalOutcome` with `finishReason:"other"` and an arbitrary `rawFinishReason` string round-trips through `renderTerminalOutcome` without throwing — regression guard for the widened-union fix above.
- **Gating (adopted per repo rule)**: `test/continuous-test-suite-proxy-ir-codec.ts` is added to the `checks` array in `scripts/run-proxy-reliability.mjs` (confirmed present, sequential `spawnSync` list of `tsx test/continuous-test-suite-proxy-*.ts` entries) so it runs under the existing `pnpm run test:proxy-reliability` npm script (`package.json:170`), which the required `provider-safety-net` job's `rest` group already runs at `.github/workflows/ci.yml:445-448` ("Proxy lifecycle, accounting, spending and update regressions (isolated)"). No new npm script or workflow step needed — confirmed by reading both files.

### Dependencies on other sections (named, unresolved here by design)

- `cache-anthropic` / `cache-codex-prefix` (session-affinity): consumes `originSessionId`/`originThreadId`/`promptCachePrefixKey`; this section only guarantees those values survive `parseRequest`, and owns the cross-turn `ProxyIRToolCallIdMap` persistence question left UNRESOLVED above.
- `cache-vertex`: must confirm the same-wire-codec-as-Anthropic simplification holds; if Vertex ever needs a field Anthropic's wire lacks, that assumption breaks and Vertex needs its own thin adapter.
- Failure-taxonomy/commit-boundary design: owns exactly where `ProxyIRUnmappableRequestError` is checked relative to `ProxyContextPreflightError`/`getProxyTokenBudgetError` in `proxyTranslationEngine.ts`, and the pre-commit/post-commit split for the new response stream — `parseResponseStream` is a plain `AsyncGenerator` specifically so a caller can peek-then-commit like existing preflight stream buffering.
- `proxy-waste` (fallback telemetry): the new Codex-outbound leg needs its own attempt-recording call (zero call sites exist today in `codexProxyRoutes.ts`, confirmed via grep); this section only notes the codec boundary is the natural place to hang it.

### Risks (kept, one added)

- Native Codex requests may not always place `additional_tools` as the single first input item — 4 synthetic, not live-captured, fixtures only.
- Reasoning-effort-to-thinking-budget mapping has no existing precedent here; any bucketing table was new policy needing owner sign-off. **Settled 2026-09-28**: low→4096, medium→8192, high→16384, xhigh→24576, max→32768, clamped to `[1024, max_tokens-1024]`; thinking is left off on a forced `tool_choice` or when the last assistant turn called a tool. Shipped in `mapCodexReasoningToThinking` (`src/lib/proxy/codexOutboundFallback.ts`).
- Leaving `codexFallback.ts` unrefactored means two independently maintained `tool_choice`/reasoning bijections exist until the named follow-up PR.
- Tier-3 thinking-to-Codex rendering has no verified real wire target; shipping a guess risks an SSE frame no real Codex CLI understands — worse than withholding, so withholding stays the default.
- **Added**: the `collaboration`-bucket/`grammar`-field distinction (this section's own code-check finding) is grounded in only 4 fixtures with only 2 collaboration tools (`exec`, `request_review`); a third collaboration tool with a different shape (`parameters` AND `grammar` both present) is unverified. **Settled 2026-09-28 (ruling 7)**: tools are classified by their own `type`, never by bucket (`mapCodexToolDeclarationToClaude`), and every `type:"custom"` tool, whatever its grammar, is wrapped as a single `{input: string}` parameter; no `isDegradableSingleArgGrammar` guard ships (see the superseded note under "Blocker resolved" above).

---

### Request translation: Codex Responses request → `ClaudeRequest`

Recovered section for "Codex outbound fallback" (native Codex client → Anthropic/Vertex fallback). Grounded against `/Users/sachinsharma/Developer/Official/fix/proxy-ci-gaps-and-dead-leg-alert` (read-only).

### 0. Boundary

Owns one thing: untrusted inbound Codex Responses JSON → a typed `ClaudeRequest`. Does **not** own: target/model selection (orchestration section supplies `target: {provider, model}`), response/stream translation back to Codex wire format (sibling section owns `ClaudeThinkingBlock`, `ClaudeStreamSerializer`), tool _execution_, or dispatch/HTTP. Vertex/Anthropic dispatch is named in §6 only to fix a wrong hand-off found in review; this section still does not own it.

### 1. Ground truth (re-verified directly against `test/fixtures/codex-request-{interactive-mode,tool-result-turn,resumed-session,exec-mode}.json`, generated by `scripts/generate-codex-fixtures.mjs`)

- Top level: `{ model, stream, store, input }` (+ `session_id`/`thread_id` only on `codex-request-resumed-session.json`). No top-level `tools`/`instructions` in any of the 4.
- `input` is flat. Tool declarations ride inside one `{ type: "additional_tools", role: "developer", tools: { functions, collaboration } }` item, never a top-level field.
- 4 separate `developer`-role `message` items per fixture (persona / sandbox policy / tool-usage rule / output-format rule), all before the first `user` item in all 4 fixtures.
- Every fixture has **two consecutive `user`** items (real prompt, then a synthetic `<environment_context>...</environment_context>` message) — the concrete proof that the flat stream violates Anthropic's strict user/assistant alternation unless coalesced.
- Content parts observed: **`input_text` only**, in all 4 fixtures — 0 occurrences of `output_text` or `input_image`, and 0 `assistant`-role message items. **Correction to the first design pass**, which claimed all three `CodexContentPart` variants were "confirmed against the fixtures": only `input_text` is fixture-confirmed; `output_text`/`input_image` handling is carried over from the pre-existing `CodexContentPart` type (`src/lib/types/codex.ts:144-147`) by structural assumption, not fixture evidence. Flagged in §10.
- `test/fixtures/codex-request-tool-result-turn.json` (not `exec-mode.json` — **corrected misread**: `exec-mode.json` contains no `function_call` item at all, verified by listing its `input` array) is the one fixture with a `function_call`/`function_call_output` pair: `{"type":"function_call","call_id":"call_synthetic_0001","name":"exec","arguments":"ls -la"}` — a raw shell string, not JSON.
- `additional_tools.tools.collaboration` is a **mixed-shape array**, verified in `codex-request-interactive-mode.json`: entry 1 is `{"name":"exec","type":"custom","description":...,"grammar":"start: command\n..."}` (no JSON schema); entry 2 is `{"name":"request_review","description":...,"parameters":{"type":"object","properties":{"summary":{"type":"string"}},"required":["summary"],"additionalProperties":false}}` — a completely ordinary JSON-schema tool, no `type`/`grammar` field. **Blocker resolved**: the first design pass's `CodexNativeCollaborationToolDefinition` (grammar-only, applied to every entry) is dropped; per the reconciliation in §2, discriminate every declaration by its own `type` field (see §3.4), never by which namespace or bucket it sits in.
- `reasoning.effort` is read for telemetry only by `src/lib/server/routes/codexProxyRoutes.ts:671-677`; none of the 4 fixtures include a `reasoning` field, and none include `tool_choice` either — both remain genuinely unobserved (§10).

### 2. Types — superseded by the tool-fidelity section's corrected types (reconciled post-review)

**This subsection's original type block does not ship.** It was grounded only against the 4 synthetic fixtures and named `CodexNativeAdditionalToolsItem` (a flat, required `{functions, collaboration}` object) — the same review pass that flagged this (finding, PR #1825) confirmed the tool-fidelity section independently read the real captured wire sample and found that shape wrong: real traffic's `additional_tools.tools` is an array of `{type:"namespace", name, description, tools}` objects, discriminated per-declaration by each tool's own `type` field, never by which bucket it sits in. That section's "§8. Types — exact, corrected" (`CodexNativeRole`, `CodexNativeMessageInputItem`, `CodexNativeFunctionToolDeclaration`, `CodexNativeCustomToolFormat`, `CodexNativeCustomToolDeclaration`, `CodexNativeToolDeclaration`, `CodexNativeToolNamespace`, `CodexNativeAdditionalToolsInputItem`, `CodexNativeFunctionCallInputItem`, `CodexNativeFunctionCallOutputInputItem`, `CodexNativeInputItem`, `CodexNativeToolChoice`, `CodexNativeRequest`) is the single source of truth; `CodexReasoningEffort`/`CodexContentPart`/`CodexResponsesInputItem`/`CodexResponsesRequest` stay untouched and out of scope for this reconciliation, exactly as originally stated.

§3.1's guard and §3.4's tool mapping below are rewritten to import and use those corrected names directly, rather than duplicating or re-deriving them here.

**Config key (reconciled, see also the rollout-and-config section):** the `codexFallbackChain?: FallbackEntry[]` field this subsection originally proposed for `src/lib/types/subscription.ts` is superseded by the rollout-and-config section's three-key scheme — `codexOutboundFallbackEnabled`/`codexOutboundFallbackTargets`/`codexOutboundFallbackModelMappings` on `ProxyRoutingConfig`, kebab-cased as `codex-outbound-fallback-{enabled,targets,model-mappings}` in `proxy-config.yaml` — which is the canonical, later-written, and more completely integrated design (it is read through the same `readRoutingPolicyKey`/hot-reload wiring every existing routing key uses, and it explicitly rejects reusing `FallbackEntry` because that type's `reasoningEffort` field configures a Codex-_inbound_ leg and has no meaning once the request has already become an Anthropic Messages request — the same reasoning this subsection's rejection of the shared `fallbackChain` key already argued, one level up). That section's design is authoritative; this subsection's own field name and shape do not ship.

### 3. New module — `src/lib/proxy/codexOutboundFallback.ts` (create)

Named to mirror the existing asymmetry (`codexFallback.ts` = Claude engine's fallback _into_ Codex; this file = Codex engine's fallback _out_).

```ts
export type CodexTranslationError =
  | { code: "MALFORMED_REQUEST"; message: string }
  | { code: "SUSPECTED_PARTIAL_HISTORY"; message: string };

export function parseCodexNativeRequest(
  raw: unknown,
):
  | { ok: true; value: CodexNativeRequest }
  | { ok: false; error: CodexTranslationError };

export function translateCodexRequestToClaude(
  request: CodexNativeRequest,
  target: { provider: "anthropic" | "vertex"; model: string },
):
  | { ok: true; value: ClaudeRequest }
  | { ok: false; error: CodexTranslationError };
```

Both return a Result union — **never throw** — resolving review's major finding ("no runtime validation boundary"; a type is compile-time only, and a malformed/duck-typed inbound body would otherwise throw an uncaught `TypeError` deep inside the translator). `parseCodexNativeRequest` is the untrusted-JSON→typed boundary; `translateCodexRequestToClaude` assumes an already-narrowed `CodexNativeRequest` and only fails on the partial-history check in §5.
Internal (not exported): `isRecord`, `isCodexContentPart`, `isCodexNativeToolDeclaration`, `isCodexNativeToolNamespace`, `isCodexNativeInputItem`, `isCodexNativeToolChoice`, `isCodexNativeReasoning`, `coalesceCodexInputToClaudeMessages`, `toClaudeContentPart`, `mapCodexFunctionToolToClaude`, `mapCodexCustomToolToClaude`, `mapCodexToolDeclarationToClaude`, `mapCodexToolChoiceToClaude`, `mapCodexReasoningToThinking`, `parseInboundToolArguments`, `hasFreshSessionPreamble`.

#### 3.1 `parseCodexNativeRequest`

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCodexContentPart(value: unknown): value is CodexContentPart {
  if (!isRecord(value)) return false;
  if (value.type === "input_text" || value.type === "output_text") {
    return typeof value.text === "string";
  }
  if (value.type === "input_image") {
    return typeof value.image_url === "string";
  }
  return false;
}

// Corrected shape (review finding, PR #1825): `additional_tools.tools` is an array of
// `{type:"namespace", ...}` objects in real traffic, not the flat, required
// `{functions, collaboration}` object this guard originally checked. Types reused from
// the tool-fidelity section's "§8. Types — exact, corrected" (`CodexNativeToolNamespace`,
// `CodexNativeToolDeclaration`, `CodexNativeFunctionToolDeclaration`,
// `CodexNativeCustomToolDeclaration`, `CodexNativeCustomToolFormat`,
// `CodexNativeAdditionalToolsInputItem`).

function isCodexNativeToolDeclaration(
  value: unknown,
): value is CodexNativeToolDeclaration {
  if (!isRecord(value) || typeof value.name !== "string") return false;
  if (value.type === "function") {
    return (
      typeof value.strict === "boolean" &&
      isRecord(value.parameters) &&
      (value.description === undefined || typeof value.description === "string")
    );
  }
  if (value.type === "custom") {
    return (
      isRecord(value.format) &&
      value.format.type === "grammar" &&
      (value.format.syntax === "lark" || value.format.syntax === "regex") &&
      typeof value.format.definition === "string" &&
      (value.description === undefined || typeof value.description === "string")
    );
  }
  return false;
}

// Resolves the review's null-validation finding: `functions: [null]` (or any nested
// non-declaration entry) must fail the guard here, not reach `tool.description` later
// in §3.4 and throw instead of returning MALFORMED_REQUEST.
function isCodexNativeToolNamespace(
  value: unknown,
): value is CodexNativeToolNamespace {
  return (
    isRecord(value) &&
    value.type === "namespace" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    Array.isArray(value.tools) &&
    value.tools.every(isCodexNativeToolDeclaration)
  );
}

function isCodexNativeInputItem(value: unknown): value is CodexNativeInputItem {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "message":
      return (
        (value.role === "user" ||
          value.role === "assistant" ||
          value.role === "developer") &&
        Array.isArray(value.content) &&
        value.content.every(isCodexContentPart)
      );
    case "function_call":
      return (
        typeof value.call_id === "string" &&
        typeof value.name === "string" &&
        typeof value.arguments === "string"
      );
    case "function_call_output":
      return (
        typeof value.call_id === "string" && typeof value.output === "string"
      );
    case "additional_tools":
      return (
        value.role === "developer" &&
        Array.isArray(value.tools) &&
        value.tools.every(isCodexNativeToolNamespace)
      );
    default:
      return false;
  }
}

// Resolves the review's residual null-validation finding (PR #1825): `tool_choice`,
// `reasoning`, and `parallel_tool_calls` are optional fields the translator still reads
// directly — `choice.name` in `mapCodexToolChoiceToClaude` (§3.3), `reasoning.effort` in
// `mapCodexReasoningToThinking` (§3.4), and `parallel_tool_calls` as a boolean passed into
// `mapCodexToolChoiceToClaude` (§2) — so a malformed value (e.g. `{type:"function"}` with
// no `name`, an unrecognized `effort` string, or a truthy non-boolean
// `parallel_tool_calls`) must fail here, not silently misbehave or throw a `TypeError`
// deep in the translator after the cast.
function isCodexNativeToolChoice(
  value: unknown,
): value is CodexNativeToolChoice {
  if (value === "auto" || value === "required" || value === "none") return true;
  return (
    isRecord(value) &&
    value.type === "function" &&
    typeof value.name === "string"
  );
}

const CODEX_REASONING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

function isCodexNativeReasoning(
  value: unknown,
): value is { effort: CodexReasoningEffort; context?: string } {
  return (
    isRecord(value) &&
    (CODEX_REASONING_EFFORTS as readonly unknown[]).includes(value.effort) &&
    (value.context === undefined || typeof value.context === "string")
  );
}

export function parseCodexNativeRequest(
  raw: unknown,
):
  | { ok: true; value: CodexNativeRequest }
  | { ok: false; error: CodexTranslationError } {
  if (
    !isRecord(raw) ||
    typeof raw.model !== "string" ||
    typeof raw.stream !== "boolean" ||
    typeof raw.store !== "boolean" ||
    !Array.isArray(raw.input) ||
    !raw.input.every(isCodexNativeInputItem) ||
    (raw.tool_choice !== undefined &&
      !isCodexNativeToolChoice(raw.tool_choice)) ||
    (raw.reasoning !== undefined && !isCodexNativeReasoning(raw.reasoning)) ||
    (raw.parallel_tool_calls !== undefined &&
      typeof raw.parallel_tool_calls !== "boolean")
  ) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_REQUEST",
        message: "inbound body does not match CodexNativeRequest",
      },
    };
  }
  return { ok: true, value: raw as CodexNativeRequest };
}
```

(Structural narrowing only, no field-by-field cast beyond the final assignment, which is sound because every field was checked above — this is the one place `as` is acceptable, since it follows, not replaces, exhaustive narrowing.)

#### 3.2 Field-by-field mapping (`translateCodexRequestToClaude`, after the guard in §3.5)

| Codex field                                                                  | Anthropic field                      | Rule                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (routing)                                                                    | `model`                              | `target.model`, passed in; never invented here.                                                                                                                                                                                  |
| `input[]` where `role:"developer"`                                           | `system: ClaudeTextBlock[]`          | One block per developer message, original order, **array form** (§4 — required for cache-breakpoint eligibility).                                                                                                                |
| `input[]` message/`function_call`/`function_call_output`                     | `messages: ClaudeMessage[]`          | Coalesced by logical role, §4.                                                                                                                                                                                                   |
| content parts                                                                | `ClaudeTextBlock`/`ClaudeImageBlock` | `toClaudeContentPart`, §3.7 (data-URI fix).                                                                                                                                                                                      |
| `additional_tools.tools[].tools[]` (namespace order, then declaration order) | `tools: ClaudeTool[]`                | Flattened via nested `.flatMap()` in fixed order, never through a name-keyed `Map` (cache-prefix order, §7). Corrected: real traffic's split is per-tool-declaration `type` (`"function"`/`"custom"`), not per-namespace — §3.4. |
| `tool_choice`                                                                | `tool_choice`                        | §3.3, exact inversion of `codexFallback.ts:445-456`.                                                                                                                                                                             |
| `reasoning.effort`                                                           | `thinking`                           | §3.4 table; omitted for `none`/`minimal`.                                                                                                                                                                                        |
| (none)                                                                       | `max_tokens`                         | `resolveClaudeMaxTokens(target.model, undefined)` (`src/lib/utils/tokenLimits.ts:178`) — genuine inbound requests carry no equivalent field, confirmed absent in all 4 fixtures.                                                 |
| (none)                                                                       | `temperature`, `top_p`               | Omitted both targets — no safe mapping, mirrors `convertClaudeRequestToCodex`'s own reason for omitting the reverse fields (`codexFallback.ts:456-461`).                                                                         |
| `stream`                                                                     | `stream`                             | Passthrough, default `true` if absent. Whether it's served as SSE or buffered is the response-translation section's concern.                                                                                                     |
| `session_id`/`thread_id`                                                     | —                                    | **Deliberately not mapped into `ClaudeMetadata.user_id`** — that field expects a caller-supplied hash, not a raw session id, and nothing on this leg reads it. Flagged for orchestration to override if a concrete need appears. |

#### 3.3 `tool_choice` — exact inversion of `codexFallback.ts:445-456`

| Codex `tool_choice`          | Anthropic `tool_choice`  |
| ---------------------------- | ------------------------ |
| `"required"`                 | `{ type: "any" }`        |
| `{ type: "function", name }` | `{ type: "tool", name }` |
| `"auto"`                     | `{ type: "auto" }`       |
| `"none"`                     | `{ type: "none" }`       |
| absent                       | omit field               |

```ts
function mapCodexToolChoiceToClaude(
  choice:
    | "auto"
    | "required"
    | "none"
    | { type: "function"; name: string }
    | undefined,
): ClaudeRequest["tool_choice"] | undefined {
  if (choice === undefined) return undefined;
  if (choice === "required") return { type: "any" };
  if (choice === "auto") return { type: "auto" };
  if (choice === "none") return { type: "none" };
  return { type: "tool", name: choice.name };
}
```

Unobserved in all 4 fixtures — the table is derived correctly from the existing forward code but not empirically confirmed on genuine traffic (§10).

#### 3.4 Tools: flattened across namespaces, split by each declaration's own `type` (corrected — was per-namespace)

**Reconciled with the tool-fidelity section's real-capture correction**: the prior version of this subsection discriminated by which bucket a tool sat in (`functions` vs `collaboration`), grounded only against the 4 synthetic fixtures. The real captured wire sample shows the opposite: `additional_tools.tools` is an array of **namespaces** (e.g. `"functions"`, `"collaboration"`), and _inside_ a namespace, individual declarations can be either kind — in the real capture, the `"functions"` namespace holds two `type:"function"` tools (`wait`, `request_user_input`) _and_ one `type:"custom"` tool (`exec`, grammar-based). Discriminating by namespace name would have misclassified `exec`. The correct split reads each declaration's own `type` field, across every namespace, in namespace order then declaration order:

```ts
function mapCodexFunctionToolToClaude(
  tool: CodexNativeFunctionToolDeclaration,
): ClaudeTool {
  return {
    name: tool.name,
    ...(tool.description ? { description: tool.description } : {}),
    input_schema: tool.parameters,
  };
}

function mapCodexCustomToolToClaude(
  tool: CodexNativeCustomToolDeclaration,
): ClaudeTool {
  // Lossy, explicitly flagged: no JSON Schema exists for a Lark/regex grammar.
  // The model is no longer grammar-constrained after this mapping. SIGNED OFF
  // 2026-09-28 (§10, ruling 7): shipped as designed, not a placeholder.
  return {
    name: tool.name,
    description: [
      tool.description,
      `Grammar (${tool.format.syntax}):\n${tool.format.definition}`,
    ]
      .filter((s): s is string => Boolean(s))
      .join("\n\n"),
    input_schema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "Raw command text, constrained by the grammar in this tool's description.",
        },
      },
      required: ["input"],
    },
  };
}

function mapCodexToolDeclarationToClaude(
  tool: CodexNativeToolDeclaration,
): ClaudeTool {
  // Discriminate on the declaration's own `type`, never on which namespace it came
  // from — corrected blocker: the first design pass assumed namespace membership
  // implied kind (`collaboration` = grammar-only), which the real capture disproves
  // (`exec` is `type:"custom"` inside the `"functions"` namespace) and would have
  // silently destroyed a `type:"function"` entry's real `input_schema`.
  return tool.type === "custom"
    ? mapCodexCustomToolToClaude(tool)
    : mapCodexFunctionToolToClaude(tool);
}

function buildClaudeTools(
  additionalTools: CodexNativeAdditionalToolsInputItem | undefined,
): ClaudeTool[] | undefined {
  if (!additionalTools) return undefined;
  const tools = additionalTools.tools.flatMap((namespace) =>
    namespace.tools.map(mapCodexToolDeclarationToClaude),
  );
  return tools.length > 0 ? tools : undefined;
}
```

The `input` key in the custom-tool branch's schema is deliberate: it must match what `parseInboundToolArguments` (§3.6) synthesizes for that tool's non-JSON `function_call.arguments` — the schema and the argument fallback are two halves of one contract.
Cardinality: only one `additional_tools` item is handled (last one wins if more than one appears — unobserved whether that's possible, §10); this should become a hard `MALFORMED_REQUEST` once real traffic confirms the cardinality, rather than silently dropping a tool set.

#### 3.5 Reasoning: `reasoning.effort` → `thinking`

No existing precedent (zero references anywhere in the codebase) — novel and unvalidated against real responses.

| `effort`          | `thinking`                                  |
| ----------------- | ------------------------------------------- |
| `none`, `minimal` | omit                                        |
| `low`             | `{ type: "enabled", budget_tokens: 4096 }`  |
| `medium`          | `{ type: "enabled", budget_tokens: 8192 }`  |
| `high`            | `{ type: "enabled", budget_tokens: 16384 }` |
| `xhigh`           | `{ type: "enabled", budget_tokens: 24576 }` |
| `max`             | `{ type: "enabled", budget_tokens: 32768 }` |

```ts
const REASONING_BUDGET: Record<
  Exclude<CodexReasoningEffort, "none" | "minimal">,
  number
> = {
  low: 4096,
  medium: 8192,
  high: 16384,
  xhigh: 24576,
  max: 32768,
};

function mapCodexReasoningToThinking(
  reasoning: { effort: CodexReasoningEffort } | undefined,
  resolvedMaxTokens: number,
): ClaudeRequest["thinking"] | undefined {
  if (
    !reasoning ||
    reasoning.effort === "none" ||
    reasoning.effort === "minimal"
  ) {
    return undefined;
  }
  const table = REASONING_BUDGET[reasoning.effort];
  // Explicit floor — resolves minor finding: today's getClaudeMaxOutputTokens
  // (src/lib/utils/tokenLimits.ts:141-170) floors at 4096 for every known
  // model so `- 1024` never underflows Anthropic's ~1024 minimum today, but
  // that was an accident of the current model table, not a guarantee this
  // formula enforced. Math.max(1024, ...) makes it correct by construction.
  const budget_tokens = Math.max(
    1024,
    Math.min(table, resolvedMaxTokens - 1024),
  );
  return { type: "enabled", budget_tokens };
}
```

`ClaudeRequest.thinking.type` is a loose `string`, not a literal union, in the pre-existing shared type (`src/lib/types/proxy.ts:168`) — not fixed here; other call sites share it.

#### 3.6 Non-JSON `function_call.arguments`

The existing `parseFunctionArguments()` (`src/lib/proxy/codexFallback.ts:466-482`) **throws** on non-JSON and must not be reused — it parses the response-side leg (Codex's own model output, always valid JSON), whereas this leg parses a client-supplied history replay, which for `exec` is a raw shell string (`arguments: "ls -la"`, confirmed in `test/fixtures/codex-request-tool-result-turn.json`).

```ts
function parseInboundToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed)) return parsed;
  } catch {
    // fall through — not JSON at all (e.g. exec's raw shell command)
  }
  return { input: raw };
}
```

Never throws. `{ input: raw }` matches §3.4's grammar-tool schema exactly.

#### 3.7 Content parts, with the image fix

**Major finding resolved**: the first design pass mapped every `input_image.image_url` to `{type:"url", url: image_url}`. But Codex's own `image_url` field routinely carries a `data:` base64 URI — proven by this same codebase's opposite-direction code, `imageUrlForBlock` (`src/lib/proxy/codexFallback.ts:171-180`), which _constructs_ `` `data:${media_type};base64,${data}` `` when going Claude→Codex. Feeding that string into Anthropic's `url` source variant is invalid; it must become the `base64` variant.

```ts
const DATA_URI_RE = /^data:([^;,]+);base64,(.+)$/s;

function toClaudeContentPart(
  part: CodexContentPart,
): ClaudeTextBlock | ClaudeImageBlock {
  if (part.type === "input_image") {
    const match = DATA_URI_RE.exec(part.image_url);
    if (match) {
      return {
        type: "image",
        source: { type: "base64", media_type: match[1], data: match[2] },
      };
    }
    return { type: "image", source: { type: "url", url: part.image_url } };
  }
  return { type: "text", text: part.text };
}
```

No fixture contains an `input_image` part (§1) — this branch is untested by any existing fixture; §9 adds an inline-constructed test case for it since no fixture covers it.

### 4. Role-alternation coalescing

Anthropic enforces strict `user`/`assistant` alternation; the fixtures prove Codex's flat stream does not (two consecutive `user` items in all 4). The algorithm walks `input` once, appending to or flushing one "open group," never reordering:

```ts
type Group = { role: "user" | "assistant"; blocks: ClaudeContentBlock[] };

function coalesceCodexInputToClaudeMessages(
  items: readonly CodexNativeInputItem[],
): ClaudeMessage[] {
  const groups: Group[] = [];
  let current: Group | undefined;
  const open = (role: "user" | "assistant"): Group => {
    if (current?.role === role) return current;
    if (current) groups.push(current);
    current = { role, blocks: [] };
    return current;
  };

  for (const item of items) {
    if (item.type === "additional_tools") continue; // handled out-of-band, §3.4
    if (item.type === "message" && item.role === "developer") continue; // → system, below
    if (item.type === "message") {
      open(item.role as "user" | "assistant").blocks.push(
        ...item.content.map(toClaudeContentPart),
      );
      continue;
    }
    if (item.type === "function_call") {
      open("assistant").blocks.push({
        type: "tool_use",
        id: item.call_id,
        name: item.name,
        input: parseInboundToolArguments(item.arguments),
      });
      continue;
    }
    open("user").blocks.push({
      type: "tool_result",
      tool_use_id: item.call_id,
      content: item.output,
    });
  }
  if (current) groups.push(current);
  return groups.map((g) => ({ role: g.role, content: g.blocks }));
}

function buildSystemBlocksFromDeveloperMessages(
  items: readonly CodexNativeInputItem[],
): ClaudeTextBlock[] {
  return items
    .filter(
      (i): i is CodexNativeMessageItem =>
        i.type === "message" && i.role === "developer",
    )
    .flatMap((i) => i.content.map(toClaudeContentPart))
    .filter((b): b is ClaudeTextBlock => b.type === "text");
}
```

Two consecutive `user` items → one message, two text blocks (fixture-proven). N consecutive `function_call` → one `assistant` message with N `tool_use` blocks, `id` = verbatim `call_id` (this _is_ Anthropic's parallel-tool-call shape, no separate code path). N consecutive `function_call_output` → one `user` message with N `tool_result` blocks, `tool_use_id` matching verbatim.
**Unresolved, not silently assumed** (§10): every fixture puts all `developer` items before the first `user` item; the algorithm folds _every_ `developer` item into the system prefix regardless of position, which is only correct if real traffic never sends a mid-conversation `developer` nudge.

### 5. Blocker resolved: resumed-session history contract

The first design pass's translator silently assumed `input` always holds full conversation history, even on a resumed session. `codex-request-resumed-session.json` replays an input array **identical** to `codex-request-interactive-mode.json`'s (same 7 items, same roles) while carrying `session_id`/`thread_id` — but the generator's own header states these are hand-built approximations of a wire sample "NOT available in this environment," so this is the fixture generator's assumption, not observed Codex CLI behavior. Given the Responses API's stateful design (`session_id`/`thread_id` imply server-side memory) and Anthropic's Messages API having none, a resumed request that in reality carries only incremental turns would make this translator silently produce an amnesiac `ClaudeRequest` with no visible error.
**Resolution adopted** (review's option (a) fail-loud, not option (b) history-cache — a persisted-history cache is a stateful, session-routing concern that belongs with the orchestration/affinity section, not a pure translator): detect the shape and refuse translation rather than guess.

```ts
function hasFreshSessionPreamble(
  items: readonly CodexNativeInputItem[],
): boolean {
  return items[0]?.type === "additional_tools";
}

// inside translateCodexRequestToClaude, before building messages:
if (
  (request.session_id !== undefined || request.thread_id !== undefined) &&
  !hasFreshSessionPreamble(request.input)
) {
  return {
    ok: false,
    error: {
      code: "SUSPECTED_PARTIAL_HISTORY",
      message:
        "resumed session's input array is missing the fresh-session preamble; refusing to translate a possibly-incremental history as if it were complete",
    },
  };
}
```

This is a static best-effort guard, not proof of the real wire contract — see UNRESOLVED in §10. It converts an unknown into a loud, caller-visible failure instead of a silent one, which is what the "nothing may break silently" requirement demands even without live traffic.

### 6. Vertex delta — corrected hand-off

`ClaudeRequest` has no `output_config` field (`src/lib/types/proxy.ts:154-169`); `output_config` is a Claude-Code-CLI-specific dial that `buildVertexAnthropicPayload` (`src/lib/proxy/vertexAnthropicFallback.ts:399-428`) hoists/strips on its own untyped passthrough path — unrelated to `thinking`. `buildVertexAnthropicPayload` only reads/rewrites `model` (dropped — Vertex encodes it in the URL, `UNSUPPORTED_FIELDS` at line 42), `context_management`, `output_config`, `messages`, `system`; it never inspects `thinking`, so `thinking.budget_tokens` flows through untouched as the same standard Anthropic field. No second reasoning table needed for Vertex.
**Major finding resolved**: the first design pass's illustrative dispatch code called `buildVertexAnthropicPayload`/`buildVertexAnthropicUrl` directly and did a raw `fetch(...)` — that omits Google ADC bearer-token acquisition, non-2xx error handling, and usage telemetry, all of which the already-exported `executeVertexAnthropicFallback` (`src/lib/proxy/vertexAnthropicFallback.ts:611-666`) provides; confirmed its real signature is `(args: { body: Readonly<Record<string, unknown>>; model: string; signal?: AbortSignal; onTerminal?: (t: VertexPassthroughTerminal) => void }) => Promise<Response>` — it resolves `projectId`/`location` itself via `resolveVertexTarget()` and calls `dispatchVertexAnthropicPassthrough` internally, so those two builders are implementation details, not a standalone caller's building blocks:

```ts
const translated = translateCodexRequestToClaude(nativeRequest, target);
if (!translated.ok) {
  /* surface translated.error to caller — orchestration section */
}

// Anthropic-direct leg: pass translated.value straight to whatever builds the
// outbound Anthropic fetch (owned by the orchestration/dispatch section).

// Vertex leg — the ONLY per-target difference is which existing function the
// dispatcher calls; no second field-mapping function to keep in sync:
const response = await executeVertexAnthropicFallback({
  body: translated.value, // ClaudeRequest is a plain object type, assignable to Record<string, unknown> with no `as`
  model: target.model,
  signal, // supplied by the caller (orchestration/dispatch section)
  onTerminal, // supplied by the caller
});
```

`translated.value.model` is required by the type and used for the Anthropic-direct leg/logging, but must never be read back out for the Vertex model — Vertex resolves its own `target.model` independently (the dropped field, per `UNSUPPORTED_FIELDS`).

### 7. Determinism ledger (cache-prefix stability), with the corrected marker claim

1. Tool array order: namespace order, then declaration order within each namespace, via nested `.flatMap()`, never through a name-keyed `Map` (corrected — §3.4).
2. Message/system order preserved 1:1 from `input`; coalescing merges only adjacent same-role items.
3. `tool_use.id`/`tool_result.tool_use_id` = verbatim Codex `call_id` — never `generateToolUseId()` (`src/lib/proxy/claudeFormat.ts:35-37`, `randomBytes`-based, confirmed non-deterministic); this module imports nothing from it.
4. `generateMessageId()` (`claudeFormat.ts:28`) is response-serializer-only, never imported here.
5. `system` must be array-form, never a string — **minor finding resolved on where the marker actually lands**: `applyClaudeRequestCacheBreakpoints` (`src/lib/utils/anthropicCacheBreakpoints.ts:217-271`) marks the last **system** block whenever `Array.isArray(out.system) && out.system.length > 0` (line 244), and only falls through to marking the last **tool** when `system` is absent/empty (line 252) — a branch that is unreachable for any translated request here, since every genuine Codex request carries ≥1 developer message and this design always emits array-form `system`. The first design pass's ledger framed tool-array order as the operative cache-key constraint in the common case; corrected: for real Codex-origin traffic the marker lands on the last **system** block, and tool-array order matters only for the (here, unreachable) empty-system path. Tool-array ordering (point 1) still matters for its own sake (a stable `tools` array is part of what gets hashed into the prefix even when the breakpoint itself sits on `system`).
6. No cache-key derivation on this leg — `codexPromptCacheKey`/`codexCachePrefix` exist only for the other (Claude→Codex, OpenAI-caching) direction; Anthropic's caching is marker-based and needs none invented here.

### 8. CI gating gap found by grounding (not in either design or review pass)

The design's file list creates `test/continuous-test-suite-codex-outbound-translation.ts` but never wires it to run. `scripts/run-proxy-reliability.mjs`'s `checks` array is a **hardcoded list** — a new file in `test/` runs in CI only if added there (or to another script+workflow step). Precedent: this exact wrapper's own comment explains it added `test/continuous-test-suite-vertex-anthropic-fallback.ts` for the identical reason ("It had no npm script and no workflow reference, so its 51 cases never ran anywhere"). This section's suite must be added the same way:

`scripts/run-proxy-reliability.mjs` (modify): add `["tsx", "test/continuous-test-suite-codex-outbound-translation.ts"]` to the `checks` array (same pattern as the vertex-anthropic-fallback entry, with a comment stating why it's not `proxy-*`-templated). This keeps it gated by `test:proxy-reliability` (`package.json:170`) → `.github/workflows/ci.yml:445` inside `provider-safety-net-shards` (matrix `rest`) → required `provider-safety-net` job, satisfying the repo's "npm script AND workflow runs it" gating rule.

`scripts/generate-codex-fixtures.mjs` (modify): none of the 4 existing fixtures exercise N-parallel tool calls. Generalize the two zero-arg helpers with defaults that reproduce today's output byte-for-byte (`functionCallItem(callId = "call_synthetic_0001", name = "exec", args = "ls -la")`, `functionCallOutputItem(callId = "call_synthetic_0001", output = JSON.stringify({stdout:"total 0\ndrwxr-xr-x  2 codex  staff  64 Jan  1 00:00 .\n",stderr:"",exit_code:0}))`), then append one new `fixtures[]` entry, `codex-request-parallel-tool-calls.json`, with `extraInputItems: [functionCallItem("call_synthetic_0001","exec","ls -la"), functionCallItem("call_synthetic_0002","read_file", JSON.stringify({path:"src/index.ts"})), functionCallOutputItem("call_synthetic_0001"), functionCallOutputItem("call_synthetic_0002", JSON.stringify({content:"export {};\n"}))]` — 2 consecutive `function_call` then 2 consecutive `function_call_output`, one JSON args one non-JSON args in the same coalesced group.

`eslint.config.js` (modify): add `"test/continuous-test-suite-codex-outbound-translation.ts"` to the `neurolink/e2e-tests-only` `allow` array (~line 400 area, alongside the existing `vertex-anthropic-fallback` entry), with its own header comment stating the determinism exception (byte-stable cache-prefix output; a live call can't itself verify determinism).

### 9. Tests

All in `test/continuous-test-suite-codex-outbound-translation.ts` (new; `#!/usr/bin/env tsx`, plain `test()`/`asyncTest()` + `passed` counter + `console.log("Passed: N; Failed: 0; RESULT: PASS")` pattern, matching `test/continuous-test-suite-vertex-anthropic-fallback.ts`):

1. `parseCodexNativeRequest` returns `ok:false, code:"MALFORMED_REQUEST"` for a body missing `input`, and `ok:true` for all 5 fixture bodies (4 existing + new parallel-tool-calls one).
2. Feed all 5 fixtures through `translateCodexRequestToClaude` twice each; assert `JSON.stringify` equality both times (determinism).
3. Assert `.value.system` is always `ClaudeTextBlock[]`, never a string, for every fixture (cache-breakpoint array-gate dependency, §7 point 5).
4. `codex-request-interactive-mode.json`: assert its two consecutive `user` items collapse into one Claude message with exactly two content blocks (alternation invariant), and that its namespace's mixed-kind declarations map to two `ClaudeTool`s where the `type:"custom"` entry's `input_schema` is the single-`input`-string fallback schema and the `type:"function"` entry's `input_schema` equals its original `parameters` object byte-for-byte (per-declaration-type split, §3.4). **Depends on the fixture regeneration tool-fidelity §10 test #26 already tracks** — today's `test/fixtures/codex-request-*.json` still use the flat, pre-correction `{functions, collaboration}` shape (confirmed "still wrong relative to the real capture"), so this assertion cannot pass until those fixtures are regenerated to the namespace-array shape; it is not a new gap introduced here.
5. New `codex-request-parallel-tool-calls.json`: assert the 2 consecutive `function_call` items become one `assistant` message with 2 `tool_use` blocks whose `id`s are `call_synthetic_0001`/`call_synthetic_0002` verbatim, and the 2 `function_call_output` items become one `user` message with 2 `tool_result` blocks whose `tool_use_id`s match; assert `call_synthetic_0001`'s parsed input is `{input: "ls -la"}` and `call_synthetic_0002`'s is `{path: "src/index.ts"}` (both JSON and non-JSON arguments coalesced correctly in the same group).
6. `codex-request-tool-result-turn.json` (corrected from the wrong `exec-mode.json` reference): assert its `exec` call's non-JSON `"ls -la"` arguments translate to `{input: "ls -la"}` without throwing.
7. Inline-constructed case (no fixture has `input_image`, §1): a `CodexNativeMessageItem` with one `input_image` part whose `image_url` is `"data:image/png;base64,QUJD"` asserts `{type:"image", source:{type:"base64", media_type:"image/png", data:"QUJD"}}`; a second with `"https://example.com/x.png"` asserts `{type:"image", source:{type:"url", url:"https://example.com/x.png"}}`.
8. `tool_choice` table: each of `"required"`/`{type:"function",name:"x"}`/`"auto"`/`"none"`/`undefined` produces the exact §3.3 shape.
9. `reasoning.effort` table: each of `none`/`minimal`/low/medium/high/xhigh/max produces the exact §3.5 shape (or omission), and a case with a small `resolvedMaxTokens` (e.g. 2000) asserts `budget_tokens` is clamped to `Math.max(1024, ...)`, never below 1024.
10. `codex-request-resumed-session.json` mutated in-memory to drop its first (`additional_tools`) item: assert `translateCodexRequestToClaude` returns `ok:false, code:"SUSPECTED_PARTIAL_HISTORY"` (§5); the unmodified fixture (which still has the preamble) returns `ok:true`.
11. Tool-order/cache test: build a request with `functions` + `collaboration`, run `applyClaudeRequestCacheBreakpoints` on the translated output, assert the breakpoint lands on the last **system** block (not the last tool) — corrected assertion per §7 point 5.

### 10. Explicitly missing facts

1. UNRESOLVED: whether `additional_tools`/`developer` items can appear anywhere other than before the first `user` item in real traffic — the one check that would settle it: capture one real Codex CLI multi-turn session with a mid-conversation system nudge (e.g. a compaction event) and inspect its `input` ordering.
2. UNRESOLVED: whether a resumed-session request's `input` is genuinely full-history or incremental — the one check that would settle it: capture one real resumed-session Codex Responses request (the referenced `~/.neurolink/reference/codex-cli-wire-sample.json` is not available in this environment) and compare its `input.length` against the same session's prior turn.
3. UNRESOLVED: whether `tool_choice` or `reasoning` ever appear on genuine inbound requests at all (absent from all 4 fixtures) — the one check that would settle it: grep captured production Codex traffic logs (once available) for either key.
4. UNRESOLVED: whether more than one `additional_tools` item can appear in one request — the one check that would settle it: same real-traffic capture as (1).
5. **SIGNED OFF 2026-09-28** on the lossy grammar→single-string-parameter mapping in §3.4 (behavior-changing, not just encoding) and on the `{input: raw}` non-JSON fallback's downstream effect on tool execution (owned by the tool-fidelity section). Both ship as designed; see ruling 7 in the stage rulings record.

### 11. Files this section touches

`src/lib/types/codex.ts` (append types, per the tool-fidelity section's §8 — see the reconciliation note above), `src/lib/proxy/codexOutboundFallback.ts` (create), `scripts/generate-codex-fixtures.mjs` (generalize two helpers, add one fixture), `test/fixtures/codex-request-parallel-tool-calls.json` (generated, not hand-authored), `test/continuous-test-suite-codex-outbound-translation.ts` (create), `scripts/run-proxy-reliability.mjs` (add the new suite to `checks`), `eslint.config.js` (add the new suite to `neurolink/e2e-tests-only` `allow`). The config key lives in `src/lib/proxy/proxyConfig.ts`/`runtimeConfig.ts` per the rollout-and-config section's `codex-outbound-fallback-{enabled,targets,model-mappings}`, not `src/lib/types/subscription.ts`/`codexFallbackChain?` as this subsection originally proposed.

---

### Response translation: Anthropic → Codex wire format

Wire-level translation from an Anthropic-shaped upstream result (`ClaudeResponse` JSON, or the
Anthropic SSE vocabulary `message_start`/`content_block_start`/`content_block_delta`/`content_block_stop`/
`message_delta`/`message_stop`/`ping`) into the Codex Responses shape a native Codex client expects
(`response.*` SSE events, or one non-streaming Response JSON body). Out of scope: engine selection /
fallback trigger, OAuth/account selection, retry/cooldown policy, analytics recording — owned by sibling
sections `proxy-waste`, `cache-anthropic`, `cache-vertex`. Assumes an outer route already has an
Anthropic-shaped `Response` (from the Claude Code OAuth pool or Vertex) to translate; this section does not
touch `src/lib/server/routes/codexProxyRoutes.ts`.

### 1. Grounded facts (verified against `/Users/sachinsharma/Developer/Official/fix/proxy-ci-gaps-and-dead-leg-alert`)

- `ClaudeUsage` (`src/lib/types/proxy.ts:177`) = `{ input_tokens, output_tokens, cache_creation_input_tokens?, cache_read_input_tokens? }`. `ClaudeThinkingBlock` (`:118`) = `{ type:"thinking"; thinking: string }`, no `signature`. `ClaudeContentBlock` (`:124`) union has no refusal variant. `ClaudeToolUseBlock.input` (`:103`) is `Record<string, unknown>`, never `undefined` — so `JSON.stringify(block.input ?? {})` is defensive-only, not load-bearing.
- **Corrected citation (was Blocker, resolved):** `message_start` carries `input_tokens`/`cache_creation_input_tokens`/`cache_read_input_tokens`; `message_delta` carries only the running `output_tokens` total. Verified directly in this repo's own reader for the identical Anthropic-shape wire, `readUsageEvent` (`src/lib/proxy/vertexAnthropicFallback.ts:669-696`): it sets input+cache fields _only_ inside `if (event.type === "message_start")`, and unconditionally overwrites `outputTokens` from `message_delta`/`message_start`'s `usage.output_tokens`. The original draft of this section called `message_start` a no-op and read cache fields from `message_delta`; that was backwards and would have zeroed cache accounting on every response. Fixed in §4/§5 below.
- `SSEContentBlockDescriptor` (`proxy.ts:203-206`) gives tool `id`/`name` at `content_block_start`, so the Codex `function_call` item can be opened immediately, not deferred to block close.
- `SSEDeltaDescriptor` (`proxy.ts:208-212`) = `text_delta | thinking_delta | input_json_delta`; `input_json_delta.partial_json` is a plain string, **not individually valid JSON** — confirmed against this repo's own reverse-direction parser, `parseFunctionArguments` (`src/lib/proxy/codexFallback.ts:466-484`), which requires a fully-accumulated string before `JSON.parse`. A serializer method that validates JSON per-chunk cannot forward these incrementally; §3 fixes this with a raw-chunk delta method (was Major finding).
- `SSEPing` (`proxy.ts:266-268`) is a real member of `SSEEvent`, and this repo's own emitter proves it is not rare: `ClaudeStreamSerializer.ensureMessageStarted` (`src/lib/proxy/claudeFormat.ts:511`) emits a `ping` frame immediately after every `message_start`. `thinking_delta` is also a real, unhandled-by-us variant. Both must be named as no-op event types, not left implicit (was Major finding, fixed in §4/§5).
- The "never interleaves blocks" assumption is **not** grounded in `ClaudeStreamSerializer` (that class is this repo's own _outbound_ emitter for the reverse direction, not a parser of real inbound Anthropic traffic — citing it was the wrong artifact, a Minor finding). It is re-grounded here as external knowledge: Anthropic's public Messages API streaming contract guarantees one open content block at a time. Flagged, like the fuller Codex event vocabulary below, as not verified against a live capture in this repo.
- `preflightAnthropicStream` (`src/lib/proxy/streamOutcome.ts:47-93`) returns `{kind: "ready"|"empty"|"sse_error"|"transport_error", chunks, ...}`, reads only Anthropic SSE bytes (`extractSSEEvents`, `isSSEErrorEvent`), has zero Codex-client-shape coupling — reusable unmodified for the pre-commit boundary.
- The carry/searchFrom SSE-frame-boundary scanner in `createCodexFallbackStream` (`codexFallback.ts:759-906`) uses a `/\r?\n\r?\n/g` boundary regex, a `16 * 1024 * 1024` char ceiling (`maxChars`), and rescans only `carry.length - 3` bytes of overlap — verified line-for-line, and it is also where `response.completed`'s own re-walk of `responseBody.output[]` happens (`:895-901`, not in the buffered `parseCodexFallbackSSE` as originally miscited) to catch items whose per-delta text/tool events never fired. This is the artifact to reuse or extract, not `parseCodexFallbardSSE`.
- Only `response.completed`'s usage payload is independently verified against real captured traffic (`test/fixtures/codex-response-usage.sse`: `input_tokens:17339, cached_tokens:8576, output_tokens:7, total_tokens:17346` → `17339+7=17346`, proving Codex `total_tokens = input_tokens(inclusive) + output_tokens`). The fuller vocabulary this design emits (`response.created`, `.output_item.*`, `.content_part.*`, `.output_text.*`, `.function_call_arguments.*`) is corroborated by this repo's own consumption code, `codexUsage.ts:71-337` (recognizes exactly these types plus `refusal.*`/`custom_tool_call_input.*`, which we do not emit — see §5), but **no live native-Codex capture of this exact vocabulary exists in this repo**. UNRESOLVED: a genuine live-captured native Codex Responses SSE transcript (text, tool-call, incomplete/error cases) — the check that would settle it is running a real Codex client through this proxy in observe-only mode and saving the bytes as new `test/fixtures/*.sse`, the way `codex-response-usage.sse` was captured 2026-08-21.
- **Resolved (was open question in the earlier draft):** whether native Codex clients ever send `stream:false` to this proxy. Checked `src/lib/server/routes/codexProxyRoutes.ts` directly — `executeCodexResponsesRequest` hardcodes `stream: true` in every tracer/log/capture call (`:558`, `:591`, `:686`, `:697`) and never reads an inbound `body.stream` field (zero matches for `body.stream` in the file). **No code path in this repository can currently construct a non-streaming Codex request.** §7's JSON path therefore has no live caller today; it is written for completeness and for a future native client that sends `stream:false`, not as something this section's tests need to prove reachable from `codexProxyRoutes.ts` (that wiring, if ever added, is `proxy-waste`'s).
- `test/continuous-test-suite-proxy-telemetry.ts:698` defines `withHttpFixture` as a local, non-exported `async function` — the new suite cannot import it and must define its own equivalent local harness.
- Rule 15 (`CLAUDE.md:52`, "tests are end-to-end only") already has a documented carve-out this section's sibling suite uses: `test/continuous-test-suite-codex.ts:5-19` states a "Determinism exception (CLAUDE.md rule 15)" for importing `src/lib/proxy/codexFallback.js` internals directly, reserving only two CLI-subprocess cases to prove the shipped package wires things up. The new suite must carry the same explicit exception header, since the ordering-invariant/property tests need to drive `CodexResponsesStreamSerializer` directly.

### 2. Types — `src/lib/types/codex.ts` (modify; append below existing Codex types, barrel `src/lib/types/index.ts:19` already does `export * from "./codex.js"`, no change needed there)

```ts
export type CodexResponseItemStatus =
  | "in_progress"
  | "completed"
  | "incomplete";

/** Wire usage block inside a synthesized response.completed / non-stream response. */
export type CodexResponseUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  /** Omitted entirely when neither cache field was observed on the Anthropic side. */
  input_tokens_details?: {
    cached_tokens?: number;
    cache_write_tokens?: number;
  };
  /** Always omitted — ClaudeUsage carries no reasoning-token count to source it from. */
  output_tokens_details?: { reasoning_tokens?: number };
};

export type CodexResponseOutputTextPart = {
  type: "output_text";
  text: string;
  annotations: [];
};

export type CodexResponseMessageItem = {
  id: string;
  type: "message";
  role: "assistant";
  status: CodexResponseItemStatus;
  content: CodexResponseOutputTextPart[];
};

export type CodexResponseFunctionCallItem = {
  id: string;
  type: "function_call";
  status: CodexResponseItemStatus;
  call_id: string;
  name: string;
  /** Concatenation of raw partial_json fragments. Valid JSON when status is
   *  "completed"; may be a truncated, non-JSON fragment when status is
   *  "incomplete" (closed early by a mid-stream failure — see §6). */
  arguments: string;
};

export type CodexResponseItem =
  | CodexResponseMessageItem
  | CodexResponseFunctionCallItem;

/** Fixes the former Blocker: item status literals now include "incomplete", matching
 *  what §6's failure-closure actually needs to assign (was "in_progress"|"completed" only,
 *  which could not typecheck a failure closure under this repo's TS-strict rule). */
export type CodexResponseEnvelope = {
  id: string;
  object: "response";
  created_at: number;
  status: "completed" | "incomplete" | "failed";
  model: string;
  output: CodexResponseItem[];
  usage?: CodexResponseUsage;
  incomplete_details: { reason: "max_output_tokens" } | null;
  error: { code: string; message: string } | null;
};

export type CodexResponseSSEEventType =
  | "response.created"
  | "response.output_item.added"
  | "response.content_part.added"
  | "response.output_text.delta"
  | "response.output_text.done"
  | "response.content_part.done"
  | "response.function_call_arguments.delta"
  | "response.function_call_arguments.done"
  | "response.output_item.done"
  | "response.completed"
  | "response.incomplete"
  | "response.failed";

export type CodexResponseStream = {
  frames: AsyncGenerator<string, CodexResponseEnvelope>;
  cancel: (reason?: unknown) => Promise<void>;
};
```

### 3. New module — `src/lib/proxy/codexResponsesFormat.ts` (create; pure wire-format, mirrors `claudeFormat.ts`'s role; imports `formatSSE` from `claudeFormat.ts` unmodified — it is already provider-agnostic, `event: <type>\ndata: <json>\n\n`, `claudeFormat.ts:404-407`)

```ts
export function generateCodexResponseId(): string {
  return `resp_${randomBytes(24).toString("base64url")}`; // same idiom as generateToolUseId, claudeFormat.ts:35-36
}
export function generateCodexItemId(kind: "message" | "function_call"): string {
  const prefix = kind === "message" ? "msg_" : "fc_";
  return `${prefix}${randomBytes(18).toString("base64url").slice(0, 24)}`;
}
export function codexCallIdFromToolUseId(toolUseId: string): string {
  return toolUseId;
} // see §5 decision

function mapClaudeStopReasonToCodex(stopReason: string | null): {
  status: "completed" | "incomplete";
  incomplete_details: CodexResponseEnvelope["incomplete_details"];
} {
  if (stopReason === "max_tokens") {
    return {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
    };
  }
  // Deliberate simplification, stated explicitly (was Minor finding — silently asserted
  // before): ClaudeResponse.stop_reason is `string | null` with no enum in this repo
  // (proxy.ts:191), so any value this repo cannot name — including a real Anthropic
  // "refusal" or "pause_turn" — falls into "completed" rather than surfacing as unusual.
  return { status: "completed", incomplete_details: null };
}

export function synthesizeCodexUsage(usage: ClaudeUsage): CodexResponseUsage {
  const cacheRead = usage.cache_read_input_tokens;
  const cacheCreation = usage.cache_creation_input_tokens;
  const inputTokens =
    usage.input_tokens + (cacheRead ?? 0) + (cacheCreation ?? 0);
  const details =
    cacheRead === undefined && cacheCreation === undefined
      ? undefined
      : {
          ...(cacheRead === undefined ? {} : { cached_tokens: cacheRead }),
          ...(cacheCreation === undefined
            ? {}
            : { cache_write_tokens: cacheCreation }),
        };
  return {
    input_tokens: inputTokens,
    output_tokens: usage.output_tokens,
    total_tokens: inputTokens + usage.output_tokens,
    ...(details ? { input_tokens_details: details } : {}),
  };
}

/** Shared by the streaming serializer's item-close and the non-streaming path. */
export function buildCodexResponseItem(
  block: ClaudeContentBlock,
  itemId: string,
): CodexResponseItem | null {
  if (block.type === "text") {
    return {
      id: itemId,
      type: "message",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text: block.text, annotations: [] }],
    };
  }
  if (block.type === "tool_use") {
    return {
      id: itemId,
      type: "function_call",
      status: "completed",
      call_id: codexCallIdFromToolUseId(block.id),
      name: block.name,
      arguments: JSON.stringify(block.input),
    };
  }
  return null; // thinking / image / tool_result — not emitted, see §5
}

export function serializeCodexResponse(
  result: ClaudeResponse,
  requestModel: string,
): CodexResponseEnvelope {
  const items: CodexResponseItem[] = [];
  for (const block of result.content) {
    const item = buildCodexResponseItem(
      block,
      generateCodexItemId(
        block.type === "tool_use" ? "function_call" : "message",
      ),
    );
    if (item) items.push(item);
  }
  const { status, incomplete_details } = mapClaudeStopReasonToCodex(
    result.stop_reason,
  );
  return {
    id: generateCodexResponseId(),
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    status,
    model: requestModel,
    output: items,
    usage: synthesizeCodexUsage(result.usage),
    incomplete_details,
    error: null,
  };
}

/** Push-based streaming serializer. Fixes the former Major findings: a genuinely
 *  incremental tool-call-argument path (openToolCall/pushToolCallArgsDelta/closeToolCall,
 *  replacing a single-shot pushToolUse(input: unknown) that could not forward partial_json
 *  chunks without buffering first), and a status literal that can represent a failure close. */
export class CodexResponsesStreamSerializer {
  private state: "idle" | "streaming" | "done" | "error" = "idle";
  private readonly responseId = generateCodexResponseId();
  private outputIndex = 0;
  private openKind: "message" | "function_call" | null = null;
  private openItemId = "";
  private textAccum = "";
  private argsAccum = "";
  private toolCallId = "";
  private toolName = "";
  private readonly closedItems: CodexResponseItem[] = [];
  constructor(private readonly model: string) {}

  *start(): Generator<string> {
    this.assertNotTerminal();
    this.state = "streaming";
    yield formatSSE("response.created", {
      type: "response.created",
      response: {
        id: this.responseId,
        object: "response",
        status: "in_progress",
        created_at: Math.floor(Date.now() / 1000),
        model: this.model,
        output: [],
        usage: null,
        incomplete_details: null,
        error: null,
      },
    });
  }

  *pushDelta(text: string): Generator<string> {
    this.assertNotTerminal();
    if (this.openKind !== "message") {
      yield* this.closeOpenItem();
      yield* this.openMessage();
    }
    this.textAccum += text;
    yield formatSSE("response.output_text.delta", {
      type: "response.output_text.delta",
      output_index: this.outputIndex,
      item_id: this.openItemId,
      content_index: 0,
      delta: text,
    });
  }

  /** Opens the function_call item header at content_block_start, before any argument text
   *  is known — mirrors what content_block_start already gives us (id, name). */
  *openToolCall(toolUseId: string, name: string): Generator<string> {
    this.assertNotTerminal();
    yield* this.closeOpenItem();
    this.openKind = "function_call";
    this.openItemId = generateCodexItemId("function_call");
    this.toolCallId = codexCallIdFromToolUseId(toolUseId);
    this.toolName = name;
    this.argsAccum = "";
    yield formatSSE("response.output_item.added", {
      type: "response.output_item.added",
      output_index: this.outputIndex,
      item: {
        id: this.openItemId,
        type: "function_call",
        status: "in_progress",
        call_id: this.toolCallId,
        name: this.toolName,
        arguments: "",
      },
    });
  }

  /** Forwards one raw partial_json fragment as-is — no JSON.parse here, because a lone
   *  fragment is not required to be valid JSON on its own (proxy.ts SSEDeltaDescriptor). */
  *pushToolCallArgsDelta(rawChunk: string): Generator<string> {
    this.assertNotTerminal();
    if (this.openKind !== "function_call") {
      throw new Error("pushToolCallArgsDelta with no open function_call item");
    }
    this.argsAccum += rawChunk;
    yield formatSSE("response.function_call_arguments.delta", {
      type: "response.function_call_arguments.delta",
      output_index: this.outputIndex,
      item_id: this.openItemId,
      delta: rawChunk,
    });
  }

  /** Validates the accumulated arguments once, at block close — the one place validity is
   *  required. Throws on malformed JSON; caller (§4) must catch and route to emitFailure. */
  *closeToolCall(): Generator<string> {
    this.assertNotTerminal();
    if (this.openKind !== "function_call") {
      return;
    }
    JSON.parse(this.argsAccum || "{}"); // throws on malformed JSON — never swallowed
    yield formatSSE("response.function_call_arguments.done", {
      type: "response.function_call_arguments.done",
      output_index: this.outputIndex,
      item_id: this.openItemId,
      arguments: this.argsAccum,
    });
    const item: CodexResponseFunctionCallItem = {
      id: this.openItemId,
      type: "function_call",
      status: "completed",
      call_id: this.toolCallId,
      name: this.toolName,
      arguments: this.argsAccum,
    };
    yield formatSSE("response.output_item.done", {
      type: "response.output_item.done",
      output_index: this.outputIndex,
      item,
    });
    this.closedItems.push(item);
    this.openKind = null;
    this.outputIndex++;
  }

  *finish(stopReason: string | null, usage: ClaudeUsage): Generator<string> {
    this.assertNotTerminal();
    yield* this.closeOpenItem();
    const { status, incomplete_details } =
      mapClaudeStopReasonToCodex(stopReason);
    const envelope: CodexResponseEnvelope = {
      id: this.responseId,
      object: "response",
      created_at: Math.floor(Date.now() / 1000),
      status,
      model: this.model,
      output: this.closedItems,
      usage: synthesizeCodexUsage(usage),
      incomplete_details,
      error: null,
    };
    this.state = "done";
    yield formatSSE(
      status === "incomplete" ? "response.incomplete" : "response.completed",
      {
        type:
          status === "incomplete"
            ? "response.incomplete"
            : "response.completed",
        response: envelope,
      },
    );
  }

  /** Post-commit terminal path (§6). Closes any open item as "incomplete" — now representable
   *  since CodexResponseItemStatus includes it — then emits a single response.failed. */
  *emitFailure(
    status: number,
    message: string,
    code?: string,
  ): Generator<string> {
    if (this.state === "done" || this.state === "error") {
      return;
    }
    yield* this.closeOpenItem(true);
    this.state = "error";
    yield formatSSE("response.failed", {
      type: "response.failed",
      response: {
        id: this.responseId,
        object: "response",
        created_at: Math.floor(Date.now() / 1000),
        status: "failed",
        model: this.model,
        output: this.closedItems,
        usage: null,
        incomplete_details: null,
        error: { code: code ?? "upstream_error", message },
      },
    });
  }

  private assertNotTerminal(): void {
    if (this.state === "done" || this.state === "error") {
      throw new Error(
        "CodexResponsesStreamSerializer: push after terminal event",
      );
    }
  }
  // openMessage/closeOpenItem(failed?): emit output_item.added / content_part.added+done /
  // output_text.done / output_item.done for a message item, or delegate to closeToolCall()
  // for a function_call item; when `failed` is true, assign status:"incomplete" instead of
  // "completed" on whichever item is open (text: content = whatever accumulated in
  // textAccum; function_call: arguments = this.argsAccum verbatim, NOT re-validated —
  // JSON.parse is not called on the failure path). Elided for brevity, frame shapes given
  // per-event in §5.
}
```

### 4. New driver — `src/lib/proxy/codexToAnthropicFallback.ts` (create; mirrors `codexFallback.ts`, inverted; named after its own upstream, an Anthropic-shape engine, by the same convention `codexFallback.ts` is named after Codex)

```ts
export class AnthropicFallbackResponseError extends Error {
  readonly status: number;
  readonly responseBody: string;
}
export class AnthropicFallbackStreamError extends Error {
  readonly status: number;
  readonly code: string;
  readonly usage?: CodexResponseUsage;
}

export async function consumeAnthropicFallbackResponse(
  response: Response,
  model: string,
): Promise<CodexResponseEnvelope> {
  // validate response.ok / content-type, JSON.parse body as ClaudeResponse, delegate to
  // serializeCodexResponse(body, model) — no message_start/message_delta split here (§1: a
  // single JSON object carries the whole turn's usage at once, confirmed against
  // settleFromResponseUsage, claudeProxyRoutes.ts:4660-4680).
}

export async function createAnthropicFallbackStream(
  response: Response,
  model: string,
): Promise<CodexResponseStream> {
  const reader = response.body.getReader();
  let cancellation: Promise<void> | undefined;
  const cancel = (reason?: unknown): Promise<void> => {
    // Fixes the former Minor finding (cancel was unspecified): mirrors codexFallback.ts's
    // own cancel exactly (:741-746) so a Codex-client disconnect promptly releases the
    // upstream reader lock and its account admission lease (claudeProxyRoutes.ts:622
    // tryAcquireAccountAdmission holds a lease for the whole stream lifetime).
    cancellation ??= reader
      .cancel(reason)
      .catch(() => undefined)
      .finally(() => reader.releaseLock());
    return cancellation;
  };
  const preflight = await preflightAnthropicStream(reader); // streamOutcome.ts:47, reused unmodified
  if (preflight.kind !== "ready") {
    // Review finding, resolved: this branch threw without calling `cancel()`, leaving
    // the upstream reader and its account admission lease active. `cancel()` is
    // idempotent (`cancellation ??=`), so calling it here and never again elsewhere is
    // safe even if the caller also disconnects later.
    await cancel();
    // Pre-commit: nothing Codex-shaped sent yet. Throw and let the outer route (proxy-waste,
    // out of scope) decide whether to try the next engine.
    throw new AnthropicFallbackStreamError(/* ... */);
  }
  const serializer = new CodexResponsesStreamSerializer(model);
  async function* frames(): AsyncGenerator<string, CodexResponseEnvelope> {
    yield* serializer.start();
    let capturedInput = 0,
      capturedCacheCreate = 0,
      capturedCacheRead = 0,
      capturedOutput = 0,
      capturedStopReason: string | null = null;
    // Feed preflight.chunks THROUGH the interpreter first (never replay raw Anthropic bytes
    // to a Codex-speaking client — the one place a copy of the Claude-facing route's "replay
    // buffered chunks raw" logic would be wrong), then continue with the live remainder using
    // the SAME carry/searchFrom scanner codexFallback.ts already has (§1, §9).
    // Per parsed Anthropic event:
    //   message_start  -> capturedInput = event.message.usage.input_tokens;
    //                      capturedCacheCreate = event.message.usage.cache_creation_input_tokens ?? 0;
    //                      capturedCacheRead = event.message.usage.cache_read_input_tokens ?? 0;
    //                      (fixes former Blocker — this is NOT a no-op; mirrors
    //                      readUsageEvent, vertexAnthropicFallback.ts:680-684, exactly)
    //   ping           -> zero frames (fixes former Major: was unnamed)
    //   content_block_start type:"text"    -> no event alone; first delta opens via pushDelta
    //   content_block_start type:"tool_use"-> yield* serializer.openToolCall(block.id, block.name)
    //   content_block_start type:"thinking"-> zero frames (dropped by design, §5)
    //   content_block_delta text_delta       -> yield* serializer.pushDelta(delta.text)
    //   content_block_delta thinking_delta   -> zero frames (fixes former Major: was unnamed)
    //   content_block_delta input_json_delta -> yield* serializer.pushToolCallArgsDelta(delta.partial_json)
    //     (fixes former Major: genuinely incremental now, not buffer-then-single-emit)
    //   content_block_stop (open item is function_call) ->
    //     try { yield* serializer.closeToolCall() }
    //     catch (e) { yield* serializer.emitFailure(502, "Codex fallback tool arguments were not valid JSON", "invalid_tool_arguments"); return <matching envelope>; }
    //     (fixes former Major: malformed-JSON parse failure is now a named, handled case,
    //     not a fallthrough exception — mirrors codexFallback.ts's own discipline that a
    //     caller "must never retry after emitting output", :715-718)
    //   content_block_stop (open item is text) -> close text item (content_part.done/output_item.done)
    //   message_delta  -> capturedStopReason = delta.stop_reason; capturedOutput = usage.output_tokens
    //                     (ONLY output_tokens read here — never input/cache fields, fixes former Blocker)
    //   message_stop   -> yield* serializer.finish(capturedStopReason,
    //                        { input_tokens: capturedInput, output_tokens: capturedOutput,
    //                          cache_creation_input_tokens: capturedCacheCreate,
    //                          cache_read_input_tokens: capturedCacheRead }); return envelope;
    //   any other event type -> zero frames (fixes former Major: explicit catch-all, so a
    //     stray unrecognized event can never trip assertNotTerminal's throw)
    // On a mid-stream reader error or an SSE `error` event (post-commit, ≥1 frame already
    // flushed): yield* serializer.emitFailure(...) — the only path available once bytes are
    // committed (§6).
  }
  return { frames: frames(), cancel };
}
```

### 5. Concrete event-to-event mapping (streaming path)

Ordering invariants (asserted by construction of `closedItems`/`outputIndex`, not just described):

1. Exactly one `response.created` precedes every other `response.*` event.
2. `response.output_item.added` for `output_index=i` precedes any `content_part.*`/`output_text.*`/`function_call_arguments.*` carrying that same `i`.
3. Items never interleave (external knowledge: Anthropic's public streaming contract — see §1 correction).
4. Exactly one terminal event (`response.completed` XOR `response.incomplete` XOR `response.failed`) is last; any push after it throws (`assertNotTerminal`).
5. A terminal event's `response.output[]` equals, in order, exactly `this.closedItems` — true by construction (both are populated by the same close calls), not by analogy to the reverse direction.

**Text block**, `itemId = generateCodexItemId("message")`:

```
response.output_item.added   {output_index:i, item:{id:itemId,type:"message",role:"assistant",status:"in_progress",content:[]}}
response.content_part.added  {output_index:i, item_id:itemId, content_index:0, part:{type:"output_text",text:"",annotations:[]}}
response.output_text.delta   {output_index:i, item_id:itemId, content_index:0, delta:<chunk>}   × one per Anthropic text_delta, 1:1
response.output_text.done    {output_index:i, item_id:itemId, content_index:0, text:<full text>}
response.content_part.done   {output_index:i, item_id:itemId, content_index:0, part:{type:"output_text",text:<full text>,annotations:[]}}
response.output_item.done    {output_index:i, item:{id:itemId,type:"message",status:"completed",content:[{type:"output_text",text:<full text>,annotations:[]}]}}
```

**Tool-use block**, `itemId = generateCodexItemId("function_call")`, `call_id = codexCallIdFromToolUseId(block.id)`:

```
response.output_item.added             {output_index:i, item:{id:itemId,type:"function_call",status:"in_progress",call_id,name,arguments:""}}    -- at content_block_start (openToolCall)
response.function_call_arguments.delta {output_index:i, item_id:itemId, delta:<raw partial_json chunk>}  × one per Anthropic input_json_delta, forwarded verbatim, no JSON validation
response.function_call_arguments.done  {output_index:i, item_id:itemId, arguments:<full JSON string>}    -- at content_block_stop, after JSON.parse succeeds (closeToolCall)
response.output_item.done              {output_index:i, item:{id:itemId,type:"function_call",status:"completed",call_id,name,arguments:<full JSON>}}
```

Always emit at least one `function_call_arguments.delta` even for a zero-argument tool call (mirrors `ClaudeStreamSerializer.pushToolUse` never skipping emission for empty input, `claudeFormat.ts:634-650`).

**Unmapped events** (fixes former Major finding — now explicit, not implicit): `ping`, `thinking_delta`, `content_block_start type:"thinking"`, and any other event type not named above are consumed and produce **zero** Codex-shape frames. This is what makes `ClaudeStreamSerializer.ensureMessageStarted`'s guaranteed post-`message_start` ping (`claudeFormat.ts:511`) harmless rather than a crash via `assertNotTerminal`.

**Thinking block**: not translated — `ClaudeThinkingBlock` has no `signature` (nothing to represent faithfully as a reasoning item), and no reasoning-stream event name is evidenced in this repo (§1). Extended-thinking content silently disappears across this fallback hop; flagged for reviewer awareness even though omission is the safest available choice.

**Tool-call id decision**: reuse `tool_use.id` (`toolu_...`) verbatim as `call_id`. Reason: nothing in this codebase validates `call_id` format on the way in, this proxy is the sole consumer of the id on the next turn's `function_call_output`, and no id-mapping table exists anywhere in this repo today (`codexFallback.ts`'s header states translation modules hold no session state). UNRESOLVED: whether the real ChatGPT backend accepts a non-`call_`-prefixed `call_id` on a _later_ turn served by a real, non-fallback Codex backend directly — the check that would settle it is replaying a captured multi-turn Codex conversation against the real backend with one `call_id` deliberately set to an opaque non-`call_`-prefixed string and observing accept/reject.

**Refusal path**: never emit `response.refusal.*` — `ClaudeContentBlock`'s union has no refusal variant (proxy.ts:124-129), so Anthropic-side refusals surface as ordinary text; there is nothing to distinguish. (This repo's reverse-direction reader, `codexUsage.ts:92-97`, does recognize a real Codex `refusal` item type — that is about _consuming_ genuine Codex output, irrelevant to what we _emit_ here since we only ever synthesize from Anthropic content.)

### 6. Failure handling and the commit boundary

- **Pre-commit** (nothing flushed): `preflightAnthropicStream` classifies `sse_error`/`transport_error`/`empty` before `serializer.start()` ever runs. The driver throws `AnthropicFallbackStreamError`/`AnthropicFallbackResponseError`; the (sibling-owned) outer route may try the next engine.
- **Post-commit** (≥1 frame flushed): a silent swap is impossible. `serializer.emitFailure(status, message, code)` closes any open item as `status:"incomplete"` (now typeable, §2) and emits one `response.failed`, never a bare `error` frame.
- **Malformed tool-call JSON** (fixes former Major finding — was unhandled): `closeToolCall()` throws when `JSON.parse(this.argsAccum || "{}")` fails. The driver's `content_block_stop` branch for an open function_call must `try`/`catch` this specific throw and route it through `serializer.emitFailure(502, "Codex fallback tool arguments were not valid JSON", "invalid_tool_arguments")` — a named case, not a fallthrough unhandled exception, mirroring `parseFunctionArguments`'s discipline that the caller must never retry after emitting output (`codexFallback.ts:715-718`).
- **Gotcha specific to this direction**: preflight's buffered chunks must run THROUGH the interpreter before the live remainder — never replayed raw, unlike the Claude-facing route where upstream shape equals client shape.

### 7. Non-streaming JSON path

When the inbound Codex request's `stream` is falsy/absent, return `serializeCodexResponse(claudeResponse, model)` directly as the HTTP JSON body (`Content-Type: application/json`) — the document root IS a `CodexResponseEnvelope`, the same shape carried inside `response.completed.response`. `buildCodexResponseItem` is shared with the streaming path so item shape is defined once. **Resolved** (§1): `codexProxyRoutes.ts` hardcodes `stream: true` and has no branch reading an inbound `stream` field, so this path is currently unreachable from the native Codex route — implement it for completeness and for a future client, but do not write a test asserting it is exercised end-to-end through that route today (there is no such route yet).

### 8. Scope boundary on `CodexResponseEnvelope`'s fields

Real OpenAI Responses API envelopes carry more fields (`temperature`, `tool_choice`, `tools`, `metadata`, `previous_response_id`, `parallel_tool_calls`, `truncation`, `text`, `reasoning`, `user`, …). This design specifies only `id`, `object`, `created_at`, `status`, `model`, `output`, `usage`, `incomplete_details`, `error` — the minimal subset a client needs for content/tool-calls/usage/status. Echoing more fields back from the original inbound request is an optional enhancement (the outer route would need to retain that request), not a gap.

### 9. Tests and CI gating

New fixture `test/fixtures/anthropic-to-codex-golden.sse`: one synthetic Anthropic SSE transcript (text + tool_use blocks, including a `ping` and a multi-chunk `input_json_delta`) with its exact expected Codex-shape SSE output, byte-for-byte.

New suite `test/continuous-test-suite-codex-response-translation.ts` (create). Must open with a "Determinism exception (CLAUDE.md rule 15)" header mirroring `test/continuous-test-suite-codex.ts:5-19` (importing `codexResponsesFormat.js`/`codexToAnthropicFallback.js` internals directly to unit-test deterministic SSE translation and ordering invariants — a live backend cannot be made to emit a specific malformed-JSON or interleaved-ping sequence on demand). Defines its own local HTTP-fixture helper (not imported — `withHttpFixture` in `continuous-test-suite-proxy-telemetry.ts:698` is unexported).

- `test/continuous-test-suite-codex-response-translation.ts`: "golden frame byte comparison" — feed the fixture transcript through `createAnthropicFallbackStream`, join emitted frames, assert exact string equality against `anthropic-to-codex-golden.sse`.
- `test/continuous-test-suite-codex-response-translation.ts`: "message_start populates cache usage" — feed a transcript whose `message_start.message.usage` has `cache_read_input_tokens:900, cache_creation_input_tokens:100, input_tokens:500` and whose `message_delta` omits both cache fields; assert the terminal envelope's `usage.input_tokens_details` equals `{cached_tokens:900, cache_write_tokens:100}` (fixes the former Blocker — this assertion fails against the pre-fix no-op design).
- `test/continuous-test-suite-codex-response-translation.ts`: "tool-call arguments forward incrementally, not buffered" — feed 3 separate `input_json_delta` frames for one tool call; assert 3 distinct `response.function_call_arguments.delta` SSE frames are emitted (not 1), each carrying its own raw chunk unmodified.
- `test/continuous-test-suite-codex-response-translation.ts`: "malformed tool JSON routes to response.failed" — feed an `input_json_delta` sequence whose concatenation is `{"a":` (truncated) followed by `content_block_stop`; assert the stream emits `response.failed` with `error.code === "invalid_tool_arguments"` and no `response.function_call_arguments.done` precedes it.
- `test/continuous-test-suite-codex-response-translation.ts`: "unmapped events are silently ignored" — feed a transcript containing `ping` and `thinking_delta` frames interleaved with text deltas; assert the Codex-shape output is byte-identical to the same transcript with those frames removed, and that no `assertNotTerminal` throw occurs.
- `test/continuous-test-suite-codex-response-translation.ts`: "ordering invariants hold over randomized streams" — property test over N synthetic Anthropic streams (varying block order and chunk boundaries): parse emitted Codex SSE back into events and assert the 5 invariants in §5 (single `response.created` first; `output_item.added` precedes its own index's part/delta events; no interleaved items; exactly one terminal event last; terminal `output[]` equals the closed-item sequence).
- `test/continuous-test-suite-codex-response-translation.ts`: "mid-stream reader failure closes the open item incomplete" — inject an upstream read error after ≥1 frame flushed; assert the currently-open item's `status` is `"incomplete"` before a single `response.failed`, and no further frames follow it.
- `test/continuous-test-suite-codex-response-translation.ts`: "non-streaming path shares item construction" — call `serializeCodexResponse` directly with a `ClaudeResponse` containing one text block and one tool_use block; assert both items match exactly what `buildCodexResponseItem` would produce for the streaming path's closed items (same function, both call sites).
- `test/continuous-test-suite-codex-response-translation.ts`: "tool-call id round-trips without a mapping table" — turn 1's synthesized `call_id` (the reused `toolu_...` id) is asserted equal to `block.id`; no id-mapping store is constructed or read (assert no such module is imported).
- `test/continuous-test-suite-codex-response-translation.ts`: "CI-gating check" — read `scripts/run-proxy-reliability.mjs`'s source text and assert it contains the literal string `"test/continuous-test-suite-codex-response-translation.ts"`, so this suite cannot regress into existing-but-ungated the way `test/continuous-test-suite-proxy.ts` did.

**CI gating (new, not in the earlier draft's file list — required for the repo's stated gating rule):** modify `scripts/run-proxy-reliability.mjs` to add, alongside the existing non-`proxy-*`-named entry for the vertex suite:

```js
// Not name-templated below because it is not a `proxy-*` suite: it covers the
// Anthropic-to-Codex response translation direction, not proxy request/accounting.
["tsx", "test/continuous-test-suite-codex-response-translation.ts"],
```

No `package.json` or `.github/workflows/ci.yml` change is needed: `test:proxy-reliability` (`package.json:170`) already runs `scripts/run-proxy-reliability.mjs`, and that script already runs inside the required `provider-safety-net-shards` job (`matrix.group == 'rest'`, `.github/workflows/ci.yml:448`), which gates the required `provider-safety-net` job (`ci.yml:330`). Adding the one line above is sufficient and necessary for this suite to be gated at all.

### 10. Dependencies on sibling sections

- **cache-anthropic**: whether request-side `cache_control` breakpoints are inserted determines whether `cache_read_input_tokens`/`cache_creation_input_tokens` are ever populated on the Anthropic response this section reads from `message_start`. This section's mapping is correct either way (absent fields omitted, never zeroed).
- **cache-codex-prefix**: owns Codex-side `prompt_cache_key`/prefix mechanics; relevant only if a fallback chain nests.
- **cache-vertex**: this layer is upstream-provider-agnostic — it consumes only the `ClaudeResponse`/SSE shape — provided cache-vertex's own normalization funnels Vertex output into that same shape before it reaches this driver.
- **proxy-waste**: owns engine selection, when to trigger fallback, and pre-commit/post-commit routing. This section provides `consumeAnthropicFallbackResponse`/`createAnthropicFallbackStream` and the §6 boundary contract; it does not decide when to retry another engine, and does not touch `codexProxyRoutes.ts`.

### 11. Files this section touches

- `src/lib/types/codex.ts` — modify, add the 8 types in §2.
- `src/lib/proxy/codexResponsesFormat.ts` — create, §3.
- `src/lib/proxy/codexToAnthropicFallback.ts` — create, §4.
- `scripts/run-proxy-reliability.mjs` — modify, one new `checks` entry (§9).
- `test/fixtures/anthropic-to-codex-golden.sse` — create.
- `test/continuous-test-suite-codex-response-translation.ts` — create.

Not touched by this section (sibling-owned): `src/lib/server/routes/codexProxyRoutes.ts`, `src/lib/proxy/codexFallback.ts` (the recommended `sseFrameScanner.ts` extraction remains an optional, explicitly-deferred follow-up — duplicating the carry/searchFrom loop once more in `codexToAnthropicFallback.ts` is acceptable if the implementation PR must be strictly additive; state which option was taken in the PR description).

---

### Tool-call fidelity (Codex-outbound fallback) — resolved

Scope: the tool-related constructs for a native Codex Responses-API request served, transparently, by the Anthropic OAuth pool or Vertex-Claude. Declarations, `tool_choice`/`parallel_tool_calls`, model-emitted calls, client results, argument parsing, schema limits, and the request/response boundary those depend on. General plain-text message-role mapping (developer/user/assistant → Claude `system`/`user`/`assistant`) is the sibling **Request translation** section's mandate; this section only reaches into it where a tool-call grouping fix cannot be made without touching the same array (see §2).

All facts below were re-verified this session directly against `/Users/sachinsharma/Developer/Official/fix/proxy-ci-gaps-and-dead-leg-alert` (read-only) and against `~/.neurolink/reference/codex-cli-wire-sample.json` (a real captured Codex CLI 0.155.1 request, `body.*` nesting). Every resolution below is inline; there is no separate changelog.

### 0. Baseline facts confirmed this pass

- `src/lib/types/codex.ts` (219 lines) has no `CodexNative*` name yet — zero collision risk. Barrel line: `src/lib/types/index.ts:19` (`export * from "./codex.js";`).
- `src/lib/types/proxy.ts:154-170` — current `ClaudeRequest.tool_choice` is `{type:"auto"|"any"|"none"} | {type:"tool"; name}`, **no** `disable_parallel_tool_use`. `ClaudeTool` (138-143), `ClaudeToolUseBlock` (103-108), `ClaudeToolResultBlock` (111-116), `ClaudeMessage` (132-135), `ClaudeUsage` (177-182), `ProxyMetrics` (2177-2194) all confirmed as designed.
- `src/lib/proxy/codexFallback.ts`: `convertClaudeMessage` (226-288) — one-to-many split via a `flushMessage` closure (238-241) that batches plain content into one Codex item and emits `function_call`/`function_call_output` as their own items; `buildSystemInstructions` (134-168) extracts every Claude `system`-role message's text (wherever it appears in `messages`) and joins with `"\n\n"` into Codex's flat `instructions` string; `parseFunctionArguments` (466-483) is **module-private** (grepped every `^export ` line: only `CodexFallbackResponseError`, `CodexFallbackStreamError`, `codexPromptCacheKey`, `convertClaudeRequestToCodex`, `parseCodexFallbackSSE`, `consumeCodexFallbackResponse`, `createCodexFallbackStream` are exported).
- `node_modules/.pnpm/@anthropic-ai+sdk@0.102.0_zod@4.3.6/.../resources/messages/messages.d.ts:1247-1300` — real SDK: `ToolChoiceAuto`/`ToolChoiceAny`/`ToolChoiceTool` each carry `disable_parallel_tool_use?: boolean`; `ToolChoiceNone` does **not**. Same file, `MessageCreateParams.messages` doc: "Consecutive `user` or `assistant` turns in your request will be combined into a single turn" — a real safety net, not a reason to skip correct grouping (see §2).
- `~/.neurolink/reference/codex-cli-wire-sample.json`: `body` top-level keys are `client_metadata, include, input, model, parallel_tool_calls, prompt_cache_key, reasoning, store, stream, text, tool_choice` — **no top-level `session_id`/`thread_id`**. `body.client_metadata = {thread_id, turn_id, root_turn_id, session_id, x-codex-installation-id, x-codex-window-id, x-codex-turn-metadata}`, and `body.prompt_cache_key === body.client_metadata.thread_id` byte-for-byte. `body.input` has exactly one `additional_tools` item (`role:"developer"`, has `id: "at_..."`) followed by 4 `message{role:"developer"}` items and 2 `message{role:"user"}` items — **zero** `function_call`/`function_call_output` items (single first turn, no history). Every `message`/`additional_tools` item carries `id`. The one `custom` tool (`exec`, in namespace `functions`) has `format:{type:"grammar", syntax:"lark", definition:"..."}`; the six `collaboration` tools and `wait`/`request_user_input` are `type:"function", strict:false`.
- `test/fixtures/codex-request-tool-result-turn.json` (`body.input`, 9 items): its `additional_tools` item's `tools` field is `{functions:[...], collaboration:[...]}` — a flat object, not a namespace array — and its custom `exec` tool has a bare top-level `grammar` string key, no `format` object. `_fixtureMeta.basedOn` says "shape only, not copied verbatim". **Confirmed still wrong** relative to the real capture.
- `test/fixtures/codex-request-resumed-session.json`: `body.session_id`/`body.thread_id` **are** top-level there — but that fixture is the synthetic one, and is exactly the shape the design wrongly attributed to real traffic.

### 1. Tool declaration (unchanged from prior design, confirmed sound)

Real wire shape: one `input` item `{type:"additional_tools", id, role:"developer", tools: CodexNativeToolNamespace[]}`, each namespace `{type:"namespace", name, description, tools: CodexNativeToolDeclaration[]}`, each declaration `{type:"function", name, description?, strict, parameters}` or `{type:"custom", name, description?, format:{type:"grammar", syntax:"lark"|"regex", definition}}`.

Mapping Codex→Claude: flatten every namespace's tools in order (namespace order, then declaration order) into one `ClaudeTool[]` via `.map()`/concat, **never** a `Record` keyed by name (would silently alphabetize and break cache-breakpoint-pinned-to-last-tool). `function` → `{name, description, input_schema: parameters}`, `strict` dropped with `reason:"strict_mode_flag_dropped"`. `custom` → **degrade, never drop**: `{name, description: (description ?? "") + "\n\n[Argument grammar, enforced by the original client, not by this model]:\n" + format.definition, input_schema: {type:"object", properties:{input:{type:"string"}}, required:["input"], additionalProperties:false}}`, `reason:"custom_tool_wrapped"`. **Resolves minor finding**: `description` is optional on `CodexNativeCustomToolDeclaration` (confirmed) — the concatenation must use `??`, not bare `+`, or an omitted description silently becomes the literal string `"undefined\n\n..."`. Namespace grouping does not round-trip; state that plainly, no reconstruction attempt.

### 2. `tool_choice` + `parallel_tool_calls` — corrected as one mapping, not two

**Resolves major finding**: the prior design called `parallel_tool_calls: false` unrepresentable and specified dropping it with a counter. That is factually wrong — confirmed directly in the installed SDK (`messages.d.ts:1264,1277,1300`): Anthropic's `tool_choice` carries `disable_parallel_tool_use?: boolean` on the `auto`/`any`/`tool` variants (inverted polarity: `disable_parallel_tool_use: true` ≡ `parallel_tool_calls: false`), just not on `none`. `src/lib/types/proxy.ts`'s own `ClaudeRequest.tool_choice` doesn't model the field yet — a type-completeness gap in this repo, not evidence the protocol lacks it.

Type change, `src/lib/types/proxy.ts:165-167` (replacing the existing 3-line union in place):

```ts
tool_choice?:
  | { type: "none" }
  | { type: "auto" | "any"; disable_parallel_tool_use?: boolean }
  | { type: "tool"; name: string; disable_parallel_tool_use?: boolean };
```

`mapCodexToolChoiceToClaude` now takes both source fields, because the flag rides on the _same_ object the bijection produces:

```ts
function mapCodexToolChoiceToClaude(
  choice: CodexNativeToolChoice | undefined,
  parallelToolCalls: boolean | undefined,
): ClaudeRequest["tool_choice"] {
  const disable = parallelToolCalls === false;
  if (choice === undefined || choice === "auto") {
    return disable
      ? { type: "auto", disable_parallel_tool_use: true }
      : { type: "auto" };
  }
  if (choice === "required") {
    return disable
      ? { type: "any", disable_parallel_tool_use: true }
      : { type: "any" };
  }
  if (choice === "none") {
    return { type: "none" }; // no tool will run; the flag has no target field to sit on
  }
  return disable
    ? { type: "tool", name: choice.name, disable_parallel_tool_use: true }
    : { type: "tool", name: choice.name };
}
```

Bijection table (base cases, unchanged — matches `codexFallback.ts:436-446` `convertClaudeRequestToCodex`'s inverse and `openaiFormat.ts:674-686` `convertOpenAIToClaudeRequest`'s identical precedent, both confirmed verbatim this session):

| Codex native              | Claude `tool_choice`  |
| ------------------------- | --------------------- |
| `"auto"` / absent         | `{type:"auto"}`       |
| `"required"`              | `{type:"any"}`        |
| `"none"`                  | `{type:"none"}`       |
| `{type:"function", name}` | `{type:"tool", name}` |

No counter fires for `parallel_tool_calls` any more — it is translated, not degraded, so `proxy_codex_outbound_unsupported_field_total` drops the `parallel_tool_calls` reason entirely (§6 shrinks by one label value).

### 3. Model-emitted tool call / client tool result (unchanged, confirmed sound)

`ClaudeToolUseBlock{type:"tool_use", id, name, input}` ↔ Codex `{type:"function_call", call_id, name, arguments: string}`: `id ↔ call_id` **verbatim, no re-minting** (Design 1, §5). `input → arguments`: `JSON.stringify(input)` unless `name` was declared `custom` this turn, then bare `String(input.input ?? "")`, using the same per-request `toolKindByName` map built at request-translation time.

`ClaudeToolResultBlock{tool_use_id, content: string | ClaudeContentBlock[]}` ↔ Codex `{type:"function_call_output", call_id, output: string}` (confirmed hard string-only ceiling, `codex.ts:161-165`): `call_id ↔ tool_use_id` verbatim, `output ↔ content` as the identical string.

### 4. Parallel/multiple tool calls — corrected grouping (resolves the blocker)

**The finding**: a per-item function `convertCodexInputItemToClaudeMessages(item, toolKindByName): ClaudeMessage[]` cannot produce test-required grouping — two sibling `function_call` items followed by two sibling `function_call_output` items must collapse into **one** assistant message (2 `tool_use` blocks) then **one** user message (2 `tool_result` blocks), not four separate messages. A per-item function can only emit 0-1 messages per call, i.e. four messages (assistant, assistant, user, user) for that shape.

**Adopted correction, mirroring `convertClaudeMessage`'s flush-accumulator (`codexFallback.ts:226-288`) run in reverse** (many-source-items → one-destination-message instead of one-source-message → many-destination-items):

**Two further corrections (review findings, reconciled against the request-translation section's own §4, which solved both of these already for its own, differently-shaped function)**:

1. **Adjacent same-role plain messages must coalesce.** The version below originally pushed each plain `user`/`assistant` item as its own `ClaudeMessage`. The real capture and every fixture send two consecutive `user` items (a real prompt, then a synthetic `<environment_context>` message) — exactly the shape `assertClaudeMessagesAlternate` (cache-preservation section) rejects. A third run buffer, `messageRun`, coalesces by role the same way the tool-call runs already do. It is flushed only when a tool-call run needs to start (the two kinds of run cannot coexist) — **not** on `additional_tools`/`developer`, for the same reason the tool-call runs are not flushed there either: a developer item never itself becomes a `messages` entry, so flushing early would only reopen a fresh, wrongly-separate group for the next same-role item.
2. **Developer text must stay in array form.** `systemTexts.push(flattenCodexContentParts(...))` joined every developer message into one string. The request-translation section's cache contract (§2, §4 there) requires one `ClaudeTextBlock` per developer segment for cache-breakpoint eligibility — a string here fails that guard before dispatch. Renamed to `systemBlocks: ClaudeTextBlock[]`, populated one block per developer content part, matching that section's own `buildSystemBlocksFromDeveloperMessages`.

```ts
function convertCodexInputItemsToClaudeMessages(
  items: readonly CodexNativeInputItem[],
  toolKindByName: ReadonlyMap<string, CodexNativeToolKind>,
): { messages: ClaudeMessage[]; systemBlocks: ClaudeTextBlock[] } {
  const messages: ClaudeMessage[] = [];
  const systemBlocks: ClaudeTextBlock[] = [];
  let toolUseRun: ClaudeToolUseBlock[] = [];
  let toolResultRun: ClaudeToolResultBlock[] = [];
  let messageRun:
    | { role: "user" | "assistant"; blocks: ClaudeContentBlock[] }
    | undefined;

  const flushToolUseRun = (): void => {
    if (toolUseRun.length === 0) return;
    messages.push({ role: "assistant", content: toolUseRun });
    toolUseRun = [];
  };
  const flushToolResultRun = (): void => {
    if (toolResultRun.length === 0) return;
    messages.push({ role: "user", content: toolResultRun });
    toolResultRun = [];
  };
  const flushMessageRun = (): void => {
    if (!messageRun) return;
    messages.push({ role: messageRun.role, content: messageRun.blocks });
    messageRun = undefined;
  };

  for (const item of items) {
    if (item.type === "function_call") {
      flushToolResultRun();
      flushMessageRun();
      const kind = toolKindByName.get(item.name) ?? "function";
      toolUseRun.push({
        type: "tool_use",
        id: item.call_id,
        name: item.name,
        input: parseToolArguments(item.arguments, kind),
      });
      continue;
    }
    if (item.type === "function_call_output") {
      flushToolUseRun();
      flushMessageRun();
      toolResultRun.push({
        type: "tool_result",
        tool_use_id: item.call_id,
        content: item.output,
      });
      continue;
    }
    // additional_tools and plain message items break any tool-call run in progress —
    // but never the plain-message run: a developer item never becomes a `messages`
    // entry, so flushing it here would wrongly split two same-role items around it.
    flushToolUseRun();
    flushToolResultRun();
    if (item.type === "additional_tools") continue; // handled in §1, not here
    if (item.role === "developer") {
      systemBlocks.push(
        ...item.content
          .map(codexContentPartToClaudeBlock)
          .filter((b): b is ClaudeTextBlock => b.type === "text"),
      );
      continue;
    }
    const blocks = item.content.map(codexContentPartToClaudeBlock);
    if (messageRun?.role === item.role) {
      messageRun.blocks.push(...blocks);
    } else {
      flushMessageRun();
      messageRun = { role: item.role, blocks };
    }
  }
  flushToolUseRun();
  flushToolResultRun();
  flushMessageRun();
  return { messages, systemBlocks };
}
```

`convertCodexNativeRequestToClaude` sets `claudeRequest.system = systemBlocks` directly (array form, no join) when `systemBlocks.length > 0` — **corrected**: an earlier draft joined developer segments into one string via the convention `buildSystemInstructions` uses in the reverse direction (`codexFallback.ts:167`), but that convention is Anthropic-_outbound_-shape-agnostic prose-building; this leg's own cache contract (§2/§4 of the request-translation section) requires one `ClaudeTextBlock` per developer segment, which a joined string cannot satisfy. This also means a `developer`-role item interleaved between a tool-call run and its paired result run does not break the pairing, nor does it break coalescing of adjacent same-role plain messages either side of it: it is extracted to `systemBlocks` out-of-band, never inserted into `messages`, so the assistant/tool_use and user/tool_result messages — and two same-role plain messages — stay immediately adjacent regardless of where a developer reminder sat in the original `input` array.

`flattenCodexContentParts`/`codexContentPartToClaudeBlock` are small, one-purpose helpers (`input_text`/`output_text` → `{type:"text"}`, `input_image` → `{type:"image", source:{type:"url", url}}`) — not designed here in full; flagged as a direct dependency on whatever the Request-translation section already owns for plain content-part mapping, reused rather than re-specified.

Everything else about parallel calls is unchanged: both protocols allow multiple tool calls per turn with the same multiplicity model; a resumed turn with N prior calls must produce exactly N `tool_use` and N `tool_result` blocks, none dropped or merged (hard assertion, §5 test list) — Anthropic rejects an unbalanced set with its own `invalid_request_error`, which is worse than any local degrade.

### 5. Empty/malformed arguments and oversized payloads (unchanged in substance, function renamed)

- `name` resolves to `custom` this turn → arguments is opaque text, wrap `{input: arguments}`.
- `name` resolves to `function`, `arguments === ""` → `{}`.
- `name` resolves to `function`, `JSON.parse` fails → **never throw**; degrade to `{input: <raw text>}`, `reason:"malformed_arguments_wrapped"`. This is deliberately asymmetric with `parseFunctionArguments` (`codexFallback.ts:466`, which throws): that function sits on the model-output-parsing hot path where a hard failure is correct; this sits on request-ingestion, where fabricating a well-formed fallback and continuing is correct, because failing here fails the whole incoming request pre-dispatch.
- `name` does not resolve to any currently-declared tool → still emit the best-guess wrapped pair; dropping produces an unbalanced tool_use/tool_result set Anthropic's own validation rejects, strictly worse than a degraded-but-present pair.

**Resolves minor finding on "reuse, not duplicate"**: the prior design claimed `parseCodexNativeFunctionArguments` "reuses `parseFunctionArguments` via a shared helper" — false, since `parseFunctionArguments` is module-private and no shared module was ever named. **Rejecting** the reviewer's alternative (a) (extract an exported helper both directions import) for a technical reason: the two functions have deliberately opposite failure-mode contracts by design (§1.6 of the original / §5 here) — one throws on purpose, one must never throw — and the only line-for-line-shared logic is a single `JSON.parse(x || "{}")` try/catch (~4 lines); forcing both through one function needs a boolean/enum mode flag coupling two independently-evolving call sites for a four-line saving, which is a worse trade than accepting the small, documented duplication. **Adopted correction**: new, independent function in a new module, and the false "reuse" claim is dropped, not carried forward.

```ts
// src/lib/proxy/argumentParsing.ts (new)
export function parseToolArguments(
  raw: string,
  kind: "function" | "custom",
): Record<string, unknown> {
  if (kind === "custom") {
    return { input: raw };
  }
  if (raw === "") {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isPlainRecord(parsed) ? parsed : { input: raw };
  } catch {
    return { input: raw };
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

Size ceilings: reuse the existing numeric constants from `codexFallback.ts` (`maxChars = 16 * 1024 * 1024`, `toolCalls.size >= 4096` — cited, not re-verified line-for-line this pass) via a new shared module, imported by both directions rather than hand-copied:

```ts
// src/lib/proxy/streamLimits.ts (new)
export const CODEX_STREAM_SIZE_CEILING_BYTES = 16 * 1024 * 1024;
export const CODEX_STREAM_MAX_TOOL_CALLS = 4096;
```

Request-ingestion oversized history → reject that turn, `request_too_large`/413 (`errorTypeFromStatus`, `claudeFormat.ts:369-370`, confirmed). Response-emission oversized `tool_use.input` → clean typed stream error (`CodexNativeStreamError`, mirroring `CodexFallbackStreamError`'s shape at `codexFallback.ts:56`), never truncate mid-object.

### 6. Identifier mapping — unchanged (Design 1), cross-turn key corrected

Design 1 stands: pass `tool_use.id`/`call_id` straight through, no re-minting, no map, in both this new response serializer and the new request translator — mirrors this repo's own dominant idiom (`openaiFormat.ts:266`, `tc.toolCallId || generateOpenAIToolCallId()` — prefer real id, mint only as fallback) rather than `codexFallback.ts`'s response-streaming re-mint, which is the outlier here, not the rule.

**Resolves major finding on session/thread scoping**: the prior design claimed "top-level `session_id`/`thread_id` fields (confirmed live)" on genuine Codex requests. **False** — re-parsed the real capture directly: `body.session_id`/`body.thread_id` are both absent; the only place those identifiers exist is nested, `body.client_metadata.{thread_id, turn_id, root_turn_id, session_id}`, and `body.prompt_cache_key` is set to the exact same string as `client_metadata.thread_id`. The top-level-fields shape belongs only to `test/fixtures/codex-request-resumed-session.json`, an admittedly-synthetic fixture (`_fixtureMeta.basedOn: "shape only, not copied verbatim"`). **Correction adopted**: `CodexNativeRequest` (§7) drops the speculative top-level `session_id?`/`thread_id?` fields entirely — `client_metadata?: Record<string, unknown>` already covers the real shape structurally, no type change needed there, only the false "top-level, confirmed live" prose is removed. Design 2 (the id-remapping fallback, not the default — kept unchanged in shape) should key its `Map<anthropicToolUseId, codexCallId>` by `client_metadata.thread_id` (or simply the already-present `prompt_cache_key`, verified to carry the same value), not by invented top-level fields.

**Resolves major finding on "resent verbatim every turn"**: the prior design told the cache-codex-prefix section it could skip its own dedup/hash logic because "the whole `additional_tools` item is resent verbatim by the Codex client on every turn of one thread (confirmed structurally)". **Downgraded**: the one real capture is a single first-turn request with **zero** `function_call`/`function_call_output` history items — there is no second turn in the evidence to compare against, so turn-over-turn stability cannot be confirmed from it, only assumed. Handed to that section as: _assumed, not confirmed by the available single-turn capture; either obtain a second, multi-turn real capture before skipping dedup/hash logic, or implement a cheap content-hash guard regardless, since an unconfirmed extrapolation breaking cache correctness would be silent and expensive to find._

### 7. JSON-schema translation limits (unchanged, confirmed sound)

| Construct                          | Decision                                | Mechanism                                                                                                                                                                                    |
| ---------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| plain object/array/required/enum   | PASSTHROUGH                             | `input_schema = parameters` unchanged                                                                                                                                                        |
| `strict:true` + all-required trick | PASSTHROUGH, drift undocumented in-band | out of scope to reverse-engineer the nullable-optional trick                                                                                                                                 |
| `format` keyword                   | PASSTHROUGH                             | not independently verified against live Anthropic this session                                                                                                                               |
| `oneOf`/`anyOf`/`allOf`            | PASSTHROUGH                             | not observed in the one real sample; absence isn't proof of absence                                                                                                                          |
| `$ref`/`$defs`/`definitions`       | FLATTEN                                 | call `inlineJsonSchema` (`src/lib/utils/schemaConversion.ts:105`) directly, confirmed exported, confirmed signature `(schema, definitions?, visited?, rootSchema?): Record<string, unknown>` |
| circular `$ref`                    | DEGRADE                                 | `inlineJsonSchema`'s existing `{type:"object"}` placeholder on repeat visits (confirmed ~126-133), `reason:"circular_ref_flattened"`                                                         |
| `type:"custom"`                    | DEGRADE                                 | single-string-parameter wrap, §1                                                                                                                                                             |

Counters: new `proxy_codex_outbound_schema_degraded_total{reason, toolName}` (`reason ∈ "custom_tool_wrapped" | "circular_ref_flattened" | "malformed_arguments_wrapped" | "strict_mode_flag_dropped"` — `"unsupported_field_dropped"` no longer applies to `parallel_tool_calls`, §2) and `proxy_codex_outbound_unsupported_field_total{field, toolName}`, added in `src/lib/proxy/proxyTracer.ts` next to the confirmed `fallbackAttemptsTotal`/`fallbackSuccessTotal`/`fallbackFailureTotal` trio (`proxyTracer.ts:135-148`), same `meter.createCounter` idiom, `toolName` truncated to 100 chars exactly like the existing `error` label (`recordFallbackAttempt`, `proxyTracer.ts:1082-1109`, specifically the `error: attrs.errorMessage?.slice(0, 100) ?? "unknown"` line at 1109). Both new counter fields also need adding to the `ProxyMetrics` type (`src/lib/types/proxy.ts:2177-2194`) alongside the implementation in `proxyTracer.ts`, or the file fails to typecheck.

### 8. Types — exact, corrected (`src/lib/types/codex.ts`, add)

```ts
export type CodexNativeRole = "developer" | "user" | "assistant";

export type CodexNativeMessageInputItem = {
  type: "message";
  id?: string; // resolves finding: present on 100% of real-capture message items
  role: CodexNativeRole;
  content: CodexContentPart[];
};

export type CodexNativeFunctionToolDeclaration = {
  type: "function";
  name: string;
  description?: string;
  strict: boolean;
  parameters: Record<string, unknown>;
};

export type CodexNativeCustomToolFormat = {
  type: "grammar";
  syntax: "lark" | "regex";
  definition: string;
};

export type CodexNativeCustomToolDeclaration = {
  type: "custom";
  name: string;
  description?: string;
  format: CodexNativeCustomToolFormat;
};

export type CodexNativeToolDeclaration =
  | CodexNativeFunctionToolDeclaration
  | CodexNativeCustomToolDeclaration;

export type CodexNativeToolNamespace = {
  type: "namespace";
  name: string;
  description: string;
  tools: CodexNativeToolDeclaration[];
};

export type CodexNativeAdditionalToolsInputItem = {
  type: "additional_tools";
  id?: string; // resolves finding: present on the real-capture additional_tools item
  role: "developer";
  tools: CodexNativeToolNamespace[];
};

export type CodexNativeFunctionCallInputItem = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
};

export type CodexNativeFunctionCallOutputInputItem = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

export type CodexNativeInputItem =
  | CodexNativeMessageInputItem
  | CodexNativeAdditionalToolsInputItem
  | CodexNativeFunctionCallInputItem
  | CodexNativeFunctionCallOutputInputItem;

export type CodexNativeToolChoice =
  | "auto"
  | "required"
  | "none"
  | { type: "function"; name: string };

export type CodexNativeToolKind = "function" | "custom";

// Removed vs. the prior draft: top-level `session_id?`/`thread_id?`. Real
// traffic carries neither at top level (§6) — only inside client_metadata,
// which the existing `Record<string, unknown>` field already covers.
export type CodexNativeRequest = {
  model: string;
  input: CodexNativeInputItem[];
  stream: boolean;
  store: boolean;
  tool_choice?: CodexNativeToolChoice;
  parallel_tool_calls?: boolean;
  reasoning?: { effort: CodexReasoningEffort; context?: string };
  include?: string[];
  text?: { verbosity?: string };
  prompt_cache_key?: string;
  client_metadata?: Record<string, unknown>;
};
```

(`CodexReasoningEffort` already exists, `codex.ts:168-175`, reused as-is.)

`src/lib/types/proxy.ts` — modify `ClaudeRequest.tool_choice` in place at lines 165-167 (exact replacement text in §2).
`src/lib/types/proxy.ts` — modify `ProxyMetrics` (2177-2194): add `schemaDegradedTotal: Counter;` and `unsupportedFieldTotal: Counter;`.

### 9. New files and exact signatures

`src/lib/proxy/streamLimits.ts` (new) — §5.
`src/lib/proxy/argumentParsing.ts` (new) — §5, exports `parseToolArguments` only (kept private: `isPlainRecord`).

`src/lib/proxy/codexRequestTranslator.ts` (new):

```ts
export function convertCodexNativeRequestToClaude(body: CodexNativeRequest): {
  claudeRequest: ClaudeRequest;
  toolKindByName: ReadonlyMap<string, CodexNativeToolKind>;
};

function flattenCodexToolNamespaces(
  item: CodexNativeAdditionalToolsInputItem,
): {
  claudeTools: ClaudeTool[];
  toolKindByName: ReadonlyMap<string, CodexNativeToolKind>;
};

function codexToolDeclarationToClaudeTool(decl: CodexNativeToolDeclaration): {
  claudeTool: ClaudeTool;
  kind: CodexNativeToolKind;
};

function mapCodexToolChoiceToClaude(
  choice: CodexNativeToolChoice | undefined,
  parallelToolCalls: boolean | undefined,
): ClaudeRequest["tool_choice"]; // corrected signature, §2

function convertCodexInputItemsToClaudeMessages(
  items: readonly CodexNativeInputItem[],
  toolKindByName: ReadonlyMap<string, CodexNativeToolKind>,
): { messages: ClaudeMessage[]; systemBlocks: ClaudeTextBlock[] }; // corrected: array in, not one item, and array out, not a joined string — §4
```

`convertCodexNativeRequestToClaude` calls `flattenCodexToolNamespaces` on the `additional_tools` item (there is at most one per request, confirmed), then `convertCodexInputItemsToClaudeMessages` on the full `input` array, then sets `claudeRequest.system = systemBlocks` (array assignment, no join) when `systemBlocks.length > 0`, then `mapCodexToolChoiceToClaude(body.tool_choice, body.parallel_tool_calls)`.

`src/lib/proxy/codexResponseSerializer.ts` (new — tool-frame shapes only; the driving byte-buffering/commit-boundary loop is out of scope, owned elsewhere):

```ts
export class CodexNativeStreamSerializer {
  constructor(
    model: string,
    toolKindByName: ReadonlyMap<string, CodexNativeToolKind>,
  );
  *start(): Generator<string>;
  *pushTextDelta(text: string): Generator<string>;
  *pushToolCall(
    callId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Generator<string>;
  // callId MUST be the verbatim Anthropic tool_use.id (Design 1, §6) — never mints one.
  // toolKindByName.get(toolName) === "custom" ? arguments = String(args.input ?? "") : arguments = JSON.stringify(args)
  *finish(
    usage: ClaudeUsage,
    finishReason: "end_turn" | "tool_use",
  ): Generator<string>;
  *emitError(status: number, code: string, message: string): Generator<string>;
}

export class CodexNativeStreamError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
}
```

`src/lib/proxy/proxyTracer.ts` (modify, alongside `proxyTracer.ts:135-148`):

```ts
schemaDegradedTotal: meter.createCounter("proxy_codex_outbound_schema_degraded_total", { description: "Total Codex-outbound tool/schema constructs degraded rather than dropped", unit: "{degrade}" }),
unsupportedFieldTotal: meter.createCounter("proxy_codex_outbound_unsupported_field_total", { description: "Total Codex-outbound request fields with no Claude equivalent", unit: "{field}" }),
```

Types introduced: `CodexNativeRole`, `CodexNativeMessageInputItem`, `CodexNativeFunctionToolDeclaration`, `CodexNativeCustomToolFormat`, `CodexNativeCustomToolDeclaration`, `CodexNativeToolDeclaration`, `CodexNativeToolNamespace`, `CodexNativeAdditionalToolsInputItem`, `CodexNativeFunctionCallInputItem`, `CodexNativeFunctionCallOutputInputItem`, `CodexNativeInputItem`, `CodexNativeToolChoice`, `CodexNativeToolKind`, `CodexNativeRequest`, `CodexNativeStreamError` — all globally unique (grepped, zero collisions in `src/lib/types/`).

### 10. Test matrix — `test/continuous-test-suite-codex-outbound-tool-fidelity.ts` (new)

Header carries the mandatory determinism-exception note (rule 15's `allow`-list contract, confirmed pattern at `test/continuous-test-suite-proxy-fallback-errors.ts:1-4`): _"Determinism exception: exact tool-declaration/argument/id-passthrough shapes need controlled Codex-native request bodies a live model cannot reliably reproduce turn-for-turn; imports only the isolated `src/` module graph, mirroring `continuous-test-suite-proxy-fallback-errors.ts`."_ All assertions below live in this one file unless noted.

1. `tool_declaration_function_roundtrip` — one `type:"function"` tool, plain schema → `ClaudeTool.input_schema` deep-equals `parameters`; name/description preserved.
2. `tool_declaration_order_preserved_across_namespaces` — 2 namespaces × 2+ tools, alphabetical-by-name order ≠ declaration order → output order is declaration order, never alphabetical.
3. `tool_declaration_custom_grammar_degrades_not_drops` — real `exec`/lark shape → tool still emitted, wrapped single-string schema, `reason:"custom_tool_wrapped"` fires.
4. `tool_declaration_custom_grammar_wrap_survives_missing_description` — same shape with `description` omitted → wrapped description is exactly the grammar-notice text, never contains the literal substring `"undefined"` (**resolves the `??` finding**).
5. `tool_choice_bijection` — table-driven `"auto"|"required"|"none"|{type:"function",name}`, `parallel_tool_calls` absent → exact base `tool_choice` per case, no `disable_parallel_tool_use` key present in any case.
6. `tool_choice_absent_defaults_auto` — no top-level field → explicit `{type:"auto"}`, not `undefined`.
7. `parallel_tool_calls_false_sets_disable_flag_on_auto` — `tool_choice` absent, `parallel_tool_calls:false` → `{type:"auto", disable_parallel_tool_use:true}` (**resolves the blocker-adjacent major finding**; no counter fires, since this is a full mapping, not a drop).
8. `parallel_tool_calls_false_sets_disable_flag_on_required_and_function` — same, for `"required"` → `{type:"any", disable_parallel_tool_use:true}` and `{type:"function",name}` → `{type:"tool", name, disable_parallel_tool_use:true}`.
9. `parallel_tool_calls_true_or_absent_omits_disable_flag` — `parallel_tool_calls` true or absent → no `disable_parallel_tool_use` key on the resulting `tool_choice` object at all (not `false`, absent).
10. `parallel_tool_calls_false_with_tool_choice_none_is_inert` — `tool_choice:"none"`, `parallel_tool_calls:false` → `{type:"none"}` exactly, no flag added (no tool will run; matches `ToolChoiceNone` having no such field).
11. `function_call_run_groups_into_one_assistant_message` — 2 consecutive `function_call` items → exactly one assistant `ClaudeMessage` with 2 `tool_use` blocks, in source order (**resolves the blocker directly**).
12. `function_call_output_run_groups_into_one_user_message` — 2 consecutive `function_call_output` items → exactly one user `ClaudeMessage` with 2 `tool_result` blocks, in source order.
13. `function_call_history_roundtrip_parallel` — 2 calls + 2 results across one historical turn → the assistant/user pair from #11/#12 back to back, ids passed through byte-for-byte, none dropped or merged.
14. `developer_message_run_produces_one_system_block_per_item` — 2+ consecutive `message{role:"developer"}` items → zero `ClaudeMessage` entries produced for them, `claudeRequest.system` is a `ClaudeTextBlock[]` with one block per developer item in source order, never joined into a single string (**resolves the message-role gap found this pass, and the array-vs-string contradiction the review caught between this test and §3.2/§4's cache-breakpoint requirement**; grounded in the real capture's 4 consecutive developer items).
15. `developer_message_interleaved_does_not_break_tool_pairing` — `function_call, function_call, message{developer}, function_call_output, function_call_output` → the assistant/tool_use message and the user/tool_result message are still immediately adjacent in `messages`, with the developer text moved to `system` and absent from `messages` entirely.
16. `function_call_arguments_empty_string` — `arguments:""` on a function tool → `tool_use.input === {}`, no throw.
17. `function_call_arguments_malformed_json` — `arguments:"{not json"` → no throw, `{input:"{not json"}`, `reason:"malformed_arguments_wrapped"`.
18. `function_call_arguments_custom_tool_free_text` — real `exec`-shaped `arguments:"ls -la"` for a `custom` tool → `{input:"ls -la"}`, no `JSON.parse` attempted.
19. `function_call_output_string_only_passthrough` — `output` string maps to `tool_result.content` as the identical string, never coerced into a block array.
20. `tool_use_response_maps_call_id_verbatim` — mock Anthropic SSE `tool_use{id:"toolu_ABC"}` → `function_call.call_id === "toolu_ABC"`, no re-minting. Single most important test in this matrix.
21. `mid_conversation_provider_swap_id_shape_agnostic` — turn-2 history carrying a non-`toolu_`-prefixed, OpenAI-native-shaped `call_id` (e.g. `"call_9f2a..."`) → passthrough to `tool_use.id`/`tool_result.tool_use_id` unchanged, no reshape/rejection based on prefix.
22. `custom_tool_call_response_unwraps_before_emit` — `tool_use.input = {input:"raw text"}` for a tool declared `custom` this turn → `function_call.arguments === "raw text"` (bare string), exercising `toolKindByName` threading from request-translation into response-serialization.
23. `arguments_size_ceiling_enforced_both_directions` — `tool_use.input`/history `arguments` exceeding `CODEX_STREAM_SIZE_CEILING_BYTES` → clean terminal typed error, no truncation, run once per direction.
24. `schema_ref_flattened_before_dispatch` — `parameters` with `$defs`/`$ref` → no `$ref` key survives; asserts `inlineJsonSchema` is the function actually called (identity/import assertion), guarding against a parallel reimplementation.
25. `schema_circular_ref_flattened_with_warning` — self-referencing schema → degrades to `{type:"object"}` at the cycle point, `reason:"circular_ref_flattened"`.
26. `additional_tools_namespace_shape_and_id_match_live_capture` — characterization test: `CodexNativeAdditionalToolsInputItem`/`CodexNativeToolNamespace` accept the real captured sample's structure **including its `id` field** (redacted fixture regenerated from `~/.neurolink/reference/codex-cli-wire-sample.json`) — must **fail** against the current `test/fixtures/codex-request-*.json` files as they exist today (confirmed this pass: flat `{functions,collaboration}` object, bare `grammar` string), must pass only once those fixtures are corrected. Not fixed by this section; the fixture-regeneration script is out of scope here.
27. `strict_mode_flag_dropped_and_logged` — `strict:true` function tool → no equivalent field in `ClaudeTool`, `reason:"strict_mode_flag_dropped"` fires.

### 11. CI wiring — the part that makes any of this gated

None of the above runs in CI merely by existing in `test/` or by having an npm script. Confirmed the required path: `provider-safety-net` (required check, `.github/workflows/ci.yml:330`) needs `provider-safety-net-shards` (350-352, matrix `[contract, rest]`) to succeed; the `rest` shard's step at `.github/workflows/ci.yml:446-448` runs `pnpm run test:proxy-reliability`, which is `node scripts/run-proxy-reliability.mjs` (`package.json:170`), a **hardcoded array** of suites (`scripts/run-proxy-reliability.mjs:4-21`) — adding a file under `test/` or even a new `package.json` script does not add it to that array.

**Required change**: append one entry to `scripts/run-proxy-reliability.mjs`'s `checks` array (after the existing non-`proxy-*` entry, following the exact precedent already in that file for `continuous-test-suite-vertex-anthropic-fallback.ts`, which is not name-templated because it also isn't a `proxy-*` suite):

```js
["tsx", "test/continuous-test-suite-codex-outbound-tool-fidelity.ts"],
```

No `ci.yml` change needed — this reuses the existing required `rest` shard step verbatim. (The alternative — a standalone `test:codex-outbound-tool-fidelity` script plus a new `ci.yml` step under `matrix.group == 'rest'`, mirroring how `test:codex` is wired at `ci.yml:450-452` — is viable but adds a second CI touchpoint for no benefit here, since this suite's runtime cost is comparable to the other wrapper entries; not adopted.)

### 12. Dependencies on other design sections (unchanged except where corrected)

- **cache-anthropic / cache-vertex**: `flattenCodexToolNamespaces` still produces a `ClaudeTool[]` in stable, deterministic order (never a `Record`), unchanged.
- **cache-codex-prefix**: session/thread-affinity fact **corrected** per §6 — use `client_metadata.thread_id` or `prompt_cache_key` (verified identical), not invented top-level fields; tool-list turn-over-turn stability is **assumed, not confirmed** (§6) — that section should not skip its own dedup/hash logic on the strength of this design alone.
- **proxy-waste**: the two new counters (§7, §9) must still conform to whatever label-cardinality standard that section sets.
- **main / streaming-loop owner**: `CodexNativeStreamSerializer` is still a pure, stateless-per-call emitter, driven by that section's byte-buffering/commit-boundary loop; id-passthrough (§6) remains loop/routing-agnostic.
- **Request translation section**: owns `codexContentPartToClaudeBlock`/plain content-part mapping that `convertCodexInputItemsToClaudeMessages` (§4) calls into for non-tool `message` items — this section only owns the tool-call grouping and developer→system extraction inside that same array walk, and hands off content-part-level mapping rather than re-specifying it.

### 13. Facts still unresolved

1. UNRESOLVED: whether the real Codex CLI validates/enforces any format on a `function_call.call_id` it did not itself mint — the linchpin of Design 1 (§6). The one check that would settle it: serve a turn through this fallback so Anthropic mints a `toolu_`-shaped id, emit it as `call_id` to a real Codex CLI, confirm it's accepted unmodified on the next turn.
2. UNRESOLVED: whether Anthropic's real Messages API enforces any format constraint on an inbound (history) `tool_use.id`/`tool_result.tool_use_id`. The one check that would settle it: a live call with a deliberately non-`toolu_`-shaped id embedded in history, confirming 200 not 400.
3. UNRESOLVED: whether Vertex's Claude backend has the same tolerance as #2. The one check that would settle it: the same live-id test run against the Vertex path specifically.
4. UNRESOLVED: whether OpenAI's real custom-tool `format` union has variants beyond the single `{type:"grammar", syntax:"lark", definition}` observed. The one check that would settle it: a second real capture containing a custom tool declared without a grammar (e.g. free-text).
5. UNRESOLVED: whether a genuine Codex CLI ever nests a namespace inside another, or declares more than the two observed (`functions`, `collaboration`). The one check that would settle it: a real capture from a session with MCP servers or many plugins attached.
6. UNRESOLVED: whether tool-list content is truly stable turn-over-turn in one thread (§6, downgraded this pass from "confirmed" to "assumed"). The one check that would settle it: a real multi-turn capture (2+ turns, same thread) to diff `additional_tools` items across turns.

---

### Codex→Anthropic fallback: preserving prompt caching across the hop

Resolved section for **cache-preservation**. Depends on **cache-codex-prefix** for `CodexNativeRequest` and `convertCodexRequestToClaudeRequest`; both are cross-section contracts, not code that exists today (confirmed: zero hits for either name under `test/` or `src/lib/proxy/*.ts`).

### 0. Grounding corrections (read before the rest)

Two corrections to the original design's own grounding, found by spot-checking real data that already sits in this environment — neither was carried into the design, and both are load-bearing.

**A real Codex wire capture exists and was not consulted.** `scripts/generate-codex-fixtures.mjs`'s header comment says the shape is "modeled on a real redacted codex_exec/0.155.1 capture (`~/.neurolink/reference/codex-cli-wire-sample.json`), which is NOT available in this environment." That file **is** present (`note: "Real Codex CLI 0.155.1 /responses request captured 2026-09-21 via a local listener"`, read directly this pass). It changes two assumptions:

1. **Identity fields are nested, not top-level.** The real capture has `body.prompt_cache_key: "01a0c461-7737-7350-9e45-27875f2a6f40"` and `body.client_metadata: { thread_id: "01a0c461-...", session_id: "01a0c461-...", turn_id, root_turn_id, ... }` (`prompt_cache_key === client_metadata.thread_id` verbatim) — there is **no top-level `body.thread_id`/`body.session_id`**. The synthetic `test/fixtures/codex-request-resumed-session.json` puts `session_id`/`thread_id` at the top level of `body`, which this one real sample does not corroborate. Every affinity-key check must read `client_metadata`, not top-level fields (§6 below fixes this — resolves review Finding 3, adopted).
2. **The functions/collaboration split is per-tool, not per-namespace.** `additional_tools.tools` in the real capture is an array of two `{type:"namespace", name, tools:[...]}` objects. Inside the `"functions"` namespace: `wait` and `request_user_input` are `type:"function"` (JSON-schema `parameters`), but `exec` is `type:"custom"` with `format:{type:"grammar", syntax:"lark", definition:"..."}` — grammar, not JSON schema. Inside `"collaboration"`: all six tools (`followup_task`, `interrupt_agent`, `list_agents`, `send_message`, `spawn_agent`, `wait_agent`) are `type:"function"` with normal `parameters`. This is the **opposite** of the synthetic generator's modeled assumption ("the `exec` tool lives in `collaboration`, is type:`custom`") and of the original design's Risk 4 framing ("collaboration tools have no `input_schema`... functions [namespace] = JSON-schema tools"). **Correction, binding on cache-codex-prefix's IR builder**: filter by each tool's own `type` field (`"function"` → has `parameters`, mappable to `ClaudeTool.input_schema`; `"custom"` → has `format`, not mappable, out of scope per Risk 4) across **both** namespaces, never by namespace name. Getting this wrong changes which tools land in `tools: ClaudeTool[]` and therefore whether breakpoint 1 (§2) is placed on the request the design assumes.

Both corrections are single-sample evidence (one real capture, one turn). What remains genuinely unverified — **UNRESOLVED: whether the four developer-role blocks (persona/sandbox/tool-usage/output-formatting) and the tools array are byte-identical turn-to-turn on live traffic — the one real capture is a single turn, not two turns of the same conversation. The check that would settle it: capture ≥2 turns of one real Codex CLI session (same listener technique used for the existing sample) and diff `input[0..4]` between them.** The developer-block _count_ (4, at fixed indices 1–4 after `additional_tools` at index 0) does hold across all 4 synthetic fixtures **and** this one real sample — good enough to enforce as an invariant (§1), not yet good enough to certify as permanently stable content.

### 1. Types (add to `src/lib/types/proxy.ts`; already barrel-exported)

`src/lib/types/index.ts:65` already has `export * from "./proxy.js"` — **no index.ts edit is needed** (the original design listed it as a file to modify; dropped, it was redundant with the existing wildcard export).

```ts
// src/lib/types/proxy.ts — add near ClaudeCacheControl (existing, line 73-81)

/** TTL override for applyClaudeRequestCacheBreakpoints's breakpoint 1 only. */
export type ClaudeCacheBreakpointOptions = {
  ttl?: "5m" | "1h";
};

/** Where a Claude-shaped request originated, for cache/cost attribution. */
export type ProxyRequestOrigin = "native" | "codex-fallback";

/** Session-affinity routing key for Codex-origin fallback requests. */
export type CodexAnthropicAffinityKey =
  | `codex-thread:${string}`
  | `codex-session:${string}`
  | `codex-prefix:${string}`;
```

Note (resolves review Finding 6, adopted): `ClaudeCacheControl` (`src/lib/types/proxy.ts:73-81`) **already has** `ttl?: "5m" | "1h"` with a doc comment describing the 1.25x/2x tradeoff — confirmed zero live producers repo-wide (`grep -rn '"1h"' src/lib` hits only this type declaration and unrelated `timeRange`/timeout-string types). The real gap is narrower than "add a field to the wire type": it's that no function threads a caller-supplied `ttl` into the existing field.

### 2. Breakpoint placement + enforced system-shape invariant

Given `ClaudeRequest` (from cache-codex-prefix) with `tools: ClaudeTool[]` and `system: ClaudeTextBlock[]` (`ClaudeRequest.system?: string | ClaudeTextBlock[]`, `src/lib/types/proxy.ts:158`):

**Contract cache-codex-prefix must satisfy, enforced defensively here (resolves review Finding 1, adopted):** `system` contains _exactly_ the developer-role-derived blocks and nothing else — today `length === 4`, confirmed across all 4 synthetic fixtures and the one real capture (§0). `environment_context` and any other per-turn payload belong in `messages`, never appended to `system`. `system[system.length-1]` is only a safe breakpoint-1 anchor while this invariant holds; trusting it silently is exactly the "silent length change with no visible symptom other than a slow cache-hit-rate metric" the review flagged.

```ts
// src/lib/proxy/codexOutboundCache.ts (new file; also holds §6's affinity key)

/** Thrown by assertClaudeSystemPrefixShape when the invariant is violated. */
export class ClaudeSystemPrefixShapeError extends Error {}

/**
 * Enforces that `system` is exactly the stable developer-block prefix before
 * a caller marks breakpoint 1 on its last element. Throws rather than logs:
 * a silent violation here defeats caching with no visible symptom besides a
 * slow-moving cache-hit-rate metric (review Finding 1).
 */
export function assertClaudeSystemPrefixShape(
  system: ClaudeTextBlock[] | string | undefined,
  expectedLength: number,
): void {
  if (!Array.isArray(system)) {
    throw new ClaudeSystemPrefixShapeError(
      `expected an array-shaped system prefix, got ${typeof system}`,
    );
  }
  if (system.length !== expectedLength) {
    throw new ClaudeSystemPrefixShapeError(
      `expected system.length === ${expectedLength} (fixed developer-block prefix), got ${system.length}`,
    );
  }
}
```

Placement (unchanged mechanism, now guarded):

1. **Breakpoint 1**: call `assertClaudeSystemPrefixShape(request.system, 4)` first; on success mark `cache_control` on `system[system.length-1]` — exactly `applyClaudeRequestCacheBreakpoints`'s existing branch (`src/lib/utils/anthropicCacheBreakpoints.ts:244-251`, `Array.isArray(out.system) && out.system.length > 0 && existing === 0`). Because Anthropic renders `tools → system → messages`, this one marker covers the tool-declarations prefix and all four developer blocks together. No change needed to this branch itself.
2. **Breakpoints 2-4**: exactly `applyClaudeHistoryBreakpoints` (`anthropicCacheBreakpoints.ts:287-324`) — walks `messages` from the tail, marks the last `text`/`tool_result` block of up to 3 messages, skips a message with no markable block without spending budget. Unchanged.

**Required code change**: `CLAUDE_EPHEMERAL` (`anthropicCacheBreakpoints.ts:273`, `{ type: "ephemeral" }`, no `ttl`) means every call gets the 5-minute default. Thread an optional TTL into breakpoint 1 only:

```ts
// src/lib/utils/anthropicCacheBreakpoints.ts
export function applyClaudeRequestCacheBreakpoints(
  request: ClaudeRequest,
  options?: ClaudeCacheBreakpointOptions,
): ClaudeRequest;
```

Add `function ephemeral(ttl?: "5m" | "1h"): ClaudeCacheControl { return ttl ? { type: "ephemeral", ttl } : CLAUDE_EPHEMERAL; }`, used only for breakpoint 1 (the `system`/`tools` branch at line 244-251 and the array-tools fallback at 252-265); `applyClaudeHistoryBreakpoints` keeps calling the bare `CLAUDE_EPHEMERAL` constant for breakpoints 2-4 unchanged (§3 explains why they must not share the TTL). `openaiFormat.ts:722` (`applyClaudeRequestCacheBreakpoints(result)`, no options passed) is unaffected — confirmed this is its only call site in the file.

**Tool ordering (real constraint, unchanged from original design, still verified true)**: `codexFallback.ts:436-441` (the existing _outbound_ direction, Claude→Codex) builds `request.tools` via `body.tools.map(...)` over a plain array — order-preserving by construction. The new _inbound_ converter (Codex-native tools → `ClaudeTool[]`, cache-codex-prefix's job) must follow the same pattern — `.map()`/spread directly over the source array in fixed field order, filtering per-tool by `type` per §0's correction, never staged through a `Record` keyed by name. Anthropic's cache is byte-identity of everything up to the marker and `tools` renders before `system`; reordering silently invalidates breakpoint 1 every time it happens.

### 3. TTL choice: 1 hour on breakpoint 1, 5 minutes on breakpoints 2-4

Verified rates, `src/lib/utils/pricing.ts:170-175` (`claude-sonnet-5`): input $2.00/MTok, output $10.00/MTok, cache read $0.20/MTok (0.1x), cache write $2.50/MTok at 5m (1.25x). `CATALOG_PRICING`'s type (`pricing.ts:31-40`) has a single `cacheCreation?: number` field, applied unconditionally in the cost formula regardless of the request's actual TTL (`pricing.ts:1061-1064`, verified: `cost += usage.cacheCreationTokens * (rates.cacheCreation ?? rates.input)` with no TTL branch) — **there is no distinct 1-hour rate field today**; a 1h-TTL write is silently billed at the 5m/1.25x rate unless `pricing.ts` gains one (Risk, unresolved by this section — belongs to whoever owns cost tracking).

Using `codexFallback.ts`'s own measured stable-head size (3,700 tokens, cited at `codexFallback.ts:340-361`) as the worked example, 20 turns:

- **All gaps < 5 min**: 5m TTL = 1 write ($2.5/MTok×3700) + 19 reads ($0.2/MTok×3700) = **$0.0233**. 1h TTL = 1 write ($4.0/MTok×3700, Anthropic's documented 2x multiplier applied by hand since `pricing.ts` has no field for it) + 19 reads = **$0.0288** — 24% more, for nothing.
- **One gap > 5 min** (`codexFallback.ts:296-298`: "a fallback that arrives in bursts separated by long gaps" — confirmed, this exact phrase is in the file): 5m TTL pays a second write: 2 writes + 18 reads = **$0.0330**. 1h TTL unchanged at $0.0288 — now cheaper, and every additional gap widens the gap further.

**Choice**: 1-hour TTL on breakpoint 1 only (tools+system prefix, the segment §0 shows is plausibly stable in shape and, per the still-open turn-to-turn question, at least stable in developer-block count); 5-minute default (unchanged) on breakpoints 2-4, which slide forward every turn or two (§7) — paying 2x to protect a marker about to be superseded is pure waste. **What this gives up**: if Codex-fallback bursts always land inside 5 minutes of each other, this costs ~24% more on breakpoint 1's write for zero benefit — an assumption from `codexFallback.ts`'s own comment about the _opposite_-direction traffic pattern, not a measured fact for this direction (no baseline exists; the feature doesn't exist yet). Revisit using §8's measurement once live.

### 4. Role-alternation precondition (resolves review blocker 2, corrected)

**The hazard is real.** Anthropic requires alternating `user`/`assistant` roles in `messages`; this codebase already treats consecutive same-role messages as a defect elsewhere: `src/lib/context/stages/slidingWindowTruncator.ts:29-38` (`validateRoleAlternation`, which warns `Role alternation broken at index ${i}`), `src/lib/providers/anthropic/client.ts:2417` ("Anthropic requires user/assistant alternation around tool blocks"), `test/continuous-test-suite-tasks.ts:2466` (asserts alternation as an invariant). Per §0, the real capture's `input[5]`/`input[6]` are **both** `role:"user"` back to back (an auto-injected `<recommended_plugins>` notice, then the literal user text "say OK", no assistant turn between) — the same hazard shape as the synthetic fixtures' user-ask-then-`environment_context` pair, just in reverse order. If cache-codex-prefix maps these 1:1 into two separate `ClaudeMessage` entries, the request has two back-to-back `user` messages and Anthropic returns 400 on every Codex-fallback request that hits it.

**Correction to the review's own fix**: the review cited `openaiFormat.ts:604-654` as "the pattern this same repo's OpenAI bridge already uses for tool-role folding" — **verified false**. Read directly: that block pushes one _separate_ `{role:"user", content:[...]}` message per OpenAI `"tool"`-role input (`openaiFormat.ts:652-662`), with no merge/coalesce step anywhere in the file (`grep -n "messages\[messages.length - 1\]\|merge\|fold" src/lib/proxy/openaiFormat.ts` → zero hits). Multiple consecutive OpenAI tool messages would produce the identical back-to-back-`user` hazard in the _existing_, shipped bridge — there is no working precedent to reuse; the repo-wide search for any merge/coalesce helper (`mergeConsecutive|foldConsecutive|coalesceMessages|mergeSameRole`) matches only the truncator's warn-only `validateRoleAlternation`.

**Resolution, scoped to avoid regressing the existing OpenAI bridge**: do not add a hard throw inside the shared `applyClaudeRequestCacheBreakpoints` (it would newly reject already-shipped, already-latent-buggy OpenAI-bridge traffic that has shipped without incident). Instead, add a narrow, new, opt-in guard called only from the new Codex-fallback dispatch path, immediately after `convertCodexRequestToClaudeRequest()` and before `applyClaudeRequestCacheBreakpoints()`:

```ts
// src/lib/proxy/codexOutboundCache.ts
/** Throws with the offending index if `messages` is not alternation-safe. */
export function assertClaudeMessagesAlternate(
  messages: ReadonlyArray<ClaudeMessage>,
): void {
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].role === messages[i - 1].role) {
      throw new ClaudeSystemPrefixShapeError(
        `messages[${i}] repeats role "${messages[i].role}" from messages[${i - 1}]` +
          " — Anthropic requires alternation; cache-codex-prefix's translator" +
          " must merge same-role turns into one message with multiple content blocks",
      );
    }
  }
}
```

This makes a translation defect a loud, attributable thrown error at the new hop's boundary instead of a silent 400 with no distinguishing symptom — directly answering the review's "no failure mode listed" complaint — while leaving the shared breakpoint function's existing behavior, and the OpenAI bridge's existing (separately pre-existing, out-of-scope-here) latent gap, untouched. Merging same-role Codex items into one Claude message with multiple content blocks remains cache-codex-prefix's translation-correctness job, not this section's to build.

### 5. Prefix determinism as an enforceable property + test

**Property**: for two consecutive turns of the same conversation with no tool added/removed, `tools` and `system` (all 4 elements, per §2's enforced invariant) must serialize to byte-identical JSON. `messages` is explicitly excluded — it's expected to vary.

**What must be byte-stable**: no timestamp, request id, or per-turn nonce anywhere in `tools` or `system`. None of the fixtures nor the one real sample currently carry one; the hazard is a future Codex CLI version injecting one, which nothing in this repo can prevent upstream — only detect via this test.

**Test** — `test/continuous-test-suite-codex.ts` (CI-gated: `package.json:173` defines `"test:codex": "pnpm exec tsx test/continuous-test-suite-codex.ts"`; `.github/workflows/ci.yml:452` runs `pnpm run test:codex` under the `provider-safety-net-shards` job's `matrix.group == 'rest'` — same job, same shard group, as `test:proxy-reliability` at `ci.yml:445`, so both are gated together). Uses the file's actual idiom, verified by reading it: `import { assert, assertEqual, defineSuite, runCLI } from "./helpers/harness.js"` (line 87), `const { test, runSuite } = defineSuite("Codex Pool Engine", { offline: true })` (line 89) — not raw `node:assert`.

```ts
// Determinism exception (CLAUDE.md rule 15): drives a pure translation
// function twice over two fixtures rather than a live capture repeated
// twice, which no live call can be made to hold reliably still for.
await test("codex outbound fallback: translated Anthropic prefix is byte-stable, and breakpoint 1 lands on the stable element, across two turns with unchanged tools/instructions", () => {
  const turn1 = loadCodexFixture("codex-request-interactive-mode.json");
  const turn2 = loadCodexFixture("codex-request-turn2-same-session.json"); // new fixture, see Files
  const c1 = applyClaudeRequestCacheBreakpoints(
    convertCodexRequestToClaudeRequest(turn1), // cache-codex-prefix's function; contract: (native: CodexNativeRequest) => ClaudeRequest
    { ttl: "1h" },
  );
  const c2 = applyClaudeRequestCacheBreakpoints(
    convertCodexRequestToClaudeRequest(turn2),
    { ttl: "1h" },
  );
  const s1 = c1.system as ClaudeTextBlock[];
  const s2 = c2.system as ClaudeTextBlock[];

  // Resolves review Finding 4: slice(0,4) alone would pass even if the
  // marker silently landed on a 5th, volatile element — assert the length
  // invariant AND which index carries the marker, not just prefix equality.
  assertEqual(s1.length, 4, "system must be exactly the 4 developer blocks");
  assertEqual(s2.length, 4, "system must be exactly the 4 developer blocks");
  assertEqual(
    JSON.stringify(c1.tools),
    JSON.stringify(c2.tools),
    "tool array drifted across turns with no tool change — breakpoint 1 will miss every turn",
  );
  assertEqual(
    JSON.stringify(s1),
    JSON.stringify(s2),
    "developer-message prefix drifted across turns — breakpoint 1 will miss every turn",
  );
  assert(
    s1[3].cache_control?.ttl === "1h" && s2[3].cache_control?.ttl === "1h",
    "breakpoint 1 must carry ttl:'1h' on the stable 4th (last) developer block specifically",
  );
});
```

`JSON.stringify` is safe here (no canonical serializer needed) only because every object on this path is built via `.map()`/spread over source arrays in fixed field order (§2's ordering constraint) — if cache-codex-prefix ever stages a field through a `Record`, this equality check goes flaky on key order and must switch to a sorted-key serializer. Needs new fixture `test/fixtures/codex-request-turn2-same-session.json` (see Files).

Naming contract on cache-codex-prefix (resolves review Finding 5, adopted — neither helper exists today, confirmed via grep): `loadCodexFixture(name: string): CodexNativeRequest` and `convertCodexRequestToClaudeRequest(native: CodexNativeRequest): ClaudeRequest` are net-new; this section only names and consumes them, it does not own their implementation.

### 6. Account cache locality (affinity)

**Verified**: `selectClaudeProxyAccountOrder`'s `sessionId` param (`src/lib/server/routes/claudeProxyRoutes.ts:2638-2645`) is a plain `string | undefined` with zero format validation, flowing straight into `sessionAffinity.get(sessionId, now, idleTtlMs)` / `.bind(sessionId, accountKey, now)` (`src/lib/proxy/sessionAffinity.ts:13,32` — both plain-`string` keyed, no parsing). The only restriction to Claude-Code-shaped ids lives entirely in `extractSnapshotBody` (`claudeProxyRoutes.ts:3133`) → `parseClaudeCodeUserId` (`src/lib/auth/anthropicOAuth.ts:143`, requiring `metadata.user_id` to parse as `{device_id: 64-hex, account_uuid: uuid, session_id: uuid}`). The storage/routing layer needs **no** changes; the gap is only that nothing hands it a key for Codex-origin traffic today.

**Identity a Codex request can supply — corrected against the real capture (resolves review Finding 3, adopted)**: the original design's priority list (`body.thread_id`, then `body.session_id`, both top-level, from the synthetic `resumed-session` fixture) is contradicted by the one real sample, which has neither top-level field but does have `body.prompt_cache_key` (top-level) and `body.client_metadata.thread_id` / `body.client_metadata.session_id` (nested), with `prompt_cache_key === client_metadata.thread_id` verbatim. Prefer the client's own pre-computed key — it is already exactly the signal being reconstructed, and it's the same key the real Codex client uses for its own infra affinity:

```ts
// src/lib/proxy/codexOutboundCache.ts
export function codexAnthropicAffinityKey(
  native: CodexNativeRequest, // cache-codex-prefix's type
): CodexAnthropicAffinityKey | undefined {
  const promptCacheKey = (native as { prompt_cache_key?: unknown })
    .prompt_cache_key;
  if (typeof promptCacheKey === "string" && promptCacheKey.length > 0) {
    return `codex-thread:${promptCacheKey}`;
  }
  const clientMetadata = (
    native as { client_metadata?: Record<string, unknown> }
  ).client_metadata;
  const threadId = clientMetadata?.thread_id;
  if (typeof threadId === "string" && threadId.length > 0) {
    return `codex-thread:${threadId}`;
  }
  const sessionId = clientMetadata?.session_id;
  if (typeof sessionId === "string" && sessionId.length > 0) {
    return `codex-session:${sessionId}`;
  }
  const prefix = codexNativePrefixDigest(native); // bounded-head + joined-tool-names idiom, mirroring codexCachePrefix (codexFallback.ts:372-382), reading native.input directly
  return prefix ? `codex-prefix:${prefix}` : undefined;
}
```

The three-way prefix (`codex-thread:`/`codex-session:`/`codex-prefix:`) keeps this from colliding with a Claude-Code `metadata.user_id`-derived UUID or with itself across cases. Reserve the `codex-prefix:` hash fallback for when the wire genuinely carries none of `prompt_cache_key`/`client_metadata.thread_id`/`client_metadata.session_id` — **UNRESOLVED: whether a genuinely first-turn native Codex request ever omits all three — the one real sample has all three populated. The check that would settle it: capture one real first-turn (no prior `/backend-api/codex` call in that session) request and inspect `body.prompt_cache_key`/`body.client_metadata`.**

**How it reaches the machinery — unresolved cross-section dependency, unchanged from the original design**: whichever Anthropic dispatch entry point cache-codex-prefix (or `main`) builds must accept an explicit override, e.g. `sessionAffinityKey?: string`, threaded to both `selectClaudeProxyAccountOrder({ ..., sessionId: args.sessionAffinityKey ?? clientSnapshotBody?.sessionId })` and the matching `bindSessionAfterServe` call. Verified current state: the only call site (`claudeProxyRoutes.ts:5364-5366`) hardcodes `sessionId: clientSnapshotBody?.sessionId` with no override parameter — this section cannot resolve that architecture question itself; if it resolves with no override seam, this affinity mechanism cannot be wired without revisiting that decision.

**Degrade path**: turn 1 gets prefix-scoped (not conversation-scoped) affinity; once the client echoes back `prompt_cache_key`/`thread_id`, affinity upgrades to conversation-scoped — at most one cold turn per conversation, at the cost of distinct concurrent conversations sharing one Codex agent config colliding into the same prefix bucket until they individuate.

### 7. How breakpoints move as the conversation grows

No new mechanism: `applyClaudeHistoryBreakpoints` (§2.2) already rolls forward every turn — it re-marks the last block of the newest ~3 messages each call; a byte-identical previously-marked prefix from last turn is a cache read this turn, not a re-write, so re-marking it is free. The stable head (breakpoint 1) never moves. **Depends on cache-compaction**: if compaction rewrites or drops messages _inside_ the currently-marked rolling window (rather than only older, already-unmarked history), every breakpoint at or after the rewritten point misses for that turn — inherent to Anthropic's byte-identity cache semantics. cache-compaction's design should prefer compacting only messages strictly older than the last-3-marked window, or account for the resulting cache-miss cost explicitly.

### 8. Expected cache-hit outcome and the exact measurement

**Fix**: widen `proxyTracer.ts`'s `tokenLabels` (verified exact shape, `src/lib/proxy/proxyTracer.ts:891-893`: `{ model: this.model, account: this.accountEmail ?? "unknown" }`, no origin field) with one new low-cardinality field, mirroring the existing `setServedAccount` (`proxyTracer.ts:502`) / `setModelSubstitution` (`proxyTracer.ts:638`) pattern — both verified real, both mutate a private field then call `this.rootSpan.setAttribute(...)`:

```ts
// src/lib/proxy/proxyTracer.ts — add to class ProxyTracer (line 259)
private requestOrigin: ProxyRequestOrigin = "native"; // new private field

setRequestOrigin(origin: ProxyRequestOrigin): void {
  this.requestOrigin = origin;
  this.rootSpan.setAttribute("proxy.request_origin", origin);
}
// tokenLabels = { model: this.model, account: this.accountEmail ?? "unknown", origin: this.requestOrigin };
```

Call `tracer.setRequestOrigin("codex-fallback")` at the point the new outbound path enters the Anthropic dispatch — same unresolved entry-point location as §6.

**Expected outcome**: `proxy_tokens_cache_read` for `origin='codex-fallback'` should become non-zero and dominate over `proxy_tokens_cache_creation` after the first turn of each conversation/prefix-bucket. No specific target ratio is asserted — no baseline exists for this direction yet.

**Post-rollout query** (columns previously verified live against this environment's metrics store; cumulative-monotonic counter, so `MAX(value)` per series key before summing, never `SUM(value)` directly):

```sql
SELECT model, SUM(v) AS cache_read_tokens
FROM (
  SELECT model, account, start_time, MAX(value) AS v
  FROM proxy_tokens_cache_read
  WHERE origin = 'codex-fallback'
  GROUP BY model, account, start_time
)
GROUP BY model
```

Run identically against `proxy_tokens_cache_creation`; hit rate = `cache_read / (cache_read + cache_creation)`. Pair with the same WHERE/GROUP against `proxy_tokens_input` as a sanity control — an empty result on the cache queries is "not measured," not "zero," unless the input-token control for the same filter is non-empty (proving traffic flowed at all). **Not done in this pass**: no live baseline query was run — the `origin` label doesn't exist yet.

### Files

| Path                                                  | Action | Purpose                                                                                                                                                                                                  |
| ----------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/utils/anthropicCacheBreakpoints.ts`          | modify | Add optional `ClaudeCacheBreakpointOptions` param to `applyClaudeRequestCacheBreakpoints`, applied only to breakpoint 1 via a new `ephemeral(ttl?)` builder; breakpoints 2-4 unchanged.                  |
| `src/lib/proxy/codexOutboundCache.ts`                 | create | `assertClaudeSystemPrefixShape`, `assertClaudeMessagesAlternate`, `codexAnthropicAffinityKey`, `ClaudeSystemPrefixShapeError`.                                                                           |
| `src/lib/types/proxy.ts`                              | modify | Add `ProxyRequestOrigin`, `ClaudeCacheBreakpointOptions`, `CodexAnthropicAffinityKey`.                                                                                                                   |
| `src/lib/proxy/proxyTracer.ts`                        | modify | Add `requestOrigin` field (default `"native"`), `setRequestOrigin()`, widen `tokenLabels` on the token/cost counters at lines 891-922.                                                                   |
| `test/continuous-test-suite-codex.ts`                 | modify | Add §5's determinism + placement test, using the file's existing `defineSuite`/`test`/`assertEqual`/`assert` idiom (imported line 87, instantiated line 89).                                             |
| `test/fixtures/codex-request-turn2-same-session.json` | create | Second-turn fixture: same tools + 4 developer messages as `codex-request-interactive-mode.json`, different `environment_context` and an appended turn.                                                   |
| `scripts/generate-codex-fixtures.mjs`                 | modify | Emit the new turn-2 fixture; also correct its header comment's now-false claim that no real capture is available (§0), and its functions/collaboration modeling to match the real per-tool `type` split. |

Dropped from the original design's file list: `src/lib/types/index.ts` — `export * from "./proxy.js"` (line 65) already re-exports everything added to `proxy.ts`; no separate edit needed. `src/lib/utils/pricing.ts` (a distinct 1h cache-write rate field) — real, verified gap (§3), but owned by whoever owns cost tracking, not this section; left as an explicit dependency, not a file this section edits.

### Tests

1. **Byte-stability + placement determinism** — `test/continuous-test-suite-codex.ts`, new `test(...)` block (§5): two consecutive-turn fixtures with unchanged tools/developer-messages produce (a) `system.length === 4` on both turns, (b) `JSON.stringify`-identical `tools` and `system`, (c) `system[3].cache_control.ttl === "1h"` on both — not just prefix-slice equality, which would pass even with a misplaced marker (Finding 4 fix).
2. **TTL selection** — same file: `applyClaudeRequestCacheBreakpoints(request, { ttl: "1h" })` sets `system[system.length-1].cache_control.ttl === "1h"` on breakpoint 1 while rolling message breakpoints 2-4 keep `cache_control.ttl` undefined (5m default).
3. **Budget ceiling** — same file: a Codex-shaped request already carrying one `cache_control` marker in its message history never exceeds `ANTHROPIC_MAX_CACHE_BREAKPOINTS` (4, `anthropicCacheBreakpoints.ts:32`) after `applyClaudeRequestCacheBreakpoints` runs, reusing the existing `countAnthropicCacheMarkers` (`anthropicCacheBreakpoints.ts:97`) invariant.
4. **System-shape guard** — same file: `assertClaudeSystemPrefixShape` throws `ClaudeSystemPrefixShapeError` when given a `system` array of length 5 (simulating `environment_context` leaking into `system`), and passes silently at length 4.
5. **Role-alternation guard** — same file: `assertClaudeMessagesAlternate` throws naming the offending index on a `[user, user]` messages array (the exact real-capture and synthetic-fixture shape from §4), and passes on a well-formed alternating array.
6. **Affinity-key derivation** — same file: four fixtures (has `prompt_cache_key` / has only `client_metadata.thread_id` / has only `client_metadata.session_id` / has none) produce correctly-prefixed `codexAnthropicAffinityKey` values (`codex-thread:`/`codex-thread:`/`codex-session:`/`codex-prefix:`); two "none" fixtures with identical tools+developer-messages but different `environment_context`/user turns produce the **same** `codex-prefix:` key, proving it is prefix-derived, not full-body-derived.
7. **Post-rollout live measurement** (not a unit test, an explicit acceptance check): run §8's two queries against `proxy_tokens_cache_read`/`proxy_tokens_cache_creation` filtered on `origin='codex-fallback'`, paired with the same filter against `proxy_tokens_input` as a traffic-flowed sanity control.

Gating: `test:codex` (`package.json:173`) runs under `.github/workflows/ci.yml:452`, inside the `provider-safety-net-shards` job (`ci.yml:348`), `matrix.group == 'rest'` — the same required job and shard group that runs `test:proxy-reliability` (`ci.yml:445`, wrapping `scripts/run-proxy-reliability.mjs`). Tests 1-6 are therefore CI-gated by the repo's own definition (npm script + workflow both run it in a required job); test 7 is a manual rollout check, not CI-gated, and is labeled as such rather than implied to be.

### Risks

1. 1-hour TTL on breakpoint 1 costs ~24% more than 5-minute if Codex-fallback bursts always land under 5 minutes apart — an assumption borrowed from `codexFallback.ts`'s comment about the _opposite_-direction traffic pattern, not a measured fact for this direction; no baseline exists yet (§3).
2. First-turn Codex session identity beyond `prompt_cache_key`/`client_metadata` is still unverified against more than one live capture (§0, §6 UNRESOLVED) — if it is ever genuinely absent, concurrent distinct conversations sharing one Codex agent config collide into the same prefix-derived affinity bucket until each gets its own id.
3. Hard architectural blocker, unchanged: `codexAnthropicAffinityKey` can only reach `selectClaudeProxyAccountOrder`/`bindSessionAfterServe` if the not-yet-decided Anthropic dispatch entry point exposes an explicit `sessionAffinityKey` override seam instead of hardcoding `extractSnapshotBody(body)` — verified current call site (`claudeProxyRoutes.ts:5364-5366`) has no such seam today.
4. `pricing.ts` has no dedicated 1-hour cache-write rate field (verified, §3) — any cost computation for this path that doesn't add one silently uses the 5-minute (1.25x) rate and under-reports actual spend on 1h-TTL writes.
5. If cache-compaction rewrites a message inside the currently-marked rolling window, every breakpoint at or after that point misses simultaneously for that turn — a full-price spike indistinguishable from normal operation unless the new origin-labeled counters (§8) are actively watched for a drop-then-plateau pattern.
6. Widening `proxyTracer`'s `tokenLabels` with a new `origin` field changes the label set of an already-live, already-queried OTLP counter — confirm no existing dashboard/alert assumes exactly `{model, account}` as the complete label set before shipping.
7. The role-alternation guard (§4) and system-shape guard (§2) are scoped to the new Codex-fallback entry point only, by design, to avoid regressing the existing OpenAI bridge's already-shipped (separately latent, out-of-scope-here) same-role-message gap. If a future refactor routes OpenAI-bridge traffic through the same new dispatch function, these guards will start throwing on that pre-existing gap too — intentional if so, but worth flagging at that refactor's review time rather than assuming these guards are Codex-only forever.

---

### Codex Outbound Fallback — Trigger Policy, In-Flight Commitment Safety, Loop Prevention, Accounting

Resolved section for "Codex outbound fallback" (native Codex client request falls back to Anthropic/Vertex). All line numbers below are approximate (`~`) pointers verified against `/Users/sachinsharma/Developer/Official/fix/proxy-ci-gaps-and-dead-leg-alert` on 2026-09-27; re-grep before wiring, this repo's own CI-reading lessons apply to source line drift too.

### 0. Corrections carried in from design + review, confirmed by direct read this session

- **Four pre-commit insertion points, not two** (design's own correction, re-verified): `codexProxyRoutes.ts:878` (`accounts.length===0`), `:895-896` (`eligible.length===0`), `:1057-1076` (non-retryable transport error inside the inner per-account fetch `catch`, un-rotated single-account terminal `return`), `:1454-1458` (end-of-account-loop fallthrough). Confirmed the third site verbatim: the `catch` block computes `errorCode`, and only rotates (`break`) when `errorCode` is one of `UND_ERR_CONNECT_TIMEOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN`; every other transport error hits `return buildCodexErrorResponse(502, ...)` immediately, trying no other account.
- **`ProxyContextPreflightError`/token-budget errors are not "re-thrown past" the fallback sites — they never reach them.** Corrected from the design's own §1 table: `codexProxyRoutes.ts:850-861` catches `ProxyContextPreflightError` locally and returns `buildCodexErrorResponse` directly inside `dispatch()`'s own outer `try`, before any account is even loaded; `:961-972` does the same for `getProxyTokenBudgetError`. Both are independent, self-contained terminal returns, not exceptions that skip past the four insertion points listed above — they simply never touch those four call sites at all. The trigger-table conclusion (never fall back) is unchanged; only the mechanism description changes.
- **`ServerContext.metadata` is `Record<string, unknown>` at `src/lib/types/server.ts:291`** (design cited `:256`; corrected pointer, same fact).
- **`recordFallbackAttempt`'s shape, `classifyProxyFailureCode`'s vocabulary, `preflightAnthropicStream`'s four-kind result, `buildProxyTranslationPlan`'s single-entry dedup, `executeClaudeCodexFallback`'s nested-ctx pattern (`${ctx.requestId}:codex-fallback`), and `test:codex` → `test/continuous-test-suite-codex.ts`** — all re-read this session and match exactly as designed/reviewed.
- **CI job naming (review's minor finding, adopted):** the required check is `provider-safety-net` (`ci.yml:330`), which is a thin `needs:[provider-safety-net-shards]` pass-through with `if: always()`. The actual `run: pnpm run test:proxy-telemetry` / `test:proxy-reliability` / `test:codex` lines live in the **separate** matrix job `provider-safety-net-shards` (`ci.yml:348`, `matrix.group=='rest'`, lines 444/448/452). Gating conclusion unchanged (landing a case in `test:codex` gates the merge because `provider-safety-net` requires `provider-safety-net-shards` to succeed); only the job name attribution is corrected here.
- **New, load-bearing finding from this pass (not in either prior artifact): `handleAnthropicRoutedClaudeRequest` returns `Promise<unknown>`, and that `unknown` is not a uniform shape.** Confirmed at `claudeProxyRoutes.ts:10193-10215`: on success it returns `successResult.response`, which per `AnthropicSuccessResult` (`types/proxy.ts:1365`) is `Response | unknown` — a real `Response` instance for a streaming success (`handleAnthropicStreamingSuccessResponse` → `attachAnthropicSuccessStreamTelemetry`'s constructed stream Response), or a **plain parsed JSON object** for a non-streaming success (`handleAnthropicJsonSuccessResponse:7895`, `return { response: responseJson, served: true }` — `responseJson` is `JSON.parse(responseText)`, not a `Response`). On failure it can be a real `Response` (`buildConfiguredClaudeFallbackFailure:6363` does `return new Response(...)`) **or** a bare `ClaudeErrorResponse` plain object with **no status field at all** (`buildClaudeError`, `claudeFormat.ts:387-399`, only ever sets `{type:"error", error:{type, message}}` — the numeric status parameter is used solely to pick a default `error.type` string via `errorTypeFromStatus` and is then discarded). `tryBorrowFromPeers:5966-6018`'s own comment states the convention explicitly: _"Hand back what the rest of this module hands back: a locally constructed Response for a stream, a parsed object for JSON."_ This is confirmed as a deliberate, module-wide convention, not a bug — but it means a caller cannot recover the true HTTP status by inspecting the returned value alone for every path. §4 below designs around this directly (captured-logger pattern), rather than assuming a uniform `{status, response}` outcome as the original design did.

### 1. Trigger policy — total function over a classified error

**New type, `src/lib/types/codex.ts`** (named export, `type` alias only — no `interface`, per repo rule 7):

```ts
export type CodexOutboundFailureClass =
  | "no_accounts"
  | "all_accounts_cooling"
  | "network_error_unretryable"
  | "account_loop_exhausted"
  | "client_cancelled"
  | "deterministic_invalid_request";

export type CodexOutboundFailureInput =
  | {
      readonly kind:
        | "no_accounts"
        | "all_accounts_cooling"
        | "client_cancelled";
    }
  | { readonly kind: "network_error_unretryable"; readonly errorCode?: string }
  | {
      readonly kind: "account_loop_exhausted";
      readonly lastStatus: number;
      readonly lastErrorBody: string;
    };

export type CodexOutboundFallbackDecision = {
  readonly attemptFallback: boolean;
  readonly reason: CodexOutboundFailureClass;
};
```

`"context_preflight"` and `"token_budget"` are **dropped from this union** (review-adjacent correction, §0): those two conditions never reach a call site that would construct a `CodexOutboundFailureInput` at all (see §0), so encoding them as classifier inputs was dead code the classifier could never receive. Not modeled ⇒ not silently mis-triggered.

**New function, `src/lib/proxy/codexOutboundFallback.ts`** (new file):

```ts
export function classifyCodexOutboundFailure(
  input: CodexOutboundFailureInput,
): CodexOutboundFallbackDecision {
  switch (input.kind) {
    case "no_accounts":
      return { attemptFallback: true, reason: "no_accounts" };
    case "all_accounts_cooling":
      return { attemptFallback: true, reason: "all_accounts_cooling" };
    case "network_error_unretryable":
      return { attemptFallback: true, reason: "network_error_unretryable" };
    case "client_cancelled":
      return { attemptFallback: false, reason: "client_cancelled" };
    case "account_loop_exhausted": {
      // FIX (review [major], adopted): the review proved classifyProxyFailureCode(undefined)
      // returns {status:undefined, retryable:undefined}, so gating on retryable===false alone
      // silently defaults an *unrecognized* error-body code to attemptFallback:true even when
      // lastStatus is a known-deterministic 4xx. lastStatus is now load-bearing, not decorative.
      const parsedCode = parseCodexErrorCode(input.lastErrorBody); // JSON.parse(body)?.error?.code, catch -> undefined
      const known = classifyProxyFailureCode(parsedCode);
      const isKnownRetryable = known.retryable === true;
      const isDeterministic4xx =
        input.lastStatus >= 400 &&
        input.lastStatus < 500 &&
        input.lastStatus !== 429 &&
        !isKnownRetryable;
      if (known.retryable === false || isDeterministic4xx) {
        return {
          attemptFallback: false,
          reason: "deterministic_invalid_request",
        };
      }
      return { attemptFallback: true, reason: "account_loop_exhausted" };
    }
  }
  // No `default:` branch. tsconfig.json has strict:true + noImplicitReturns:true
  // (confirmed), so a new CodexOutboundFailureInput.kind member without a new
  // case here fails to compile (a "not all code paths return a value" /
  // noImplicitReturns diagnostic — TS7030-class; the earlier draft's "TS2367"
  // citation was wrong, review [minor], adopted: TS2367 is the unrelated
  // disjoint-equality-comparison check).
}

function parseCodexErrorCode(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as { error?: { code?: string } };
    return typeof parsed.error?.code === "string"
      ? parsed.error.code
      : undefined;
  } catch {
    return undefined;
  }
}

export const MAX_ENGINE_CROSSINGS = 1;
```

`classifyProxyFailureCode` is reused unchanged from `src/lib/proxy/proxyFailureDetails.ts:4-29` (confirmed vocabulary: `cyber_policy|content_policy_violation|content_filter|safety_violation → {403,false}`; `max_output_tokens|context_length_exceeded|invalid_request_error|empty_response → {undefined,false}`; else `{status: code==='rate_limit_exceeded'?429:undefined, retryable:undefined}`).

**Trigger/no-trigger table:**
| Condition | Fallback? | Why |
|---|---|---|
| `no_accounts` / `all_accounts_cooling` | **yes** | unconditionally terminal today; says nothing about request validity |
| 429 on an account, mid-rotation | **no fallback here** | existing cooldown+rotate already tries the next Codex account; only `account_loop_exhausted` with a still-429-shaped `lastStatus` triggers fallback |
| 401/403 exhausted after refresh+rotate | **yes**, via `account_loop_exhausted` | credential failure on Codex's OAuth pool says nothing about Anthropic's |
| 5xx exhausted after rotation | **yes**, via `account_loop_exhausted` | classic provider-outage case |
| non-retryable transport error, single account | **yes**, via `network_error_unretryable` | corrected insertion point #3; today silently terminal, zero retries |
| retryable transport error | **no fallback here** | existing same-account/rotate logic handles it; only exhaustion reaches `account_loop_exhausted` |
| deliberate 4xx about request validity (any code `classifyProxyFailureCode` marks non-retryable, **or** an unrecognized code with `lastStatus` in 400-499 excluding 429) | **never** | `deterministic_invalid_request`; mirrors `isInvalidRequestError`/`shouldAttemptClaudeFallback` (`claudeProxyRoutes.ts:12519`, `:10087`) |
| client abort | **never** | `client_cancelled` |
| context overflow / token-budget | **never** (not modeled) | terminal before any of the four sites, see §0 |
| mid-stream failure after Codex-client-facing `Response` already returned | **never** | out of scope by construction, see §2 |

**Tests** (`test/continuous-test-suite-codex.ts`, gated via `test:codex`, `ci.yml:452` inside `provider-safety-net-shards`, required indirectly through `provider-safety-net`):

1. `classifyCodexOutboundFailure` exhaustiveness is a **compile-time** assertion: a `// @ts-expect-error` fixture adding a bogus 7th `kind` to a local copy of the union and calling the switch must fail `tsc --strict`; verified once at review time, not re-run per CI invocation (no runtime equivalent for a type-level property).
2. `account_loop_exhausted` with `lastErrorBody='{"error":{"code":"invalid_request_error"}}'`, `lastStatus=400` → `{attemptFallback:false, reason:"deterministic_invalid_request"}`.
3. `account_loop_exhausted` with `lastErrorBody='{"error":{"code":"some_unrecognized_code"}}'`, `lastStatus=422` → `{attemptFallback:false, reason:"deterministic_invalid_request"}` (regression test for review [major] — the pre-fix classifier returned `attemptFallback:true` here).
4. `account_loop_exhausted` with `lastErrorBody='{"error":{"code":"rate_limit_exceeded"}}'`, `lastStatus=429` → `{attemptFallback:true, reason:"account_loop_exhausted"}`.
5. `account_loop_exhausted` with unparseable `lastErrorBody=""`, `lastStatus=502` → `{attemptFallback:true, reason:"account_loop_exhausted"}` (5xx never classified deterministic).
6. A simulated non-retryable transport error (`errorCode="ECONNRESET"`) on the first Codex account triggers exactly one `attemptCodexOutboundFallback` call before any second account is tried (spy/counter; regression test for the corrected 3rd insertion point).
7. `ctx.abortSignal` aborted at any of the four insertion points short-circuits to `cancelRequest()` and never reaches `classifyCodexOutboundFailure` (spy assertion, 0 calls).

### 2. Streaming commitment semantics

**Corrected commit point (review [blocker] + [major], both adopted — this materially changes the design from the prior draft):**

The prior draft planned to re-run `preflightAnthropicStream(reader)` on the value returned by `handleAnthropicRoutedClaudeRequest` and to treat `kind:"transport_error"` the same as `empty`/`sse_error` (both "safe to try next leg"). Both are wrong, confirmed by direct read:

- `handleAnthropicRoutedClaudeRequest` **already ran the full account loop internally**, including `preflightAnthropicStream`, before ever returning to its caller (`claudeProxyRoutes.ts:10949`, `return successResult.response;` — the loop only exits once an account's attempt is fully resolved as `served`/terminal). Re-running the preflight on the returned value re-buffers bytes that already passed and cannot produce a different verdict, and has no way to unwind an already-finalized account selection if it tried to. **Do not call `preflightAnthropicStream` a second time anywhere in the Codex-outbound path.**
- `handleAnthropicStreamingSuccessResponse`'s own `transport_error` branch (`claudeProxyRoutes.ts:7106-7135`) is **categorically terminal, never rotated**, with an explicit comment: _"The POST has already returned a response. The upstream may have started processing it, so replaying it on another account could duplicate work"_ → it returns `served:false` via `finalizeAnthropicTerminalTransportError`, which itself is folded into whatever `handleAnthropicRoutedClaudeRequest` ultimately returns as a **terminal failure**, not a retry signal. The ambiguous-side-effects concern is generic to "did the POST already leave the process," not specific to same-vs-cross-engine, so it transfers unchanged to this hop: Codex must not further rotate to Vertex/a different Anthropic account past this outcome either. Because it is already terminal _inside_ `handleAnthropicRoutedClaudeRequest`, no special casing is needed at the Codex-outbound layer — it simply falls out of the ordinary "did this call succeed" check in §4 below as a failure with `status>=400`, which the caller already treats as "fall through to Codex's own pre-existing terminal response," never as "try Vertex next." (There is no live `codexOutboundFallbackTargets` entry beyond one Anthropic attempt in this section's scope — see FILES below, and the rollout-and-config section for the canonical config key; if a future chain adds Vertex after Anthropic, it must inherit this same non-rotation rule for any `served:false` outcome, not just for `transport_error` by name.)

**The commit point, restated precisely:** the response to the Codex client is uncommitted until `attemptCodexOutboundFallback` has (a) called `executeAnthropicRoutedRequestForFallback`, (b) classified its return value as a success (§4's discriminator), and (c) started writing to the Codex-client-facing `ReadableStreamDefaultController` (first byte of a `response.output_text.delta`-class frame, or the full JSON body handoff for non-streaming). Before that instant, any failure discovered — Codex's own accounts (§1) or the Anthropic leg's `executeAnthropicRoutedRequestForFallback` call — falls through to the **existing, unmodified terminal error response** at that insertion point; nothing has reached the Codex client. After that instant, no further silent swap is possible.

Concretely, inside the new `attemptCodexOutboundFallback` (in `src/lib/proxy/codexOutboundFallback.ts`):

1. Call `executeAnthropicRoutedRequestForFallback(...)` (§4). Get back `AnthropicFallbackRoutingOutcome`.
2. If `outcome.status >= 400`: record via `recordFallbackAttempt` (§4) and return `undefined` — caller falls through to its pre-existing terminal response, byte-for-byte unchanged from today.
3. If `outcome.status < 400` and `outcome.isStreaming === false` (non-streaming JSON): the whole Anthropic response body is already fully materialized server-side (`outcome.response` is a plain object) — translate it to the Codex Responses JSON shape and return it in one shot. No partial-byte exposure is possible on this branch; commit and post-commit collapse into the same instant.
4. If `outcome.status < 400` and `outcome.isStreaming === true`: `outcome.response` is the raw Anthropic-shaped `Response` **that has already passed `preflightAnthropicStream` inside `handleAnthropicRoutedClaudeRequest`** — hand its `body.getReader()` directly to a new `CodexResponsesStreamSerializer` (new class, third instance of the push-based serializer idiom alongside `ClaudeStreamSerializer`/`OpenAIStreamSerializer` per the repo's existing pattern; owned by the translation-layer section, out of scope here) with **no further preflight call**. The first byte the serializer writes to the Codex-facing controller is the commit instant.
5. Native Codex→Codex passthrough (`upstream.ok`, `codexProxyRoutes.ts:1091-1137`) has no equivalent preflight-buffering step today and this design does not add one — it has nothing else to fall back to at that point regardless, and it is unrelated to this section's scope (unchanged, existing gap).

**Post-commit failure** (serializer's `pull()` throwing, or the live Anthropic reader erroring past the point `handleAnthropicRoutedClaudeRequest` already committed to `served:true`): surfaced as an honest in-band `response.failed` Codex SSE frame, the write-side mirror of `CodexFallbackStreamError`/`streamFailureDetails` (`codexFallback.ts:56-124`, confirmed to exist with that read-side shape) — genuinely new code (nothing in-repo constructs a Codex-shaped terminal-failure frame today), same _pattern_ as the Claude engine's own post-commit in-band `event: error` frame (`claudeProxyRoutes.ts:7307-7314`, the `remainingStream`'s `pull()` catch, confirmed to exist at that shape). Wired through the same generic `registerProxyResponseObserver`/`trackProxyResponse` pair (`proxyActivity.ts:185,197,261`, confirmed exported) the native passthrough branch already uses (`codexProxyRoutes.ts:1135-1160`) — no new tracker.

**"Socket commit deadlines" — explicit non-interaction (unchanged from prior draft, re-confirmed):** `PROXY_SOCKET_COMMIT_TIMEOUT`/`commitBudgetMs` (`rollingWorkerProcess.ts:190-245`) govern IPC file-descriptor handoff during a zero-downtime worker restart. Unrelated to an in-flight upstream response; does not gate, delay, or interact with the commit point above.

**Tests** (`test/continuous-test-suite-codex.ts`): 8. A synthetic Anthropic-leg response with `preflight.kind==="transport_error"` inside `executeAnthropicRoutedRequestForFallback`'s underlying call produces `outcome.status>=400` and the Codex engine's response is byte-identical to today's pre-feature terminal error — i.e. no attempt to reach Vertex or a second Anthropic account (regression test for review [blocker]). 9. `attemptCodexOutboundFallback` never calls `preflightAnthropicStream` directly — asserted by a module-level spy on the imported binding across a full successful streaming fallback run (regression test for review [major] #2). 10. A committed native-Codex relay stream (`upstream.ok` already returned) that fails mid-stream records `terminalOutcome:"stream_error"` via the existing `onTerminal` observer and makes zero calls into `attemptCodexOutboundFallback` (proves post-commit exclusion, unchanged from prior draft). 11. A streaming Codex→Anthropic fallback that commits, then has its live reader throw after the first written frame, produces a `response.failed` SSE frame as the terminal Codex-client-visible event (not a dropped connection).

### 3. Loop prevention

**Existing state** (confirmed): `CODEX_FALLBACK_METADATA_KEY = "neurolink.codexFallback"` (`codexProxyRoutes.ts:109`), read at `:542,:556,:670` (accounting/logging only, no routing gate). `isFallbackRequest` computed at `:669-670`. `buildProxyTranslationPlan` (`routingPolicy.ts:33-75`, confirmed) dedupes only an exact match against `primary {provider,model}`; appends `auto-provider` only when `allowAutoFallback` is explicitly `true` and the chain is empty/already-deduped-to-one. No chain-wide visited-set.

**Invariant:** at most one engine crossing per client request per direction; a leg that is itself already an inner fallback of the other engine may never itself fall outbound. Formally: the ordered sequence of engines serving any one client request has length ≤ 2 with no repeat — `[codex]`, `[anthropic]`, `[codex,anthropic]`, `[anthropic,codex]` are the only allowed sequences.

Two independent mechanisms:

1. **Marker-based cut (primary).**
   - At the top of `dispatch()` in `codexProxyRoutes.ts`, where `isFallbackRequest` is already computed (`:669-670`): if `isFallbackRequest === true`, skip every call to `classifyCodexOutboundFailure`/`attemptCodexOutboundFallback` unconditionally at all four insertion points — they fall straight through to their existing terminal responses, unchanged.
   - `attemptCodexOutboundFallback` builds the nested Anthropic-facing `ServerContext` (mirrors `executeClaudeCodexFallback`'s nested-ctx construction, `codexProxyRoutes.ts` pattern at `claudeProxyRoutes.ts:5564-5619`, inverted) and sets:
     ```ts
     metadata: {
       ...ctx.metadata,
       "neurolink.codexOutboundFallback": true,
       parentRequestId: ctx.requestId,
     }
     ```
     on the same untyped `ServerContext.metadata` bag (`types/server.ts:291`) — no type change, matching the `"neurolink.codexFallback"` convention exactly.
   - One additive line inside `handleAnthropicRoutedClaudeRequest` (`claudeProxyRoutes.ts:10241`, its existing `buildProxyTranslationPlan` call):
     ```ts
     const isCodexOutboundLeg =
       ctx.metadata?.["neurolink.codexOutboundFallback"] === true;
     const configuredFallbackPlan = buildProxyTranslationPlan(
       { provider: "anthropic", model: body.model },
       (modelRouter?.getFallbackChain() ?? []).filter(
         (entry) => !(isCodexOutboundLeg && entry.provider === "codex"),
       ),
       body.model,
       parsedRequest,
     );
     ```
     `buildProxyTranslationPlan`'s signature is untouched. Confirmed `grep -rn '"neurolink.codexOutboundFallback"'` returns zero existing writers today, so this filter is provably a no-op for every current caller.
2. **Depth counter (defense-in-depth).** `ctx.metadata["neurolink.fallbackHopDepth"]` (plain `number`, default `0`), incremented by 1 on every engine crossing (never on same-engine account rotation). Both `executeClaudeCodexFallback` and the new `attemptCodexOutboundFallback` read `((ctx.metadata.fallbackHopDepth as number | undefined) ?? 0)` and refuse a crossing once `depth >= MAX_ENGINE_CROSSINGS` (`=1`, exported from `codexOutboundFallback.ts`, §1), independent of the marker check.

**Tests** (`test/continuous-test-suite-codex.ts`): 12. Inbound Codex `ServerContext` with `metadata["neurolink.codexFallback"]=true`, every Codex account failing → `attemptCodexOutboundFallback` never invoked (spy/counter); response byte-identical to today's pre-feature 429/502. 13. `handleAnthropicRoutedClaudeRequest` invoked (via `__testHooks`, matching this suite's existing determinism-exception convention — confirmed pattern already in use) with `ctx.metadata["neurolink.codexOutboundFallback"]=true` and a configured chain `[codex, vertex]` → `configuredFallbackPlan.attempts` contains zero entries with `provider:"codex"`. 14. `fallbackHopDepth` forced to `1` on an inbound Codex ctx blocks `attemptCodexOutboundFallback` even with the marker absent (proves depth cap independent of the marker).

### 4. Accounting

**Decision: mirror the nested-ctx pattern (Codex-as-fallback-target), inverted — not the flat/shared-ctx Vertex pattern.** Anthropic's own account rotation (ranking, admission leases, cooldowns, session affinity) is reachable only through a route-shaped, currently-unexported function (`handleAnthropicRoutedClaudeRequest`, confirmed not exported today), structurally identical to why Codex needed the heavier pattern in the existing Claude→Codex direction. The lightweight Vertex pattern is unavailable without duplicating Anthropic's rotation logic in `codexProxyRoutes.ts` (rejected) or genuinely reusing the route function (this design).

**New minimal export, `src/lib/server/routes/claudeProxyRoutes.ts`:**

```ts
export async function executeAnthropicRoutedRequestForFallback(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  modelRouter?: ModelRouterInterface;
  configGeneration: number;
  accountStrategy: "round-robin" | "fill-first";
  primaryAccountKey?: string;
  accountAllowlist?: AccountAllowlist;
  quotaRoutingEnabled?: boolean;
  sessionSoftLimit?: number;
  sessionResetToleranceMs?: number;
  ranking?: ProxyAccountRankingPolicy;
  preferPrimary?: boolean;
  sessionAffinityEnabled?: boolean;
  sessionAffinityIdleTtlMs?: number;
  spillInflight?: number;
  tracer?: ProxyTracer;
  requestStartTime: number;
}): Promise<AnthropicFallbackRoutingOutcome>;
```

Every routing/account-strategy field mirrors `handleAnthropicRoutedClaudeRequest`'s own parameter list exactly (confirmed at `claudeProxyRoutes.ts:10193-10214`) and must be read from the **same live `ProxyRuntimeConfigSnapshot`** the real `/v1/messages` handler resolves (`requestRouting` at the route registration, `:11241`) — never hand-rolled defaults, or the two paths drift.

**New type, `src/lib/types/codex.ts`:**

```ts
export type AnthropicFallbackRoutingOutcome = {
  readonly status: number;
  readonly response: Response | unknown; // Response for a stream, parsed JSON object for JSON, per the confirmed module-wide convention (§0)
  readonly isStreaming: boolean;
  readonly servedAccountKey?: string; // absent when a terminal error was synthesized locally, not served by an account
  readonly servedModel?: string;
  readonly usage?: UsageContext; // reused unchanged, types/proxy.ts:2254
  readonly errorMessage?: string;
};
```

**Status recovery — the corrected mechanism (§0's new finding drives this; the prior draft's plan to read `outcome.status` off a uniform shape does not survive contact with the code):**

`executeAnthropicRoutedRequestForFallback` builds its own child runtime context via `createClaudeRequestRuntimeContext` with one additive, optional field:

```ts
function createClaudeRequestRuntimeContext(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  clientRequestBody: string;
  suppressFinalAccounting?: boolean; // new, optional, default false — additive, existing callers unaffected
}): RoutedClaudeRequestRuntimeContext;
```

When `true`, the returned `logFinalRequest` closure (built at `claudeProxyRoutes.ts:9316-9333`) becomes a no-op for the **client-facing final-request-log row and this leg's own span-end only**. It must NOT be a pure no-op: `executeAnthropicRoutedRequestForFallback` wraps it in its own outer closure that **captures the call arguments into a local variable before discarding them**, because `logFinalRequest(status, accountLabel, accountType, errorType?, errorMessage?, extra?)` is confirmed to be called **synchronously, on every exit path except one**, with the real numeric status, before `handleAnthropicRoutedClaudeRequest` returns control to its caller:

- `handleAnthropicJsonSuccessResponse:7921` — `logFinalRequest(response.status, ...)`, synchronous, non-streaming success.
- `finalizeAnthropicTerminalTransportError:8808` — `logFinalRequest(502, ...)`, synchronous, the transport_error terminal case from §2.
- every `buildLoggedClaudeError(status, ...)` call site (`buildClaudeAnthropicFailureResponse`, `buildDeferredClaudeAccountFailureResponse`, the 404/model-routing early returns) — `logFinalRequest` fires inside `buildLoggedClaudeError` itself (`claudeProxyRoutes.ts:9559`), synchronous.
- `tryBorrowFromPeers:5995` — `logFinalRequest(attempt.response.status, ...)`, synchronous, both stream and JSON peer-borrow branches.

The **one exception**: a **streaming success** (`kind:"ready"`) defers its terminal `logFinalRequest` call until the stream itself completes, asynchronously, via `attachAnthropicSuccessStreamTelemetry`'s `telemetryDone` — by design, since the true terminal status of a stream is not known at commit time. For this one case, `executeAnthropicRoutedRequestForFallback` does not need the captured value at all: it detects `outcome.response instanceof Response` and reads `.status` directly off the `Response` object (confirmed always constructed with an explicit `status` at every `Response`-returning site checked: `buildConfiguredClaudeFallbackFailure:6386`, `tryBorrowFromPeers`'s stream branch:6001, and the streaming-success `Response` built inside `attachAnthropicSuccessStreamTelemetry`, which preserves the upstream 2xx `response.status`).

Concretely:

```ts
let capturedStatus: number | undefined;
let capturedErrorMessage: string | undefined;
const childCtx = {
  ...ctx,
  requestId: `${ctx.requestId}:anthropic-fallback`,
  metadata: {
    ...ctx.metadata,
    "neurolink.codexOutboundFallback": true,
    parentRequestId: ctx.requestId,
  },
};
const runtime = createClaudeRequestRuntimeContext({
  ctx: childCtx,
  body: translatedBody,
  clientRequestBody: JSON.stringify(translatedBody),
  suppressFinalAccounting: true,
});
const originalLogFinalRequest = runtime.logFinalRequest;
runtime.logFinalRequest = (
  status,
  accountLabel,
  accountType,
  errorType,
  errorMessage,
  extra,
) => {
  capturedStatus = status;
  capturedErrorMessage = errorMessage;
  return originalLogFinalRequest(
    status,
    accountLabel,
    accountType,
    errorType,
    errorMessage,
    extra,
  );
};
const result = await handleAnthropicRoutedClaudeRequest({
  ctx: childCtx,
  body: translatedBody,
  ...runtime,
  ...routingArgs,
});
const status =
  result instanceof Response ? result.status : (capturedStatus ?? 502);
```

(`capturedStatus ?? 502` is a defensive fallback only — every plain-object-returning path is confirmed above to call `logFinalRequest` synchronously before returning, so this branch should be unreachable; if it is ever hit in practice that is itself a signal a new plain-object return path was added to `claudeProxyRoutes.ts` without threading `logFinalRequest`, and the fallback conservatively treats it as a failure rather than silently succeeding.)

**Requested-id derivation (review [major] #4, adopted):** the child ctx uses `${ctx.requestId}:anthropic-fallback` (matching the existing `:codex-fallback` precedent, `claudeProxyRoutes.ts:5587`), **not** the parent's bare `requestId`. This must be set before `logFinalRequest`/`ProxyTracer.startRequest` (both keyed by `requestId`, confirmed at `claudeProxyRoutes.ts:9327` and `9257`) so `suppressFinalAccounting`'s no-op takes effect on the child's own dedup guard (`finalRequestLogged || isProxyRequestFinalized(ctx.requestId)`, confirmed at `:9327`) without ever touching the parent's `isProxyRequestFinalized` state.

**`suppressFinalAccounting` must not touch `settleFromResponseUsage`/`recordLeasedAccountSpend`** (`claudeProxyRoutes.ts:4625,4660`, confirmed to run inside `handleAnthropicJsonSuccessResponse`/inside the streaming success path regardless of any accounting-suppression flag) — the serving Anthropic account's spend ledger and quota update exactly as an ordinary request. Getting this split wrong either double-bills or silently drops spend.

**Wiring at the four insertion points (§1):**

```ts
const started = Date.now();
const outcome = await attemptCodexOutboundFallback(
  ctx,
  body,
  decision,
  requestStartTime,
  tracer,
);
if (outcome === undefined) {
  // fall through to the existing, unmodified terminal error response at this insertion point
}
```

Inside `attemptCodexOutboundFallback`:

```ts
const outcome = await executeAnthropicRoutedRequestForFallback({
  ctx,
  body: translatedBody,
  ...liveConfigFields,
});
recordFallbackAttempt({
  provider: "anthropic",
  model: outcome.servedModel ?? body.model,
  status: outcome.status < 400 ? "success" : "failure",
  ...(outcome.status >= 400 ? { errorMessage: outcome.errorMessage } : {}),
  durationMs: Date.now() - started,
});
if (outcome.status >= 400) {
  return undefined;
}
tracer?.setModelSubstitution(
  body.model,
  outcome.servedModel ?? body.model,
  "anthropic",
);
if (outcome.servedAccountKey) {
  tracer?.setServedAccount(outcome.servedAccountKey, "anthropic-oauth");
}
if (outcome.usage) {
  tracer?.setUsage(outcome.usage);
}
return translateAnthropicToCodexResponse(outcome); // owned by the translation-layer section
```

`recordFallbackAttempt` (`proxyTracer.ts:1082-1112`, confirmed exact shape `{provider, model, status:"success"|"failure", errorMessage?, durationMs}`, no new fields) — `trackFallbackLegHealth`/`DEAD_FALLBACK_LEG_THRESHOLD=20`/`reportedDeadFallbackLegs` (`proxyTracer.ts:1001-1079`, confirmed) picks up an `anthropic/<model>` dead leg for free.

**On success, exactly one final request-log row** is written for the whole client-visible request: Codex's own (`recordFinalOutcome` inside `codexProxyRoutes.ts`, `account: outcome.servedAccountKey ?? "anthropic-fallback"`, `accountType: "anthropic-oauth"`). Satisfied structurally via `suppressFinalAccounting`, not by convention.

**Streaming terminal-outcome wiring:** the Anthropic leg's own committed `Response` is wrapped in `trackProxyResponse`/`registerProxyResponseObserver` exactly as `executeClaudeCodexFallback` already wraps its own child response (`claudeProxyRoutes.ts:5602-5619`) — inverted: Codex's outer `ctx.metadata` gets the observer, and Codex-facing final accounting waits on that promise before finalizing. Fully reused, no new tracker.

**`proxy_fallback_*` account label — do not add one.** (1) cardinality/shape change to counters existing dead-leg alerting depends on; (2) account-level detail already exists on the separately-labelled `proxy_cost_usd_total` metric (observed live with `account="vertex/claude-opus-4-6"`-shaped values), which `tracer?.setServedAccount(...)` + `setUsage(...)` + `tracer.end()` already populate for this leg for free. Trade-off: the dead-leg alert says "the `anthropic/<model>` leg is failing," not "on which account" — an existing limitation for Vertex too, so this preserves consistency rather than creating a new asymmetry.

**FILES:**
| Path | Action | Purpose |
|---|---|---|
| `src/lib/types/codex.ts` | modify | Add `CodexOutboundFailureClass`, `CodexOutboundFailureInput`, `CodexOutboundFallbackDecision`, `AnthropicFallbackRoutingOutcome` (named exports, `type` only, globally-unique names per repo rule 9). |
| `src/lib/proxy/codexOutboundFallback.ts` | create | `classifyCodexOutboundFailure` (total function), `attemptCodexOutboundFallback`, `parseCodexErrorCode`, `MAX_ENGINE_CROSSINGS`. |
| `src/lib/server/routes/codexProxyRoutes.ts` | modify | Wire the four sites (`~878`, `~896`, `~1057-1076`, `~1458`) to `classifyCodexOutboundFailure`+`attemptCodexOutboundFallback`; skip all four unconditionally when `isFallbackRequest` is true; construct the Codex-shape post-commit terminal SSE frame. |
| `src/lib/server/routes/claudeProxyRoutes.ts` | modify | Export `executeAnthropicRoutedRequestForFallback`; add optional `suppressFinalAccounting` to `createClaudeRequestRuntimeContext` (additive, default `false`); add the one-line codex-exclusion filter in `handleAnthropicRoutedClaudeRequest`'s `buildProxyTranslationPlan` call (`~10241`), guarded by `ctx.metadata['neurolink.codexOutboundFallback']`. |
| `src/lib/proxy/proxyConfig.ts` | modify | Reconciled (review finding, PR #1825): this row originally proposed its own `routing.codex-fallback-chain` config key. The rollout-and-config section's `codex-outbound-fallback-{enabled,targets,model-mappings}` is the canonical, later-written scheme (integrated with `readRoutingPolicyKey`/hot-reload the same way every existing routing key is) — this section only depends on some ordered `{provider:'anthropic'\|'vertex', model}` list resolving before `dispatch()`, and reads that section's `codexOutboundFallbackTargets` rather than defining its own key. |
| `src/lib/proxy/runtimeConfig.ts` | modify | No separate edit here — the rollout-and-config section's own `buildCandidate()`/`fingerprintSource`/`ProxyRuntimeConfigSnapshot` wiring for its three keys already covers hot-reload for this section's dependency. |
| `test/continuous-test-suite-codex.ts` | modify | Tests 1-14 above. |
| `docs/features/codex-proxy-support.md` | modify | Document the loop-prevention invariant and accounting attribution here; the config keys themselves are documented once, in the rollout-and-config section's own file. |

### Risks / open items

- The native Codex passthrough path (`upstream.ok`) still has no preflight-buffering equivalent to `preflightAnthropicStream`; unrelated pre-existing gap, not fixed here.
- `test/continuous-test-suite-proxy.ts` is not invoked by any CI workflow; any new determinism case must land in `test/continuous-test-suite-codex.ts` or it gates nothing.
- `proxy_fallback_*` keeps `{provider, model}` labels; per-account attribution requires correlating against `proxy_cost_usd_total` instead.
- This section assumes a translated `ClaudeRequest` and `CodexResponsesStreamSerializer`/`translateAnthropicToCodexResponse` already exist by the time `attemptCodexOutboundFallback` runs; both are explicitly owned by the translation-layer section.
- UNRESOLVED: whether a genuine native Codex client ever sends `stream:false` — the repo shows `convertClaudeRequestToCodex` always setting `stream:true` for the existing, opposite-direction leg, but nothing in this repo constrains what a real Codex CLI client sends inbound. The one check that would settle it: read the Codex Responses API client behavior directly (upstream OpenAI docs or a captured real request), not this repo, since this repo is the proxy, not the client.
- UNRESOLVED: the exact `Response`-vs-plain-object status of `tryConfiguredClaudeFallbackChain`'s own `.response` field was not traced to its own terminal builder in this pass (time-bounded); §4's `result instanceof Response` / captured-`logFinalRequest` discriminator is designed to cover it either way, but the one check that would settle it with certainty is reading `tryConfiguredClaudeFallbackChain` (`claudeProxyRoutes.ts:6035` onward) end to end before implementation.

---

### Configuration surface, staged rollout — Codex outbound fallback

Scope: config schema, validation, runtime wiring, kill switch, PR sequencing, observability, docs. Does
**not** own translation (Codex Responses ⇄ Anthropic Messages body/stream), tool-call fidelity, or
cache-breakpoint placement — those belong to cache-codex-prefix / cache-anthropic / cache-vertex. Every
citation below was re-read from `.../fix/proxy-ci-gaps-and-dead-leg-alert` on 2026-09-27; where the prior
design's citation was off, the number here is the one actually in the file.

### A. Types

**`src/lib/types/subscription.ts`**, new type placed beside `ModelMapping` (1186–1190) and
`FallbackEntry` (1193–1198), inside `ProxyRoutingConfig` (1201–1256, `spillInflight` is its last field
at 1255):

```ts
/** One outbound-fallback hop for a native Codex request whose own account pool
 *  is exhausted. No `reasoningEffort` (unlike FallbackEntry): that knob configures
 *  a Codex *inbound* leg and has no meaning once the request has left Codex's
 *  Responses format and become an Anthropic Messages request. */
export type CodexFallbackTarget = {
  provider: "anthropic" | "vertex";
  model: string;
};
```

Add to `ProxyRoutingConfig` after `spillInflight` (after line 1255):

```ts
/** Master flag for native-Codex-request outbound fallback. Independent of
 *  codexOutboundFallbackTargets so the list can be staged ahead of turning the
 *  feature on. Default false — the only new key whose absence must reproduce
 *  byte-identical current behavior. */
codexOutboundFallbackEnabled?: boolean;
/** Ordered targets tried after Codex's own account pool is exhausted.
 *  Try-order = array order. Empty/absent with enabled:true is a no-op. */
codexOutboundFallbackTargets?: CodexFallbackTarget[];
/** Per-incoming-Codex-model override, layered on codexOutboundFallbackTargets.
 *  Reuses ModelMapping's {from,to,provider}: from = requested Codex model,
 *  provider = which target this overrides, to = model to send instead of that
 *  target's plain `model`. Absent for a (from,provider) pair = use the target's
 *  plain model. */
codexOutboundFallbackModelMappings?: ModelMapping[];
```

`FallbackEntry` reuse was checked and rejected — it carries `reasoningEffort` ("Explicit Codex fallback
effort"), meaningless once the request is already Anthropic-format. `ModelMapping`'s generic
`{from,to,provider}` **is** reused for the override map — no direction-specific semantics baked in.

**`src/lib/types/proxy.ts`**, `ProxyRequestRoutingSnapshot` (3744–3761) — add the same 3 fields,
non-optional/defaulted (request-time code reads via `ProxyRuntimeConfigProvider = () =>
ProxyRequestRoutingSnapshot`, 3819):

```ts
codexOutboundFallbackEnabled: boolean;
codexOutboundFallbackTargets: CodexFallbackTarget[];
codexOutboundFallbackModelMappings: ModelMapping[];
```

`ProxyRuntimeConfigSnapshot = ProxyRequestRoutingSnapshot & {...}` (3768) inherits them automatically —
no separate edit there.

### B. Config parsing — `src/lib/proxy/proxyConfig.ts`

Kebab keys: `codex-outbound-fallback-enabled`, `codex-outbound-fallback-targets`,
`codex-outbound-fallback-model-mappings`. All three read via `readRoutingPolicyKey()` (325–333,
presence-based, explicit `null` rejected) — not `readLegacyRoutingKey()` (303–315, `null`-means-unset),
which exists only for keys predating the routing-policy convention.

**Hard validator**, inside `validateProxyConfig` (339+), insert after the `spill-inflight` block (568–578,
before line 579's closing brace of the `hasRouting` block):

```ts
const rawCodexOutboundEnabled = readRoutingPolicyKey(
  routing,
  "codex-outbound-fallback-enabled",
);
const normalizedCodexOutboundEnabled =
  typeof rawCodexOutboundEnabled === "string"
    ? rawCodexOutboundEnabled.trim().toLowerCase()
    : undefined;
if (
  rawCodexOutboundEnabled !== undefined &&
  typeof rawCodexOutboundEnabled !== "boolean" &&
  normalizedCodexOutboundEnabled !== "true" &&
  normalizedCodexOutboundEnabled !== "false"
) {
  errors.push("routing.codex-outbound-fallback-enabled must be a boolean");
}

const rawCodexOutboundTargets = readRoutingPolicyKey(
  routing,
  "codex-outbound-fallback-targets",
);
if (rawCodexOutboundTargets !== undefined) {
  if (!Array.isArray(rawCodexOutboundTargets)) {
    errors.push("routing.codex-outbound-fallback-targets must be an array");
  } else if (
    rawCodexOutboundTargets.length > MAX_CODEX_OUTBOUND_FALLBACK_TARGETS
  ) {
    errors.push(
      `routing.codex-outbound-fallback-targets must have at most ${MAX_CODEX_OUTBOUND_FALLBACK_TARGETS} entries`,
    );
  } else {
    rawCodexOutboundTargets.forEach((entry, index) => {
      const field = `routing.codex-outbound-fallback-targets[${index}]`;
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        errors.push(`${field} must be an object`);
        return;
      }
      const target = entry as Record<string, unknown>;
      if (target.provider !== "anthropic" && target.provider !== "vertex") {
        errors.push(`${field}.provider must be anthropic or vertex`);
      }
      if (typeof target.model !== "string" || target.model.trim() === "") {
        errors.push(`${field}.model must be a non-empty string`);
      }
    });
  }
}
// codex-outbound-fallback-model-mappings: validate each entry against the SAME
// {from,to,provider} shape the existing model-mappings block already checks —
// no second copy of that check.
```

`MAX_CODEX_OUTBOUND_FALLBACK_TARGETS = 8` is a new module constant next to `MIN_SPILL_INFLIGHT`/
`MAX_SPILL_INFLIGHT` (274–277) — the prior design left this uncapped and flagged it as an open risk
(unbounded chain degrades worst-case exhausted-turn latency linearly); 8 is a deliberate decision here (2
providers × up to 4 models each is generous headroom), following this file's precedent of small named
MIN/MAX constants for array-shaped routing keys.

**Soft parser**, inside `parseRoutingConfig` (684–1024, returns `Partial<ProxyRoutingConfig> | undefined`),
insert right before `return result;` (1024). Correction to the prior design: it cited `account-allowlist`'s
soft-parse as the "per-entry-drop" precedent; re-read, `account-allowlist` (928–932) does no per-entry
validation — it just coerces every entry to a trimmed string via `String(entry).trim()`. The real
per-entry-drop precedent is `model-mappings`/`fallback-chain` (700–726, 730–760): each maps every entry,
drops ones missing required string fields with a `logger.warn`, filters nulls — the pattern to copy:

```ts
const rawCodexOutboundEnabled = readRoutingPolicyKey(
  raw,
  "codex-outbound-fallback-enabled",
);
if (rawCodexOutboundEnabled !== undefined) {
  if (typeof rawCodexOutboundEnabled === "boolean") {
    result.codexOutboundFallbackEnabled = rawCodexOutboundEnabled;
  } else if (
    typeof rawCodexOutboundEnabled === "string" &&
    ["true", "false"].includes(rawCodexOutboundEnabled.trim().toLowerCase())
  ) {
    result.codexOutboundFallbackEnabled =
      rawCodexOutboundEnabled.trim().toLowerCase() === "true";
  } else {
    logger.warn(
      `[proxy-config] Ignoring routing.codexOutboundFallbackEnabled: expected boolean, got ${typeof rawCodexOutboundEnabled}`,
    );
  }
}

const rawCodexOutboundTargets = readRoutingPolicyKey(
  raw,
  "codex-outbound-fallback-targets",
);
if (Array.isArray(rawCodexOutboundTargets)) {
  result.codexOutboundFallbackTargets = rawCodexOutboundTargets
    .filter(
      (t): t is Record<string, unknown> => t !== null && typeof t === "object",
    )
    .map((t) => {
      const provider =
        t.provider === "anthropic" || t.provider === "vertex"
          ? t.provider
          : undefined;
      const model = String(t.model ?? "").trim();
      if (!provider || !model) {
        logger.warn(
          `[proxy-config] Skipping codex-outbound-fallback-targets entry with invalid provider/model: ${JSON.stringify(t)}`,
        );
        return null;
      }
      return { provider, model } satisfies CodexFallbackTarget;
    })
    .filter((t): t is CodexFallbackTarget => t !== null)
    .slice(0, MAX_CODEX_OUTBOUND_FALLBACK_TARGETS);
}
// codexOutboundFallbackModelMappings: identical shape to the existing
// model-mappings block (700-726) — same from/to/provider extraction and drop rule.
```

Note (unchanged from prior design, re-verified): the two validators intentionally disagree on
strictness — hard validator rejects outright, soft parser drops the one bad entry — matching this file's
existing convention for the other 5 routing-policy keys.

### C. Runtime wiring

**`src/lib/proxy/runtimeConfig.ts`**, `buildCandidate()` (236–345): `routing` there is
`proxyConfig?.routing` (287), typed `Partial<ProxyRoutingConfig> | undefined`, so
`routing?.codexOutboundFallbackTargets` etc. type-check once section A lands. Add, next to the existing
`spillInflight` read (358):

```ts
const codexOutboundFallbackEnabled = resolveCodexOutboundFallbackEnabled(
  effectiveEnv.NEUROLINK_PROXY_CODEX_OUTBOUND_FALLBACK,
  routing?.codexOutboundFallbackEnabled,
);
const codexOutboundFallbackTargets =
  routing?.codexOutboundFallbackTargets ?? [];
const codexOutboundFallbackModelMappings =
  routing?.codexOutboundFallbackModelMappings ?? [];
```

...then add all three to `fingerprintSource`'s `JSON.stringify` (359–373 — already includes `routing:
routing ?? null`, so raw values are change-covered; the extra fields just give request-time code one
already-defaulted read) and to the frozen `snapshot` return (`Object.freeze({...})`, 376–400), in the same
position `spillInflight` occupies in each — copy-paste-and-rename, not a new mechanism.

Kill switch, mirroring `resolveQuotaRoutingEnabled` (62–70) with one deliberate default difference:

```ts
function resolveCodexOutboundFallbackEnabled(
  envValue: string | undefined,
  configured: boolean | undefined,
): boolean {
  if (envValue === undefined) {
    // Unlike resolveQuotaRoutingEnabled's `configured ?? true`, this defaults
    // false — required so today's behavior is byte-identical when unconfigured.
    return configured ?? false;
  }
  const normalized = envValue.trim().toLowerCase();
  return normalized !== "off" && normalized !== "false" && normalized !== "0";
}
```

Env var `NEUROLINK_PROXY_CODEX_OUTBOUND_FALLBACK` — no collision with `NEUROLINK_PROXY_CODEX_CAPTURE`
(unrelated debug flag, `codexUsage.ts:211`) or the mirrored precedent `NEUROLINK_PROXY_QUOTA_ROUTING`
(`runtimeConfig.ts:312`). Env wins whenever set, identical precedence to quota routing.

### D. The two call sites that need a `runtimeConfigProvider` — corrected scope

**Review finding, CONFIRMED by direct read, adopted:** the prior design's PR2 claimed
`routes/index.ts:75` could "just also pass the existing runtimeConfigProvider" into
`createCodexProxyRoutes` alongside the other engines. That is false. There are **two independent call
paths**, and only one of them has a provider today:

1. **`src/cli/commands/proxy.ts`** (`neurolink proxy start`, live path) — `runtimeConfigProvider` IS
   built here, at 2209 (`runtimeConfigStore ? () => runtimeConfigStore.getSnapshot() : undefined`), and IS
   already passed to `createClaudeProxyRoutes` (2212–2222), `createOpenAIProxyRoutes` (2226–2231, 5th arg
   `(request) => app.fetch(request)`, confirmed in-process not a socket call), and `createGeminiProxyRoutes`
   (2236–2240). `createCodexProxyRoutes("")` at line **2235** is the one call passing only `basePath` — the
   real "just thread the existing provider" site, one line: `createCodexProxyRoutes("", runtimeConfigProvider)`.
2. **`src/lib/server/routes/index.ts`**, `createAllRoutes()` (40–83) — the SDK-embeddable path. **No
   engine** receives a provider here: `createClaudeProxyRoutes(undefined, basePath)` (67),
   `createOpenAIProxyRoutes(undefined, basePath)` (71), `createCodexProxyRoutes(basePath)` (75),
   `createGeminiProxyRoutes(undefined, basePath)` (79) are all 2-arg calls, and `CreateRoutesOptions`
   (`src/lib/types/server.ts:1410–1426`) has no field for one — a pre-existing gap, not Codex-specific.

Resolution (scoped narrowly — no retroactive fix to openai/gemini's gap, out of scope here and risks a
behavior change on two engines nobody asked to touch): add one optional field to `CreateRoutesOptions` and
thread it only to Codex:

```ts
// src/lib/types/server.ts, in CreateRoutesOptions (after geminiProxy?: boolean)
/** Runtime config provider for engines that read it (currently: Codex outbound fallback). */
runtimeConfigProvider?: ProxyRuntimeConfigProvider;
```

```ts
// src/lib/server/routes/index.ts:75
routes.push(createCodexProxyRoutes(basePath, options?.runtimeConfigProvider));
```

An SDK consumer of `createAllRoutes` who never passes `runtimeConfigProvider` gets `undefined` threaded
through exactly as `codexProxyRoutes.ts` already treats an absent provider (§E) — zero behavior change for
every existing caller.

### E. `createCodexProxyRoutes` signature extension — `src/lib/server/routes/codexProxyRoutes.ts`

Confirmed: `export function createCodexProxyRoutes(basePath: string = ""): RouteGroup` (1666), handlers
`(ctx) => handleCodexResponsesRequest(ctx)` / `(ctx) => handleCodexModelsRequest(ctx)` — single-arg,
nothing closed over. `RouteGroup` (`src/lib/types/server.ts:443–457`) has no config-provider slot, unlike
`openaiProxyRoutes.ts`/`geminiProxyRoutes.ts` (explicit positional param) or `claudeProxyRoutes.ts` (union
6th param `AccountAllowlist | ClaudeProxyRouteRuntimeOptions`, disambiguated by
`isClaudeProxyRouteRuntimeOptions()` at 11097). **Decision (re-verified sound): plain optional 2nd
parameter, matching openai/gemini** — Codex has no allowlist to disambiguate against, so Claude's
union-type trick is pure overhead here:

```ts
// codexProxyRoutes.ts:1666
export function createCodexProxyRoutes(
  basePath: string = "",
  runtimeConfigProvider?: ProxyRuntimeConfigProvider,
): RouteGroup {
  return {
    prefix: `${basePath}/backend-api/codex`,
    routes: [
      {
        method: "POST",
        path: `${basePath}/backend-api/codex/responses`,
        description: "Codex ChatGPT-backend Responses API (account pool)",
        handler: (ctx: ServerContext) =>
          handleCodexResponsesRequest(ctx, runtimeConfigProvider),
      },
      /* models route unchanged */
    ],
  };
}
```

Threaded down: `handleCodexResponsesRequest(ctx, runtimeConfigProvider?)` (539) →
`executeCodexResponsesRequest(ctx, runtimeConfigProvider?)` (623, currently single-arg).

### F. Insertion points and the budget-lease requirement they must satisfy

Two insertion points, both confirmed by direct read:

- **~895–896**: `if (eligible.length === 0) { ... }` — today, an immediate `buildCodexQuotaExhaustedResponse`
  (429). New: before building that response, if `runtimeConfigProvider?.().codexOutboundFallbackEnabled`
  AND targets non-empty AND `!isFallbackRequest`, attempt the outbound chain instead.
- **~1458–1461**: end of the `for (const account of eligible)` loop —
  `await recordFinalOutcome(lastAttemptedAccount, lastErrorStatus, {...}); return
buildCodexErrorResponse(...);`. Same gate, symmetric (every pooled account tried and failed).

**Review finding, CONFIRMED, adopted as a hard requirement — missing from the prior design entirely.**
`recordFinalOutcome` (738–760+) calls `await settleBudget(...)` as its **literal first statement** (744),
before the `finalOutcomeRecorded` latch, `writeFinalLog`, or `tracer?.end()`. `settleBudget` (635–657)
either confirms the last-attempted account's `ProxyTokenBudgetLease` via
`settleProxyTokenBudget(budgetLease, actualTokens)` when dispatched, or cancels via
`budgetLease.cancelBeforeDispatch()`. The per-account loop settles each iteration's lease at the top of the
**next** iteration (947–951) — but there is no next iteration once the pool is exhausted. The outer
`catch` (1465–1467) also calls `settleBudget()`, but only on a thrown error, not in a `finally`. **If a new
outbound-fallback branch returns a translated success response instead of falling through to
`recordFinalOutcome`/`buildCodexErrorResponse`, the last-attempted account's `budgetLease` is never
settled and its reserved token budget leaks indefinitely.**

Requirement, binding on PR 4/5: the outbound-fallback code at **both** insertion points must call
`await settleBudget(actualTokens)` (the closure already in scope inside `executeCodexResponsesRequest`)
before returning **any** response — success or failure — since it cannot assume `recordFinalOutcome` runs
afterward (on the success path it will not).

### G. Reentrancy guard (unchanged, re-verified sound)

`CODEX_FALLBACK_METADATA_KEY = "neurolink.codexFallback"` (codexProxyRoutes.ts:109), read as
`isFallbackRequest = ctx.metadata?.[CODEX_FALLBACK_METADATA_KEY] === true` (669–670), set by
`claudeProxyRoutes.ts` when Claude falls back into Codex. Both new insertion points (§F) must add
`!isFallbackRequest` to their gate — without it, Claude → Codex (exhausted) → Anthropic → (fails) → Codex
again can loop; the flag already exists for exactly this hazard and the new direction must inherit it.

### H. Dispatch-target gap — still open, framing corrected

**Review finding, CONFIRMED, adopted:** the prior design characterized the loopback-dispatch option (Codex
→ Claude engine via an HTTP-shaped internal request, the pattern `openaiProxyRoutes.ts` uses for its own
bridge) as costing "a real network hop." Not true of this repo's deploy path: `openaiProxyRoutes.ts` takes
`internalDispatch?: (request: Request) => Response | Promise<Response>` (line 295), dispatching via
`internalDispatch ? internalDispatch(new Request(...)) : fetch(...)` (432–433); `cli/commands/proxy.ts`
(2226–2231) constructs `createOpenAIProxyRoutes` with `(request) => app.fetch(request)` as that 5th arg —
confirmed in-process, no socket. A Codex → Claude loopback built the same way is **not** inherently a
network-cost tradeoff; the real difference vs. a direct in-process ctx-spread call
(`executeClaudeCodexFallback`, claudeProxyRoutes.ts:5564–5603, confirmed **not exported**) is API shape
(Request/Response marshaling vs. direct `ctx` reuse), not transport cost.

This does not resolve the gap — genuinely open, not this section's call. `claudeProxyRoutes.ts` exports
exactly 14 top-level symbols (`resolveServedFallbackModel`, `createClaudeProxyRoutes`,
`getTransientSameAccountRetryDelayMs`, `getOverloadRotationDelayMs`, `parseClaudeErrorBody`,
`isInvalidRequestError`, `isSubscriptionBetaRejection`, `isAccountEntitlementError`,
`isDurableEntitlementBlock`, `buildProxyFallbackOptions`, `isTransientHttpFailure`, `isUpstreamOverload`,
`redactProviderErrorMessage`, `__testHooks`), none a symmetric `handleClaudeMessagesRequest`. Exposing one,
or wiring the already-in-process openai-style loopback, is PR 3's job and **not decided here** — a
translation/dispatch question for whichever sibling section (closest candidate: cache-anthropic) touches
`claudeProxyRoutes.ts`'s export surface. `executeVertexAnthropicFallback(args: {body, model, signal?,
onTerminal?}): Promise<Response>` (`vertexAnthropicFallback.ts:611`, shape confirmed) remains immediately
reusable as-is for Codex → Vertex — zero new dispatch surface for that leg.

### I. Staged rollout (one commit per PR, scope-mandatory conventional commit, e.g.

`feat(proxy-codex-fallback): ...`; each PR must independently pass `pnpm run check:all`)

**PR 1 — No-op skeleton.** Files: `src/lib/types/subscription.ts` (§A), `src/lib/types/proxy.ts` (§A),
`src/lib/proxy/proxyConfig.ts` (§B). Nothing else changes; nothing reads the new fields yet. Test:
`validateProxyConfig` accepts/rejects the 3 new keys in isolation.

**PR 2 — Runtime plumbing and both call sites, still no-op.** Files: `src/lib/proxy/runtimeConfig.ts` (§C),
`src/lib/types/server.ts` (§D, `CreateRoutesOptions` field), `src/lib/server/routes/index.ts` (§D),
`src/cli/commands/proxy.ts` (§D, line 2235), `src/lib/server/routes/codexProxyRoutes.ts` (§E signature
extension only — insertion points ~896/~1458 stay byte-identical; the new parameter is accepted, stored,
never branched on). Corrects the prior design's understated scope: explicitly includes the
`CreateRoutesOptions` field and `routes/index.ts` threading, not just a one-line change at a site that
turned out not to exist. Tests: `configHash` changes when `-enabled` flips (fingerprint wiring);
`createCodexProxyRoutes()` with no 2nd arg still compiles/behaves identically; a
`continuous-test-suite-codex.ts` regression booting routes with `codexOutboundFallbackEnabled: true`
asserts the all-accounts-cooling 429 is unchanged.

**PR 3 — Claude-engine dispatch surface (blocked on §H).** Adds only that surface plus its own tests, no
caller from `codexProxyRoutes.ts` yet — isolates the riskiest change (a 12.9k-line file, 14 exports) into
its own revertable unit.

**PR 4 — Codex → Vertex leg.** Lowest risk: `executeVertexAnthropicFallback` is already standalone.
Wires insertion points ~896/~1458 gated on `codexOutboundFallbackEnabled && targets.some(t =>
t.provider === "vertex") && !isFallbackRequest`, applies the §F budget-settlement requirement, ships §J's
observability for this leg. Can land and be flag-tested before PR 3/5 are ready.

**PR 5 — Codex → Anthropic-pool leg.** Depends on PR 3. Same insertion points for `provider === "anthropic"`
targets, applies `codexOutboundFallbackModelMappings` overrides and the same §F requirement.

**PR 6 — Documentation.** Section K, landed once the feature is real.

Kill switch from PR 2 on (§C): env `=off` or config `false` disables every insertion point PR 4/5 add.

### J. Observability

`tracer.setModelSubstitution(requestedModel, actualModel, actualProvider?)` (`proxyTracer.ts:638`,
confirmed) feeds `proxy_model_substitution_total{requested_model,actual_model}` and needs zero code
changes — already called this way at the Vertex-fallback site (`claudeProxyRoutes.ts:6180`:
`tracer?.setModelSubstitution(body.model, vertexModel, "vertex")`). A Codex model (`gpt-5.x-*`) as
`requested_model` cannot collide with any existing call site. **Hard requirement on PR 4/5**: call
`setModelSubstitution(requestedCodexModel, actualModel, targetProvider)`.

`recordFallbackAttempt` (`proxyTracer.ts:1082–1112`) is called only from `claudeProxyRoutes.ts` today (6
sites: 5722, 6214, 6244, 6340, 6445, 6478), signature `{provider, model, status, errorMessage?,
durationMs}`. Extend additively:

```ts
export function recordFallbackAttempt(attrs: {
  provider: string;
  model: string;
  status: "success" | "failure";
  errorMessage?: string;
  durationMs: number;
  direction?: "claude-outbound" | "codex-outbound"; // omitted = "claude-outbound"
}): void {
  /* legKey below; labels = {provider, model, direction} */
}
```

**Review finding, adopted, corrects the prior design's compatibility claim:** the 3 fallback counters
(`fallbackAttemptsTotal`/`fallbackSuccessTotal`/`fallbackFailureTotal`, `meter.createCounter(...)` at
`proxyTracer.ts:136-147`) are cumulative monotonic OTel instruments. Adding `direction` to their label set
is **not** backward-compatible — per this repo's own MAX-per-series-then-SUM convention a label-set
change starts a new series, exactly like the `legKey` text-format change below. Any dashboard/alert
summing these without grouping by `direction` silently under/double-counts once mixed-direction data
exists, until updated (or treats pre-rollout data as implicitly `claude-outbound`) — remediate in the
same PR that ships the label.

**Confirmed pre-existing bug this change would otherwise inherit:** `trackFallbackLegHealth`'s `legKey` is
`` `${provider}/${model}` `` only (`proxyTracer.ts:1092`, no direction). A Codex-outbound-to-Anthropic leg
and an existing Claude-outbound-to-Vertex leg sharing a `{provider,model}` would merge failure streaks —
one direction's burst could trip or reset the other's dead-leg alert. `DEAD_FALLBACK_LEG_THRESHOLD = 20`
and `MAX_TRACKED_FALLBACK_LEGS = 256` (`proxyTracer.ts:1001,1013`) stay unchanged (targets capped at 8,
§B, nowhere near the ceiling). **Required fix, same PR**: `legKey` becomes
`` `${direction}:${provider}/${model}` ``. Consequence: the dead-leg log/report text changes from
`vertex/claude-opus-4-6` to `claude-outbound:vertex/claude-opus-4-6` for **every existing leg** — update
any saved alert-rule regex on the bare shape in this same PR.

**Billing attribution**, mirroring the Vertex-fallback sequence (`claudeProxyRoutes.ts:6180-6186`:
`setModelSubstitution` → `setServedAccount(vertexAccount, "vertex")` → `setUsage(usage)` → `end(status)`,
`setUsage` must precede `end()`): PR 4/5 must call `setServedAccount(<target label>, <targetProvider>)`
before `end()`, or spend attributes to the pre-fallback default.

**New log lines** (`[proxy] ...` prefix): `codex outbound fallback attempt: target=<provider>/<model>
requestId=<id>` (entry); `codex outbound fallback served by <provider>/<model> requestId=<id>` (success,
before `setServedAccount`/`end()`); `codex outbound fallback exhausted; all targets failed
requestId=<id>` (must be distinguishable from an unrelated failure). **Dead-leg alert**: no new mechanism
— reuse `recordFallbackAttempt`/`trackFallbackLegHealth` with the namespaced `legKey`; PR 4/5 must call it
on every outcome or a dead Codex-outbound leg never reports.

**OpenObserve** (MAX-per-series-then-SUM): day-one query needs no new metric —
`SELECT actual_model, requested_model, SUM(v) FROM (SELECT actual_model, requested_model, account,
MAX(value) AS v FROM proxy_model_substitution_total WHERE requested_model LIKE 'gpt-5%' GROUP BY
actual_model, requested_model, account, start_time) GROUP BY actual_model, requested_model`. Once PR 4/5
ship, filter `proxy_fallback_attempts_total`/`_success_total` on `direction = 'codex-outbound'` the same way.

### K. Documentation (PR 6)

- **`docs/features/claude-proxy-config-reference.md`** — 3 new "Routing Fields" rows (`-enabled`:
  boolean/false/No; `-targets`: `CodexFallbackTarget[]`/`[]`/No; `-model-mappings`: `ModelMapping[]`/`[]`/No);
  a "CodexFallbackTarget Fields" sub-table; a Validation Rules bullet: `provider` must be
  `anthropic`|`vertex` (hard error), array capped at 8.
- **`docs/features/codex-proxy-support.md`** — new "Outbound fallback (Codex → Anthropic/Vertex)" section:
  off by default, config keys, env kill switch, reentrancy guard, per-stage status line.
- **`docs/features/claude-proxy-observability.md`** — the §J queries, plus a note that `legKey`'s format
  changes for every existing leg once PR 4/5 ship.

### L. Tests (exact file + assertion)

- `test/continuous-test-suite-proxy-config.ts` _(confirm exact filename at implementation time — nearest
  existing proxy-config suite)_: `validateProxyConfig` accepts a valid `codex-outbound-fallback-targets`
  array; rejects `provider: "openai"` (hard error) and an empty `model`; accepts `"true"`/`"false"` string
  spellings of `-enabled`; rejects a 9-entry target list (`MAX_CODEX_OUTBOUND_FALLBACK_TARGETS`);
  `parseRoutingConfig` drops one malformed entry from a 3-entry array without blanking the other two;
  kebab/camel dual-acceptance for all 3 keys, explicit `null` rejected per `readRoutingPolicyKey`'s
  presence-based contract; `NEUROLINK_PROXY_CODEX_OUTBOUND_FALLBACK=off` disables the feature even with
  `codex-outbound-fallback-enabled: true` in config (mirrors the `NEUROLINK_PROXY_QUOTA_ROUTING` precedence
  test shape).
- `test/continuous-test-suite-proxy-reliability.ts` (or the suite `run-proxy-reliability.mjs` names —
  confirm at implementation time): `configHash` changes when `-enabled` flips unset→`true` (proves
  `fingerprintSource` wiring); a reload with an invalid `-targets` value keeps the last-known-good snapshot
  (mirrors the existing `performReload` rejection pattern).
- `test/continuous-test-suite-codex.ts`: `createCodexProxyRoutes()` with no 2nd argument still compiles,
  byte-identical (signature backward-compat); a `runtimeConfigProvider` snapshot with
  `codexOutboundFallbackEnabled: true` and empty targets still returns the existing 429 on
  all-accounts-cooling (PR 2 no-op); once PR 4 lands — cooling pool + one Vertex target asserts a served
  200 with `setModelSubstitution`/`setServedAccount` called correctly and `recordFallbackAttempt` firing
  `direction: "codex-outbound"`; a `ctx` carrying `CODEX_FALLBACK_METADATA_KEY: true` must NOT trigger
  outbound fallback even with flag+targets set (§G); a request reaching the outbound branch and succeeding
  must still settle the last-attempted account's budget lease — assert via token-budget test hooks that no
  lease is left `"reserved"` (§F); once PR 5 lands — a `codexOutboundFallbackModelMappings` entry overrides
  the target's plain `model`, and is absent-safe with no match.
- `test/continuous-test-suite-proxy-dead-leg-alert.ts` (or nearest fallback-health suite): 20 consecutive
  `codex-outbound` failures to the same `{provider, model}` trip the alert exactly once via
  `__fallbackLegHealthTestHooks`, and do NOT increment an existing `claude-outbound` streak for the same
  pair — proves the `direction`-namespaced `legKey` fix.

**CI gating, confirmed**: `test:codex` → `tsx test/continuous-test-suite-codex.ts` (`package.json:173`) and
`test:proxy-reliability` → `node scripts/run-proxy-reliability.mjs` (`package.json:170`, running
`continuous-test-suite-vertex-anthropic-fallback.ts` plus 11 `continuous-test-suite-proxy-*.ts` suites via
`spawnSync`) both run as steps inside `provider-safety-net-shards` (`ci.yml:452` and `:448` — corrected
from the prior design's approximate `:445`), which required job `provider-safety-net` depends on
(`ci.yml:330-343`). A test added to `continuous-test-suite-codex.ts` is gated automatically; a new suite
file is not gated unless registered in `run-proxy-reliability.mjs`'s `checks` array or given its own
`ci.yml`-referenced `test:*` script — prefer extending the already-gated file.

### M. Unresolved

1. UNRESOLVED: which suite file already covers `validateProxyConfig`/`parseRoutingConfig` unit cases for
   the routing-policy keys, so new tests extend it rather than duplicate it — settle with
   `grep -rl "validateProxyConfig(" test/` and confirm which file is registered in a gated `test:*` script.
2. UNRESOLVED: the account-label string PR 4/5 passes to `setServedAccount` for a Codex-outbound-served
   turn (cf. `` vertexAccount = `vertex/${vertexModel}` `` ) — depends on §H's dispatch-surface decision, not
   this section's to make; settle once the cache-anthropic/translation section lands.
3. UNRESOLVED: whether `proxy_errors_total`'s label set can filter to "codex route only" for a
   would-have-failed-anyway comparison — only its counter name was reconfirmed this pass; settle by
   reading the `errorsTotal` counter's `add(...)` call sites in `proxyTracer.ts` and listing every label key.
4. UNRESOLVED (genuinely open per §H): whether PR 3 exports a new `handleClaudeMessagesRequest`-shaped
   handler from `claudeProxyRoutes.ts` or reuses the already-in-process `openaiProxyRoutes.ts`-style
   loopback — settle via the cache-anthropic section's own design once synthesized.

---

### Codex outbound-fallback: validation plan

Scope: this section owns test suites, fixtures, CI gating, the live model matrix, and
red-green defect injection for the Codex→Anthropic/Vertex outbound-fallback feature. It
does not own the translator's type layer, trigger-policy gate, or rollout/config surface —
those are named where relied on and flagged `depends_on` at the end.

### 0. Verified premise (spot-checked against the worktree, not carried forward blind)

`additional_tools` is **two namespaces**, not one, confirmed byte-for-byte in all 4 fixtures
(`test/fixtures/codex-request-{exec-mode,interactive-mode,resumed-session,tool-result-turn}.json`)
and in `scripts/generate-codex-fixtures.mjs`'s own `FUNCTION_TOOLS`/`COLLABORATION_TOOLS`
constants (lines ~35–79) plus its header comment (lines 2–19):

- `functions`: `read_file`, `apply_patch` — ordinary `{name, description, parameters}` JSON-schema tools.
- `collaboration`: `exec` (`type:"custom"`, a `grammar` field holding a Lark grammar string,
  **no** `parameters`) and `request_review` (`parameters`, no `type`/`grammar`).

`ClaudeTool` (`src/lib/types/proxy.ts:138–143`, re-read directly) is exactly
`{ name: string; description?: string; input_schema: Record<string, unknown>; cache_control?: ClaudeCacheControl }`
— no grammar field, no custom-tool discriminant, anywhere in `src/lib/`. A native `exec`
declaration has no faithful destination shape. This is a type ceiling, not a bug to patch
later. Whichever section owns the translator (`codex-outbound-fallback.ts` /
`types/codex.ts`, likely `cache-codex-prefix`) must pick one of: (a) drop collaboration
silently — rejected, a coding agent's shell-exec capability vanishes with no signal; (b) a
lossy JSON-schema wrapper that can't enforce the grammar; (c) fail the outbound fallback
closed whenever `additional_tools.collaboration` contains a `type:"custom"` entry. This plan
does not pick for them, but **every test and live scenario below is written so it fails
loudly if no case exists for a `type:"custom"` tool**, whichever of (a)/(b)/(c) is chosen.

Also confirmed live in the tool-result-turn fixture: `exec`'s `function_call.arguments` is
the plain string `"ls -la"` — **not JSON**. Any translator step that does `JSON.parse` on
`function_call.arguments` unconditionally will throw on real `exec` calls; A.1 has an
explicit case for this.

### 1. Suite placement and CI gating (resolved: 2 findings folded in)

Two new suites, both integration/pure-function style matching the two existing patterns in
this repo (`test/continuous-test-suite-proxy-fallback-parent.ts`, 1331 lines, confirmed
`createProxyStartApp`/`InMemorySpanExporter`/`FixtureMetricReader`; and
`test/continuous-test-suite-proxy-fallback-errors.ts`, 125 lines, confirmed a determinism-
exception header importing pure functions from `codexFallback.ts` with no server/network):

| New file                                                      | Model                 | Covers                                                                       |
| ------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| `test/continuous-test-suite-proxy-codex-outbound-fallback.ts` | `-fallback-parent.ts` | A.8 trigger-policy totality, A.9 loop prevention, A.10 commit-boundary rules |
| `test/continuous-test-suite-codex-outbound-translation.ts`    | `-fallback-errors.ts` | A.1–A.7, A.11 (pure functions, no server)                                    |

**Gating (verified directly, not from the grounding's stale numbers):** both suites must be
added to `scripts/run-proxy-reliability.mjs`'s `checks` array, which backs
`package.json`'s `test:proxy-reliability`, run at **`.github/workflows/ci.yml:448`**
(re-grepped: the grounding's `:445` is stale by 3 lines — `git show 47c4d1c7d` added 3
comment lines near `ci.yml:196`, shifting everything below; `test:proxy-telemetry` is now at
line 444, `test:codex` at line 452). That step runs inside job `provider-safety-net-shards`
with `matrix.group == 'rest'` (ci.yml:351–352), which `provider-safety-net` (ci.yml:330,
`needs: [provider-safety-net-shards]`) aggregates as the actually-required check
(ci.yml:320–343) — this _is_ the required gate the repo rules refer to.

**Resolved placement finding (minor, adopted):** `scripts/run-proxy-reliability.mjs`
currently has exactly one raw, untemplated `checks` entry
(`["tsx", "test/continuous-test-suite-vertex-anthropic-fallback.ts"]`), with its own comment
explaining it's raw specifically _because_ its name doesn't fit the `proxy-${suite}.ts`
template; every other suite is added via `.map()` over an 11-name array
(`request-lifecycle`, `http-disconnect`, `route-accounting`, `fallback-parent`,
`update-staging`, `pressure-recovery`, `token-budget`, `capture-pipeline`,
`context-preflight`, `fallback-errors`, `telemetry-reconciliation`). Per that file's own
convention:

- `proxy-codex-outbound-fallback.ts` **fits** the template → append `"codex-outbound-fallback"`
  to the 11-name array (becomes a 12th name), not a new raw entry.
- `codex-outbound-translation.ts` does **not** fit (no `proxy-` prefix) → add it as a
  **second** raw entry, `["tsx", "test/continuous-test-suite-codex-outbound-translation.ts"]`,
  with a comment mirroring the existing one, stating why it's raw.

`test/continuous-test-suite-codex.ts` (4178 lines, `test:codex`, `ci.yml:452`, confirmed
required, same `rest` group) stays untouched — its own header docstring scopes it to account
ordering/cooldown/quota/refresh-classification/CLI auth, never outbound fallback; grepped,
zero fallback-direction hits. `test/continuous-test-suite-proxy.ts` (14598 lines,
`package.json:168` script `test:proxy`) is confirmed **not** referenced by any `run:` line in
`ci.yml` (only `test:proxy-telemetry`, `test:proxy-reliability`, `test:proxy-connect-retry`,
`test:proxy-restart` appear) — do not place cases there; it gives a false sense of coverage.

### 2. Fixtures

Existing (reused, unmodified): the 4 `codex-request-*.json` files above, all confirmed
`store:false`, all confirmed carrying `additional_tools` with both namespaces on **every**
turn including the resumed-session and tool-result-turn fixtures (turn N of an ongoing
conversation still resends the identical block — `store:false` means Codex never assumes the
server remembers prior tool declarations).

New, for A.6 byte-stability: `test/fixtures/codex-native-request-cache-turn1.json` and
`...-turn2.json`, generated by extending `scripts/generate-codex-fixtures.mjs` (which already
exports the exact building blocks needed — confirmed present: `additionalToolsItem()`,
`developerMessageItems()`, `userMessageItem(text)`, `functionCallItem()`,
`functionCallOutputItem()`, `baseHeaders(...)`, `baseBody({input, sessionId, threadId})`,
`buildFixture({...})`). Add two more entries to the `fixtures` array:

- `turn1`: `buildFixture({ mode: "exec", betaCompaction: true, betaResponsesLite: true, userTexts: [...] })` — i.e. the same `additionalToolsItem()` + `developerMessageItems()` prefix as the existing exec-mode fixture, so the stable prefix is byte-identical by construction.
- `turn2`: same `buildFixture` call plus `extraInputItems: [functionCallItem(), functionCallOutputItem(), userMessageItem("<new turn text>")]` appended after the two turn-1 user messages.
  Both call the **same** `additionalToolsItem()`/`developerMessageItems()` functions — do not
  hand-duplicate the tool/developer-message literals into the new fixture pair, since a
  hand-duplicated copy is exactly the kind of accidental byte drift A.6 exists to catch.

### 3. Part A — deterministic offline suites

**A.1 Request translation shape** (file: `test/continuous-test-suite-codex-outbound-translation.ts`;
function under test: `convertCodexNativeRequestToClaude(body: CodexNativeRequestBody): ClaudeRequest`,
proposed new pure function in new `src/lib/proxy/codexOutboundFallback.ts`, structural
inverse of the confirmed-existing `convertClaudeRequestToCodex(body: ClaudeRequest, model: string, reasoningEffort?: CodexReasoningEffort): CodexResponsesRequest`
at `src/lib/proxy/codexFallback.ts:407`; `CodexNativeRequestBody` is a **new** type in
`src/lib/types/codex.ts`, distinct from the existing `CodexResponsesRequest` type there,
because `CodexResponsesRequest` is this repo's own _outgoing_ shape for the forward
direction and has no `additional_tools`/namespace concept at all):

- `developer-role messages map to system text in order` — load `codex-request-exec-mode.json` (4 developer messages), assert joined system text contains all 4 in original order.
- `user-role messages map to Claude user messages verbatim` — byte-identical text per message, including the `<environment_context>` synthetic wrapper string.
- `functions-namespace tools rename parameters to input_schema, deep-equal` — `result.tools` entries for `read_file`/`apply_patch` deep-equal source `parameters`.
- `collaboration custom-grammar tool (exec) is dropped or fails closed` — direct test of Section 0: assert either `exec` is absent from `result.tools` **and** an explicit diagnostic is set, or the converter throws a typed `CodexOutboundUnsupportedToolError` naming `exec` and `type:"custom"`. One of these two must hold under whichever policy (a)/(b)/(c) lands; this case must exist regardless.
- `collaboration parameter-based tool (request_review) is translated identically to a functions-namespace tool` — proves dispatch is by shape (grammar-present vs parameters-present), not by namespace name.
- `function_call + function_call_output pair becomes assistant tool_use + user tool_result` — load `codex-request-tool-result-turn.json` (`call_id: "call_synthetic_0001"`, `name: "exec"`, `arguments: "ls -la"` — confirmed a bare string, not JSON); assert the raw string is preserved somewhere recoverable on the `ClaudeToolUseBlock.input`, since it cannot be `JSON.parse`d.
- `resumed-session session_id/thread_id do not leak into the Claude request body` — load `codex-request-resumed-session.json`; assert no top-level `session_id`/`thread_id` key on the `ClaudeRequest`.
- `an unrecognized input item type does not silently vanish` — hand-construct an item of an unknown `type`; assert a thrown error or explicit diagnostic (mirrors the confirmed silent-no-op in `outputTextFromItem`, `codexFallback.ts:486–498`, which returns `""` for any `item.type !== "message"` — a known defect class, not a hypothetical one).

**A.2 Response/stream event sequence** (function under test: `createClaudeToCodexResponsesStream(response: Response, model: string): Promise<CodexResponsesOutboundStream>`,
proposed, mirroring the confirmed signature of `createCodexFallbackStream(response: Response, model: string): Promise<CodexFallbackStream>` at `codexFallback.ts:719`;
`CodexResponsesOutboundStream` proposed as `{ frames: AsyncGenerator<string, void>; cancel: (reason?: unknown) => Promise<void> }` in `types/codex.ts`, parallel to the existing `CodexFallbackStream`):

- `response.created precedes any output_item` — feed `message_start → content_block_start → content_block_delta×N → content_block_stop → message_delta → message_stop`; assert the first emitted frame is `response.created`.
- `exactly one terminal response.completed, never zero, never two` — mirrors the reverse-direction invariant already enforced by `parseCodexFallbackSSE`.
- `text delta frames for an index precede that index's response.output_item.done`.
- `a message_stop with zero content blocks still terminates cleanly` — stated explicitly rather than assuming the reverse direction's empty-result-rejection policy applies unchanged.
- `premature stream close after the terminal event is tolerated, not surfaced as failure` — force `reader.read()` to reject after `response.completed`; assert clean end, no thrown/logged error.
- **(resolved, adopted — review major finding)** `a ClaudeThinkingBlock reaches the client as an explicit item or is dropped only behind an assertable diagnostic, never silently` — `ClaudeThinkingBlock` (`{type:"thinking", thinking: string}`, `proxy.ts:118–121`, confirmed) has no counterpart anywhere in `CodexContentPart` (`types/codex.ts:144–147`, confirmed exactly 3 variants: `input_text`/`output_text`/`input_image`, no reasoning variant) or in any Codex response-item type in this repo. Given the plan is otherwise scrupulous about never letting a droppable case vanish silently (A.1's unrecognized-item case, A.3's unknown-call_id case, Section 0's exec case), this must not be the one silent exception. UNRESOLVED: the exact Codex Responses wire shape for a reasoning output item (whether OpenAI's `{type:"reasoning", ...}` with encrypted or summarized content applies here) is not established anywhere in this repo's types, fixtures, or the redacted reference sample — the one check that would settle it is a live capture of a real `codex_cli_rs` reasoning-effort turn (Part B, once a `reasoning.effort` request round-trips) or populating `~/.neurolink/reference/codex-cli-wire-sample.json`, which does not exist in this environment.

**A.3 Tool-call round trip** (targets the grounding's flagged gap: no cross-turn id-mapping
table exists anywhere in this codebase). Design choice, flagged for the translator-owning
section to confirm or override: **pass through** the real Anthropic `tool_use.id` (`toolu_`
prefix + 24 base64url chars — confirmed `generateToolUseId()`, `claudeFormat.ts:35–37`:
`` `toolu_${randomBytes(18).toString("base64url").slice(0,24)}` ``) verbatim as
`function_call.call_id`, instead of minting a fresh id or a mapping table:

- `two tool_use blocks in one turn become two function_call items, same ids, same order` — assert `call_id`s equal source `toolu_` ids verbatim.
- `tool results returned out of call order still resolve to the correct tool_use_id` — build a next turn with `function_call_output` items in reversed order vs. emission order; assert matching by id equality, not array position.
- `an unknown call_id is rejected, not silently attached to the nearest open tool_use` — fabricate a `function_call_output` with a `call_id` that never appeared; assert an explicit error.
- `ids from an Anthropic-served turn and a Vertex-served turn both round-trip without cross-contamination` — run one fixture turn through an Anthropic-shaped stub and one through a Vertex-shaped stub (reusing `vertexAnthropicFallback.ts`'s own stub pattern), assert both round-trip independently.
  UNRESOLVED: whether the real ChatGPT Codex backend validates `call_id` format server-side is
  not establishable from this repo — Part B scenario 4 is the only check that would settle it;
  until it runs, passthrough is a proposal, not a proven-safe choice.

**A.4 JSON-schema translation limits:**

- `tool key order is preserved, no Record staging` — `Object.keys(result.tools[i].input_schema)` equals `Object.keys(nativeTool.parameters)` in the same order; direct regression test for the confirmed `sortToolRecord` tool-order cache-busting hazard (**resolved, line corrected**: `sortToolRecord` is defined at `src/lib/core/baseProvider.ts:1499`, called from `1462` and `1487` — not `~1350–1367` as the stale grounding claimed; lines 1345–1370 hold unrelated `toolCalls`/`toolResults`-mapping code). The converter must map over the native array directly, never stage through a `Record<string, Tool>`.
- `a schema with $ref/$defs is passed through unresolved, not dereferenced` — deep-equal, not a semantic rewrite.
- `a second, differently-named type:"custom" collaboration tool is rejected the same way as exec` — guards against a converter that special-cases the literal string `"exec"` instead of checking the actual `type`/`grammar` shape.
- `a tool missing description does not throw and does not synthesize a placeholder` — `description` is optional on both `ClaudeTool` and the native functions-namespace shape.

**A.5 cache_control breakpoint placement** — reuse `applyClaudeRequestCacheBreakpoints`
(`src/lib/utils/anthropicCacheBreakpoints.ts:217–268`, confirmed unchanged) as-is; do not
write a new placement function.

- `a multi-block system array gets exactly one marker, on the last block` — load the exec-mode fixture's converted request.
- `a bare-string system value is promoted to block-array form before marking, or is explicitly asserted unmarked` — **LOAD-BEARING, confirmed by direct read**: the array branch is `if (Array.isArray(out.system) && out.system.length > 0 && existing === 0)` (`anthropicCacheBreakpoints.ts:242`, exact line re-verified). If the converter ever emits `system` as a plain string, this branch never fires and only the sibling `tools`-fallback branch could mark anything (and only when `existing===0 && tools.length>0` — never both, since the two branches are `if`/`else if`). `openaiFormat.ts`'s `convertOpenAIToClaudeRequest` is confirmed to already promote `system` to a block array specifically so this branch fires — the new converter must do the same.
- `total markers across tools+system+history never exceed 4` — count `cache_control` occurrences in the full output request (`MAX_BREAKPOINTS`, same file).
- `zero developer messages and zero tools degrades to zero markers, not a crash`.

**A.6 Byte-stability of the translated prefix across two turns** — the single most important
category for the caching requirement. Uses the two new fixtures above.

- `the stable prefix (developer messages + functions + collaboration) is byte-identical across both converted requests` — `JSON.stringify` equality on the extracted prefix, not a semantic diff; this is the literal Anthropic cache-validity contract.
- `the cache_control marker lands on the same logical block index/identity in both turns` — catches non-deterministic tool ordering (e.g. `Map`/`Set` iteration, a per-request temp id) that would still pass A.4's order-preservation case in isolation.
- `a converter that embeds Date.now() or a fresh id inside the stable prefix fails this suite` — the RED half; see Part C row 1.

**A.7 Usage mapping including unreported-vs-zero.** Source is Anthropic's flat `ClaudeUsage`
(`input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number` —
`proxy.ts:177–182`, confirmed exact shape, no per-field observed-flag), which must still
decide what to emit toward Codex's usage envelope when a field is genuinely absent upstream:

- `cache_read_input_tokens maps to usage.input_tokens_details.cached_tokens, and the emitted usage.input_tokens is the INCLUSIVE total` — **corrected wording (review finding)**: the earlier phrasing ("without double counting into input_tokens") read as if `input_tokens` should stay exclusive of cache tokens, contradicting `synthesizeCodexUsage`'s own (correct) behavior of computing `input_tokens = usage.input_tokens + (cacheRead ?? 0) + (cacheCreation ?? 0)`. Anthropic's `input_tokens` is exclusive of its cache fields; OpenAI's `input_tokens` is inclusive, with `cached_tokens` a breakdown/subset of that same total, not a separate additive count. The assertion is: `cached_tokens`/`cache_write_tokens` in `input_tokens_details` are the breakdown, counted once as part of the inclusive `input_tokens` total they already contributed to — never counted a second time on top of it.
- `a field genuinely absent from the Anthropic response is omitted from the Codex usage envelope, never coerced to 0` — repeats the exact defect class commit `d6234273c` ("fix(proxy): stop recording an unreported Codex cache breakdown as zero") already fixed once in the forward direction (commit confirmed present in this worktree's history); the reverse leg needs its own test, not an assumption by analogy.
- `reasoning tokens, if ever exposed by the serving leg, reach the emitted Codex usage envelope, or the omission is stated explicitly` — Anthropic/Vertex extended thinking is a different mechanism from Codex reasoning-effort accounting; if never reported, assert the field is omitted, not fabricated as 0.

**A.8 Trigger policy totality** (file: `test/continuous-test-suite-proxy-codex-outbound-fallback.ts`,
exercising the real per-status branches in `executeCodexResponsesRequest`,
`src/lib/server/routes/codexProxyRoutes.ts:623–1462`, 1694-line file, confirmed): table
enumerating every terminal condition the existing loop already distinguishes —
`ProxyContextPreflightError` (must NOT fall back; confirmed existing re-throw pattern for
this error class at `claudeProxyRoutes.ts:6270` — `fallbackErr instanceof ProxyContextPreflightError || getProxyTokenBudgetError(fallbackErr)` → rethrow, corrected from the grounding's stale `~6205–6208`), a `getProxyTokenBudgetError` match (must NOT fall back), `ctx.abortSignal.aborted` (must NOT fall back), all-accounts-cooling 429 (SHOULD fall back — the #1 real insertion point), 401/403 exhausted-after-rotation (SHOULD fall back), 429 exhausted-after-rotation (SHOULD fall back), other non-2xx exhausted-after-rotation (SHOULD fall back), and a **new** classification: a genuinely malformed-request rejection. Confirmed: Codex today has **no** equivalent of Anthropic's `isInvalidRequestError` (`claudeProxyRoutes.ts:12606`, used at `:8908`) — grepped `src/lib/server/routes/codexProxyRoutes.ts`, zero hits. Assert the new `shouldAttemptCodexOutboundFallback` function (proposed, does not exist yet — confirmed no such symbol anywhere in `src/lib`) distinguishes this case; its absence today is itself the finding.

- **(resolved, adopted — review minor finding, simplified rather than over-engineered)**: drop the proposed meta-assertion that greps the route file's own body to auto-count terminal exits. Confirmed the dispatch region (`codexProxyRoutes.ts:623–1462`) has many `return`/`break` sites at varying nesting depth (abort checks in the inner retry loop, budget-reservation failures, the auth-retry continue path) that a naive text-grep would overcount, and the cited analogy (`tools/verify-provider-onboarding.ts`) checks named-artifact presence, not anonymous control-flow counting — not a good fit. Instead: state plainly in the suite's own header comment that table totality against the real source is asserted by code review at PR time, not by an automated structural check, and rely on the table-driven case list itself.

**A.9 Loop prevention** (integration suite):

- `a Codex request already marked isFallbackRequest cannot fall outbound` — confirmed `CODEX_FALLBACK_METADATA_KEY = "neurolink.codexFallback"` (`codexProxyRoutes.ts:109`) and `isFallbackRequest = ctx.metadata?.[CODEX_FALLBACK_METADATA_KEY] === true` (`:669–670`), used **only** for `recordRequestMetrics: !isFallbackRequest` (`:694`) and branching at `:778`/`:816` — i.e. accounting-only today, confirmed by direct read. This test proves the repurposing into a routing guard actually happened; it does not exist yet.
- `an Anthropic leg whose own fallback chain points back at the same Codex leg does not re-select it within one logical request` — via a proposed hop-depth counter or visited-provider set threaded through `ctx.metadata` (e.g. `ctx.metadata["neurolink.codexOutboundHopDepth"]`); cap depth ≤ 1 (Codex may fall to Anthropic once; that Anthropic attempt may not fall back to Codex again in the same chain).
- `the hop-depth cap is enforced even when the operator's config describes a cycle` — configure both chains to point at each other; assert the second re-entry into an already-visited provider is refused with a specific loggable reason; bound the test's own patience with a max-iterations counter so a real infinite loop fails via assertion/timeout, not a hang.

**A.10 Commitment rule before/after first byte** — Codex has no existing
`preflightAnthropicStream`-equivalent on its own outbound response; propose one, reusing the
confirmed constants `STREAM_PREFLIGHT_MAX_BYTES = 64 * 1024` and `STREAM_PREFLIGHT_MAX_CHUNKS = 32`
(**line-corrected**: `src/lib/proxy/streamOutcome.ts:9–10`, not `:8–9`):

- `an Anthropic response failing before any usable SSE frame is preflight-detected and the leg still rotates to Vertex` — stub Anthropic to emit an immediate SSE error event; assert classification happens before any bytes reach the Codex client, and that the client-facing bytes actually came from the Vertex stub (not merely that it was called).
- `once first byte has reached the Codex client, a later upstream failure becomes an in-band terminal event, never a silent provider swap` — stub one real `content_block_delta` then an abrupt error; assert the client receives that delta plus a terminal Codex-shaped failure frame (e.g. `response.failed`), and that no second upstream is ever called post-commit — matches the existing Anthropic-side discipline (`claudeProxyRoutes.ts` ~7226–7241) instead of overclaiming full-stream seamlessness.
- `the preflight byte/chunk bound is stated and tested` — reuse the same two constants as a provider-agnostic bound; if a different bound is chosen, the test documents why.

**A.11 Cross-cutting**: reuse the existing SSE framing primitive
(`extractSSEEvents`, `src/lib/proxy/sseInterceptor.ts:53`, confirmed exported), do not add a
fourth hand-rolled loop.

- `both directions handle the identical pathological input identically` — feed both the forward (`codexFallback.ts`'s `parseSSEPayloads`) and the new reverse framing loop the same pathological input (a frame boundary split across two chunk writes; an oversized single tool-call payload); assert identical size-ceiling and boundary-scan behavior. Divergence means a fourth hand-rolled loop was written instead of generalizing the existing primitive.

### CI-gating summary

| Suite                                                          | npm script                                                                 | Workflow line                                        | Required                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| `continuous-test-suite-proxy-codex-outbound-fallback.ts` (new) | `test:proxy-reliability` via `run-proxy-reliability.mjs` (templated entry) | `ci.yml:448`                                         | yes, `provider-safety-net-shards`/`rest`     |
| `continuous-test-suite-codex-outbound-translation.ts` (new)    | same wrapper (raw entry)                                                   | `ci.yml:448`                                         | yes, same job                                |
| `continuous-test-suite-codex.ts` (existing, untouched)         | `test:codex`                                                               | `ci.yml:452`                                         | yes, out of scope per this plan's non-choice |
| `continuous-test-suite-proxy.ts` (existing, 14598 lines)       | `test:proxy`                                                               | none (confirmed no `run:` line anywhere in `ci.yml`) | no — do not rely on it                       |

### 4. Part B — live matrix (Codex quota reset; both Anthropic [3 OAuth accounts] and Vertex live-callable)

**Resolved framing (blocker, adopted):** the review is correct that `additional_tools.collaboration`
carries `exec` on **every** live Codex CLI request (confirmed: `store:false` means every
turn, including a resumed session and a mid-conversation tool-result turn, resends the
identical `additional_tools` block — there is no "tool-free" native Codex session). B1–B7
below therefore do **not** validate a hypothetical tool-free subset; every one of them
inherently exercises whichever policy Section 0 resolves to (drop/lossy-wrap/fail-closed),
because `exec` rides along on every request regardless of what the human operator typed.
Each scenario's pass criterion below adds an explicit clause for this. If the chosen policy
is fail-closed (option c), **every** scenario B1–B7 will observe a clean, Codex-shaped
closed-fail at the translation step rather than a model response — that is a valid, expected
outcome under that policy and must be asserted as such, not treated as an unexplained
failure. A live run against a real `exec`-bearing session, observing which of the two
outcomes actually happens, is the only way to close UNRESOLVED-2 below.

| #   | Model         | Target    | Scenario                                                                                                           | Pass criterion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------- | --------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | gpt-5.6-sol   | Anthropic | Cold start, single turn                                                                                            | If policy permits dispatch: `proxy_tokens_input` rises by ≈ prefix token count (±10%), `proxy_tokens_cache_creation` rises above 0. If fail-closed: a Codex-shaped diagnostic response, no dispatch attempted, asserted as the correct outcome.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2   | gpt-5.6-sol   | Anthropic | Warm second turn, same session/account                                                                             | **(resolved, adopted — review major finding)** Before drawing any cache-locality conclusion, query `proxy_cost_usd_total`'s `account` label for both turns; only proceed if the same account served both. `~/.neurolink/proxy-config.yaml` is confirmed `strategy: fill-first` with no `sessionAffinity` key, which compiles to the confirmed default `false` (`runtimeConfig.ts:355`, `sessionAffinity ?? false`) — Codex requests also have no path into the existing `metadata.user_id`-gated affinity hook. If the account differs, this scenario measures account-affinity, not translator correctness — re-run with a single account pinned before concluding anything about A.6. Given same account: `proxy_tokens_cache_read` rises by ≥80% of the prior turn's `cache_creation` delta; this turn's `cache_creation` delta is near-zero. |
| 3   | gpt-6-astra   | Anthropic | Functions-namespace tool call (`read_file`) alongside the ever-present `exec`/`request_review` collaboration tools | Client-visible stream contains a well-formed `function_call` for `read_file` the Codex CLI can execute; `proxy_fallback_success_total{provider='anthropic'}` increments by exactly 1; the response's handling of the accompanying `exec`/`request_review` declarations matches whichever Section-0 policy is live (no 400 from Anthropic on a malformed tool schema — the live proof for Part C row 8).                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 4   | gpt-6-astra   | Anthropic | Parallel tool calls (2 functions-namespace calls)                                                                  | Both `function_call` items carry distinct, `toolu_`-derived `call_id`s; the following live turn's `function_call_output` pair (fed back by the real Codex CLI) is accepted with no 400 — the live proof of the A.3 passthrough choice against a real backend.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 5   | gpt-5.6-terra | Vertex    | 6+ turn conversation crossing a fallback boundary mid-thread                                                       | Turns 1–3 carry `account` = an Anthropic OAuth email; turns 4+ carry `account` = a `vertex/<model>` shape (unconfirmed against source until this run); no protocol error at the boundary turn.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 6   | gpt-5.6-sol   | Anthropic | Forced quota rejection                                                                                             | `proxy_fallback_attempts_total{provider='anthropic'}` increments; either success on the next leg, or, if none, a client-visible 429 that is still Codex-shaped, never a raw Anthropic error passed through.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 7a  | gpt-5.6-terra | Anthropic | Mid-stream failure BEFORE first byte                                                                               | Clean fallback, no visible interruption; `failure_total` then `success_total` both present for the same wall-clock request.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 7b  | gpt-5.6-terra | Anthropic | Mid-stream failure AFTER first byte                                                                                | Stream terminates with an in-band Codex-shaped terminal frame; never a second provider's bytes appended — live proof matching A.10.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Cache-hop pass criterion for scenario 2, precisely (after the account-stickiness gate above
passes): `ratio = cache_read_delta / (cache_read_delta + cache_creation_delta + fresh_input_delta)`.
Approaching 1.0 demonstrates caching survived the hop; near 0 with nonzero `cache_creation`
on the second turn means A.6's byte-stability requirement failed live even though it may have
passed offline against fixtures.

Query pattern (counters are cumulative monotonic — roll up MAX per series key including
`start_time`, then SUM; never `SUM(value)` directly):

```sql
WITH per_series AS (
  SELECT start_time, MAX(value) AS v FROM proxy_tokens_cache_read
  WHERE account = '<account-or-vertex-model>' AND model = '<model>'
  GROUP BY start_time
) SELECT SUM(v) AS cache_read_total FROM per_series;
```

Run once for the window ending before the turn and once after; the delta is the difference.
Invoke via `node ooq-tmp.mjs '<sql>' metrics '<startISO>' '<endISO>'` from the repo root. An
empty `hits` array is **not** a measured zero — widen the window and re-check before
concluding caching failed. For `proxy_fallback_*` (labels `{provider, model}` only, no
`account` — confirmed via direct read of `recordFallbackAttempt`, `proxyTracer.ts:1082`),
group by `provider`/`model` instead.

### 5. Part C — red-green discipline

No telemetry exists yet at the current `service_versions` — run Part B scenarios 1–2 once
against **today's** code first (force a Codex failure with no outbound fallback at all,
confirm the client simply sees a failure) and record the exact `service_versions`/timestamps
returned, rather than assuming a prior baseline exists.

| #   | Behavior                                              | Defect to inject                                                                             | Where                                 | Expected failure without fix                                                                                                                                                                                                   |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Byte-stability (A.6)                                  | Embed `Date.now()` or a fresh id into the synthesized system/tools prefix                    | system-assembly step                  | A.6 byte-stability case fails                                                                                                                                                                                                  |
| 2   | Cache marker placement (A.5)                          | Skip string→block-array promotion, emit `system` as a bare string                            | converter's system-shape choice       | `applyClaudeRequestCacheBreakpoints` places 0 markers (array-branch guard requires `Array.isArray`); A.5 promotion case fails                                                                                                  |
| 3   | Unreported-vs-zero usage (A.7)                        | Coerce a missing `cache_creation_input_tokens` to 0 instead of omitting it                   | usage-mapping step                    | A.7 'genuinely absent' case fails — repeat of `d6234273c`, other direction                                                                                                                                                     |
| 4   | Tool-id round trip (A.3)                              | Re-mint a fresh `call_id` instead of passthrough, no mapping table                           | outbound `function_call` construction | A.3 out-of-order tool-result case fails                                                                                                                                                                                        |
| 5   | Trigger-policy totality (A.8)                         | Remove the `ProxyContextPreflightError`/token-budget re-throw guard                          | `shouldAttemptCodexOutboundFallback`  | A.8's table case for that row fails; live, an unexpected `proxy_fallback_attempts_total` increment appears for a request that should never have attempted one                                                                  |
| 6   | Loop prevention (A.9)                                 | Remove the hop-depth/visited-provider check, rely only on the accounting-only metadata key   | outbound dispatch entry guard         | A.9's configured-cycle case fails to refuse (bound the test's own patience with a max-iterations counter)                                                                                                                      |
| 7   | Commitment rule (A.10)                                | Make the preflight step a no-op, attempt rotation even after real bytes were forwarded       | Codex-outbound stream handling        | A.10's post-commit case fails (one client-visible stream expected, two providers' frames interleaved observed)                                                                                                                 |
| 8   | `additional_tools.collaboration` handling (Section 0) | Treat `collaboration` identically to `functions`, blindly copy `grammar` into `input_schema` | tool-declaration mapping              | A.1's exec case and A.4's hybrid-custom-tool case both fail; live, Anthropic returns a 400 `invalid_request_error` on the malformed schema — check for this specific 400 in Part B scenarios 3/4 if this defect ships uncaught |

### 6. Dependencies on other sections / UNRESOLVED

- Exact translator names/types (`convertCodexNativeRequestToClaude`, `CodexNativeRequestBody`,
  the functions/collaboration union) are proposed here for concreteness; owned by whichever
  section designs the request-parsing/type layer (likely `cache-codex-prefix`). If it settles
  on different names, only the symbol names here change — file placement, CI gating, the case
  list, and the live-matrix scenarios are structural and independent of the exact names.
- Account-affinity/session-pinning feeding a Codex-derived cache key into account selection —
  confirmed `sessionId` parameter accepts an arbitrary string with no format validation, so
  this plan's assumption is safe, but the hook itself belongs to `cache-anthropic`.
- `cache_control` TTL policy choice beyond straight reuse of `applyClaudeRequestCacheBreakpoints`
  — likely `cache-anthropic`/`cache-compaction`.
- Vertex-specific leg differences for scenario 5's account-label assertions — likely `cache-vertex`.
- The actual trigger-policy gate function body, hop-depth mechanism, and routing-config key
  name — likely `cache-guardrails`; this plan only names the test surface for it.
- Any new `proxy_fallback_*` observability labels — likely `proxy-waste`.
- UNRESOLVED-1: exact wire shape for a Codex reasoning output item (A.2) — see A.2 above; the
  one check that would settle it is a live capture of a real reasoning-effort Codex turn.
- UNRESOLVED-2: whether the real ChatGPT Codex backend validates `function_call.call_id`
  format server-side — the one check that would settle it is Part B scenario 4.
- UNRESOLVED-3: whether Section 0's policy choice ((a)/(b)/(c)) is fail-closed or lossy —
  owned by the translator section; this plan's Part B framing is written to be correct under
  either outcome, but the actual observed behavior (clean fail-closed vs. a live 400) is only
  settled by running scenarios 1/3/4 once the translator lands.

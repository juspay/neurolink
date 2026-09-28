# Credential-free provider acceptance gate

Suite: `test/continuous-test-suite-acceptance-gate.ts`
Run: `pnpm run test:acceptance-gate`
Script: `test:acceptance-gate` in `package.json`
Mock server: `test/helpers/acceptanceGateServer.ts`

## Why this exists

The prior full provider capability matrix (`test/continuous-test-suite-provider-matrix.ts`,
1,037 cells) was audited and found to be able to report green without proving
anything, in at least 10 ways: tool cells that passed with zero tool calls
made, no `disableInternalFallback` and no provider/model identity check on
any cell, structured-output cells that asserted a value's _type_ rather than
its _contents_, and a harness that could exit `0` on zero coverage.

This gate replaces that surface area with a small, falsifiable one: **at most
9 cells per (provider, pinned model), fail-fast, cheapest first**, run
entirely against a local mock vendor HTTP server — no real vendor calls, no
real API keys, ever. Every provider is pointed at the mock through its own
documented base-URL environment override, with a fake key, so the SDK and
the CLI both round-trip through the exact same server (that's what makes
cell 9, CLI parity, meaningful instead of a re-derivation).

## The 9 cells

Each cell asserts an **exact** value the mock server returns, never a shape
or a "non-empty" check. A row stops (remaining cells report `SKIP`, not a
second `FAIL`) the first time a cell genuinely fails — this is the
"fail-fast" contract; a capability-gated skip (e.g. a provider that doesn't
declare `tools`) never counts as a failure and never poisons the rest of the
row.

1. **Identity pin** — every call carries
   `{ provider, model, disableInternalFallback: true }`; the result's
   `provider` and `model` fields are asserted against what was requested.
2. **Exact-output generate** — `generate()`'s `content` is asserted equal to
   a specific constant (`GATE_EXACT_VALUE`), not merely non-empty.
3. **Drained stream, identity asserted** — the stream is fully drained and
   the accumulated content is asserted equal to a constant. The
   `StreamResult`'s `provider`/`model` are then asserted — and for the
   OpenAI-compatible protocol rows, against what the mock server actually
   served (`${model}::mock-server-resolved`), not what was requested. See
   "The stream-identity defect" below — this cell is the reason that defect
   was caught and fixed.
4. **Tool-nonce proof** — the test tool's `execute()` returns a fresh
   `randomUUID()` nonce that exists nowhere else. The final answer is
   asserted to contain `ACCEPTANCE_GATE_TOOL_CONFIRMED:<nonce>`, which the
   mock server only emits once it sees that exact nonce echoed back in a
   tool-result message — i.e. the assertion can only pass if a real tool
   call round-tripped through the model.
5. **Structured-exact** — `generate({ schema })`'s parsed `structuredData` is
   asserted equal (via `JSON.stringify`) to an exact object, and
   `jsonTruncated` is asserted not `true` — truncation is surfaced, never
   silently swallowed.
6. **Thinking proof** — only for providers whose catalog/descriptor declares
   `thinking: true` (currently `anthropic` and the `deepseek` catalog row).
   Drives `stream()` with an explicit
   `thinkingConfig: { enabled: true, budgetTokens: 2048 }` (the SDK path has no bare `thinkingLevel`
   convenience — that folding only exists on the CLI's option parser) and
   asserts the accumulated `reasoning` deltas and the post-thinking answer
   both equal exact constants.
7. **Embeddings proof** — only for providers whose row declares
   `embeddings: true`. Goes through `ProviderFactory.createProvider()`
   directly (`NeuroLink` has no `embed()` method) and asserts the returned
   vector equals an exact constant array.
8. **Budget ceiling enforced** — a _dedicated_, low-ceiling (`1`) mock
   server instance proves the ceiling mechanism itself is real: a first call
   succeeds, a second call against the same server must fail, and the
   server's own request counter is asserted to have observed both. This
   runs against its own server, never the shared one every other cell uses,
   so it can't be tripped by unrelated traffic.
9. **CLI parity** — the same identity + exact-output assertions as cells 1-2,
   but driven through the _built_ CLI
   (`node dist/cli/index.js generate ... --format json`), parsing its JSON
   stdout, against the same mock server.
   Not a separate re-derivation of the assertions — literally the same
   constants.

### Known, documented gap in cell 9

The CLI's `generate`/`stream` commands have no flag that reaches
`disableInternalFallback` — `commandFactory.ts`'s `processOptions()`
whitelist omits it (only the interactive REPL's separate options schema
supports it). Cell 9 therefore runs without `disableInternalFallback`. This
is an intentional, documented gap, not an oversight: fixing it is a CLI
option-surface change out of scope for this gate.

What keeps the gap harmless is that the suite holds no real credential to
fall back to. `test/helpers/credentialFreeEnv.ts` is its first import: it
points `DOTENV_CONFIG_PATH` at `/dev/null`, so neither the SDK's nor the
harness's `.env` load reads a developer's `.env`, it deletes every
credential-named variable the shell exported, and it points `HOME` at an
empty temp directory. The last one matters as much as the first two: the
Anthropic provider prefers a stored OAuth token
(`~/.neurolink/anthropic-credentials.json`) over `ANTHROPIC_API_KEY` and
refreshes it against Anthropic's live token endpoint, so a gate that only
cleaned the environment could still send a real refresh token to a real
host. The suite checks the environment and the home directory before it
runs a row, and the CLI child inherits that stripped environment plus the
current row's fake key.

## The stream-identity defect (cell 3)

**Confirmed and fixed in `src`.**

`StreamResult.model` (the public value cell 3 asserts against) was reporting
the _requested_ model, not the model the server actually served. Internally,
`neurolink.ts` already captured the resolved model — the bug was that this
resolved value never reached the public `StreamResult`.

- **OpenAI-compatible protocol path** (`src/lib/providers/openaiChatCompletionsBase.ts`,
  `src/lib/types/openaiCompatible.ts`) — the substantive fix, and the one
  cell 3 actually exercises: added `StreamLoopArgs.onModelObserved?: (model:
string) => void`, fired once per step that echoes a `model` field on the
  wire (SSE `chunk.model`, captured by `parseSSEStream` into
  `OpenAICompatSSEResult.model`). `executeStream`'s public `result.model` was
  a plain data property fixed at the pre-call resolved/requested `modelId`;
  it is now a live getter (`observedServerModel ?? modelId`) so a caller
  reading `.model` after draining `.stream` sees what the server actually
  served — the mock's `::mock-server-resolved` suffix on the `STREAM` cell
  is what makes this difference observable and the fix provable. It has to
  be a getter, not a reassignment after the fact: `preserveLiveStreamAccessors`
  spreads `result` into a new object at each provider boundary before the
  background loop produces its first chunk, which would freeze a plain field
  at its construction-time value.
- **Anthropic path** (`src/lib/providers/anthropic/client.ts`) — a narrower,
  related fix: `StreamResult.model` was reporting the raw constructor
  argument `this.modelName`, which is `undefined` whenever a caller relies
  on the default model rather than passing one explicitly. It now reports
  `modelId`, the value already resolved as `this.modelName ||
getDefaultAnthropicModel()` and actually put on the wire. Note this is a
  different bug from the OpenAI-compatible one: the Anthropic Messages API
  always echoes the request's `model` back verbatim in its envelope, so
  there is no "server resolved a different model than requested" case on
  this protocol for cell 3 to catch — the mock's `anthropic` row therefore
  asserts the request-echoed value, not a server-observed one. This fix is
  real and independently correct (it fixes default-model callers), but it
  is not the same class of defect cell 3's OpenAI-compatible assertion
  proves, and cell 3 does not exercise it for the covered `anthropic` row
  specifically, since that row always passes an explicit `model`.

The mock server deliberately makes this defect observable rather than
hiding it: on the OpenAI-compatible protocol, the `STREAM` cell's response
appends `::mock-server-resolved` to the requested model in both the content
and finish SSE chunks, simulating a gateway/router rewriting an alias to a
concrete served model id. Cell 3 asserts the _server-observed_ value for
`protocol: "openai"` rows and the request-echoed value for `protocol:
"anthropic"` rows (per the Messages API's own envelope semantics).

## Additional `src` defects found and fixed by cells 4 and 8

Building this gate surfaced three more real defects, all in provider-side
tool-capability allowlists and one test-sizing constant — none in the mock
itself. Each is a one-line, strictly capability-adding fix.

- **`ollama` cell 4 (tool-nonce proof)** — `OllamaProvider.supportsTools()`
  checks the model name against `modelConfiguration.ts`'s
  `createOllamaConfig().modelBehavior.toolCapableModels` allowlist. That list
  (`OLLAMA_TOOL_CAPABLE_MODELS`) included `"llama3.1"` but not `"llama3.2"` —
  the gate's own pinned default Ollama model
  (`providerMatrix.ts`'s `ollama.defaultModel`, which declares `tools:
true`). `supportsTools()` returned `false` for the provider's own default
  model, which silently dropped the user-supplied tool from both the
  wire `tools` field and the execution lookup (`executeNativeGenerate()`'s
  `toolsRecord` is built empty when `supportsTools()` is false), producing a
  `"Tool not found"` error instead of a real tool round-trip. **Fixed** in
  `src/lib/core/modelConfiguration.ts` by adding `"llama3.2"` to the default
  `toolCapableModels` array.
- **`openrouter` cell 4 (tool-nonce proof)** — `OpenRouterProvider.supportsTools()`
  has two paths: a dynamically cached capability set (populated by
  `cacheModelCapabilities()`, which fetches `/models` and reads
  `supported_parameters`) and a hardcoded fallback pattern list used until
  that cache is populated. `cacheModelCapabilities()` is never invoked
  automatically anywhere in the real `generate()`/`stream()` code paths, so
  the fallback list is the _only_ path ever exercised in practice. That list
  included `"meta-llama/llama-3.2"` and `"meta-llama/llama-3.3"` but not
  `"meta-llama/llama-3.1"` — the family of the gate's pinned default
  OpenRouter model, `"meta-llama/llama-3.1-8b-instruct"` (chosen, per an
  existing code comment, specifically because it supports every capability
  the matrix exercises). Same failure mode as the ollama defect above.
  **Fixed** in `src/lib/providers/openRouter/client.ts` by adding
  `"meta-llama/llama-3.1"` to `knownToolCapablePatterns`.
- **`litellm` cell 8 (budget ceiling) — test sizing, not a `src` defect** — a
  single `nl.generate()` call against `litellm` makes 3 wire requests
  against this mock, not 1: `ensureModelLimits()` performs its own `GET
/model/info` discovery request before the real chat-completions call, and
  NeuroLink constructs two separate `LiteLLMProvider` instances per logical
  call, so that discovery request fires twice. Against a real, slower
  backend the second firing is normally absorbed by the module-level
  in-flight-promise dedup cache in
  `src/lib/providers/litellm/client.ts`; against this fast local mock the
  first discovery call can complete (and 404, since the mock has no
  `/model/info` handler) before the second `LiteLLMProvider` construction
  reuses the cache entry, so the dedup misses and both land on the wire.
  This is a test-infrastructure timing artifact specific to a fast local
  mock, not a genuine product defect — the underlying two-instances-per-call
  construction pattern is sanctioned architecture and is normally invisible
  against real network latency. **Fixed** in the test suite only: the
  `litellm` row's `requestsPerCall` (see `GateRow.requestsPerCall` in
  `test/continuous-test-suite-acceptance-gate.ts`) is `3`, so cell 8 sizes
  its dedicated ceiling server correctly and doesn't trip mid-way through
  the row's own first call.

## Mock server

`test/helpers/acceptanceGateServer.ts` is a real `node:http` server (not
fetch interception) that speaks the two wire protocols the covered providers
actually use:

- **OpenAI-compatible chat completions** — `/chat/completions` (including
  SSE streaming, tool calls, `response_format`, reasoning deltas), `/models`,
  `/embeddings`.
- **Anthropic Messages API** — `/messages`, for the one `ANTHROPIC_BASE_URL`
  row.

Every provider is redirected at it through its own documented base-URL
environment override (`<ID>_BASE_URL` for catalog providers, each
hand-written provider's own env var — see "Coverage" below) with a fake API
key (`gate-fake-key-not-a-real-credential`). The server enforces a
request-count ceiling per instance and returns HTTP 400 past it (cell 8).

Every gate marker, exact value, and mock behavior the suite asserts against
is exported from that file (`GATE_MARKERS`, `GATE_EXACT_VALUE`,
`GATE_STREAM_VALUE`, `GATE_STRUCTURED_VALUE`, `GATE_TOOL_NAME`,
`GATE_TOOL_CONFIRM_PREFIX`, `GATE_THINKING_FULL`, `GATE_THINKING_ANSWER`,
`GATE_EMBEDDING_VECTOR`, `GATE_SERVER_MODEL_SUFFIX`, ...) so the suite and
the mock can never silently drift apart.

## Coverage

Provider rows are derived the same way `test/helpers/providerMatrix.ts`
already does: hand-written rows are listed explicitly, catalog rows are
derived from the _built_ catalog (`dist/providers/catalog/index.generated.js`
and `dist/providers/catalog/loader.js`), matching every other suite that
consumes `providerMatrix.ts`.

**31 providers covered** — 9 hand-written OpenAI-compatible providers
(`openai`, `openai-compatible`, `openrouter`, `ollama`, `litellm`,
`nvidia-nim`, `lm-studio`, `llamacpp`, `cohere`), `azure` (OpenAI-compatible
protocol via its own deployment URL), `anthropic` (Anthropic Messages
protocol), and 20 catalog providers whose base URL is a plain env override
(every catalog provider except `cloudflare`, which needs a
`computedBaseURL`/account-id template the mock can't satisfy — see below).

**13 providers not covered**, each for a structural reason (no silent caps —
the suite itself throws at import time if a `PROVIDERS` entry is in neither
list):

| Provider     | Reason                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vertex`     | Signed Google Cloud client (service account / ADC), not a plain bearer-token HTTP call; no base-URL override, credentials can't be faked with a static string.                       |
| `google-ai`  | Speaks Google's Gemini wire protocol — a third protocol family this gate's mock does not implement (only OpenAI-compatible and Anthropic Messages are).                              |
| `bedrock`    | AWS SigV4-signed requests via the AWS SDK — same class of problem as vertex.                                                                                                         |
| `sagemaker`  | AWS SigV4-signed requests via the AWS SDK — same class of problem as vertex.                                                                                                         |
| `cloudflare` | Catalog entry declares a `baseURLTemplate` with a hardcoded `api.cloudflare.com` host; only the `{accountId}` path segment is overridable via `CLOUDFLARE_ACCOUNT_ID`, not the host. |
| `voyage`     | Embeddings-only (`text: false`) — no chat surface for cells 1-3, and its embeddings wire shape is a custom protocol not implemented here.                                            |
| `jina`       | Embeddings/reranking-only (`text: false`) — same reasoning as voyage.                                                                                                                |
| `stability`  | Image-generation-only (`text: false`) — no chat surface, image generation out of scope.                                                                                              |
| `ideogram`   | Image-generation-only (`text: false`) — same as stability.                                                                                                                           |
| `recraft`    | Image-generation-only (`text: false`) — same as stability.                                                                                                                           |
| `replicate`  | Predictions API (poll-based, `streaming: false`) — a custom protocol distinct from both implemented protocol families.                                                               |
| `typesafe`   | Decide-only (`SystemOneDecisionProvider`) — every generation capability is `false`; no text surface for any cell.                                                                    |
| `laya`       | Decide-only, like typesafe — no text surface for any cell.                                                                                                                           |

Cells 4 (tools), 5 (structured output), 6 (thinking) and 7 (embeddings) run
only where the covered provider's row/catalog descriptor declares that
capability; otherwise the cell reports `SKIP` with a reason, never a
silent pass or a fabricated failure.

## Running it

```bash
pnpm run build            # dist/ must be fresh — the suite calls
                           # assertDistFresh({ entrypoints: ["dist/cli/index.js"] })
                           # and refuses to run against a stale build, since
                           # cell 9 drives the built CLI directly.
pnpm run test:acceptance-gate
```

No environment variables or credentials are required, and none are used:
real ones are stripped at startup (see "Known, documented gap in cell 9"),
and every credential the suite sets is a fake string, scoped per-row via
`withEnv()` and restored after each row.

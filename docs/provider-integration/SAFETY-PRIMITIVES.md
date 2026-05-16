# Safety Primitives Reference

Canonical reference for the cross-cutting safety helpers introduced
in the PR #1019 review fix-up. Use this when adding new providers /
modalities, or when touching any code that:

- downloads URLs returned by external APIs
- logs HTTP responses or arbitrary records
- wraps provider streaming with OTel spans
- discriminates a `NeuroLink` SDK instance from an opaque `unknown`
- routes between image-gen and text-gen paths

All helpers live in `src/lib/utils/` or `src/lib/telemetry/` and are
re-exported from the appropriate barrel.

---

## 1. SSRF-hardened binary download — `safeDownload`

**Use for:** every `fetch()` of a URL that came from somewhere other than a
hardcoded literal — caller arguments, third-party API responses, redirects.

```ts
import { safeDownload } from "../utils/safeFetch.js";
import { MAX_VIDEO_BYTES } from "../utils/sizeGuard.js";

const buffer = await safeDownload(videoUrl, {
  maxBytes: MAX_VIDEO_BYTES,
  label: "MyProvider video",
  timeoutMs: 60_000, // optional, default 60_000
  signal: callerAbortSignal, // optional
});
```

**Guarantees** (each enforced by tests in `test/continuous-test-suite-ssrf.ts`):

- Resolves and validates the hostname against blocked CIDRs:
  RFC 1918, loopback, link-local, CGNAT, IPv6 loopback / link-local /
  ULA, IPv4-mapped IPv6 (both dotted-decimal and hex forms),
  Alibaba metadata `100.100.100.200`, cloud metadata
  `169.254.169.254`, and encoded IPv4 forms (octal `0177.0.0.1`,
  decimal-int `2130706433`).
- Pins the resolved IP onto the actual TCP connection via an undici
  `Agent` so DNS rebinding (resolver returns public IP for the guard,
  private IP for the real request) can't bypass.
- Uses `redirect: "manual"` — a 3xx → private-IP redirect would
  otherwise sneak past the guard.
- Caps total bytes via `readBoundedBuffer` from `sizeGuard.ts`.
- Re-throws on DNS lookup failure (the previous `assertSafeUrl`
  silently allowed; both forms still rejected here).

**Lower-level alternatives** (when you must `fetch()` yourself and only
want validation):

```ts
import { assertSafeUrl, validateAndResolveUrl } from "../utils/ssrfGuard.js";

// Just validate (throws on bad URL).
await assertSafeUrl(url);

// Validate + return the resolved IP so you can pin yourself.
const { url, ip, family } = await validateAndResolveUrl(url);
```

**ESLint enforcement:** none yet — prefer `safeDownload` over
hand-rolled `fetch + assertSafeUrl + readBoundedBuffer` chains.

**Tests:** `pnpm run test:ssrf` (40 cases covering H01 + H06 in the review).

---

## 2. Log redaction — `sanitizeForLog`, `sanitizeRecord`, `sanitizeHeaders`

**Use for:** any HTTP response body, request payload, or arbitrary
record that goes through `logger.{info,warn,error,debug}(...)`.

```ts
import {
  sanitizeForLog,
  sanitizeRecord,
  sanitizeHeaders,
} from "../utils/logSanitize.js";

// Free-form text (HTTP body, error message)
logger.warn("upstream error", { body: sanitizeForLog(raw, 500) });

// Structured payload (recursive — handles cycles via [Circular])
logger.debug("request context", sanitizeRecord(context));

// HTTP headers (redacts Authorization / Cookie / X-API-Key wholesale)
logger.debug("request headers", { headers: sanitizeHeaders(req.headers) });
```

**Coverage** — `SECRET_PATTERN` in `src/lib/utils/logSanitize.ts`:

| Type                | Tokens covered                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Auth schemes        | `Bearer X`, `Token X` (Replicate), `Basic X` (D-ID) — all with required whitespace                                 |
| Bare token prefixes | `sk-…`, `pk-…`, `r8_…`, `gsk_…`, `xai-…`, `tgp_…`, `fw_…`, `pplx-…`, `pa-…`, `jina_…`, `fish-…`                    |
| Generic kv          | `api_key=…`, `access_token: …`, `secret_key=…`, `refresh_token=…` (URLs and JSON)                                  |
| Object keys         | `apiKey`, `api_key`, `accessToken`, `refresh_token`, `secret`, `password`, `authorization`, `oauth`, `credentials` |
| Header names        | `authorization`, `cookie`, `set-cookie`, `x-api-key`, `api-key`, `apikey`, `x-auth-token`, `x-csrf-token`          |

**ESLint enforcement:** `neurolink/no-inline-secret-regex` blocks any
inline regex used in `.replace()` that matches a known token-marker
substring outside `logSanitize.ts`. Bypass via `// eslint-disable-next-line`
with justification only when the redaction is unrelated (e.g. CLI flag
form `--token foo`).

**Tests:** `pnpm run test:log-sanitize` (41 cases covering H03 + H04).

---

## 3. OTel stream spans — `withClientStreamSpan` / `withStreamSpan`

**Use for:** any provider method that returns a producer
(`StreamResult`, `AsyncIterable`-returning function). NOT for one-shot
operations — those still use `withClientSpan` / `withSpan`.

```ts
import {
  withClientStreamSpan,
  tracers,
  ATTR,
} from "../telemetry/index.js";

protected async executeStream(options): Promise<StreamResult> {
  return withClientStreamSpan(
    {
      name: "neurolink.provider.stream",
      tracer: tracers.provider,
      attributes: {
        [ATTR.GEN_AI_SYSTEM]: "<provider>",
        [ATTR.GEN_AI_MODEL]: this.modelName,
        [ATTR.GEN_AI_OPERATION]: "stream",
        [ATTR.NL_STREAM_MODE]: true,
      },
    },
    async () => this.executeStreamInner(options),
    (r) => r.stream,                            // selector: extract iterable
    (r, wrapped) => ({ ...r, stream: wrapped }), // setter: attach wrapped iterable
  );
}
```

**Why not `withClientSpan` for streams:** the one-shot variant ends
the span as soon as the callback's promise resolves. For a stream that
means the span captures **only the setup phase** — the actual chunks,
token usage, and finish reason all happen later (during iteration),
after the span has already ended. The result: `gen_ai.usage.*` and
`gen_ai.response.finish_reason` are missing from the span, duration is
meaningless (tens of ms instead of seconds), and child spans outlive
the parent in the trace tree.

`withClientStreamSpan` wraps the returned iterable so the span stays
open until the **consumer** reaches end-of-stream / errors / aborts.

**Lifecycle guarantees** (each enforced by tests in
`test/continuous-test-suite-stream-span.ts`):

- Span unfinished after the wrapper returns.
- Span ends `OK` when the consumer reaches the end of the iterable.
- Span ends `ERROR` + `recordException` when the consumer throws (and
  `recordException` is called BEFORE `span.end()` so the event isn't
  silently dropped).
- Span ends `ERROR` immediately if the `fn` callback itself rejects.
- Attributes set in `options` are preserved through wrapping.

**Migrated providers** (15 streaming spans across 13 files):
`baseProvider.stream` (top-level), `cohere`, `groq`, `xai`,
`togetherAi`, `fireworks`, `perplexity`, `deepseek`, `llamaCpp`,
`lmStudio`, `nvidiaNim`, `cloudflare`, `ollama` (×2 — with/without
tools), `googleAiStudio`, `googleVertex`.

**Tests:** `pnpm run test:stream-span` (105 cases including pattern
sweep that ensures no legacy `withClientSpan(` remains for streaming
in any provider).

---

## 4. NeuroLink SDK brand check — `isNeuroLink` / `NEUROLINK_BRAND`

**Use for:** the `sdk?: unknown` parameter on provider constructors
that the factory passes in.

```ts
import { isNeuroLink } from "../neurolink.js";

constructor(
  modelName?: string,
  sdk?: unknown,
  _region?: string,
  credentials?: NeurolinkCredentials["<provider>"],
) {
  const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;
  super(modelName, "<provider>" as AIProviderName, validatedNeurolink);
  // ...
}
```

**Why not duck-typing:** the previous pattern was
`sdk && typeof sdk === "object" && "getInMemoryServers" in sdk` — if
NeuroLink ever renames that method, the SDK reference is silently
dropped (no compile error, no runtime warning) and downstream tool /
MCP / event-emitter resolution all break with a confusing "no tools"
symptom.

`isNeuroLink` uses a `Symbol.for("@juspay/neurolink/sdk-brand")` that
survives minification and isn't tied to method names.

**Migrated providers** (18): cohere, fireworks, groq, ideogram, jina,
llamaCpp, lmStudio, mistral, nvidiaNim, perplexity, togetherAi,
replicate, stability, recraft, xai, voyage, cloudflare, deepseek.

**Tests:** the pattern sweep section of `test/continuous-test-suite-stream-span.ts`
asserts each provider uses `isNeuroLink(` and has no leftover
`"getInMemoryServers" in sdk` reference.

---

## 5. Image-gen routing — `isImageGenerationModel`

**Use for:** detecting whether a model name should dispatch to
`executeImageGeneration()` instead of the chat path.

```ts
import { isImageGenerationModel } from "../core/constants.js";

if (isImageGenerationModel(this.modelName) && !requestsNonImageOutput) {
  return this.executeImageGeneration(options);
}
```

Boundary-aware match: the model name must equal a known image-model
entry OR contain it as a prefix bordered by `-`, `_`, `:`, `/`, `.`,
or end-of-string. Prevents accidental matches like a fine-tune named
`gpt-image-1-finetune-2025-q1` triggering image-gen routing for what's
actually a chat model.

**Source list:** `IMAGE_GENERATION_MODELS` in `src/lib/core/constants.ts`.

---

## 6. Provider error convention — typed errors only

**Use for:** every `formatProviderError` implementation in any chat /
image / embedding provider.

```ts
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";

protected formatProviderError(error: unknown): Error {
  if (error instanceof TimeoutError) {
    return new NetworkError(`Request timed out: ${error.message}`, "<name>");
  }
  if (message.includes("401")) return new AuthenticationError(...);
  if (message.includes("429")) return new RateLimitError(...);
  if (message.includes("404")) return new InvalidModelError(...);
  return new ProviderError(`<Name> error: ${message}`, "<name>");
}
```

**Why typed:** `baseProvider.handleProviderError` classifies errors via
`instanceof` against the typed hierarchy and sets `error.type` on the
OTel span (`"auth_failure"`, `"rate_limit"`, `"network"`,
`"invalid_model"`, `"timeout"`, or `"provider_error"`). Plain
`new Error()` always falls through to the default tag, erasing
fidelity from observability dashboards and breaking alerts that
filter by `error.type`.

**ESLint enforcement:** `neurolink/provider-typed-errors` blocks
`return new Error(...)` from any `formatProviderError` method body
inside `src/lib/providers/*.ts`.

---

## 7. Shared logging fetch — `createLoggingFetch`

**Use for:** the `fetch` option on `createOpenAI({...})` / similar SDK
client constructors when you want non-2xx upstream responses logged
with sanitized output.

```ts
import { createLoggingFetch } from "../utils/loggingFetch.js";

const cohere = createOpenAI({
  apiKey: this.apiKey,
  baseURL: this.baseURL,
  fetch: createLoggingFetch("cohere"), // ← single shared impl
});
```

**Body opt-in:** response bodies are NOT logged by default. Set
`NEUROLINK_DEBUG_HTTP=1` to enable body logging — bodies are run
through `sanitizeForLog` to redact tokens.

**Previously duplicated in:** cohere, xai, groq, togetherAi, fireworks,
perplexity, cloudflare, llamaCpp, lmStudio, nvidiaNim, deepseek (11
near-identical copies with subtle differences). Now centralised.

---

## 8. Test scripts

| Script                       | Suite                                        | Covers                                                                                                  |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `pnpm run test:ssrf`         | `test/continuous-test-suite-ssrf.ts`         | H01 + H06 bypass categories, handler-coverage audit                                                     |
| `pnpm run test:log-sanitize` | `test/continuous-test-suite-log-sanitize.ts` | H03 + H04 token formats, record/header sanitization, H04 regression grep                                |
| `pnpm run test:stream-span`  | `test/continuous-test-suite-stream-span.ts`  | H07 span lifetime + error path + recordException ordering, M08 typed-error sweep, M09 brand check sweep |

All three run offline (no API keys required, no external network for
the IP-literal paths) so they're safe to wire into pre-commit / CI.

---

## 9. Universal safety checklist (paste into PR description)

When adding any new provider / modality / handler, tick:

- [ ] All caller-influenced URL downloads go through `safeDownload` (or `predictionLifecycle.downloadPredictionOutput` for Replicate-based handlers)
- [ ] All HTTP response bodies sanitized via `sanitizeForLog` / `sanitizeRecord` / `sanitizeHeaders` (NO inline regex)
- [ ] Streaming spans wrapped in `withClientStreamSpan` (NOT `withClientSpan`)
- [ ] Provider SDK reference validated via `isNeuroLink(sdk)` (NOT duck-typing)
- [ ] `formatProviderError` returns typed errors (`AuthenticationError` / `RateLimitError` / `InvalidModelError` / `NetworkError` / `ProviderError` / `NeuroLinkError`) — never plain `Error`
- [ ] `pnpm run test:ssrf && pnpm run test:log-sanitize && pnpm run test:stream-span` all pass

If a custom redaction or fetch pattern is genuinely required, add an
`eslint-disable-next-line` with a one-line justification rather than
silently bypassing the centralized helper.

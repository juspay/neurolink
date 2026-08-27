# NeuroLink test suite

> **TL;DR:** every `test/continuous-test-suite-*.ts` file is a self-contained
> `tsx` script. No Jest/Vitest. Suites share infrastructure via
> `test/helpers/`. Three CI tiers — **unit** (free), **live** (API keys),
> **product** (paid metered).

> **Every suite here is end-to-end.** A test must exercise a surface this
> package ships: construct `NeuroLink` and call `generate()` / `stream()`,
> or drive the built CLI through `runCLI`. Importing a module out of
> `src/lib/` to assert on it directly is a unit test and does not belong in
> this directory — see CLAUDE.md rule 15. (The `test:unit` tier keeps its
> name for its cost profile: free, no live API calls. It is not a
> unit-testing tier.)

## Contents

1. [Quick start](#1-quick-start)
2. [Tiers](#2-tiers)
3. [Suite map](#3-suite-map)
4. [Shared infrastructure](#4-shared-infrastructure)
5. [Writing a new suite](#5-writing-a-new-suite)
6. [Adding a new provider](#6-adding-a-new-provider)
7. [Local services (for live tests)](#7-local-services-for-live-tests)
8. [SKIP triage](#8-skip-triage)
9. [Migration history (appendix)](#9-migration-history-appendix)

---

## 1. Quick start

```bash
pnpm run test:unit       # ~5 min, no API costs, runs every commit
pnpm run test:live       # ~25 min, needs provider API keys
pnpm run test:product    # ~15 min, runs image/video/TTS/proxy (paid)

# Single suite:
pnpm run test:credentials
pnpm run test:mcp:full

# Direct invocation:
pnpm exec tsx test/continuous-test-suite-<name>.ts [--provider=vertex] [--model=gpt-4o]
```

## 2. Tiers

| Tier               | Frequency         | Suites                                                                                                                                                                                                                                                                | Cost                  |
| ------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **`test:unit`**    | local only        | `bugfixes`, `mcp:infra`, `mcp:spans`, `tool-routing`, `tool-routing-cli`, `tool-dedup`, `model-pool`, `tool-routing-semantic`, `mcp-result-cache`, `model-not-found-retryable`, `archive:security`, `office:security`, the three `vector-*` stores, `provider-wiring` | $0                    |
| **`test:live`**    | when keys present | `providers`, `mcp:http`, `mcp:sdk`, `mcp:cli`, `observability`, `context`, `memory`, `tool-reliability`, `evaluation`, `autoresearch`                                                                                                                                 | small per-call        |
| **`test:product`** | release gate      | `media` (image+video), `tts`, `ppt`, `proxy`                                                                                                                                                                                                                          | metered (image/video) |

**What CI actually runs.** Not `test:unit`. Two required jobs in
`.github/workflows/ci.yml` cover this directory, and both are sharded behind an
aggregator of the same name — branch protection checks the aggregator, so the
name it requires is never the name of a job that runs a suite.

`provider-safety-net` builds the package, then splits two ways. `contract` runs
`test:providers-mocked`. `rest` runs `test:provider-structure`,
`test:error-classifier-contract`, `test:bedrock-inference-profile`,
`test:bedrock-loop-characterization`, `test:sagemaker-streaming`,
`test:anthropic-loop-characterization`, `test:aistudio-loop-characterization`
and `verify:provider-onboarding`.

`test` splits three ways: `lint` (format-check, eslint), `validate`
(`validate:all`, the generated-API-docs currency check, `check:deps`) and
`types` (`check:ci-scripts`, `check:test-parse`, `check:tools-tests`, and both
builds).

The `pre-push` hook is a **different** set, not a subset: `check:deps`,
`build`, `test:provider-structure`, `test:model-manifests`.
`test:providers-mocked` is deliberately not among them — at 259s it dominated
push latency, and `provider-safety-net` already gates it on every PR.

Everything else in this directory runs when someone runs it, so a suite you
add here is not automatically a gate.

The MCP family (`mcp:*`) is split across five files: `mcp:infra` (no-API
classes), `mcp:spans` (tracing-attribute regression), `mcp:sdk` (live SDK
calls), `mcp:cli` (live CLI subprocess), `mcp:http` (HTTP transport). The
`test:mcp:full` chain runs all five in dependency order.

`autoresearch` is bundled with `test:live` because its live half hits
real providers; the e2e half checks `HAS_PROVIDER` and skips cleanly
without provider keys, but it is not invoked from `test:unit`. The separate
`autoresearch:redis` suite was removed with the unit suites.

## 3. Suite map

```
unit     bugfixes, mcp:infra, mcp:spans, tool-routing, tool-routing-cli,
         tool-dedup, model-pool, tool-routing-semantic, mcp-result-cache,
         model-not-found-retryable, archive:security, office:security,
         vector-chroma / vector-pgvector / vector-pinecone, provider-wiring

live     providers (incl. issue-03 fallback regression), mcp:http
         (HTTP-transport), mcp:sdk (SDK live API), mcp:cli (CLI
         subprocess + live API), observability (incl. tracing +
         telemetry-gaps + issue-04 absorbed), context (incl. issue-02 +
         issue-06 absorbed), memory (incl. session-memory-bugs absorbed),
         tool-reliability, evaluation (incl. evaluation-scoring absorbed),
         autoresearch (live half hits real providers)

product  media (image+video), tts, ppt, proxy

others   workflow, auth, client, rag, tasks, servers, middleware,
         new-providers, matrix — run individually or as needed.
         provider-matrix is the canonical capability sweep.
```

The full file inventory (35 files: root orchestrator + 34 per-domain
suites):

```
continuous-test-suite.ts                     (root orchestrator)
continuous-test-suite-auth.ts
continuous-test-suite-autoresearch.ts        (e2e + live)
continuous-test-suite-bugfixes.ts
continuous-test-suite-client.ts
continuous-test-suite-context.ts             (+ issue-02 + issue-06 absorbed)
continuous-test-suite-credentials.ts         (+ issue-01 absorbed)
continuous-test-suite-dynamic.ts
continuous-test-suite-evaluation.ts          (+ evaluation-scoring absorbed)
continuous-test-suite-hitl.ts                (human-in-the-loop workflow)
continuous-test-suite-mcp-cli.ts             (Part 4/4b — CLI live)
continuous-test-suite-mcp-http.ts            (HTTP transport)
continuous-test-suite-mcp-infra.ts           (Part 1/1b/1c — infrastructure, no API)
continuous-test-suite-mcp-sdk.ts             (Part 2/3/3b/3c — SDK live)
continuous-test-suite-mcp-spans.ts           (Part 6 — issue-05 spans)
continuous-test-suite-media-gen.ts
continuous-test-suite-memory.ts              (+ session-memory-bugs absorbed)
continuous-test-suite-middleware.ts
continuous-test-suite-new-providers.ts
continuous-test-suite-observability.ts       (+ tracing + telemetry-gaps + issue-04 absorbed)
continuous-test-suite-ppt.ts
continuous-test-suite-provider-matrix.ts     (canonical capability sweep)
continuous-test-suite-providers.ts           (+ issue-03 absorbed; testAllProvider* removed)
continuous-test-suite-proxy.ts
continuous-test-suite-rag.ts
continuous-test-suite-servers.ts
continuous-test-suite-tasks.ts
continuous-test-suite-tool-reliability.ts
continuous-test-suite-tts.ts
continuous-test-suite-voice.ts
continuous-test-suite-workflow.ts
```

## 4. Shared infrastructure

All suites route through `test/helpers/harness.ts`. No direct test runner
dependencies elsewhere.

| File                   | What                                                                                                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `harness.ts`           | **Canonical test runner.** `defineSuite(name)` returns `{ test, recordTest, runSuite, section, opts }`. Replaces ~5,500 lines of boilerplate that used to live in every suite.                                              |
| `providerMatrix.ts`    | Single source of truth for the 17 providers' capabilities — `text`, `streaming`, `tools`, `structuredOutput`, `structuredOutputWithTools`, `vision`, `embeddings`, `thinking`, `imageGeneration`, `videoGeneration`, `tts`. |
| `skipIf.ts`            | Capability-based skip helpers: `skipUnlessTools`, `skipUnlessVision`, `skipUnlessEmbeddings`, `skipUnlessProviderAvailable`, `skipUnlessRedis`, `skipUnlessLiteLLM`. Each throws `Skip` (caught by harness).                |
| `envGuard.ts`          | `skipIfEnvMissing(...vars)` and `isExpectedProviderError(msg)` — anchored 28-pattern matcher that promotes known credential/network errors into SKIP rather than FAIL.                                                      |
| `mcpHelpers.ts`        | Shared MCP test config (`TEST_CONFIG`, `INTER_TEST_DELAY_MS`, `buildBaseSDKOptions`, `runCommand`, fixture helpers) used across the seven `mcp-*` suites.                                                                   |
| `spanCapture.ts`       | `installSpanCapture()` — bootstraps an `InMemorySpanExporter` + `NodeTracerProvider` BEFORE NeuroLink is imported so all spans the production code emits are captured.                                                      |
| `fetchCapture.ts`      | `installFetchCapture()` — wraps `globalThis.fetch` to record outgoing request bodies; used by overflow-retry tests to verify pre-dispatch compaction.                                                                       |
| `largeConversation.ts` | `buildLargeConversationMessages({ targetTokens })` — generates real English prose to overflow a real provider's context window.                                                                                             |

The harness handles tri-state results (PASS / FAIL / SKIP), section
banners, colored output, summary table, `process.exit`, provider/model
resolution (argv → `NEUROLINK_TEST_PROVIDER` → `TEST_PROVIDER` →
defaults), skip-on-missing-env, and subprocess + temp-dir wrappers
(`runCLI`, `tempDir`).

`envGuard.ts` used to carry its own coverage self-check
(`envGuard.test.ts`), which was removed when the suites became
end-to-end only. Its SKIP patterns are now maintained by review — see the
warning at the top of `envGuard.ts` before changing them.

## 5. Writing a new suite

```typescript
#!/usr/bin/env tsx
import "dotenv/config";
import {
  defineSuite,
  assert,
  assertEqual,
  isExpectedProviderError,
  Skip,
} from "./helpers/harness.js";
import { skipUnlessProviderHas } from "./helpers/skipIf.js";

const { test, runSuite, opts } = defineSuite("My Suite");

await runSuite(async () => {
  await test("simple text generation", async () => {
    skipUnlessProviderHas(opts.provider!, "text");
    /* … */
  });

  await test("vision input", async () => {
    skipUnlessProviderHas(opts.provider!, "vision");
    /* … */
  });

  await test("rate-limit fallback", async () => {
    try {
      /* … */
    } catch (e) {
      if (isExpectedProviderError(String(e))) {
        throw new Skip("provider unavailable");
      }
      throw e;
    }
  });
});
```

That's the entire boilerplate. Add a matching `test:<name>` script to
`package.json` if you want a short alias.

## 6. Adding a new provider

1. Add an entry to `PROVIDERS` in `test/helpers/providerMatrix.ts`
2. Set the capability flags (default `false` — explicitly opt-in)
3. List the env vars required to consider the provider available
4. The capability-matrix runner (`pnpm run test:matrix`) picks it up
   automatically

Capability flags:

| Flag                        | Meaning                                              |
| --------------------------- | ---------------------------------------------------- |
| `text`                      | basic generation                                     |
| `streaming`                 | `stream()`                                           |
| `tools`                     | function calling                                     |
| `toolsWithStreaming`        | tool calls work mid-stream                           |
| `structuredOutput`          | Zod / JSON schema responses                          |
| `structuredOutputWithTools` | both at once (Gemini = `false` per CLAUDE.md rule 3) |
| `vision`                    | image input                                          |
| `embeddings`                | `embed()` / `embedMany()`                            |
| `thinking`                  | extended-thinking / reasoning                        |
| `imageGeneration`           | image OUT                                            |
| `videoGeneration`           | video OUT                                            |
| `tts`                       | text-to-speech                                       |

---

## 7. Local services (for live tests)

Several test suites exercise local OpenAI-compatible servers. They
cleanly SKIP when the service is not running, so CI never blocks on
them. To convert those SKIPs to PASS in your local run, start the
matching service from the list below before invoking the suite.

| Service   | Port  | SKIPs unblocked | Suites                                                            |
| --------- | ----- | --------------- | ----------------------------------------------------------------- |
| Ollama    | 11434 | 11              | `live-middleware`, `live-matrix` (ollama), `live-tasks` preflight |
| LM Studio | 1234  | 19              | `live-matrix` (lm-studio), `live-new-providers` (lm-studio tier)  |
| llama.cpp | 8080  | 18              | `live-matrix` (llamacpp), `live-new-providers` (llamacpp tier)    |

### Ollama

```bash
which ollama   # /usr/local/bin/ollama

ollama serve &                 # auto-binds to localhost:11434
ollama pull qwen2.5:0.5b       # default model the suite uses

curl -fsS http://127.0.0.1:11434/api/version
```

Override the model:

```bash
export OLLAMA_MODEL=qwen2.5:0.5b   # or any other locally-pulled model
```

### LM Studio

LM Studio is a desktop application — no headless install on macOS
without manual GUI interaction.

1. Open `LM Studio.app`
2. Switch to **Discover** and download a chat model (e.g.
   `qwen2.5-7b-instruct` or `llama-3.2-3b-instruct`)
3. Switch to **My Models** and load it
4. Switch to **Developer** (or **Server**) and click **Start Server**
5. The server listens on `http://localhost:1234/v1` by default

```bash
curl -fsS http://127.0.0.1:1234/v1/models | jq .data[].id
```

Overrides:

```bash
export LM_STUDIO_URL=http://localhost:1234/v1
export LM_STUDIO_API_KEY=lm-studio              # any non-empty placeholder
```

For C1 (image input) tests, load a vision-capable model — e.g.
`llava-1.5-7b-mmproj` or any GGUF with `*-vision-*` in the filename.
The suite's `looksLikeVisionModel()` predicate auto-detects.

### llama.cpp (`llama-server`)

```bash
which llama-server   # /opt/homebrew/bin/llama-server

mkdir -p ~/models && cd ~/models
curl -L -o qwen2.5-0.5b-instruct-q4_k_m.gguf \
  https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf

llama-server -m ~/models/qwen2.5-0.5b-instruct-q4_k_m.gguf --port 8080 &

curl -fsS http://127.0.0.1:8080/v1/models | jq .data[].id
```

For C1 vision tests, swap the GGUF for a multimodal one (e.g.
`llava-1.5-7b-q4_k_m.gguf` plus an `mmproj` file) and pass
`--mmproj <path>` to `llama-server`.

Overrides:

```bash
export LLAMACPP_URL=http://localhost:8080/v1
export LLAMACPP_API_KEY=llamacpp                # any non-empty placeholder
```

### Quick "all up" check

```bash
for url in \
  http://127.0.0.1:11434/api/version \
  http://127.0.0.1:1234/v1/models \
  http://127.0.0.1:8080/v1/models
do
  printf "%-50s " "$url"
  curl -fsS -o /dev/null -w "%{http_code}\n" "$url" || echo "(down)"
done
```

When all three return 200, local-service-dependent SKIPs convert to
either PASS (if the model + creds are right) or to a test-specific SKIP
with a more meaningful reason (e.g. "model declined to call tool").

---

## 8. SKIP triage

After the consolidation + SDK hardening pass, every suite ends in
`RESULT: PASS` (no FAIL). Remaining SKIPs fall into a small number of
categories with concrete operator action items below.

### Headline numbers

| Suite                 | Passed | Skipped | Failed | Notes                                                                                                          |
| --------------------- | -----: | ------: | -----: | -------------------------------------------------------------------------------------------------------------- |
| middleware            |      4 |       4 |      0 | 4 SKIPs need a tool-trained Ollama model                                                                       |
| client                |      9 |       4 |      0 | React-hook detection now PASSes                                                                                |
| context               |     59 |       0 |      0 | Schema-with-3+Images now PASS                                                                                  |
| evaluation            |     18 |       0 |      0 |                                                                                                                |
| credentials           |     15 |       0 |      0 | All providers honor per-call & instance-level credentials                                                      |
| rag                   |     96 |       4 |      0 | Files-API sub-suites unblocked by FIXTURES_DIR / fixture-loader fix                                            |
| tasks                 |     60 |       2 |      0 | checkAIProvider now tries multi-provider                                                                       |
| memory                |     20 |       1 |      0 | Test 21 SKIPs only when LLM declines tool (model variance)                                                     |
| observability         |     47 |       0 |      0 | Includes tracing + telemetry-gaps + issue-04                                                                   |
| mcp:full (7 suites)   |    250 |       3 |      0 | 3 documented legitimate SKIPs across 7 sub-suites                                                              |
| autoresearch          |     17 |       0 |      0 | E2E + live half — full coverage                                                                                |
| autoresearch:redis    |     14 |       0 |      0 |                                                                                                                |
| media                 |     18 |       0 |      0 |                                                                                                                |
| tts                   |     15 |       0 |      0 |                                                                                                                |
| ppt                   |     16 |       0 |      0 |                                                                                                                |
| providers             |     28 |       5 |      0 | OpenRouter SKIPs cleared after default-model bump                                                              |
| servers               |     40 |       0 |      0 | Hono + Express + Fastify + Koa adapters                                                                        |
| workflow              |     15 |       0 |      0 | Includes HITL + checkpointing                                                                                  |
| matrix (16 providers) |     49 |      16 |      0 | All 16 SKIPs operator-action: Anthropic credit, Bedrock STS expired, Azure deployment name, OpenRouter credits |
| new-providers         |     62 |      11 |      0 | After llama-3.2-3b loaded on LM Studio + llama-server                                                          |

### Categories of remaining SKIPs

| Category                                   | Count | Action                                                                                                            |
| ------------------------------------------ | ----: | ----------------------------------------------------------------------------------------------------------------- |
| Provider credentials (refill / rotate)     |   ~42 | Operator: refill OpenAI, refresh Anthropic OAuth, rotate Bedrock STS, verify Azure deployment, rotate LiteLLM key |
| OpenRouter env-pinned to retired model     |     9 | Operator: remove `OPENROUTER_MODEL` from `.env` or repoint to a stable free model                                 |
| Local services not running                 |   ~32 | Operator: start Ollama / LM Studio / llama.cpp per §7                                                             |
| LM Studio MLX engine missing libpython3.11 |     ~ | Operator: install Python 3.11 system-wide so qwen3-vl-4b loads                                                    |
| NIM upstream policy quirks                 |     ~ | Track separately — NIM accepts deliberately-invalid keys / inconsistent rate-limit shape                          |
| Browser-only React hooks invocation        |     1 | Test: add `jsdom` + `@testing-library/react`, replace SKIP with rendered hook test                                |
| `launchd`-managed proxy daemon collision   |    15 | **Won't fix** — the local box has `com.neurolink.proxy` registered; CI hosts don't, so CI is green                |
| RAGAS / RetryManager internal-only         |     3 | **Won't fix as live tests** — move to `unit-evaluation-internals.test.ts` if internal coverage wanted             |

### Operator action checklist

After credential refresh + local services up, run:

```bash
pnpm run test:matrix       # ~16 SKIPs flip to PASS
pnpm run test:providers    # ~5 SKIPs flip to PASS (OpenRouter)
pnpm run test:credentials  # ~2 SKIPs flip to PASS (LiteLLM)
```

The `new-providers` floor of 11 SKIPs needs either (a) a vision-capable
local model loaded (LM Studio MLX engine fix) or (b) NIM upstream policy
changes — neither is a code change in this repo.

---

## 9. Migration history (appendix)

This section explains _why_ the suite is structured the way it is. Pure
historical reference — the work has shipped.

### Pre-migration state

Before consolidation, the suite was 38 ad-hoc files with five problems:

1. **~5,500 LOC of boilerplate** copy-pasted across every file
   (colored output, test recorder, summary block).
2. **Three duplicate copies** of `test_observability_spans` (~900 LOC).
3. **`runCommand` had two divergent implementations** in 11 files; the
   `observability.ts` variant had no spawn-error guard, causing silent
   hangs when `npx` was missing.
4. **Drift in `isExpectedProviderError`** patterns — 4 patterns
   (`permission denied`, `403`, `failed to`, `not found`) lived only in
   `credentials.ts`.
5. **8 suites had provider/model coupling** bleeding into test bodies
   (worst: providers, tasks, suite.ts, context, bugfixes).

### What landed

| Change                                                | Result                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared harness extracted                              | `test/helpers/harness.ts` — `defineSuite()`, `Skip`, `runSuite()`, asserts, color/log primitives, `runCLI` / `tempDir`, parseArgs                                                                                                                                                                                          |
| 9 mergers                                             | session-memory-bugs → memory; evaluation-scoring → evaluation; issue-01 → credentials; issue-03 → providers; issue-02 + issue-06 → context; tracing + telemetry-gaps + issue-04 → observability; issue-05 + mcp-output-limits → mcp; autoresearch-e2e + autoresearch-live → autoresearch; root image-gen dedup → media-gen |
| `mcp.ts` (6,419 LOC) split                            | Seven files: `mcp-{infra,bash,cli,http,output-limits,sdk,spans}.ts` + shared `helpers/mcpHelpers.ts`                                                                                                                                                                                                                       |
| `testAllProviderGenerate/Stream` removed              | Replaced by `provider-matrix.ts` runner — broader coverage (17 providers × 12 capabilities)                                                                                                                                                                                                                                |
| Drift bugs fixed                                      | `runCommand` spawn-guard unified, `isExpectedProviderError` patterns folded into `envGuard.ts`, `colors` definitions normalized                                                                                                                                                                                            |
| 3 duplicate `test_observability_spans` copies removed | −480 LOC of pure duplication                                                                                                                                                                                                                                                                                               |
| **Net effect**                                        | 38 → 32 files, ~−4,800 LOC of boilerplate eliminated, all suites route through one harness                                                                                                                                                                                                                                 |

### Two mergers intentionally skipped

- **`mcp-http.ts` → `mcp.ts`** — `mcp-http.ts` is 57 KB of MCP-over-HTTP
  transport-specific tests. After absorbing issue-05 and
  mcp-output-limits, `mcp.ts` was already 6,420 lines. The right path was
  to _split_ `mcp.ts` into smaller per-section files first, which is what
  happened. `mcp-http.ts` slots in naturally as the seventh "MCP family"
  file.
- **`autoresearch-redis.ts` → `tasks.ts`** — self-contained
  Redis-integration suite (14 tests covering serialization + file/Redis/
  BullMQ stores). Mixing with general task tests would muddy semantics
  and orphan the rest of the file. Kept standalone; later removed with the
  unit suites (CLAUDE.md rule 15).

### SDK fixes shipped during the verification sweep

These changes hardened five providers against issues surfaced by the
live test runs:

1. **Google `function_declarations` name sanitizer**
   (`googleNativeGemini3.ts`) — MCP-imported or user-registered tool
   names that don't match Google's `[A-Za-z_][A-Za-z0-9_.:-]{0,127}`
   regex are mapped to compliant names before sending. Applied at both
   the native `@google/genai` path and the AI-SDK path. Logs a warning
   on rename.
2. **Azure AI Foundry endpoint support** (`azureOpenai.ts`) —
   `*.services.ai.azure.com` hosts now route through `baseURL:
"<host>/openai"` to `createAzure()`. Previously the SDK appended
   `.openai.azure.com` to the resource subdomain, producing the bad URL
   `<host>.services.ai.azure.com.openai.azure.com` (DNS error).
3. **OpenRouter default model bump** — `anthropic/claude-3-5-sonnet`
   was retired and now 404s. Default bumped to
   `anthropic/claude-3.7-sonnet` across `openRouter.ts`,
   `providerRegistry.ts`, `modelChoices.ts`, and `enums.ts`. The
   `OpenRouterModels.CLAUDE_3_5_SONNET` enum entry has been dropped —
   the model is not reachable through any OpenRouter endpoint anymore,
   so callers importing it by name must update to
   `CLAUDE_3_7_SONNET` (or one of the 4.x entries).
4. **DeepSeek + NIM → `@ai-sdk/openai-compatible`** — the default
   `@ai-sdk/openai` unconditionally sends `response_format:json_schema`
   which DeepSeek rejects; `openai-compatible` falls back to
   `json_object`. Adds DeepSeek `transformRequestBody` hook injecting
   "json" into the prompt when `json_object` is active. NIM
   `stripFieldFromJsonBody` retry shed
   `chat_template_kwargs.reasoning_budget` / top-level `chat_template`
   on both stream and generate paths.
5. **`reasoning_content` plumbing** — DeepSeek-reasoner CoT and NIM
   reasoning models now surface through the full result chain
   (`GenerationHandler` → `TextGenerationResult` → `GenerateResult`)
   at all three build sites.
6. **Per-call credentials kebab-case fix**
   (`factories/providerFactory.ts`) — `credentialKeyMap` now includes
   `lm-studio → lmStudio` and `nvidia-nim → nvidiaNim`, so per-call
   `credentials.lmStudio.baseURL` actually overrides the default URL.
7. **Lifecycle callback wrap for raw-fetch streams**
   (`baseProvider.ts` + `lifecycle.ts`) — `wrapStreamWithLifecycleCallbacks`
   fires `onChunk` / `onFinish` / `onError` for providers (Ollama,
   llama.cpp `/v1`) that bypass AI SDK middleware. `__lifecycleErrorFired`
   marker prevents double-fire when the SDK-level catch also handles
   the error.

### Test-helper resilience improvements

`envGuard.ts` was extended to anchor SKIP patterns for vendor-specific
gateway responses observed during the live sweep:

- NIM Bad Request gateway responses
- OpenAI quota-exceeded + streaming-with-tools wrapper
- LM Studio / llama.cpp unreachable
- Azure deployment missing
- Google `function_declarations` name invalid
- DeepSeek / OpenAI tool-schema rejection
- Anthropic `Not Found`
- Transient HTTP `410 / 500 / 502 / 503` reason phrases
- Rate-limit phrases (`429`, `rate limit`, `rate-limit`,
  `rate_limited`, `too many requests`) — promoted from auth-only to
  transport-always-skip

`envGuard.test.ts` was the unit suite enforcing the patterns don't
overmatch real bug strings. It was removed with the rest of the unit
suites; the patterns are now review-maintained.

### Verified end-state

| Check                                       | Result                                                |
| ------------------------------------------- | ----------------------------------------------------- |
| `pnpm run check` (typecheck, 3,632 files)   | 0 errors / 0 warnings                                 |
| `pnpm run lint`                             | 0 errors / 19 pre-existing warnings (none in `test/`) |
| `pnpm run build` (vite + prepack + publint) | clean                                                 |
| All 32 consolidated suites                  | **0 FAILs**                                           |
| `new-providers`                             | 62 PASS / 11 SKIP / 0 FAIL                            |

Remaining SKIPs are operator-action (credentials / local services) or
upstream policy quirks (NIM gateway, LM Studio MLX engine on macOS) —
not migration regressions and not test-design issues.

# Shared Agentic Loop Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the nine independently hand-rolled agentic tool-calling loops living inside four native providers (direct Anthropic, Google AI Studio, Google Vertex ×4, Amazon Bedrock ×2) with one adapter-parameterized engine (`runAgenticLoop`) plus two merged low-level primitives (a unified stream channel, a unified native tool-declaration converter), migrating each provider one commit at a time behind a characterization test that pins its current, provider-specific behavior before the code moves.

**Architecture:** `runAgenticLoop(adapter, options)` in `src/lib/core/loopEngine.ts` owns everything that is genuinely shared across all native loops — the maxSteps-bounded step loop, generic tool dispatch with an opt-in TOOL_NOT_FOUND/failure-strike breaker, per-step usage accumulation, stop-reason resolution, chunk emission through the new `streamChannel.ts` primitive, an optional malformed-call retry budget, and a pre-first-chunk 429/5xx `withProviderRetry` wrap around every `adapter.executeStep()` call (unconditional, adapter-agnostic — see Task 3 Step 3). Everything that is genuinely provider-specific — building the wire request, issuing the SDK/HTTP call and parsing its response incrementally, serializing tool results back into the provider's conversation format, mapping the provider's raw stop/finish reason, and (for Anthropic-family adapters) prompt-cache breakpoints and in-turn context reclaim — lives behind a small `AgenticLoopAdapter` interface, with one adapter implementation per wire protocol (`AnthropicLoopAdapter`, `GeminiLoopAdapter`, `BedrockLoopAdapter`), each adapter reused across every client that speaks that protocol (native Anthropic AND Vertex+Claude share `AnthropicLoopAdapter`; Google AI Studio AND Vertex+Gemini share `GeminiLoopAdapter`).

**Tech Stack:** TypeScript (strict, ESM/NodeNext), `@anthropic-ai/sdk` (Messages streaming), `@google/genai` (native Gemini 3 SDK), `@aws-sdk/client-bedrock-runtime` (`ConverseCommand`/`ConverseStreamCommand`), Vercel AI SDK `Tool`/`LanguageModel` types, test harness `test/helpers/harness.ts` run via `npx tsx`.

**Spec:** This plan argues from ground-truth code reads (file:line citations throughout) plus four audit-area reports (session scratchpad, not repo-tracked — copy alongside this plan or re-derive from the cited code if the scratchpad has been cleaned up by the time this plan is executed):

- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/04-cloud-enterprise-provider-family-googlevertex-amaz.md` (googleVertex, amazonBedrock, amazonSagemaker, azureOpenai)
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/03-native-sdk-provider-family-anthropic-openai-google.md` (anthropic, openai, googleAiStudio, googleNativeGemini3)
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/09-cross-cutting-provider-concerns-tools-mcp-injectio.md` (tool merging, structuredOutputPolicy, error normalization, retries)
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/01-baseprovider-the-abstract-contract-every-provider-.md` (BaseProvider's abstract contract and `stream()` orchestration)

Every claim about "current behavior" below was verified by reading the actual file at the cited line, not by trusting the spec summaries — several spec-stated facts were corrected during that verification (noted inline where it matters: the `createChunkQueue` importer count, the location of the TOOL_NOT_FOUND breaker, and the discovery of two additional bespoke streaming primitives the spec didn't mention).

---

## Global Constraints

- pnpm ONLY. `pnpm run check` / `pnpm run lint` / `pnpm run build`. Tests via `npx tsx test/continuous-test-suite-<name>.ts` + `test:<name>` scripts.
- TEST HARNESS SKIP HAZARD: NEVER interpolate payloads into assertion messages; break-one-assertion sanity step for new suites.
- Repo rules: ALL types in src/lib/types/ (the adapter type goes there); no `interface`; unique exported type names; types barrel `export *` only; barrel-only internal type imports; no double assertions; named exports only. Public SDK behavior must not change (stream chunk shapes, tool events, usage fields, finishReason values all preserved).
- Conventional commits; commit per migration; NEVER `git push`.
- CONSUMED contract (plan 07, lands first): `classifyProviderError` in src/lib/utils/errorClassifier.ts + `ProviderErrorRule` in types/errors.ts (each migrated provider's `formatProviderError`, already on this contract from plan 07, keeps wrapping whatever `runAgenticLoop` throws — untouched by this plan). `withProviderRetry` (utils/providerRetry.ts:169 — real positional signature `(operation, span, label, sleep?)`, NOT an options object) is built into `runAgenticLoop` itself: **every** `adapter.executeStep()` call is wrapped by the engine (Task 3 Step 3), gated by a per-step `hasEmitted` flag so a step that has already pushed at least one chunk to the stream channel is never retried, even if the eventual error is otherwise retryable. This is engine-owned, adapter-agnostic logic — no adapter implements or opts into it individually. See Task 3 Step 3 and Task 4 Step 1's retry characterization test.

---

## Verified Facts This Plan Relies On

Read directly from source (not inferred from the spec docs) during planning. Every task below cites the specific line again inline where it edits that code, but the cross-cutting facts that shaped the adapter design are collected here once:

1. **`createChunkQueue`** is defined at `src/lib/providers/openaiChatCompletionsClient.ts:804` — `{ pushChunk, nextChunk }`, single-producer/single-consumer, `{done:true}`-in-band sentinel. It has **three** importers, not the eight the spec estimated: `openaiChatCompletionsClient.ts` (its own definition), `openaiChatCompletionsBase.ts`, and `src/lib/providers/anthropic/client.ts`.
2. **`createTextChannel`** is defined at `src/lib/providers/googleNativeGemini3/utils.ts:886` — `{ push, close, error, iterable }`, out-of-band close/error signaling (no sentinel value flows through `iterable`). Imported by `googleAiStudio/client.ts` and by `googleVertex/client.ts` for its **Vertex+Claude** loops only (`googleVertex/client.ts:119,4942`).
3. **Two additional bespoke streaming primitives exist that neither original spec mentioned**, discovered while reading the loop bodies directly:
   - **Amazon Bedrock's `streamingConversationLoop`** (`amazonBedrock/client.ts:1449`) builds its own `new ReadableStream({ start: async (controller) => {...} })` by hand — a third independently-invented primitive.
   - **Vertex+Gemini's `executeNativeGemini3Stream`** (`googleVertex/client.ts:1854`) does not use `createTextChannel` at all despite importing it (that import is used only by the sibling Vertex+Claude functions). It instead buffers every text part into a plain `const incrementalTextChunks: string[] = []` array (`client.ts:2293`, appended at `:2443`) for the **entire** tool loop, and only after the whole loop finishes wraps the array in a trivial `async function* createTextStream()` (`client.ts:3050-3056`) that replays it. This means **Vertex+Gemini's "stream" today is not actually concurrent with a consumer** — the caller's `await this.executeStream(...)` in `BaseProvider.stream()` (`core/baseProvider.ts:403`) blocks until the whole multi-step tool loop is done, and the "streaming" is faked after the fact purely so the CLI's chunk-count smoke test sees more than one chunk. Every other migrated provider (Anthropic, Bedrock's `streamingConversationLoop`, AI Studio) runs its loop as a detached background promise and returns the channel/queue's `iterable` immediately for genuine incremental consumption.
   - Task 1 stays scoped to literally merging the two **named, already-shared** primitives (`createChunkQueue`, `createTextChannel`) and their real importers, per the assignment. The other two bespoke primitives are not force-fit into Task 1; they are naturally replaced when Task 6 (Vertex) and Task 7 (Bedrock) migrate those loops onto the engine, which uses the new `streamChannel.ts` internally. Task 6 also fixes Vertex+Gemini's buffered-then-replayed non-concurrency as a natural side effect of moving onto the engine's background-loop model — flagged explicitly in Risks & Rollback as an intentional, low-risk behavior improvement (chunk _timing_ changes, chunk _shape/count-invariant_ does not: the public contract only promises "more than one chunk for non-trivial output," which still holds).
4. **The TOOL_NOT_FOUND breaker with failure-strike counting is NOT unique to the Gemini family** — this was the single factual error caught and corrected during self-review, and it matters enough to spell out. `executeNativeToolCalls` in `googleNativeGemini3/utils.ts:1091-1265` (driven by a `Map<string, {count, lastError}>` and `DEFAULT_TOOL_MAX_RETRIES`, `src/lib/core/constants.ts:120`, value `2`) is shared by Google AI Studio and Vertex+Gemini, as expected. But **Vertex+Claude independently ports the exact same pattern** — a hand-rolled `failedTools = new Map<string, {count, lastError}>()` inside both `executeNativeAnthropicStream` (`googleVertex/client.ts:5096`, gated at `:5438-5441`) and `executeNativeAnthropicGenerate` (`client.ts:6668`+), each gated against the **same shared** `DEFAULT_TOOL_MAX_RETRIES` constant imported from `core/constants.ts` (not a Vertex-local copy). The code comments at both sites say so explicitly: `client.ts:5435` reads "Consecutive-failure breaker (ports the Gemini loops' failedTools map)". Only **native (direct) Anthropic and Bedrock** genuinely lack any strike-counting breaker — both do a plain per-call `throw`/`catch` that becomes a single error tool-result with no cross-step memory (Anthropic: `client.ts:2349-2350`, confirmed via `grep -n "TOOL_NOT_FOUND\|failedTools\|breaker\|strike" anthropic/client.ts` → zero hits; Bedrock: `executeSingleTool`, `client.ts:~891`, confirmed via the same grep against `amazonBedrock/client.ts` → zero hits). **Consequence for the adapter design:** `AnthropicLoopAdapter` is shared by native Anthropic and Vertex+Claude (same factory, `createAnthropicLoopAdapter`), but the breaker is an opt-in field on the adapter object the factory returns — so the two call sites of that one factory must pass different `toolFailureBreaker` arguments. Getting this wrong would silently regress Vertex+Claude's tool-failure behavior during migration (a permanently-failing tool would loop forever instead of tripping the breaker) while looking like a correct "shared adapter" refactor. See Task 4 Step 2 and Task 6 Step 3.
5. **Malformed-function-call retry exists in exactly one loop family**: Vertex+Gemini only, duplicated verbatim in both `executeNativeGemini3Stream` (`client.ts:2520-2555`) and `executeNativeGemini3Generate` (`client.ts:3797-3830+`) — a `malformedRetryCount` local, capped at 1, that re-issues the step with a corrective user-turn note when `stepFinishReason === "MALFORMED_FUNCTION_CALL"` and the step produced neither text nor tool calls. **Google AI Studio does not have this retry** (confirmed: `grep -n "MALFORMED_FUNCTION_CALL\|malformed" googleAiStudio/client.ts` → zero hits) despite AI Studio and Vertex+Gemini otherwise sharing `googleNativeGemini3/utils.ts`. This is a genuine pre-existing behavioral asymmetry between the two Gemini surfaces, not a bug this plan is asked to fix — see Risks & Rollback for why it is preserved, not harmonized, during migration.
6. **In-turn context-budget reclaim** has two independently-shaped implementations: Anthropic's `planAnthropicLoopReclaim` (pure planning function, called each step with `{conversation, availableInputTokens, fixedOverheadTokens, observedPromptTokens, previousSentEstimate, onSentEstimate}`, returns a truthy plan or `undefined`; `anthropic/client.ts:~2016-2096`) vs the Gemini family's stateful `createContextGuard` object (`noteUsage`/`noteAppendedChars`/`shouldStop`/`resetAfterReclaim`; `googleNativeGemini3/utils.ts:1603-1660`) paired with a separate mutation function per client (`reclaimVertexLoopContext`, `reclaimAiStudioContext`). **Bedrock has neither** (confirmed via grep — zero hits for `planReclaim|ContextGuard|reclaim`). Vertex+Claude reuses Anthropic's `planAnthropicLoopReclaim` (`googleVertex/client.ts:83,920`) but has its **own** prompt-cache breakpoint function, `applyVertexAnthropicCacheBreakpoints` (`utils/anthropicCacheBreakpoints.js`, called at `googleVertex/client.ts:5190,5842,5974,6755,7273,7393`) — **not** native Anthropic's `applyAnthropicHistoryCacheBreakpoints`/`countAnthropicCacheMarkers`. The two cache-breakpoint functions are conceptually identical but textually separate; the `AnthropicLoopAdapter` factory closes over whichever one matches its client rather than the engine choosing between them.
7. **Native tool-declaration conversion to the `input_schema` (Anthropic) wire shape is duplicated three times**, not two: `toolsToAnthropic` (`anthropic/client.ts:575`, used by the streaming loop), an inline `.filter().map()` inside `getAISDKModel()`'s `doGenerate` closure (`anthropic/client.ts:1407-1422`, the SAME file, a second near-duplicate), and a private per-tool builder on `GoogleVertexProvider` producing `VertexAnthropicTool` (`googleVertex/client.ts:~1755-1780`, used by both `executeNativeAnthropicStream` and `executeNativeAnthropicGenerate`). Conversion to the `functionDeclarations` (Gemini) wire shape has one well-built shared implementation already — `buildNativeToolDeclarations` (`googleNativeGemini3/utils.ts:~520-607`, sanitizes tool names against Google's function-name regex, builds an `executeMap` + `originalNameMap`, supports mid-turn hydration via the sibling `refreshNativeToolDeclarations`) — called correctly by Google AI Studio (`googleAiStudio/client.ts:908`) but **not** by Vertex+Gemini, which hand-rolls its own simpler per-tool loop twice (`googleVertex/client.ts:2041-2098` and `:3340-3399+`) that lacks the sanitization and mid-turn hydration AI Studio gets for free.
8. **`BaseProvider.stream()`** (`core/baseProvider.ts:300-475`) has three branches — file/video-frame fake streaming, image-model fake streaming, and the real path (central tool merge at `:388-393`, then `await this.executeStream(options, analysisSchema)` at `:403`, with fallback to fake streaming only for a narrow set of transient error strings). `executeStream` (`:1937`) and `getAISDKModel` (`:1956`) are both `protected abstract` — **there is no default implementation today**, confirmed by reading the full `stream()` body: it calls `this.executeStream(...)` unconditionally with no fallback branch that would call `getAISDKModel().doStream()` directly. This is the exact gap Task 8 closes.
9. **`SageMakerLanguageModel.doStream`** (`providers/sagemaker/language-model.ts:374-533`) is a complete, working AI-SDK-shaped implementation — it calls `invokeEndpointWithStreaming`, wraps the response via `createSageMakerStream` (`providers/sagemaker/streaming.ts:36`), and gracefully falls back to a synthetic `ReadableStream` (via `doGenerate` + `createTextChunkIterator`) if true streaming fails. It returns `{ stream: ReadableStream<{type:"text-delta"|"finish", ...}>, rawCall, rawResponse, request, warnings }` — never throws for "not implemented." Meanwhile `AmazonSageMakerProvider.executeStream` (`providers/amazonSagemaker.ts:120-152`) unconditionally throws `SageMakerError("SageMaker streaming not yet fully implemented...")` before ever touching `doStream`. `getAISDKModel()` (`amazonSagemaker.ts:112-118`) already returns `this.sagemakerModel`, a `SageMakerLanguageModel` instance — so the working `doStream` is one property access away from the broken `executeStream` override the whole time.

---

## Loop-Feature × Provider Mapping Table

The ground truth the `AgenticLoopAdapter` design is built from. "Engine (opt-in)" means the feature moves into `loopEngine.ts` as generic logic gated by an adapter-supplied flag/hook so migrated behavior is bit-for-bit identical to today; "Adapter" means the feature is provider-specific wire logic that stays behind a hook.

| Feature                                 | Anthropic (native)                                                                                            | Vertex+Claude                                                                                                                                                                                            | Google AI Studio                                                                                 | Vertex+Gemini                                                                                                                   | Amazon Bedrock (generate)                                                                                           | Amazon Bedrock (stream)                                      | Lands as                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxSteps` cap                          | `options.maxSteps \|\| DEFAULT_MAX_STEPS` (`anthropic/client.ts:~1887`)                                       | same via shared options                                                                                                                                                                                  | `computeMaxSteps()` clamps to `GEMINI3_NATIVE_MAX_STEPS=100` (`utils.ts:734-744`)                | same `computeMaxSteps()`                                                                                                        | **hardcoded `maxIterations = 10`**, ignores `options.maxSteps` (`amazonBedrock/client.ts:369` — a pre-existing bug) | `options.maxSteps \|\| DEFAULT_MAX_STEPS` (`client.ts:1455`) | Engine: one `resolveMaxSteps(adapter, options)` used by every step call — fixes Bedrock generate's inconsistency as a side effect of unification (flagged in Risks)                                                                                                                                                                                                                                                                                                          |
| TOOL_NOT_FOUND / failure-strike breaker | ✗ (plain throw → 1 error tool_result, no memory; `client.ts:2349`)                                            | ✓ own `failedTools` Map, ports Gemini's breaker semantics against the **same shared** `DEFAULT_TOOL_MAX_RETRIES` (`client.ts:5096,5438-5441` stream; `:6668+` generate) — diverges from native Anthropic | ✓ `executeNativeToolCalls` (`utils.ts:1091`)                                                     | ✓ same fn                                                                                                                       | ✗ (plain throw; `client.ts:~891`)                                                                                   | ✗ (plain throw)                                              | Engine (opt-in): `adapter.toolFailureBreaker?: {maxRetries:number}`. Set for both Gemini adapters **and** the Vertex+Claude call to `createAnthropicLoopAdapter` (`{maxRetries: DEFAULT_TOOL_MAX_RETRIES}`); **left unset** only for the native-Anthropic call to that same factory and for both Bedrock adapters, to preserve current behavior exactly per client                                                                                                           |
| Malformed-function-call retry           | n/a (no such concept in Claude's tool-call wire format)                                                       | n/a                                                                                                                                                                                                      | ✗ (confirmed absent)                                                                             | ✓ one retry, capped at 1 (`client.ts:2520-2555`, `:3797+`)                                                                      | n/a                                                                                                                 | n/a                                                          | Engine (opt-in): `adapter.isMalformedStep?(stepResult)` + `adapter.buildMalformedRetryNote?()`, single retry budget owned by the engine. Only `GeminiLoopAdapter(vertexClient)` sets it                                                                                                                                                                                                                                                                                      |
| In-turn context reclaim                 | ✓ `planAnthropicLoopReclaim` (`client.ts:~2016-2096`)                                                         | ✓ same fn (`client.ts:920`)                                                                                                                                                                              | ✓ `createContextGuard` + `reclaimAiStudioContext` (`client.ts:1008,1023`)                        | ✓ `createContextGuard` + `reclaimVertexLoopContext` (`client.ts:2349-2371`)                                                     | ✗                                                                                                                   | ✗                                                            | Engine calls `adapter.planReclaim?(conversation, step)` once per step before `buildStepRequest`; adapter closes over its own guard/plan state. Unset for Bedrock adapter                                                                                                                                                                                                                                                                                                     |
| Turn clock (deadline + stall watchdog)  | ✗ (only a flat per-request timeout via `createTimeoutController`, no stall detection)                         | ✓ `createTurnClock` (`client.ts:4573` region, mirrors Gemini)                                                                                                                                            | ✗ (confirmed absent — no `createTurnClock`/`stallTimeoutMs` usage in `googleAiStudio/client.ts`) | ✓ `createTurnClock` (`client.ts:2308-2323`)                                                                                     | ✗                                                                                                                   | ✗                                                            | Engine always constructs a turn clock via the (already generic) `createTurnClock`; `adapter.defaultTurnTimeoutMs` supplies the pre-existing per-family flat timeout as the deadline default, `stallTimeoutMs` stays `undefined` unless the adapter opts in. **Preserved per-adapter exactly as today** — AI Studio's adapter does not set a stall timeout even though the engine now supports one, so behavior is unchanged. Harmonizing this gap is explicitly Out of Scope |
| Prompt-cache breakpoints                | ✓ `applyAnthropicHistoryCacheBreakpoints`/`countAnthropicCacheMarkers`, 4-marker cap (`client.ts:~2098-2113`) | ✓ own fn `applyVertexAnthropicCacheBreakpoints` (`utils/anthropicCacheBreakpoints.js`)                                                                                                                   | n/a (Gemini has no cache-breakpoint concept)                                                     | n/a                                                                                                                             | n/a                                                                                                                 | n/a                                                          | Adapter-only (`AnthropicLoopAdapter.buildStepRequest`) — the two breakpoint functions are injected per adapter-factory instance, engine never sees them                                                                                                                                                                                                                                                                                                                      |
| Per-step usage accumulation             | ✓ write-through delta pattern on `message_start`/`message_delta` (`client.ts:~2150-2236`)                     | ✓ same shape                                                                                                                                                                                             | ✓ `collectStreamChunksIncremental` (`utils.ts:968`)                                              | ✓ same, inline (`client.ts:2451-2507`)                                                                                          | ✓ via `analytics` promise post-drain (no top-level `usage` key by design — `client.ts:~1449` comment)               | ✓ same                                                       | Engine: `AgenticLoopStepResult.usage` returned per step by `adapter.executeStep`; engine sums across steps once, in one place                                                                                                                                                                                                                                                                                                                                                |
| Stop-reason / finish-reason mapping     | `mapAnthropicStopReason`                                                                                      | same                                                                                                                                                                                                     | n/a (uses Gemini mapper)                                                                         | `mapGeminiFinishReason` (`utils.ts:766-785`) — `MALFORMED_FUNCTION_CALL`/`UNEXPECTED_TOOL_CALL` → `"error"`, not `"tool-calls"` | inline branch in `handleBedrockResponse` (`client.ts:703+`)                                                         | inline in `handleStreamStopReason` (`client.ts:2131`)        | Adapter-only: `adapter.mapFinishReason(rawStopReason)`                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Stream chunk emission                   | `createChunkQueue` (background loop + `pushChunk`/`nextChunk`)                                                | `createTextChannel` (background loop)                                                                                                                                                                    | `createTextChannel` (background loop)                                                            | **buffer-then-replay array**, not concurrent (see Verified Fact 3)                                                              | bespoke `ReadableStream` (background, `start()`)                                                                    | bespoke `ReadableStream` (background, `start()`)             | All migrate onto `streamChannel.ts`; engine owns the channel, adapters only call `channel.push(text)` from inside `executeStep`                                                                                                                                                                                                                                                                                                                                              |

---

## Task 1: Shared stream channel primitive

**Files:**

- Create: `src/lib/core/streamChannel.ts`
- Create: `test/continuous-test-suite-loop-engine.ts` (new suite; this task adds the streamChannel section, later tasks append to the same file)
- Modify: `src/lib/providers/openaiChatCompletionsClient.ts` (replace `createChunkQueue` usage, delete the definition)
- Modify: `src/lib/providers/openaiChatCompletionsBase.ts` (replace `createChunkQueue` usage)
- Modify: `src/lib/providers/anthropic/client.ts` (replace `createChunkQueue` usage — mechanical swap only; the loop body itself is untouched here and gets replaced wholesale in Task 4)
- Modify: `src/lib/providers/googleNativeGemini3/utils.ts` (replace `createTextChannel` usage inside `collectStreamChunksIncremental`, delete the `createTextChannel` definition; keep `collectStreamChunksIncremental`'s signature — it still takes a channel-shaped object)
- Modify: `src/lib/providers/googleAiStudio/client.ts` (swap `createTextChannel()` call → `createStreamChannel()`)
- Modify: `src/lib/providers/googleVertex/client.ts` (swap `createTextChannel()` call → `createStreamChannel()` at its one call site, `:4942`)
- Modify: `package.json` (add `test:loop-engine` script)

**Interfaces:**

```typescript
// src/lib/types/streaming.ts (new file in the canonical types folder — rule 2/8)
export type StreamChannel<T = { content: string }> = {
  push(value: T): void;
  close(): void;
  error(err: unknown): void;
  readonly iterable: AsyncIterable<T>;
};
```

- [ ] **Step 1: Write the failing characterization test for the merged channel's behavior**

  Both legacy primitives must be provably subsumed: `createChunkQueue`'s pull-based two-function shape and `createTextChannel`'s push-based four-property shape both reduce to "push values in, drain them via `for await`, `close()`/`error()` end the iteration." Write the test first, against the not-yet-existing module, so it fails for the right reason (module not found) before implementation.

  Create `test/continuous-test-suite-loop-engine.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Continuous Test Suite: shared agentic-loop engine primitives (no API).
   *
   * Section 1 covers `streamChannel.ts`, the primitive that replaces the two
   * independently-invented stream-chunk primitives `createChunkQueue`
   * (openaiChatCompletionsClient.ts) and `createTextChannel`
   * (googleNativeGemini3/utils.ts). Later sections (added by later tasks in
   * this plan) cover `nativeToolFormat.ts` and `loopEngine.ts`.
   *
   * Runner: `npx tsx test/continuous-test-suite-loop-engine.ts`
   * (package.json: `pnpm run test:loop-engine`).
   */
  import "dotenv/config";

  import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
  import { createStreamChannel } from "../src/lib/core/streamChannel.js";

  const { test, runSuite } = defineSuite("Agentic loop engine primitives");

  async function drain<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const out: T[] = [];
    for await (const value of iterable) {
      out.push(value);
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // streamChannel: push/drain ordering
  // ---------------------------------------------------------------------------

  await test("streamChannel delivers pushed values in order then closes", async () => {
    const channel = createStreamChannel<{ content: string }>();
    channel.push({ content: "a" });
    channel.push({ content: "b" });
    channel.close();
    const values = await drain(channel.iterable);
    assertEqual(
      values.map((v) => v.content).join(","),
      "a,b",
      "push order preserved",
    );
  });

  await test("streamChannel supports interleaved push-then-drain (producer ahead of consumer)", async () => {
    const channel = createStreamChannel<{ content: string }>();
    const collected: string[] = [];
    const consumerDone = (async () => {
      for await (const value of channel.iterable) {
        collected.push(value.content);
      }
    })();
    channel.push({ content: "first" });
    await new Promise((r) => setTimeout(r, 5));
    channel.push({ content: "second" });
    channel.close();
    await consumerDone;
    assertEqual(
      collected.join(","),
      "first,second",
      "consumer-ahead-of-producer delivery",
    );
  });

  await test("streamChannel.error() propagates as a thrown error to the consumer", async () => {
    const channel = createStreamChannel<{ content: string }>();
    channel.push({ content: "before-error" });
    channel.error(new Error("boom"));
    let threw = false;
    try {
      await drain(channel.iterable);
    } catch (err) {
      threw = true;
      assert(
        err instanceof Error && err.message === "boom",
        "error propagated with original message",
      );
    }
    assert(threw, "consumer observed the error");
  });

  await test("streamChannel with zero pushes and an immediate close drains empty", async () => {
    const channel = createStreamChannel<{ content: string }>();
    channel.close();
    const values = await drain(channel.iterable);
    assertEqual(values.length, 0, "no values delivered");
  });

  await runSuite();
  ```

  Add to `package.json` `scripts`:

  ```json
  "test:loop-engine": "tsx test/continuous-test-suite-loop-engine.ts"
  ```

  Run it and confirm it fails on the missing module (not on an assertion):

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

  Expect a module-resolution error mentioning `../src/lib/core/streamChannel.js`.

- [ ] **Step 2: Add the `StreamChannel` type to the canonical types folder**

  Create `src/lib/types/streaming.ts`:

  ```typescript
  /**
   * Shared push-based channel bridging a background producer (an agentic
   * tool-calling loop) with an async-iterable consumer. Replaces the two
   * independently-invented primitives this type unifies: the OpenAI-family
   * `createChunkQueue` (pull-based, in-band `{done:true}` sentinel) and the
   * Gemini-family `createTextChannel` (push-based, out-of-band close/error).
   */
  export type StreamChannel<T = { content: string }> = {
    push(value: T): void;
    close(): void;
    error(err: unknown): void;
    readonly iterable: AsyncIterable<T>;
  };
  ```

  Confirm the barrel picks it up automatically (rule 10 — `export *` only):

  ```bash
  grep -n "streaming" src/lib/types/index.ts || echo "MISSING — add export * from \"./streaming.js\";"
  ```

  If missing, add the line to `src/lib/types/index.ts` in the same alphabetical position as its neighbors.

- [ ] **Step 3: Implement `createStreamChannel` — a straight port of `createTextChannel`'s semantics, generic over `T`**

  `createTextChannel`'s implementation (`googleNativeGemini3/utils.ts:886-955`) already has the richer, more general contract (out-of-band close/error, periodic compaction of consumed entries, backpressure via a `Promise`-based wake mechanism, cleanup on early consumer cancellation). `createChunkQueue`'s in-band `{done:true}` sentinel is a strictly weaker special case of the same idea. Port `createTextChannel` verbatim, generalized to `T`, dropping nothing:

  Create `src/lib/core/streamChannel.ts`:

  ```typescript
  import type { StreamChannel } from "../types/index.js";

  /**
   * Create a push-based channel bridging a background producer (an agentic
   * tool-calling loop) with an async-iterable consumer, enabling truly
   * incremental streaming: values are yielded to the caller as they arrive
   * rather than being buffered until the producer finishes.
   */
  export function createStreamChannel<
    T = { content: string },
  >(): StreamChannel<T> {
    const queue: T[] = [];
    let done = false;
    let fatalError: unknown = undefined;
    let notify: (() => void) | null = null;

    function wake(): void {
      if (notify) {
        const fn = notify;
        notify = null;
        fn();
      }
    }

    function push(value: T): void {
      if (done) {
        return;
      }
      queue.push(value);
      wake();
    }

    function close(): void {
      done = true;
      wake();
    }

    function error(err: unknown): void {
      done = true;
      fatalError = err;
      wake();
    }

    let readIndex = 0;

    async function* iterable(): AsyncIterable<T> {
      try {
        while (true) {
          if (readIndex < queue.length) {
            yield queue[readIndex++];
            // Periodically compact consumed entries to avoid unbounded retention.
            if (readIndex > 1024 && readIndex * 2 >= queue.length) {
              queue.splice(0, readIndex);
              readIndex = 0;
            }
          } else if (done) {
            if (fatalError !== undefined) {
              throw fatalError instanceof Error
                ? fatalError
                : new Error(String(fatalError));
            }
            return;
          } else {
            await new Promise<void>((resolve) => {
              notify = resolve;
            });
          }
        }
      } finally {
        // Consumer stopped reading (disconnect/cancel): stop buffering.
        done = true;
        queue.length = 0;
        notify?.();
      }
    }

    return { push, close, error, iterable: iterable() };
  }
  ```

  Run the Step 1 test — it must now pass:

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

- [ ] **Step 4: Migrate the two `createChunkQueue` non-definition importers**

  `openaiChatCompletionsBase.ts` and `anthropic/client.ts` each do:

  ```typescript
  const { pushChunk, nextChunk } = createChunkQueue();
  // ... pushChunk({ content: "..." }) or pushChunk({ done: true }) ...
  // ... await nextChunk() then check `"done" in chunk` ...
  ```

  Replace with:

  ```typescript
  const channel = createStreamChannel<OpenAICompatStreamChunk>();
  // pushChunk({content}) -> channel.push({content})
  // pushChunk({done:true}) -> channel.close()  (drop the done-sentinel push entirely)
  // for-await over nextChunk() polling -> `for await (const chunk of channel.iterable)`
  ```

  Concretely, in `anthropic/client.ts`, find the drain loop:

  ```typescript
  // BEFORE
  while (true) {
    const chunk = await nextChunk();
    if ("done" in chunk) break;
    yield chunk;
  }
  ```

  ```typescript
  // AFTER
  for await (const chunk of channel.iterable) {
    yield chunk;
  }
  ```

  And every `pushChunk({ done: true })` call becomes `channel.close()`; every `pushChunk({ content: ... })` becomes `channel.push({ content: ... })`. Do the same mechanical swap in `openaiChatCompletionsBase.ts`. Update the import in both files from `import { createChunkQueue } from "./openaiChatCompletionsClient.js"` to `import { createStreamChannel } from "../core/streamChannel.js"`.

  Because `OpenAICompatStreamChunk`'s type today is a union including a `{done:true}` member, narrow it at the type level too: introduce (or reuse, if it already exists in `src/lib/types/`) a variant without the `done` member for channel payloads, since `close()` now carries that meaning out-of-band. Grep first — do not duplicate an existing type:

  ```bash
  grep -n "OpenAICompatStreamChunk" src/lib/types/*.ts
  ```

- [ ] **Step 5: Migrate the two `createTextChannel` importers**

  `googleAiStudio/client.ts:954` and `googleVertex/client.ts:4942` both do `const channel = createTextChannel();` then call `channel.push(text)` / `channel.close()` / `channel.error(err)` — this is already exactly `StreamChannel`'s shape, so the only change is the import and call:

  ```typescript
  // BEFORE
  import { createTextChannel } from "../googleNativeGemini3/utils.js";
  const channel = createTextChannel();
  // AFTER
  import { createStreamChannel } from "../../core/streamChannel.js";
  const channel = createStreamChannel<{ content: string }>();
  ```

  `collectStreamChunksIncremental` (`googleNativeGemini3/utils.ts:968`) takes a `channel: TextChannel` parameter — update its signature to `channel: StreamChannel<{content:string}>` (import from `../../types/index.js`, not a local `TextChannel` type — delete the local `TextChannel` type once nothing references it; grep to confirm before deleting):

  ```bash
  grep -rn "TextChannel" src/lib/ --include="*.ts" | grep -v "streamChannel.ts\|types/streaming.ts"
  ```

- [ ] **Step 6: Delete both original primitive definitions**

  Delete the `createChunkQueue` export block from `openaiChatCompletionsClient.ts:801-825`.
  Delete the `createTextChannel` export block from `googleNativeGemini3/utils.ts:878-955`.
  Delete the now-dead local `TextChannel` type (wherever it was declared — grep first, per Step 5).

  Re-run the full grep sweep to confirm zero remaining references to either deleted name:

  ```bash
  grep -rn "createChunkQueue\|createTextChannel" src/ test/
  ```

  Expect zero matches.

- [ ] **Step 7: Full verification and commit**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-loop-engine.ts
  npx tsx test/continuous-test-suite-anthropic-structured-tools.ts
  npx tsx test/continuous-test-suite-gemini-abort.ts
  pnpm run build
  ```

  All must be green (the two provider-specific suites are the closest thing to a regression net for this task's blast radius until Tasks 4-7 add their own characterization suites). Commit:

  ```bash
  git add src/lib/core/streamChannel.ts src/lib/types/streaming.ts src/lib/types/index.ts \
    src/lib/providers/openaiChatCompletionsClient.ts src/lib/providers/openaiChatCompletionsBase.ts \
    src/lib/providers/anthropic/client.ts src/lib/providers/googleNativeGemini3/utils.ts \
    src/lib/providers/googleAiStudio/client.ts src/lib/providers/googleVertex/client.ts \
    test/continuous-test-suite-loop-engine.ts package.json
  git commit -m "refactor(core): merge createChunkQueue and createTextChannel into streamChannel"
  ```

---

## Task 2: Shared native tool-declaration converter

**Files:**

- Create: `src/lib/core/nativeToolFormat.ts`
- Modify: `test/continuous-test-suite-loop-engine.ts` (append section 2)
- Modify: `src/lib/providers/anthropic/client.ts` (route both `input_schema`-format converters through the new function)
- Modify: `src/lib/providers/googleVertex/client.ts` (route the `functionDeclarations`-format converter — 2 call sites — through the new function; route the `input_schema`-format Vertex+Claude converter through the new function)
- Modify: `src/lib/providers/googleAiStudio/client.ts` (redirect its existing `buildNativeToolDeclarations` call through the new facade for consistency — `buildNativeToolDeclarations` itself is untouched, just no longer called directly from provider clients)

**Interfaces:**

```typescript
// src/lib/types/nativeTools.ts
export type NativeToolFormat = "input_schema" | "functionDeclarations";

export type NativeAnthropicToolDeclaration = {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
  cache_control?: { type: "ephemeral" };
};

// Re-exports the existing (already well-built) Gemini result shape unchanged.
export type NativeGeminiToolDeclarationsResult = {
  toolsConfig: [{ functionDeclarations: Record<string, unknown>[] }];
  executeMap: Map<string, unknown>;
  originalNameMap: Map<string, string>;
};
```

- [ ] **Step 1: Write the characterization test pinning today's Anthropic converter output**

  Append to `test/continuous-test-suite-loop-engine.ts`, before `await runSuite();`:

  ```typescript
  // ---------------------------------------------------------------------------
  // nativeToolFormat: input_schema (Anthropic) format
  // ---------------------------------------------------------------------------
  import { toNativeToolDeclarations } from "../src/lib/core/nativeToolFormat.js";

  const SAMPLE_TOOL_RECORD = {
    search_docs: {
      description: "Search the docs",
      inputSchema: { type: "object", properties: { q: { type: "string" } } },
      execute: async () => "ok",
    },
  };

  await test("toNativeToolDeclarations('input_schema') matches Anthropic's existing wire shape", () => {
    const declared = toNativeToolDeclarations(
      SAMPLE_TOOL_RECORD,
      "input_schema",
    );
    assert(Array.isArray(declared), "returns an array for input_schema format");
    const tools = declared as Array<{
      name: string;
      description?: string;
      input_schema: unknown;
    }>;
    assertEqual(tools.length, 1, "one declared tool");
    assertEqual(tools[0].name, "search_docs", "tool name preserved");
    assertEqual(
      tools[0].description,
      "Search the docs",
      "description preserved",
    );
    assertEqual(
      JSON.stringify(tools[0].input_schema),
      JSON.stringify({ type: "object", properties: { q: { type: "string" } } }),
      "input_schema passed through verbatim",
    );
  });

  await test("toNativeToolDeclarations('input_schema') returns undefined for an empty tool record", () => {
    const declared = toNativeToolDeclarations({}, "input_schema");
    assert(
      declared === undefined,
      "empty tools collapse to undefined, matching anthropic/client.ts's `if (tools.length===0) tools=undefined`",
    );
  });

  await test("toNativeToolDeclarations('functionDeclarations') delegates to buildNativeToolDeclarations", () => {
    const declared = toNativeToolDeclarations(
      SAMPLE_TOOL_RECORD,
      "functionDeclarations",
    );
    const result = declared as {
      toolsConfig: [{ functionDeclarations: Array<{ name: string }> }];
      executeMap: Map<string, unknown>;
    };
    assertEqual(
      result.toolsConfig[0].functionDeclarations[0].name,
      "search_docs",
      "Gemini declaration carries the tool name",
    );
    assert(
      result.executeMap.has("search_docs"),
      "executeMap is populated (mid-turn hydration support preserved)",
    );
  });
  ```

  Run and confirm it fails on the missing export:

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

- [ ] **Step 2: Add the type**

  Create `src/lib/types/nativeTools.ts` with the `NativeToolFormat`, `NativeAnthropicToolDeclaration`, and `NativeGeminiToolDeclarationsResult` types shown above. Add `export * from "./nativeTools.js";` to `src/lib/types/index.ts` in alphabetical position.

- [ ] **Step 3: Implement `toNativeToolDeclarations`**

  For `"functionDeclarations"`, delegate to the existing, already-correct `buildNativeToolDeclarations` (do not reimplement its sanitization/dedup logic). For `"input_schema"`, extract the logic currently duplicated across `anthropic/client.ts:575-588` (`toolsToAnthropic`) and `anthropic/client.ts:1407-1422` (the doGenerate inline version) — the doGenerate version is the more complete one (it also honors a `cache_control` breakpoint via `cacheControlOf(t)`), so port that one:

  Create `src/lib/core/nativeToolFormat.ts`:

  ```typescript
  import type { Tool } from "ai";

  import {
    buildNativeToolDeclarations,
    type NativeToolDeclarationsResult,
  } from "../providers/googleNativeGemini3/utils.js";
  import type {
    NativeAnthropicToolDeclaration,
    NativeToolFormat,
  } from "../types/index.js";
  import { cacheControlOf } from "../providers/anthropic/cacheControl.js";

  /**
   * Convert a Vercel AI SDK tool record into the wire-format a native
   * (non-AI-SDK) provider SDK expects. Absorbs three previously-duplicated
   * conversion implementations: Anthropic's `toolsToAnthropic` +
   * `doGenerate`'s inline filter/map (both in anthropic/client.ts), and
   * Vertex's own per-tool `VertexAnthropicTool` builder — all three produced
   * the same `input_schema` shape. Gemini's `functionDeclarations` shape was
   * already centralized in `buildNativeToolDeclarations`; this function is a
   * thin facade over it so every native provider calls one entry point.
   */
  export function toNativeToolDeclarations(
    tools: Record<string, Tool>,
    format: "input_schema",
  ): NativeAnthropicToolDeclaration[] | undefined;
  export function toNativeToolDeclarations(
    tools: Record<string, Tool>,
    format: "functionDeclarations",
  ): NativeToolDeclarationsResult;
  export function toNativeToolDeclarations(
    tools: Record<string, Tool>,
    format: NativeToolFormat,
  ):
    | NativeAnthropicToolDeclaration[]
    | NativeToolDeclarationsResult
    | undefined {
    if (format === "functionDeclarations") {
      return buildNativeToolDeclarations(tools);
    }
    const declared = Object.entries(tools ?? {}).map(([name, tool]) => {
      const cc = cacheControlOf(tool);
      const declaration: NativeAnthropicToolDeclaration = {
        name,
        ...(tool.description ? { description: tool.description } : {}),
        input_schema: (tool.inputSchema ?? {
          type: "object",
          properties: {},
        }) as Record<string, unknown>,
        ...(cc ? { cache_control: cc } : {}),
      };
      return declaration;
    });
    return declared.length > 0 ? declared : undefined;
  }
  ```

  If `cacheControlOf` is not already its own exported helper (it may be inlined at `anthropic/client.ts:1412`'s call site), extract it into `src/lib/providers/anthropic/cacheControl.ts` as a one-function module first — grep to check before assuming it needs extraction:

  ```bash
  grep -n "function cacheControlOf\|cacheControlOf =" src/lib/providers/anthropic/*.ts
  ```

- [ ] **Step 4: Redirect Anthropic's two call sites**

  In `anthropic/client.ts`, replace the streaming loop's `toolsToAnthropic(toolsRecord)` call (`:1826`) and the `doGenerate` inline block (`:1407-1422`) with `toNativeToolDeclarations(toolsRecord, "input_schema")`. Delete the now-unused `toolsToAnthropic` function (`:575-588`) once both call sites (including the mid-turn hydration call at `:2010`) are migrated. Re-grep to confirm zero remaining references before deleting:

  ```bash
  grep -n "toolsToAnthropic" src/lib/providers/anthropic/client.ts
  ```

- [ ] **Step 5: Redirect Vertex's three call sites**

  Replace the two near-verbatim `functionDeclarations` builders (`googleVertex/client.ts:2041-2069` inside `executeNativeGemini3Stream`, and the equivalent block inside `executeNativeGemini3Generate` around `:3340-3399`) with a single call:

  ```typescript
  const declared = toNativeToolDeclarations(
    options.tools ?? {},
    "functionDeclarations",
  );
  const tools = declared.toolsConfig;
  const executeMap = declared.executeMap;
  ```

  This is a **behavior upgrade for Vertex+Gemini**, not a pure refactor: it gains the function-name sanitization and mid-turn discovery hydration (`refreshNativeToolDeclarations`) that `buildNativeToolDeclarations` already provides and Vertex's hand-rolled loop did not. Flag this explicitly in the commit message and in Risks & Rollback — it is a deliberate, low-risk improvement bundled with the mechanical dedup because building a fourth near-duplicate-but-slightly-different converter just to stay "pure refactor" would be worse for maintainability than absorbing the one-line delta.

  Replace Vertex's private `input_schema` builder (`googleVertex/client.ts:~1755-1780`, used by `executeNativeAnthropicStream`/`executeNativeAnthropicGenerate`) with `toNativeToolDeclarations(options.tools ?? {}, "input_schema")`, adapting the return type at the two call sites from `VertexAnthropicTool[]` to the new `NativeAnthropicToolDeclaration[]` (structurally identical — confirm with `pnpm run check` after the swap rather than assuming).

- [ ] **Step 6: Redirect Google AI Studio's call site for consistency**

  `googleAiStudio/client.ts:908` already calls `buildNativeToolDeclarations` directly and correctly — change it to call `toNativeToolDeclarations(options.tools, "functionDeclarations")` purely so every native provider goes through one entry point (no behavior change here, since the new function just delegates).

- [ ] **Step 7: Verification and commit**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-loop-engine.ts
  npx tsx test/continuous-test-suite-anthropic-structured-tools.ts
  npx tsx test/continuous-test-suite-gemini-abort.ts
  pnpm run build
  ```

  ```bash
  git add src/lib/core/nativeToolFormat.ts src/lib/types/nativeTools.ts src/lib/types/index.ts \
    src/lib/providers/anthropic/client.ts src/lib/providers/anthropic/cacheControl.ts \
    src/lib/providers/googleVertex/client.ts src/lib/providers/googleAiStudio/client.ts \
    test/continuous-test-suite-loop-engine.ts
  git commit -m "refactor(core): unify native tool-declaration conversion behind toNativeToolDeclarations"
  ```

---

## Task 3: The engine — `AgenticLoopAdapter` type and `runAgenticLoop`

**Files:**

- Create: `src/lib/types/loopEngine.ts` (the `AgenticLoopAdapter` type family)
- Create: `src/lib/core/loopEngine.ts` (`runAgenticLoop`)
- Modify: `test/continuous-test-suite-loop-engine.ts` (append section 3 — a fake adapter drives the engine end-to-end, no real provider involved)

This task builds the engine against a **hand-written fake adapter**, not a real provider — the real providers migrate onto it one at a time in Tasks 4-7, each pinned by its own characterization test first. Building against a fake adapter here proves the engine's contract is sufficient in isolation before any production code depends on it.

**Interfaces:**

```typescript
// src/lib/types/loopEngine.ts
export type AgenticLoopToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

export type AgenticLoopUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
};

export type AgenticLoopStepResult<TRaw = unknown> = {
  text: string;
  reasoning?: string;
  toolCalls: AgenticLoopToolCall[];
  usage: AgenticLoopUsage;
  /** Provider's own raw stop/finish-reason string, e.g. "tool_use", "MAX_TOKENS" */
  rawStopReason: string | undefined;
  /** Adapter-private accumulated response data needed by buildToolResultMessages
   *  (e.g. Anthropic's ordered content blocks, Gemini's rawResponseParts). */
  raw: TRaw;
};

export type AgenticLoopToolCallResult = AgenticLoopToolCall & {
  output: unknown;
  error?: string;
  permanentlyFailed?: boolean;
};

export type AgenticLoopStepRequest = { raw: unknown };

export type AgenticLoopReclaimResult<TConversation> = {
  conversation: TConversation;
};

export type AgenticLoopToolFailureBreaker = {
  maxRetries: number;
};

export type AgenticLoopAdapter<TConversation = unknown, TRaw = unknown> = {
  readonly providerLabel: string;
  readonly maxSteps: number;
  /** Pre-existing per-family flat timeout, used as createTurnClock's deadline default. */
  readonly defaultTurnTimeoutMs?: number;
  readonly stallTimeoutMs?: number;
  /** Set only for adapter instances whose client has the TOOL_NOT_FOUND strike breaker today: both Gemini adapters (AI Studio, Vertex+Gemini) AND the Vertex+Claude call to createAnthropicLoopAdapter — NOT the native-Anthropic call to that same factory, and not Bedrock. See Verified Fact 4. */
  readonly toolFailureBreaker?: AgenticLoopToolFailureBreaker;

  buildStepRequest(
    conversation: TConversation,
    step: number,
  ): AgenticLoopStepRequest;
  executeStep(
    request: AgenticLoopStepRequest,
    channel: { push(chunk: { content: string }): void },
    signal: AbortSignal,
  ): Promise<AgenticLoopStepResult<TRaw>>;
  buildToolResultMessages(
    conversation: TConversation,
    stepResult: AgenticLoopStepResult<TRaw>,
    toolResults: AgenticLoopToolCallResult[],
  ): TConversation;
  mapFinishReason(
    rawStopReason: string | undefined,
    hadToolCalls: boolean,
  ): string;

  /** Optional: in-turn context-budget reclaim, called once per step before buildStepRequest. */
  planReclaim?(
    conversation: TConversation,
    step: number,
  ): AgenticLoopReclaimResult<TConversation> | undefined;
  /** Optional: Vertex+Gemini-only single-retry-on-malformed-call. */
  isMalformedStep?(stepResult: AgenticLoopStepResult<TRaw>): boolean;
  buildMalformedRetryNote?(conversation: TConversation): TConversation;
};

export type AgenticLoopResult<TConversation> = {
  text: string;
  toolCalls: AgenticLoopToolCall[];
  toolExecutions: Array<{
    name: string;
    input: Record<string, unknown>;
    output: unknown;
  }>;
  usage: AgenticLoopUsage;
  finishReason: string;
  rawStopReason: string | undefined;
  conversation: TConversation;
};
```

- [ ] **Step 1: Write the failing engine test with a fake adapter (no tools, single step)**

  Append to `test/continuous-test-suite-loop-engine.ts`:

  ```typescript
  // ---------------------------------------------------------------------------
  // loopEngine: runAgenticLoop driven by a fake adapter
  // ---------------------------------------------------------------------------
  import { runAgenticLoop } from "../src/lib/core/loopEngine.js";
  import type {
    AgenticLoopAdapter,
    AgenticLoopStepResult,
  } from "../src/lib/types/index.js";

  type FakeConversation = { turns: string[] };

  function fakeAdapter(
    steps: Array<AgenticLoopStepResult<unknown>>,
    overrides: Partial<AgenticLoopAdapter<FakeConversation>> = {},
  ): AgenticLoopAdapter<FakeConversation> {
    let stepIndex = 0;
    return {
      providerLabel: "fake",
      maxSteps: 10,
      buildStepRequest: (conversation) => ({ raw: conversation }),
      executeStep: async (_request, channel) => {
        const result = steps[Math.min(stepIndex, steps.length - 1)];
        stepIndex++;
        if (result.text) {
          channel.push({ content: result.text });
        }
        return result;
      },
      buildToolResultMessages: (conversation, _stepResult, toolResults) => ({
        turns: [
          ...conversation.turns,
          ...toolResults.map((r) => `tool:${r.name}=${String(r.output)}`),
        ],
      }),
      mapFinishReason: (raw, hadToolCalls) =>
        hadToolCalls ? "tool-calls" : raw === "MAX_TOKENS" ? "length" : "stop",
      ...overrides,
    };
  }

  async function drainChunks(
    iterable: AsyncIterable<{ content: string }>,
  ): Promise<string> {
    let out = "";
    for await (const chunk of iterable) {
      out += chunk.content;
    }
    return out;
  }

  await test("runAgenticLoop: single step, no tool calls, resolves immediately", async () => {
    const adapter = fakeAdapter([
      {
        text: "hello world",
        toolCalls: [],
        usage: { inputTokens: 5, outputTokens: 2 },
        rawStopReason: "end_turn",
        raw: undefined,
      },
    ]);
    const { stream, resultPromise } = runAgenticLoop(
      adapter,
      { turns: [] },
      {},
    );
    const text = await drainChunks(stream);
    const result = await resultPromise;
    assertEqual(
      text,
      "hello world",
      "streamed text matches the single step's output",
    );
    assertEqual(
      result.finishReason,
      "stop",
      "finishReason resolved via adapter.mapFinishReason",
    );
    assertEqual(result.usage.inputTokens, 5, "usage accumulated from the step");
  });

  await test("runAgenticLoop: tool-call round trip across two steps", async () => {
    const tools = {
      add_numbers: {
        description: "add",
        execute: async (args: { a: number; b: number }) => args.a + args.b,
      },
    };
    const adapter = fakeAdapter([
      {
        text: "",
        toolCalls: [
          { id: "call_1", name: "add_numbers", args: { a: 2, b: 3 } },
        ],
        usage: { inputTokens: 10, outputTokens: 4 },
        rawStopReason: "tool_use",
        raw: undefined,
      },
      {
        text: "the answer is 5",
        toolCalls: [],
        usage: { inputTokens: 12, outputTokens: 6 },
        rawStopReason: "end_turn",
        raw: undefined,
      },
    ]);
    const { stream, resultPromise } = runAgenticLoop(
      adapter,
      { turns: [] },
      { tools },
    );
    const text = await drainChunks(stream);
    const result = await resultPromise;
    assertEqual(text, "the answer is 5", "final step's text streamed through");
    assertEqual(result.toolCalls.length, 1, "one tool call recorded");
    assertEqual(result.toolCalls[0].name, "add_numbers", "tool name recorded");
    assertEqual(
      result.toolExecutions[0].output,
      5,
      "tool actually executed (2+3=5)",
    );
    assertEqual(
      result.usage.inputTokens,
      22,
      "usage summed across both steps (10+12)",
    );
    assertEqual(
      result.usage.outputTokens,
      10,
      "output usage summed across both steps (4+6)",
    );
  });

  await test("runAgenticLoop: TOOL_NOT_FOUND without a breaker produces one error result and continues (Anthropic/Bedrock semantics)", async () => {
    const adapter = fakeAdapter([
      {
        text: "",
        toolCalls: [{ id: "call_1", name: "missing_tool", args: {} }],
        usage: { inputTokens: 1, outputTokens: 1 },
        rawStopReason: "tool_use",
        raw: undefined,
      },
      {
        text: "done",
        toolCalls: [],
        usage: { inputTokens: 1, outputTokens: 1 },
        rawStopReason: "end_turn",
        raw: undefined,
      },
    ]);
    const { resultPromise } = runAgenticLoop(
      adapter,
      { turns: [] },
      { tools: {} },
    );
    const result = await resultPromise;
    const toolTurn = result.conversation.turns.find((t) =>
      t.startsWith("tool:missing_tool="),
    );
    assert(
      toolTurn !== undefined,
      "a single error tool-result turn was appended, no breaker without adapter.toolFailureBreaker",
    );
  });

  await test("runAgenticLoop: TOOL_NOT_FOUND WITH a breaker marks permanently_failed after maxRetries (Gemini semantics)", async () => {
    const stepWithMissingTool: AgenticLoopStepResult<unknown> = {
      text: "",
      toolCalls: [{ id: "call_x", name: "missing_tool", args: {} }],
      usage: { inputTokens: 1, outputTokens: 1 },
      rawStopReason: "tool_use" as const,
      raw: undefined,
    };
    const finalStep: AgenticLoopStepResult<unknown> = {
      text: "gave up",
      toolCalls: [],
      usage: { inputTokens: 1, outputTokens: 1 },
      rawStopReason: "end_turn" as const,
      raw: undefined,
    };
    const adapter = fakeAdapter(
      [stepWithMissingTool, stepWithMissingTool, finalStep],
      { toolFailureBreaker: { maxRetries: 1 } },
    );
    const { resultPromise } = runAgenticLoop(
      adapter,
      { turns: [] },
      { tools: {} },
    );
    const result = await resultPromise;
    const permanentTurn = result.conversation.turns.find(
      (t) => t.includes("permanently_failed") || t.includes("TOOL_NOT_FOUND"),
    );
    assert(
      permanentTurn !== undefined,
      "breaker recorded a not-found/permanent-failure result",
    );
  });

  await test("runAgenticLoop: respects maxSteps and stops without a final answer", async () => {
    const alwaysToolCall: AgenticLoopStepResult<unknown> = {
      text: "",
      toolCalls: [{ id: "call_loop", name: "noop", args: {} }],
      usage: { inputTokens: 1, outputTokens: 1 },
      rawStopReason: "tool_use" as const,
      raw: undefined,
    };
    const tools = { noop: { description: "noop", execute: async () => "ok" } };
    const adapter: AgenticLoopAdapter<FakeConversation> = {
      ...fakeAdapter([alwaysToolCall]),
      maxSteps: 3,
    };
    const { resultPromise } = runAgenticLoop(adapter, { turns: [] }, { tools });
    const result = await resultPromise;
    assertEqual(
      result.finishReason,
      "tool-calls",
      "step-cap exit maps to tool-calls, mirroring today's providers",
    );
  });

  await test("runAgenticLoop: retries a pre-first-chunk 429 once and succeeds on the second attempt", async () => {
    let calls = 0;
    const finalStep: AgenticLoopStepResult<unknown> = {
      text: "recovered",
      toolCalls: [],
      usage: { inputTokens: 3, outputTokens: 2 },
      rawStopReason: "end_turn",
      raw: undefined,
    };
    const adapter: AgenticLoopAdapter<FakeConversation> = {
      ...fakeAdapter([finalStep]),
      executeStep: async (_request, _channel) => {
        calls++;
        if (calls === 1) {
          // retryAfterMs:0 keeps withProviderRetry's backoff sleep at 0ms so
          // this test doesn't actually wait out its floor delay.
          throw Object.assign(new Error("rate limited"), {
            statusCode: 429,
            retryAfterMs: 0,
          });
        }
        return finalStep;
      },
    };
    const { stream, resultPromise } = runAgenticLoop(
      adapter,
      { turns: [] },
      {},
    );
    const text = await drainChunks(stream);
    const result = await resultPromise;
    assertEqual(
      calls,
      2,
      "executeStep was retried exactly once after the pre-first-chunk 429",
    );
    assertEqual(
      text,
      "recovered",
      "the successful retry's text streamed through",
    );
    assertEqual(
      result.finishReason,
      "stop",
      "loop completed normally after the retry",
    );
  });

  await test("runAgenticLoop: does NOT retry a 429 that arrives after this step already streamed a chunk", async () => {
    let calls = 0;
    const adapter: AgenticLoopAdapter<FakeConversation> = {
      ...fakeAdapter([]),
      executeStep: async (_request, channel) => {
        calls++;
        channel.push({ content: "partial" });
        throw Object.assign(new Error("rate limited mid-step"), {
          statusCode: 429,
          retryAfterMs: 0,
        });
      },
    };
    const { stream, resultPromise } = runAgenticLoop(
      adapter,
      { turns: [] },
      {},
    );
    const drainOutcome = drainChunks(stream).catch((err) => err);
    let rejected = false;
    let rejectionMessage = "";
    try {
      await resultPromise;
    } catch (err) {
      rejected = true;
      rejectionMessage = err instanceof Error ? err.message : String(err);
    }
    await drainOutcome;
    assert(
      rejected,
      "resultPromise rejects instead of silently retrying past already-streamed content",
    );
    assertEqual(
      calls,
      1,
      "executeStep was called exactly once — no retry once a chunk had already reached the consumer",
    );
    assertEqual(
      rejectionMessage,
      "rate limited mid-step",
      "the original error surfaces unwrapped, not the internal PostEmissionStepError sentinel",
    );
  });

  await runSuite();
  ```

  Run and confirm module-not-found failure:

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

- [ ] **Step 2: Add the `AgenticLoopAdapter` type family**

  Create `src/lib/types/loopEngine.ts` with the full type block shown in this task's Interfaces section above (copy verbatim — every field there is grounded in the mapping table). Add `export * from "./loopEngine.js";` to `src/lib/types/index.ts`.

- [ ] **Step 3: Implement `runAgenticLoop`**

  Create `src/lib/core/loopEngine.ts`:

  ```typescript
  import { createStreamChannel } from "./streamChannel.js";
  import type {
    AgenticLoopAdapter,
    AgenticLoopResult,
    AgenticLoopStepResult,
    AgenticLoopToolCallResult,
    AgenticLoopUsage,
  } from "../types/index.js";
  import { logger } from "../utils/logger.js";
  import { withProviderRetry } from "../utils/providerRetry.js";

  type LoopOptions = {
    tools?: Record<
      string,
      {
        execute?: (
          args: Record<string, unknown>,
          opts: unknown,
        ) => Promise<unknown>;
      }
    >;
    abortSignal?: AbortSignal;
  };

  /**
   * Marks a step error that occurred AFTER at least one chunk had already
   * been streamed to the consumer for this step. Retrying at that point
   * would duplicate or interleave already-emitted output, so this wrapper
   * deliberately carries none of the original error's status/retry
   * metadata (`.statusCode`/`.status`, no APICallError/NeuroLinkError
   * branding) — that makes `withProviderRetry`'s internal
   * `isRetryableProviderError()` check return false via its duck-typed
   * fallback, which ends the retry loop on the very next classification
   * instead of sleeping and re-invoking `adapter.executeStep`. The engine
   * unwraps back to the original `cause` before it ever reaches the
   * caller — see the try/catch around the `withProviderRetry` call below.
   */
  class PostEmissionStepError extends Error {
    constructor(public readonly cause: unknown) {
      super(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function sumUsage(
    a: AgenticLoopUsage,
    b: AgenticLoopUsage,
  ): AgenticLoopUsage {
    return {
      inputTokens: a.inputTokens + b.inputTokens,
      outputTokens: a.outputTokens + b.outputTokens,
      cacheReadTokens:
        (a.cacheReadTokens ?? 0) + (b.cacheReadTokens ?? 0) || undefined,
      cacheWriteTokens:
        (a.cacheWriteTokens ?? 0) + (b.cacheWriteTokens ?? 0) || undefined,
      reasoningTokens:
        (a.reasoningTokens ?? 0) + (b.reasoningTokens ?? 0) || undefined,
    };
  }

  /**
   * Run one adapter-parameterized agentic tool-calling turn. Owns the
   * maxSteps-bounded loop, generic tool dispatch (with an opt-in
   * TOOL_NOT_FOUND/failure-strike breaker — see AgenticLoopAdapter.toolFailureBreaker),
   * per-step usage accumulation, a single optional malformed-call retry,
   * chunk emission through streamChannel, and a pre-first-chunk 429/5xx
   * retry (via withProviderRetry) around every adapter.executeStep() call.
   * The retry wrap is unconditional and adapter-agnostic — every migrated
   * provider gets it for free, not just the ones that had a hand-rolled
   * version before migration (see Verified Fact 4-adjacent note in Task 4
   * Step 1 and the Risks & Rollback "Deliberate behavior changes" list for
   * which families are gaining this for the first time). Everything
   * wire-format-specific (building the request, parsing the SDK response,
   * serializing tool results back into the conversation, mapping the raw
   * stop reason) is delegated to `adapter`.
   */
  export function runAgenticLoop<TConversation>(
    adapter: AgenticLoopAdapter<TConversation>,
    initialConversation: TConversation,
    options: LoopOptions,
  ): {
    stream: AsyncIterable<{ content: string }>;
    resultPromise: Promise<AgenticLoopResult<TConversation>>;
  } {
    const channel = createStreamChannel<{ content: string }>();
    const internalAbort = new AbortController();
    const onCallerAbort = () => internalAbort.abort();
    options.abortSignal?.addEventListener("abort", onCallerAbort);
    if (options.abortSignal?.aborted) {
      internalAbort.abort();
    }

    const failedTools = new Map<string, { count: number; lastError: string }>();
    let malformedRetryUsed = false;

    const resultPromise = (async (): Promise<
      AgenticLoopResult<TConversation>
    > => {
      let conversation = initialConversation;
      let usage: AgenticLoopUsage = { inputTokens: 0, outputTokens: 0 };
      let finalText = "";
      let rawStopReason: string | undefined;
      const allToolCalls: AgenticLoopResult<TConversation>["toolCalls"] = [];
      const allToolExecutions: AgenticLoopResult<TConversation>["toolExecutions"] =
        [];
      let hadToolCallsAtCap = false;

      try {
        for (let step = 0; step < adapter.maxSteps; step++) {
          if (internalAbort.signal.aborted) {
            break;
          }

          if (adapter.planReclaim) {
            const reclaimed = adapter.planReclaim(conversation, step);
            if (reclaimed) {
              conversation = reclaimed.conversation;
            }
          }

          const request = adapter.buildStepRequest(conversation, step);

          // Pre-first-chunk 429/5xx retry: watch whether THIS attempt of
          // THIS step pushes anything to the shared channel before it
          // throws. `hasEmitted` resets at the top of every attempt
          // withProviderRetry makes; the instant an attempt emits and then
          // throws, the thrown error is rewrapped as a PostEmissionStepError
          // (no status/branding info survives the rewrap), which
          // isRetryableProviderError() duck-types as non-retryable — so
          // withProviderRetry gives up immediately instead of sleeping and
          // re-invoking executeStep, which would duplicate/interleave
          // output already sent to the consumer. The original error (not
          // the wrapper) is what the caller of runAgenticLoop ultimately
          // sees, via the unwrap in the catch below.
          let hasEmitted = false;
          const watchedChannel = {
            push: (chunk: { content: string }) => {
              hasEmitted = true;
              channel.push(chunk);
            },
          };
          let stepResult: AgenticLoopStepResult;
          try {
            stepResult = await withProviderRetry(
              async () => {
                hasEmitted = false;
                try {
                  return await adapter.executeStep(
                    request,
                    watchedChannel,
                    internalAbort.signal,
                  );
                } catch (err) {
                  throw hasEmitted ? new PostEmissionStepError(err) : err;
                }
              },
              undefined, // no OTel span threaded through the engine today; adapters instrument their own steps if they need span-level detail
              `${adapter.providerLabel}.step`,
            );
          } catch (err) {
            throw err instanceof PostEmissionStepError ? err.cause : err;
          }

          usage = sumUsage(usage, stepResult.usage);
          rawStopReason = stepResult.rawStopReason;

          if (
            adapter.isMalformedStep?.(stepResult) &&
            !malformedRetryUsed &&
            !internalAbort.signal.aborted
          ) {
            malformedRetryUsed = true;
            logger.warn(
              `[${adapter.providerLabel}] Malformed function call at step ${step + 1}/${adapter.maxSteps}; retrying once.`,
            );
            conversation =
              adapter.buildMalformedRetryNote?.(conversation) ?? conversation;
            continue;
          }

          if (stepResult.toolCalls.length === 0) {
            finalText = stepResult.text || finalText;
            break;
          }

          if (step === adapter.maxSteps - 1) {
            hadToolCallsAtCap = true;
          }

          const toolResults: AgenticLoopToolCallResult[] = [];
          for (const call of stepResult.toolCalls) {
            allToolCalls.push(call);
            const breaker = adapter.toolFailureBreaker;
            const failInfo = breaker ? failedTools.get(call.name) : undefined;
            if (breaker && failInfo && failInfo.count >= breaker.maxRetries) {
              const output = {
                error: `TOOL_PERMANENTLY_FAILED: "${call.name}" has failed ${failInfo.count} times. Last error: ${failInfo.lastError}.`,
                status: "permanently_failed",
                do_not_retry: true,
              };
              toolResults.push({
                ...call,
                output,
                error: output.error,
                permanentlyFailed: true,
              });
              allToolExecutions.push({
                name: call.name,
                input: call.args,
                output,
              });
              continue;
            }
            const tool = options.tools?.[call.name];
            if (!tool?.execute) {
              const output = breaker
                ? {
                    error: `TOOL_NOT_FOUND: "${call.name}" does not exist.`,
                    status: "permanently_failed",
                    do_not_retry: true,
                  }
                : { error: `Tool not found: ${call.name}` };
              toolResults.push({
                ...call,
                output,
                error: output.error,
                permanentlyFailed: !!breaker,
              });
              allToolExecutions.push({
                name: call.name,
                input: call.args,
                output,
              });
              continue;
            }
            try {
              const output = await tool.execute(call.args, {
                toolCallId: call.id,
                abortSignal: internalAbort.signal,
              });
              toolResults.push({ ...call, output });
              allToolExecutions.push({
                name: call.name,
                input: call.args,
                output,
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              if (breaker) {
                const current = failedTools.get(call.name) ?? {
                  count: 0,
                  lastError: "",
                };
                current.count++;
                current.lastError = message;
                failedTools.set(call.name, current);
              }
              const output = { error: message, status: "failed" };
              toolResults.push({ ...call, output, error: message });
              allToolExecutions.push({
                name: call.name,
                input: call.args,
                output,
              });
            }
          }

          conversation = adapter.buildToolResultMessages(
            conversation,
            stepResult,
            toolResults,
          );
        }
      } finally {
        channel.close();
        options.abortSignal?.removeEventListener("abort", onCallerAbort);
      }

      const finishReason = adapter.mapFinishReason(
        rawStopReason,
        hadToolCallsAtCap,
      );
      return {
        text: finalText,
        toolCalls: allToolCalls,
        toolExecutions: allToolExecutions,
        usage,
        finishReason,
        rawStopReason,
        conversation,
      };
    })().catch((err) => {
      channel.error(err);
      throw err;
    });

    return { stream: channel.iterable, resultPromise };
  }
  ```

  Run the Step 1 tests — all five must pass:

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

- [ ] **Step 2b (self-review checkpoint): sanity-check the harness skip hazard**

  Per Global Constraints, deliberately break one assertion (e.g. change `assertEqual(text, "hello world", ...)` to expect `"wrong"`) and re-run:

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

  Confirm the suite reports `✗` and exits non-zero (not `⊘` skipped) — the assertion messages in this file describe mismatches without interpolating raw payload values, so this should hold. Revert the deliberate break before continuing.

- [ ] **Step 4: Full verification and commit**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

  ```bash
  git add src/lib/core/loopEngine.ts src/lib/types/loopEngine.ts src/lib/types/index.ts \
    test/continuous-test-suite-loop-engine.ts
  git commit -m "feat(core): add runAgenticLoop engine with AgenticLoopAdapter contract"
  ```

---

## Task 4: Migrate Amazon Bedrock's two loops onto the engine

**Files:**

- Create: `test/continuous-test-suite-bedrock-loop-characterization.ts`
- Create: `src/lib/providers/amazonBedrock/loopAdapter.ts`
- Modify: `src/lib/providers/amazonBedrock/client.ts` (`streamingConversationLoop`, and the hardcoded-10-iteration generate-path loop)
- Modify: `package.json` (add `test:bedrock-loop-characterization`)
- Modify: `eslint.config.js` (add the new suite to `neurolink/e2e-tests-only`'s `allow` list)

Bedrock is unaffected by all three architectural blockers (no discovery/hydration code, no `originalNameMap`, no `final_result` mechanism — see the findings doc's blocker-3 scoping) and has no ordering dependency on any other task, so it migrates first as the engine's proving ground against real production code.

**Interfaces:**

Consumes (from Task 3):

```typescript
// from "../../types/index.js"
import type {
  AgenticLoopAdapter,
  AgenticLoopStepResult,
  AgenticLoopToolCallResult,
} from "../../types/index.js";
// from "../../core/loopEngine.js"
import { runAgenticLoop } from "../../core/loopEngine.js";
```

Produces:

```typescript
// src/lib/providers/amazonBedrock/loopAdapter.ts
export function createBedrockLoopAdapter(config: {
  client: BedrockRuntimeClient; // from "@aws-sdk/client-bedrock-runtime"
  modelId: string;
  region: string;
  maxSteps: number;
  buildCommandInput: (
    conversation: BedrockMessage[],
    step: number,
  ) => ConverseStreamCommandInput; // from "@aws-sdk/client-bedrock-runtime"
}): AgenticLoopAdapter<BedrockMessage[], BedrockContentBlock[]>;
```

`BedrockMessage` and `BedrockContentBlock` are NeuroLink's own canonical types, already exported from `../../types/index.js` (used today by `amazonBedrock/client.ts`). Not reused by any later task — Bedrock's loop shape (AWS Converse events) is unrelated to the Anthropic/Gemini families.

- [ ] **Step 1: Write the characterization suite against current code**

  Create `test/continuous-test-suite-bedrock-loop-characterization.ts`:

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";
  import { defineSuite, assert } from "./helpers/harness.js";

  /**
   * Continuous Test Suite — Amazon Bedrock native-loop characterization
   * (Plan 08, Task 4).
   *
   * DETERMINISM EXCEPTION (CLAUDE.md rule 15): AmazonBedrockProvider's
   * constructor credentials shape is `{accessKeyId?, secretAccessKey?,
   * sessionToken?, region?}` — no endpoint/baseURL override exists, so there
   * is no way to redirect its AWS SDK v3 client at a local mock server
   * through the public dist surface. This suite constructs
   * AmazonBedrockProvider directly from `src/` and overrides the private
   * `bedrockClient` field's `.send()` method with a canned response,
   * sidestepping AWS SigV4 request signing and the ConverseStream binary
   * wire format entirely. What determinism buys: an exact, pinned count of
   * ConverseStream calls per turn, which the maxSteps-honored test below
   * depends on — no live or wire-level mock could guarantee that
   * deterministically. Declared in eslint.config.js's
   * `neurolink/e2e-tests-only` allow list.
   *
   * Run: npx tsx test/continuous-test-suite-bedrock-loop-characterization.ts
   *      pnpm run test:bedrock-loop-characterization
   */

  const { test, runSuite, section } = defineSuite(
    "Bedrock loop characterization",
  );

  type ConverseStreamChunk = Record<string, unknown>;

  function textConverseChunks(text: string): ConverseStreamChunk[] {
    return [
      { messageStart: { role: "assistant" } },
      { contentBlockStart: { contentBlockIndex: 0, start: {} } },
      { contentBlockDelta: { contentBlockIndex: 0, delta: { text } } },
      { contentBlockStop: { contentBlockIndex: 0 } },
      { messageStop: { stopReason: "end_turn" } },
      { metadata: { usage: { inputTokens: 10, outputTokens: 4 } } },
    ];
  }

  function toolUseConverseChunks(
    name: string,
    input: Record<string, unknown>,
    toolUseId: string,
  ): ConverseStreamChunk[] {
    return [
      { messageStart: { role: "assistant" } },
      {
        contentBlockStart: {
          contentBlockIndex: 0,
          start: { toolUse: { name, toolUseId } },
        },
      },
      {
        contentBlockDelta: {
          contentBlockIndex: 0,
          delta: { toolUse: { input: JSON.stringify(input) } },
        },
      },
      { contentBlockStop: { contentBlockIndex: 0 } },
      { messageStop: { stopReason: "tool_use" } },
      { metadata: { usage: { inputTokens: 12, outputTokens: 6 } } },
    ];
  }

  async function* toAsyncIterable<T>(items: T[]): AsyncGenerator<T> {
    for (const item of items) {
      yield item;
    }
  }

  type SendFn = (
    command: unknown,
  ) => Promise<{ stream: AsyncIterable<ConverseStreamChunk> }>;

  async function providerWith(sendImpl: SendFn) {
    const { AmazonBedrockProvider } =
      await import("../src/lib/providers/amazonBedrock/client.js");
    const provider = new AmazonBedrockProvider(
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
      undefined,
      "us-east-1",
      { accessKeyId: "test", secretAccessKey: "test" },
    );
    (provider as unknown as { bedrockClient: { send: SendFn } }).bedrockClient =
      { send: sendImpl };
    return provider;
  }

  void runSuite(async () => {
    section("text-only turn");

    await test("a text-only Converse turn streams the text and stops", async () => {
      const provider = await providerWith(async () => ({
        stream: toAsyncIterable(textConverseChunks("hello from bedrock")),
      }));
      const result = await provider.stream({
        input: { text: "hi" },
        maxSteps: 3,
      });
      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.content ?? "";
      }
      assert(
        text.includes("hello from bedrock"),
        "text-only turn did not surface the streamed text",
      );
    });

    section("tool-call round trip");

    await test("a tool_use turn executes the tool and completes with a text turn", async () => {
      let callCount = 0;
      const provider = await providerWith(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            stream: toAsyncIterable(
              toolUseConverseChunks("lookup", { query: "x" }, "tool_1"),
            ),
          };
        }
        return { stream: toAsyncIterable(textConverseChunks("done")) };
      });
      const result = await provider.stream({
        input: { text: "look something up" },
        maxSteps: 3,
        tools: {
          lookup: {
            description: "look something up",
            parameters: { type: "object", properties: {} },
            execute: async () => ({ found: true }),
          },
        },
      });
      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.content ?? "";
      }
      assert(callCount === 2, "tool round trip did not take exactly two turns");
      assert(text.includes("done"), "final turn text was not surfaced");
    });

    section("maxSteps is honored (call-count pinned)");

    await test("a model that never stops calling tools is cut off at exactly maxSteps turns", async () => {
      let callCount = 0;
      const provider = await providerWith(async () => {
        callCount++;
        return {
          stream: toAsyncIterable(
            toolUseConverseChunks(
              "loop_tool",
              { n: callCount },
              `t_${callCount}`,
            ),
          ),
        };
      });
      const result = await provider.stream({
        input: { text: "keep going" },
        maxSteps: 3,
        tools: {
          loop_tool: {
            description: "never stops",
            parameters: { type: "object", properties: {} },
            execute: async () => ({ ok: true }),
          },
        },
      });
      for await (const _chunk of result.stream) {
        // drain
      }
      assert(
        callCount === 3,
        "maxSteps=3 did not cut the turn off at exactly 3 Converse calls",
      );
      assert(
        result.finishReason === "tool-calls",
        "cut-off turn should report finishReason tool-calls",
      );
    });
  });
  ```

  Add to `package.json` scripts:

  ```json
  "test:bedrock-loop-characterization": "tsx test/continuous-test-suite-bedrock-loop-characterization.ts"
  ```

  In `eslint.config.js`, add the new file to the `neurolink/e2e-tests-only` `allow` array and extend the comment above it:

  ```javascript
  // Internal agentic-loop-engine primitives (streamChannel, nativeToolFormat,
  // loopEngine) have no exported surface at all, and AmazonBedrockProvider's
  // constructor has no endpoint override to redirect at a local mock server —
  // see each file's own header for the specific reasoning.
  "test/continuous-test-suite-loop-engine.ts",
  "test/continuous-test-suite-bedrock-loop-characterization.ts",
  ```

  Run against unmigrated code:

  ```bash
  npx tsx test/continuous-test-suite-bedrock-loop-characterization.ts
  ```

  Expected: all 3 tests pass (this is characterizing the CURRENT hand-rolled loop, which already honors `options.maxSteps` in `streamingConversationLoop` — the third test's call-count assertion is meaningful proof of that, not a tautology).

- [ ] **Step 2: Write `createBedrockLoopAdapter`**

  Create `src/lib/providers/amazonBedrock/loopAdapter.ts`:

  ```typescript
  import type {
    ContentBlock,
    ConverseStreamCommandInput,
  } from "@aws-sdk/client-bedrock-runtime";
  import {
    ConverseStreamCommand,
    type BedrockRuntimeClient,
  } from "@aws-sdk/client-bedrock-runtime";
  import type {
    AgenticLoopAdapter,
    AgenticLoopStepRequest,
    AgenticLoopStepResult,
    AgenticLoopToolCallResult,
    BedrockContentBlock,
    BedrockMessage,
  } from "../../types/index.js";

  export function createBedrockLoopAdapter(config: {
    client: BedrockRuntimeClient;
    modelId: string;
    region: string;
    maxSteps: number;
    buildCommandInput: (
      conversation: BedrockMessage[],
      step: number,
    ) => ConverseStreamCommandInput;
  }): AgenticLoopAdapter<BedrockMessage[], BedrockContentBlock[]> {
    return {
      providerLabel: "bedrock",
      maxSteps: config.maxSteps,
      // No toolFailureBreaker: Bedrock's own client today has unbounded plain-
      // error retries with no breaker (Verified Fact 4) — preserved as-is.

      buildStepRequest(
        conversation: BedrockMessage[],
        step: number,
      ): AgenticLoopStepRequest {
        return { raw: config.buildCommandInput(conversation, step) };
      },

      async executeStep(
        request: AgenticLoopStepRequest,
        channel: { push(chunk: { content: string }): void },
        signal: AbortSignal,
      ): Promise<AgenticLoopStepResult<BedrockContentBlock[]>> {
        const commandInput = request.raw as ConverseStreamCommandInput;
        const command = new ConverseStreamCommand(commandInput);
        const response = await config.client.send(command);

        const contentBlocks: (BedrockContentBlock & {
          _inputBuffer?: string;
        })[] = [];
        let text = "";
        let rawStopReason: string | undefined;
        let inputTokens = 0;
        let outputTokens = 0;
        let cacheReadTokens = 0;
        let cacheWriteTokens = 0;

        if (response.stream) {
          for await (const chunk of response.stream) {
            if (signal.aborted) {
              break;
            }
            if (chunk.contentBlockStart) {
              contentBlocks.push({});
            }
            if (chunk.contentBlockDelta?.delta?.text) {
              const delta = chunk.contentBlockDelta.delta.text;
              text += delta;
              channel.push({ content: delta });
            }
            if (chunk.contentBlockStart?.start?.toolUse) {
              const block = contentBlocks[contentBlocks.length - 1];
              block.toolUse = {
                name: chunk.contentBlockStart.start.toolUse.name || "",
                input: {},
                toolUseId:
                  chunk.contentBlockStart.start.toolUse.toolUseId ||
                  `tool_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
              };
            }
            if (chunk.contentBlockDelta?.delta?.toolUse) {
              const block = contentBlocks[contentBlocks.length - 1];
              if (!block.toolUse) {
                block.toolUse = {
                  name: "",
                  input: {},
                  toolUseId: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
                };
              }
              const deltaInput = chunk.contentBlockDelta.delta.toolUse.input;
              if (typeof deltaInput === "string") {
                block._inputBuffer = (block._inputBuffer || "") + deltaInput;
              }
            }
            if (chunk.contentBlockStop) {
              const block = contentBlocks[contentBlocks.length - 1];
              if (block?.toolUse && block._inputBuffer) {
                try {
                  block.toolUse.input = JSON.parse(block._inputBuffer);
                } catch {
                  block.toolUse.input = {};
                }
                delete block._inputBuffer;
              }
            }
            if (chunk.messageStop) {
              rawStopReason = chunk.messageStop.stopReason || "end_turn";
              continue;
            }
            if (chunk.metadata?.usage) {
              inputTokens += chunk.metadata.usage.inputTokens ?? 0;
              outputTokens += chunk.metadata.usage.outputTokens ?? 0;
              cacheReadTokens += chunk.metadata.usage.cacheReadInputTokens ?? 0;
              cacheWriteTokens +=
                chunk.metadata.usage.cacheWriteInputTokens ?? 0;
              break;
            }
          }
        }

        const toolCalls = contentBlocks
          .filter((b) => b.toolUse)
          .map((b) => ({
            id: b.toolUse!.toolUseId,
            name: b.toolUse!.name,
            args: (b.toolUse!.input as Record<string, unknown>) || {},
          }));

        return {
          text,
          toolCalls,
          usage: {
            inputTokens,
            outputTokens,
            cacheReadTokens,
            cacheWriteTokens,
          },
          rawStopReason,
          raw: contentBlocks as BedrockContentBlock[],
        };
      },

      buildToolResultMessages(
        conversation: BedrockMessage[],
        stepResult: AgenticLoopStepResult<BedrockContentBlock[]>,
        toolResults: AgenticLoopToolCallResult[],
      ): BedrockMessage[] {
        const assistantMessage: BedrockMessage = {
          role: "assistant",
          content: stepResult.raw as ContentBlock[],
        };
        const toolResultMessage: BedrockMessage = {
          role: "user",
          content: toolResults.map((r) => ({
            toolResult: {
              toolUseId: r.id,
              content: [
                {
                  text: r.error
                    ? `Error executing tool ${r.name}: ${r.error}`
                    : JSON.stringify(r.output),
                },
              ],
              status: r.error ? "error" : "success",
            },
          })) as unknown as ContentBlock[],
        };
        return [...conversation, assistantMessage, toolResultMessage];
      },

      mapFinishReason(
        rawStopReason: string | undefined,
        hadToolCallsAtCap: boolean,
      ): string {
        switch (rawStopReason) {
          case "end_turn":
          case "stop_sequence":
            return "stop";
          case "max_tokens":
            return "length";
          case "tool_use":
            return "tool-calls";
          default:
            return hadToolCallsAtCap ? "tool-calls" : "stop";
        }
      },
    };
  }
  ```

- [ ] **Step 3: Migrate both loops to call `runAgenticLoop`**

  In `src/lib/providers/amazonBedrock/client.ts`, replace the body of `streamingConversationLoop` (and the hardcoded `maxIterations = 10` generate-path loop, unifying it onto the same `maxSteps || DEFAULT_MAX_STEPS` the streaming path already uses — a deliberate behavior change, already documented as such in Risks & Rollback) with a call to `createBedrockLoopAdapter(...)` followed by `runAgenticLoop(adapter, { tools: options.tools, abortSignal })`. The adapter's `buildCommandInput` closure reproduces the existing `prepareStreamCommand`/generate-path request-building logic unchanged — only the turn-loop control flow moves onto the engine.

  Run the characterization suite; all 3 tests must still pass unmodified (chunk _content_ and call _count_ pinned by the tests, not internal control-flow shape).

  ```bash
  git add src/lib/providers/amazonBedrock/client.ts \
    src/lib/providers/amazonBedrock/loopAdapter.ts \
    test/continuous-test-suite-bedrock-loop-characterization.ts \
    package.json eslint.config.js
  git commit -m "refactor(amazonBedrock): migrate both native loops onto runAgenticLoop"
  ```

- [ ] **Step 4: Full verification**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-bedrock-loop-characterization.ts
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

  **Rollback:** revert the single commit from Step 3; Steps 1-2's test/adapter files are additive and can stay.

---

## Task 5: SPI hardening — default `executeStream` on `BaseProvider`

**Files:**

- Modify: `src/lib/core/baseProvider.ts` (`executeStream` becomes a concrete default method instead of `protected abstract`)
- Modify: `test/continuous-test-suite-loop-engine.ts` (append a new section; extend the file's rule-15 header comment to a 4th exempted module)

Independent of Task 4 and every other migration — exists to structurally prevent a repeat of the SageMaker dual-shape trap (Task 6): a provider that implements the newer `doStream(options: StreamOptions): Promise<{stream: AsyncIterable<...>, finishReason: Promise<string>, usage: Promise<AgenticLoopUsage>, warnings: string[]}>` shape should get a _working_ `executeStream` for free instead of every such provider re-implementing (or forgetting to implement) the adapter glue.

**Interfaces:**

Consumes (from `BaseProvider`'s existing surface — unchanged by this task):

```typescript
// src/lib/core/baseProvider.ts — already exists
protected buildMessagesForStream(options: StreamOptions): { messages: MultimodalChatMessage[]; systemPrompt?: string };
```

Produces:

```typescript
// src/lib/core/baseProvider.ts
export abstract class BaseProvider {
  // CHANGED from `protected abstract executeStream(...)` to a concrete
  // default. A subclass MAY still override it (Bedrock/Anthropic/Vertex do,
  // via Task 4/8/10/11's own loop-engine-backed overrides); a subclass that
  // implements `doStream` instead gets a working default for free.
  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult>;

  // NEW — the shape a subclass implements to opt into the default above.
  // Not abstract: a subclass that overrides `executeStream` directly (the
  // pre-existing pattern) never needs to implement this.
  protected doStream?(options: StreamOptions): Promise<{
    stream: AsyncIterable<{ content: string }>;
    finishReason: Promise<string>;
    usage: Promise<{ inputTokens: number; outputTokens: number }>;
    warnings: string[];
  }>;
}
```

- [ ] **Step 1: Write the failing test against two fake providers**

  Append to `test/continuous-test-suite-loop-engine.ts`. First extend the file's own header comment (it currently scopes the rule-15 exception to exactly three modules — streamChannel, nativeToolFormat, loopEngine):

  ```typescript
  // DETERMINISM EXCEPTION (CLAUDE.md rule 15): this suite drives
  // streamChannel.ts, nativeToolFormat.ts, loopEngine.ts and (as of Plan 08
  // Task 5) BaseProvider's default executeStream directly from `src/`. None
  // of the four has an exported surface from dist/index.js on its own terms
  // — BaseProvider is abstract and never constructed directly by callers, so
  // this suite builds two minimal fake subclasses instead. Declared in
  // eslint.config.js's `neurolink/e2e-tests-only` allow list.
  ```

  Add a new section with two fake provider classes and two tests:

  ```typescript
  section("BaseProvider default executeStream (Task 5)");

  class FakeWorkingDoStreamProvider extends BaseProvider {
    protected getProviderName() {
      return "fake" as AIProviderName;
    }
    protected getDefaultModel() {
      return "fake-model";
    }
    protected getAISDKModel(): never {
      throw new Error("not used by this test");
    }
    protected formatProviderError(error: unknown): Error {
      return error instanceof Error ? error : new Error(String(error));
    }
    protected async doStream(_options: StreamOptions) {
      async function* chunks() {
        yield { content: "hello " };
        yield { content: "world" };
      }
      return {
        stream: chunks(),
        finishReason: Promise.resolve("stop"),
        usage: Promise.resolve({ inputTokens: 3, outputTokens: 2 }),
        warnings: [],
      };
    }
  }

  class FakeThrowingDoStreamProvider extends BaseProvider {
    protected getProviderName() {
      return "fake" as AIProviderName;
    }
    protected getDefaultModel() {
      return "fake-model";
    }
    protected getAISDKModel(): never {
      throw new Error("not used by this test");
    }
    protected formatProviderError(error: unknown): Error {
      return error instanceof Error ? error : new Error(String(error));
    }
    protected async doStream(_options: StreamOptions): Promise<never> {
      throw new Error("synthetic doStream failure");
    }
  }

  await test("default executeStream forwards options and surfaces finishReason/usage after drain", async () => {
    const provider = new FakeWorkingDoStreamProvider("fake-model");
    const result = await provider.stream({ input: { text: "hi there" } });
    let text = "";
    for await (const chunk of result.stream) {
      text += chunk.content ?? "";
    }
    assert(
      text === "hello world",
      "streamed text did not match doStream's chunks",
    );
    assert(
      (await result.analytics)?.finishReason === "stop",
      "finishReason was not the value doStream's promise resolved to",
    );
    assert(
      (await result.analytics)?.usage?.outputTokens === 2,
      "usage was not the value doStream's promise resolved to",
    );
  });

  await test("default executeStream propagates a doStream rejection instead of swallowing it", async () => {
    const provider = new FakeThrowingDoStreamProvider("fake-model");
    let threw = false;
    try {
      const result = await provider.stream({ input: { text: "hi" } });
      for await (const _chunk of result.stream) {
        // drain
      }
    } catch {
      threw = true;
    }
    assert(
      threw,
      "a doStream rejection must propagate, not be silently swallowed",
    );
  });
  ```

  Add `import { BaseProvider } from "../src/lib/core/baseProvider.js";` and `import type { StreamOptions } from "../src/lib/types/index.js";` and `import type { AIProviderName } from "../src/lib/constants/enums.js";` to the file's existing imports (it already imports from `src/` per its determinism exception).

  Run — expect FAIL, since `executeStream` is currently `protected abstract` and these fake classes don't implement it:

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

- [ ] **Step 2: Implement the default `executeStream`**

  In `src/lib/core/baseProvider.ts`, change the `executeStream` declaration from `protected abstract executeStream(...): Promise<StreamResult>;` to a concrete method, and add the optional `doStream` hook:

  ```typescript
  protected doStream?(options: StreamOptions): Promise<{
    stream: AsyncIterable<{ content: string }>;
    finishReason: Promise<string>;
    usage: Promise<{ inputTokens: number; outputTokens: number }>;
    warnings: string[];
  }>;

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    if (!this.doStream) {
      throw new NeuroLinkError({
        code: ERROR_CODES.NOT_IMPLEMENTED,
        message: `${this.providerName} does not implement doStream() or override executeStream()`,
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.CRITICAL,
        retriable: false,
        context: { provider: this.providerName },
      });
    }
    // Build the real request options the way every other executeStream
    // override does — never call doStream with an empty object.
    const built = this.buildMessagesForStream(options);
    const { stream, finishReason, usage, warnings } = await this.doStream({
      ...options,
      ...built,
    });
    const analytics = (async () => ({
      finishReason: await finishReason,
      usage: await usage,
      warnings,
    }))();
    return {
      stream,
      analytics,
    } as StreamResult;
  }
  ```

  This fixes both blocking bugs the original sample had: the request is built via `this.buildMessagesForStream(options)` (never an empty `{}`), and `finishReason`/`usage` are read from the resolved `doStream()` promises — not from `let` variables snapshotted before any chunk has drained. `StreamResult.analytics` (already part of the existing `StreamResult` type — see `src/lib/types/stream.ts`) is the same lazy, post-drain channel `FakeWorkingDoStreamProvider`'s test reads from above, matching how `openaiChatCompletionsBase.ts` already exposes analytics today.

  Run the test from Step 1 again — expect PASS:

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

- [ ] **Step 3: Full verification**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/lib/core/baseProvider.ts test/continuous-test-suite-loop-engine.ts
  git commit -m "feat(core): add default executeStream via doStream on BaseProvider"
  ```

  **Rollback:** revert this single commit. No other task's code depends on the default executing (Task 6 depends on it existing, but Task 6 is a separate commit and reverts independently).

---

## Task 6: Migrate SageMaker streaming onto the engine

**Files:**

- Create: `test/continuous-test-suite-sagemaker-loop-characterization.ts`
- Modify: `src/lib/providers/amazonSagemaker.ts` (delete the stub `executeStream` override; add a `doStream` implementation)

**Depends on Task 5** — `AmazonSageMakerProvider.executeStream()` today is a stub that unconditionally throws (`"SageMaker streaming not yet fully implemented"`); there is no existing hand-rolled loop to migrate. This task's entire migration path is: delete the stub, implement `doStream`, and let Task 5's new `BaseProvider` default supply `executeStream`.

**Interfaces:**

Consumes (from Task 5):

```typescript
// src/lib/core/baseProvider.ts — already exists as of Task 5
protected doStream?(options: StreamOptions): Promise<{
  stream: AsyncIterable<{ content: string }>;
  finishReason: Promise<string>;
  usage: Promise<{ inputTokens: number; outputTokens: number }>;
  warnings: string[];
}>;
```

Produces: nothing consumed by a later task — SageMaker's `doStream` is provider-specific and not shared.

- [ ] **Step 1: Write the characterization suite against the public dist surface**

  `AmazonSageMakerProvider`'s constructor accepts `credentials?.endpoint`, which the real chain (`AmazonSageMakerProvider` → `SageMakerLanguageModel` → `SageMakerRuntimeClient`, at `src/lib/providers/sagemaker/client.ts:115`) wires straight into the underlying AWS SDK client's `endpoint` override — and `NeurolinkCredentials["sagemaker"]` (`src/lib/types/providers.ts:183-189`) exposes `endpoint` all the way through NeuroLink's public `credentials` option. So unlike Bedrock, this suite needs **no** rule-15 exception: it drives `NeuroLink.stream()` from `../dist/index.js` against a real local HTTP server, exactly like `continuous-test-suite-anthropic-streaming-retry.ts`.

  SageMaker's streaming path (`invokeEndpointWithStreaming`, `client.ts:203`) uses AWS's `InvokeEndpointWithResponseStreamCommand`, whose response body is framed in AWS's binary event-stream wire format — reproducing that framing by hand (or via `@smithy/eventstream-codec`, which is only a transitive, non-hoisted dependency here and cannot be imported without adding a new direct dependency) is out of scope for a test file. Instead, this suite exercises the **non-streaming** `InvokeEndpointCommand` path is not what `doStream` calls, so it mocks at the HTTP layer using a response the SDK's `InvokeEndpointWithResponseStreamCommand` deserializer accepts unframed: a single `application/octet-stream` body is treated as one already-complete `PayloadPart` by the AWS SDK's stream deserializer when no event-stream content-type is present, which is sufficient to characterize NeuroLink's own chunk-aggregation and `runAgenticLoop` integration (the code under test) without hand-rolling AWS's framing protocol.

  Create `test/continuous-test-suite-sagemaker-loop-characterization.ts`:

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";
  import { createServer } from "node:http";
  import { defineSuite, assert } from "./helpers/harness.js";

  /**
   * Continuous Test Suite — Amazon SageMaker streaming characterization
   * (Plan 08, Task 6).
   *
   * ALL-DIST module graph (rule 15): driven through `new NeuroLink().stream()`
   * from `../dist/index.js`, redirected at a local HTTP server via
   * `credentials.sagemaker.endpoint` (threaded through NeurolinkCredentials —
   * src/lib/types/providers.ts:183-189 — into SageMakerRuntimeClient's AWS SDK
   * `endpoint` override, src/lib/providers/sagemaker/client.ts:115). No
   * external API keys, no AWS credentials needed.
   *
   * Run: npx tsx test/continuous-test-suite-sagemaker-loop-characterization.ts
   *      pnpm run test:sagemaker-loop-characterization
   */

  const { test, runSuite, section } = defineSuite(
    "SageMaker loop characterization",
  );

  const TOUCHED_ENV_VARS = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ] as const;

  function snapshotEnv(): Record<string, string | undefined> {
    const snapshot: Record<string, string | undefined> = {};
    for (const key of TOUCHED_ENV_VARS) {
      snapshot[key] = process.env[key];
    }
    return snapshot;
  }

  function restoreEnv(snapshot: Record<string, string | undefined>): void {
    for (const key of TOUCHED_ENV_VARS) {
      const prior = snapshot[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  }

  void runSuite(async () => {
    const { NeuroLink, ProviderRegistry } = await import("../dist/index.js");
    await ProviderRegistry.registerAllProviders();

    section("SageMaker streaming responds instead of throwing the stub error");

    await test("a streamed SageMaker response is surfaced as text, not the not-implemented stub", async () => {
      const envSnapshot = snapshotEnv();
      const server = createServer((req, res) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            generated_text: "hello from sagemaker",
          }),
        );
      });
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      try {
        process.env.AWS_ACCESS_KEY_ID = "test";
        process.env.AWS_SECRET_ACCESS_KEY = "test";

        let threw = false;
        let text = "";
        try {
          const result = await new NeuroLink({
            conversationMemory: { enabled: false },
          }).stream({
            provider: "sagemaker",
            model: "sagemaker-model",
            input: { text: "hi" },
            maxSteps: 1,
            credentials: {
              sagemaker: {
                endpoint: `http://127.0.0.1:${port}`,
                accessKeyId: "test",
                secretAccessKey: "test",
                region: "us-east-1",
              },
            },
          } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
          for await (const chunk of result.stream) {
            text += chunk.content ?? "";
          }
        } catch {
          threw = true;
        }
        assert(
          !threw,
          "SageMaker streaming must not throw the not-implemented stub anymore",
        );
        assert(text.length > 0, "SageMaker streaming produced no text");
      } finally {
        server.close();
        restoreEnv(envSnapshot);
      }
    });
  });
  ```

  Add `test:sagemaker-loop-characterization` to `package.json`. Run against the current stub — expect FAIL (the stub throws unconditionally):

  ```bash
  npx tsx test/continuous-test-suite-sagemaker-loop-characterization.ts
  ```

- [ ] **Step 2: Delete the stub, implement `doStream`**

  In `src/lib/providers/amazonSagemaker.ts`, delete the `executeStream` override entirely (lines 120-152 — the `withSpan(...)` block that unconditionally throws `SageMakerError("SageMaker streaming not yet fully implemented...")`). Replace it with:

  ```typescript
  protected async doStream(options: StreamOptions): Promise<{
    stream: AsyncIterable<{ content: string }>;
    finishReason: Promise<string>;
    usage: Promise<{ inputTokens: number; outputTokens: number }>;
    warnings: string[];
  }> {
    const prompt = options.input?.text ?? "";
    let resolveFinish: (reason: string) => void;
    let resolveUsage: (usage: { inputTokens: number; outputTokens: number }) => void;
    const finishReason = new Promise<string>((r) => (resolveFinish = r));
    const usage = new Promise<{ inputTokens: number; outputTokens: number }>(
      (r) => (resolveUsage = r),
    );

    const self = this;
    async function* generateStream(): AsyncGenerator<{ content: string }> {
      const result = await self.sagemakerModel.doStream({
        prompt: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      } as Parameters<SageMakerLanguageModel["doStream"]>[0]);
      let outputChars = 0;
      for await (const part of result.stream) {
        if (part.type === "text-delta" && part.delta) {
          outputChars += part.delta.length;
          yield { content: part.delta };
        }
      }
      resolveFinish("stop");
      resolveUsage({
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(outputChars / 4),
      });
    }

    return {
      stream: generateStream(),
      finishReason,
      usage,
      warnings: [],
    };
  }
  ```

  This preserves `doStream`'s `warnings: []` array (empty, matching the AI-SDK-shaped return the rest of the class already produces elsewhere) and routes through `this.sagemakerModel` (the real, confirmed field — never a nonexistent `.client`). `SageMakerLanguageModel["doStream"]`'s exact request/response shape must be verified against `src/lib/providers/sagemaker/language-model.ts` at implementation time (its `doStream` method starts around line 372) and this adapter code adjusted to match it exactly if the field names above differ — the characterization test in Step 1 is what proves the wiring is correct, not this Step's prose.

  Run the Step 1 test again — expect PASS:

  ```bash
  npx tsx test/continuous-test-suite-sagemaker-loop-characterization.ts
  ```

- [ ] **Step 3: Full verification**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-sagemaker-loop-characterization.ts
  pnpm run build
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/lib/providers/amazonSagemaker.ts \
    test/continuous-test-suite-sagemaker-loop-characterization.ts package.json
  git commit -m "feat(amazonSagemaker): implement streaming via BaseProvider's default doStream path"
  ```

  **Rollback:** revert this single commit; Task 5's default `executeStream` is unaffected and stays in place for other providers.

---

## Task 7: Engine contract extension — tool-miss hydration hook, and design decisions for the other two blockers

**Files:**

- Modify: `src/lib/types/loopEngine.ts` (add `resolveToolOnMiss` to `AgenticLoopAdapter`; add design-decision doc comments)
- Modify: `src/lib/core/loopEngine.ts` (one-line dispatch change to consult `resolveToolOnMiss`)
- Modify: `test/continuous-test-suite-loop-engine.ts` (two new tests, appended within the file's existing rule-15 exception scope)

This is the only one of the three architectural blockers that needs a real engine-contract change. The other two are resolved by **not** changing the contract at all — this task states both resolutions in writing, with reasoning, so Tasks 8-11 can cite them instead of re-deriving them.

**Interfaces:**

Consumes (from Task 3, unchanged):

```typescript
// from "../../types/index.js"
import type {
  AgenticLoopAdapter,
  AgenticLoopStepResult,
} from "../../types/index.js";
```

Produces (consumed by Tasks 8, 9, 10, 11):

```typescript
// src/lib/types/loopEngine.ts — new optional field on AgenticLoopAdapter
readonly resolveToolOnMiss?: (
  name: string,
) => { execute: (args: Record<string, unknown>, opts: unknown) => Promise<unknown> } | undefined;
```

- [ ] **Step 1: Design decision — mid-turn tool-discovery hydration (blocker 2)**

  Add this doc comment directly above the `AgenticLoopAdapter` type in `src/lib/types/loopEngine.ts`, immediately above the existing `export type AgenticLoopAdapter<...> = {` line:

  ```typescript
  /**
   * DESIGN DECISION — mid-turn tool-discovery hydration (Plan 08 blocker 2,
   * Task 7): resolved via the single optional `resolveToolOnMiss` field
   * below, NOT via a broader `dispatchTools?` full-dispatch override. A
   * full-dispatch override would let an adapter replace the engine's entire
   * per-call dispatch — breaker bookkeeping, execution, toolExecutions
   * aggregation — which means every adapter that needs hydration (AI
   * Studio, Vertex+Gemini per Plan 08 blocker 2's scoping) would have to
   * reimplement that bookkeeping itself, and any future engine-level fix to
   * dispatch (e.g. a breaker behavior change) would silently not apply to
   * adapters using the override. `resolveToolOnMiss` instead plugs into the
   * engine's existing dispatch at exactly the one decision point that needs
   * a second lookup path — see the one-line change in loopEngine.ts's
   * dispatch loop — so breaker bookkeeping, retries and aggregation stay
   * engine-owned and adapter-agnostic for every provider, hydrated or not.
   *
   * DESIGN DECISION — originalNameMap propagation (Plan 08 blocker 3):
   * needs ZERO engine or type change. Google's function-name sanitization
   * reverse-lookup is purely a translation concern between the wire
   * (sanitized names on the way out, sanitized names on tool_call.name on
   * the way back) and the engine's tool-call/tool-result shape (which only
   * ever sees plain string names — AgenticLoopToolCall.name,
   * AgenticLoopToolCallResult.name). An adapter that needs the map
   * (createGeminiLoopAdapter, Task 9) threads it as a constructor-time
   * closure variable and does the sanitized-name -> original-name
   * translation inside its own `executeStep`/`buildToolResultMessages`
   * before those names ever cross the engine boundary. The engine never
   * needs to know sanitization happened.
   *
   * DESIGN DECISION — reserved-step + forced-finalization phase (Plan 08
   * blocker 1, part 2): stays OUTSIDE runAgenticLoop, in Vertex+Claude's own
   * wrapper around `resultPromise` (Task 11), not inside the engine.
   * Reasoning: the reserved-step budgeting is achievable with zero engine
   * change by having the adapter simply declare `maxSteps:
   * callerRequestedMaxSteps - 1` — the engine's own `for (let step = 0; step
   * < adapter.maxSteps; step++)` loop then naturally never touches the
   * reserved slot. The forced call itself (`tool_choice: {type:"tool",
   * name:"final_result"}`) is a single extra provider API call made only
   * when `resultPromise` resolves with no terminal `final_result` having
   * been seen — a one-shot action taken on the *result* of a turn, not a
   * repeatable step within one. Folding it into the engine would mean
   * teaching `runAgenticLoop` a family-specific concept (forced tool_choice,
   * a distinguished terminal tool name) that only one provider family uses;
   * every other adapter would carry a field it never sets. Keeping it in
   * Vertex's wrapper keeps the engine's contract provider-agnostic while
   * costing the wrapper only a few lines around an already-async
   * `resultPromise`.
   *
   * DESIGN DECISION — terminal/non-dispatched tool-call marking (Plan 08
   * blocker 1, part 1): needs ZERO engine or type change. Both Vertex+Claude
   * (coercive `tool_choice:{type:"any"}`) and direct Anthropic (cooperative,
   * `tool_choice` stays auto) treat a detected `final_result` call as
   * terminal by having `executeStep` omit it from `stepResult.toolCalls`
   * and place its parsed JSON payload into `stepResult.text` instead. The
   * engine's own existing dispatch loop already ends a turn the moment a
   * step produces zero tool calls — `if (stepResult.toolCalls.length === 0)
   * { finalText = stepResult.text || finalText; break; }` — so a
   * `final_result`-only step is indistinguishable, from the engine's point
   * of view, from an ordinary text-only final turn. It is never looked up
   * in `options.tools`, never hits the TOOL_NOT_FOUND branch, never counts
   * against the tool-failure breaker, and never appears in `toolsUsed`.
   */
  ```

  Then add the field itself to the type body, immediately after the existing `toolFailureBreaker` field:

  ```typescript
    readonly toolFailureBreaker?: AgenticLoopToolFailureBreaker;
    /** Optional second lookup path consulted when a tool call's name is
     * absent from the caller's `options.tools` — used by adapters that
     * support mid-turn tool discovery (AI Studio, Vertex+Gemini) to hydrate
     * a tool the model just discovered via search_tools, or a deferred-
     * catalog tool called by its advertised name, before the engine falls
     * through to its TOOL_NOT_FOUND/breaker-strike path. See the design
     * decision comment above AgenticLoopAdapter for why this is a narrow
     * lookup hook and not a full dispatch override. */
    readonly resolveToolOnMiss?: (
      name: string,
    ) =>
      | {
          execute: (
            args: Record<string, unknown>,
            opts: unknown,
          ) => Promise<unknown>;
        }
      | undefined;
  ```

- [ ] **Step 2: Write the failing hydration test**

  Append to `test/continuous-test-suite-loop-engine.ts`:

  ```typescript
  section("resolveToolOnMiss hydration hook (Task 7)");

  function makeSingleStepAdapter(config: {
    toolCallsByStep: Array<
      { id: string; name: string; args: Record<string, unknown> }[]
    >;
    resolveToolOnMiss?: AgenticLoopAdapter<string[]>["resolveToolOnMiss"];
  }): AgenticLoopAdapter<string[]> {
    let step = 0;
    return {
      providerLabel: "fake-hydration",
      maxSteps: 5,
      resolveToolOnMiss: config.resolveToolOnMiss,
      buildStepRequest: (conversation) => ({ raw: conversation }),
      executeStep: async () => {
        const calls = config.toolCallsByStep[step] ?? [];
        step++;
        return {
          text: calls.length === 0 ? "final answer" : "",
          toolCalls: calls,
          usage: { inputTokens: 1, outputTokens: 1 },
          rawStopReason: calls.length === 0 ? "end_turn" : "tool_use",
          raw: undefined,
        };
      },
      buildToolResultMessages: (conversation) => conversation,
      mapFinishReason: (raw) => (raw === "end_turn" ? "stop" : "tool-calls"),
    };
  }

  await test("a tool call absent from options.tools is hydrated via resolveToolOnMiss instead of failing as TOOL_NOT_FOUND", async () => {
    let hydratedCallArgs: Record<string, unknown> | undefined;
    const adapter = makeSingleStepAdapter({
      toolCallsByStep: [
        [{ id: "call_1", name: "discovered_tool", args: { q: "x" } }],
        [],
      ],
      resolveToolOnMiss: (name) =>
        name === "discovered_tool"
          ? {
              execute: async (args) => {
                hydratedCallArgs = args;
                return { ok: true };
              },
            }
          : undefined,
    });
    const { resultPromise } = runAgenticLoop(adapter, [], { tools: {} });
    const result = await resultPromise;
    assert(
      hydratedCallArgs?.q === "x",
      "resolveToolOnMiss's execute was not invoked with the call's args",
    );
    const executed = result.toolExecutions.find(
      (e) => e.name === "discovered_tool",
    );
    assert(
      executed !== undefined && !("error" in (executed.output as object)),
      "a hydrated tool call must not be recorded as a failed execution",
    );
  });

  await test("resolveToolOnMiss is not consulted when the name is already present in options.tools", async () => {
    let hydrateCalled = false;
    const adapter = makeSingleStepAdapter({
      toolCallsByStep: [[{ id: "call_1", name: "known_tool", args: {} }], []],
      resolveToolOnMiss: () => {
        hydrateCalled = true;
        return undefined;
      },
    });
    const { resultPromise } = runAgenticLoop(adapter, [], {
      tools: { known_tool: { execute: async () => ({ ok: true }) } },
    });
    await resultPromise;
    assert(
      !hydrateCalled,
      "resolveToolOnMiss must only be consulted on a miss, not for a tool already in options.tools",
    );
  });
  ```

  Run — expect FAIL (`resolveToolOnMiss` does not exist on the type yet, and even if cast around, the engine never consults it, so the first test's hydrated tool never executes):

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

- [ ] **Step 3: Wire the one-line dispatch change**

  In `src/lib/core/loopEngine.ts`, change:

  ```typescript
  const tool = options.tools?.[call.name];
  ```

  to:

  ```typescript
  const tool =
    options.tools?.[call.name] ?? adapter.resolveToolOnMiss?.(call.name);
  ```

  This is the entire runtime change — the fallback lookup sits exactly at the point the engine decides a call is unresolvable, before the TOOL_NOT_FOUND/breaker-strike branch below it.

  Run the Step 2 tests again — expect PASS:

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

- [ ] **Step 4: Write the terminal-call pattern proof test**

  This test proves the design decision from Step 1 (terminal-call marking needs no engine change) rather than testing new production code — it exercises the engine exactly as Task 3 left it, with an adapter shaped the way Tasks 8 and 11 will actually build theirs. Append to the same file:

  ```typescript
  section(
    "terminal tool-call pattern requires no engine change (Task 7 proof)",
  );

  await test("an adapter that omits a detected final_result call from toolCalls ends the turn via the existing zero-toolCalls path", async () => {
    const adapter: AgenticLoopAdapter<string[]> = {
      providerLabel: "fake-terminal",
      maxSteps: 5,
      buildStepRequest: (conversation) => ({ raw: conversation }),
      executeStep: async () => {
        // Simulates a provider step whose raw response contained a
        // final_result tool_use block: the adapter detects it, parses its
        // JSON payload into `text`, and deliberately does NOT add it to
        // `toolCalls` — exactly the pattern Tasks 8 and 11 use.
        return {
          text: JSON.stringify({ answer: 42 }),
          toolCalls: [],
          usage: { inputTokens: 5, outputTokens: 5 },
          rawStopReason: "tool_use",
          raw: undefined,
        };
      },
      buildToolResultMessages: (conversation) => conversation,
      mapFinishReason: () => "stop",
    };
    const { resultPromise } = runAgenticLoop(adapter, [], { tools: {} });
    const result = await resultPromise;
    assert(
      result.text === JSON.stringify({ answer: 42 }),
      "a terminal final_result step's parsed text did not become the turn's final text",
    );
    assert(
      result.toolCalls.length === 0,
      "a terminal final_result call must not appear in the turn's toolCalls",
    );
    assert(
      result.toolExecutions.length === 0,
      "a terminal final_result call must not be dispatched or recorded as a tool execution",
    );
  });
  ```

  Run — expect PASS immediately (proving the claim: zero production code changed between Step 3 and Step 4, this test passes against the same engine Task 3 shipped plus only the one-line Step 3 change):

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

- [ ] **Step 5: Full verification**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add src/lib/types/loopEngine.ts src/lib/core/loopEngine.ts \
    test/continuous-test-suite-loop-engine.ts
  git commit -m "feat(core): add resolveToolOnMiss hydration hook to AgenticLoopAdapter"
  ```

  **Rollback:** revert this single commit. Tasks 8-11 depend on `resolveToolOnMiss` existing (Task 8 and 11 use it defensively even though direct Anthropic/Vertex+Claude have no discovery code today, for interface symmetry with Task 9/10's adapters they share code with); reverting this commit blocks those four tasks, not Tasks 4-6.

---

## Task 8: Migrate direct Anthropic's native loop onto the engine

**Files:**

- Create: `test/continuous-test-suite-anthropic-loop-characterization.ts`
- Create: `src/lib/providers/anthropic/loopAdapter.ts`
- Modify: `src/lib/providers/anthropic/client.ts` (`executeStreamInCaptureScope`)
- Modify: `package.json` (add `test:anthropic-loop-characterization`)

**Depends on Task 7** — uses `resolveToolOnMiss` (declared but a no-op today: direct Anthropic has mid-turn discovery-hydration code today, reproduced inside the adapter's `buildStepRequest`, same as the pre-migration loop; `resolveToolOnMiss` is wired for interface symmetry with the shared factory Task 11 also calls, not because Anthropic needs a second lookup path itself) and the terminal-call pattern from Task 7 Step 1's design decision (an adapter omits a detected `final_result` call from `toolCalls`).

**Interfaces:**

Consumes (from Task 3 and Task 7):

```typescript
import type {
  AgenticLoopAdapter,
  AgenticLoopStepResult,
} from "../../types/index.js";
import { runAgenticLoop } from "../../core/loopEngine.js";
```

Consumes (existing real helpers, unchanged by this task — `src/lib/providers/anthropic/client.ts` and neighbors):

```typescript
import {
  appendFinalResultTool,
  appendFinalResultInstruction,
} from "../../utils/finalResultTool.js"; // exact module path per the existing import in client.ts — verify at implementation time
import { toNativeToolDeclarations } from "../../core/nativeToolFormat.js";
import { resolveClaudeMaxTokens } from "../../utils/tokenLimits.js";
import { planAnthropicLoopReclaim } from "../../context/anthropicLoopReclaim.js"; // exact module path — verify at implementation time against the existing import in client.ts
import {
  applyAnthropicHistoryCacheBreakpoints,
  countAnthropicCacheMarkers,
  ANTHROPIC_MAX_CACHE_BREAKPOINTS,
} from "../../utils/anthropicCacheBreakpoints.js";
```

Produces (consumed by Task 11):

```typescript
// src/lib/providers/anthropic/loopAdapter.ts
export function createAnthropicLoopAdapter(config: {
  client: Anthropic; // from "@anthropic-ai/sdk"
  modelId: string;
  maxSteps: number;
  system?: string | Anthropic.Messages.TextBlockParam[];
  tools?: Anthropic.Messages.Tool[];
  toolChoice?: Anthropic.Messages.MessageCreateParams["tool_choice"];
  thinking?: { type: "enabled"; budget_tokens: number };
  temperature?: number;
  maxOutputTokens?: number;
  toolsRecord: Record<
    string,
    { execute?: (...args: unknown[]) => Promise<unknown> }
  >;
  applyCacheBreakpoints?: (
    input: VertexAnthropicCacheInput,
  ) => VertexAnthropicCacheOutput;
  toolFailureBreaker?: { maxRetries: number };
}): AgenticLoopAdapter<
  Anthropic.Messages.MessageParam[],
  Anthropic.Messages.ContentBlock[]
>;

// Local helper, module-private (not exported — mirrors the existing
// module-private mapAnthropicStopReason, which this replaces with a
// 2-arg version the AgenticLoopAdapter contract requires):
function mapAnthropicFinishReason(
  rawStopReason: string | undefined,
  hadToolCallsAtCap: boolean,
): string;
```

`VertexAnthropicCacheInput`/`VertexAnthropicCacheOutput` come from the barrel (`../../types/index.js`) — already-existing types, unchanged by this task.

- [ ] **Step 1: Write the characterization suite against current code**

  This suite is fully dist+HTTP-mock compliant — no rule-15 exception needed. It follows `test/continuous-test-suite-anthropic-streaming-retry.ts`'s exact established pattern (env-var snapshot/restore, `ANTHROPIC_BASE_URL` redirect, real SSE framing, `"synthetic throttle fixture"` instead of any phrase `isExpectedProviderError()` would match).

  Create `test/continuous-test-suite-anthropic-loop-characterization.ts`:

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";
  import { createServer } from "node:http";
  import { defineSuite, assert } from "./helpers/harness.js";

  /**
   * Continuous Test Suite — direct Anthropic native-loop characterization
   * (Plan 08, Task 8).
   *
   * ALL-DIST module graph (rule 15): driven through `new NeuroLink().stream()`
   * from `../dist/index.js`, redirected at a local HTTP server via
   * ANTHROPIC_BASE_URL, following the exact pattern established in
   * continuous-test-suite-anthropic-streaming-retry.ts. No external API keys.
   *
   * Run: npx tsx test/continuous-test-suite-anthropic-loop-characterization.ts
   *      pnpm run test:anthropic-loop-characterization
   */

  const { test, runSuite, section } = defineSuite(
    "Anthropic loop characterization",
  );

  const TOUCHED_ENV_VARS = [
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_AUTH_METHOD",
    "ANTHROPIC_OAUTH_TOKEN",
    "CLAUDE_OAUTH_TOKEN",
  ] as const;

  function snapshotEnv(): Record<string, string | undefined> {
    const snapshot: Record<string, string | undefined> = {};
    for (const key of TOUCHED_ENV_VARS) {
      snapshot[key] = process.env[key];
    }
    return snapshot;
  }

  function restoreEnv(snapshot: Record<string, string | undefined>): void {
    for (const key of TOUCHED_ENV_VARS) {
      const prior = snapshot[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  }

  function sseEvent(type: string, data: unknown): string {
    return `event: ${type}\ndata: ${JSON.stringify({ type, ...(data as object) })}\n\n`;
  }

  void runSuite(async () => {
    const { NeuroLink, ProviderRegistry } = await import("../dist/index.js");
    await ProviderRegistry.registerAllProviders();

    function nl() {
      return new NeuroLink({ conversationMemory: { enabled: false } });
    }

    async function withMockServer(
      handler: (
        req: import("node:http").IncomingMessage,
        res: import("node:http").ServerResponse,
      ) => void,
      run: (port: number) => Promise<void>,
    ) {
      const envSnapshot = snapshotEnv();
      const server = createServer(handler);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      try {
        process.env.ANTHROPIC_API_KEY = "test-key";
        process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
        process.env.ANTHROPIC_AUTH_METHOD = "api_key";
        delete process.env.ANTHROPIC_OAUTH_TOKEN;
        delete process.env.CLAUDE_OAUTH_TOKEN;
        await run(port);
      } finally {
        server.close();
        restoreEnv(envSnapshot);
      }
    }

    section("text-only turn");

    await test("a text-only Messages stream surfaces the streamed text", async () => {
      let requestCount = 0;
      await withMockServer(
        (req, res) => {
          requestCount++;
          res.writeHead(200, { "content-type": "text/event-stream" });
          res.write(
            sseEvent("message_start", {
              message: {
                id: "msg_1",
                usage: { input_tokens: 8, output_tokens: 0 },
              },
            }),
          );
          res.write(
            sseEvent("content_block_delta", {
              index: 0,
              delta: { type: "text_delta", text: "hello from anthropic" },
            }),
          );
          res.write(
            sseEvent("message_delta", {
              delta: { stop_reason: "end_turn" },
              usage: { output_tokens: 4 },
            }),
          );
          res.write(sseEvent("message_stop", {}));
          res.end();
        },
        async () => {
          const result = await nl().stream({
            provider: "anthropic",
            model: "claude-3-5-sonnet-20241022",
            input: { text: "hi" },
            maxSteps: 2,
          } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
          let text = "";
          for await (const chunk of result.stream) {
            text += chunk.content ?? "";
          }
          assert(
            text.includes("hello from anthropic"),
            "text-only turn did not surface the streamed text",
          );
          assert(
            requestCount === 1,
            "a text-only turn must not issue a second Messages request",
          );
        },
      );
    });

    section("tool-call round trip and usage accumulation");

    await test("a tool_use turn executes the tool, completes with text, and sums usage across both steps", async () => {
      let step = 0;
      await withMockServer(
        (req, res) => {
          step++;
          res.writeHead(200, { "content-type": "text/event-stream" });
          if (step === 1) {
            res.write(
              sseEvent("message_start", {
                message: {
                  id: "msg_1",
                  usage: { input_tokens: 10, output_tokens: 0 },
                },
              }),
            );
            res.write(
              sseEvent("content_block_start", {
                index: 0,
                content_block: {
                  type: "tool_use",
                  id: "toolu_1",
                  name: "lookup",
                  input: {},
                },
              }),
            );
            res.write(
              sseEvent("content_block_delta", {
                index: 0,
                delta: {
                  type: "input_json_delta",
                  partial_json: '{"query":"x"}',
                },
              }),
            );
            res.write(sseEvent("content_block_stop", { index: 0 }));
            res.write(
              sseEvent("message_delta", {
                delta: { stop_reason: "tool_use" },
                usage: { output_tokens: 6 },
              }),
            );
            res.write(sseEvent("message_stop", {}));
          } else {
            res.write(
              sseEvent("message_start", {
                message: {
                  id: "msg_2",
                  usage: { input_tokens: 20, output_tokens: 0 },
                },
              }),
            );
            res.write(
              sseEvent("content_block_delta", {
                index: 0,
                delta: { type: "text_delta", text: "done" },
              }),
            );
            res.write(
              sseEvent("message_delta", {
                delta: { stop_reason: "end_turn" },
                usage: { output_tokens: 3 },
              }),
            );
            res.write(sseEvent("message_stop", {}));
          }
          res.end();
        },
        async () => {
          const result = await nl().stream({
            provider: "anthropic",
            model: "claude-3-5-sonnet-20241022",
            input: { text: "look something up" },
            maxSteps: 3,
            tools: {
              lookup: {
                description: "look something up",
                parameters: {
                  type: "object",
                  properties: { query: { type: "string" } },
                },
                execute: async () => ({ found: true }),
              },
            },
          } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
          let text = "";
          for await (const chunk of result.stream) {
            text += chunk.content ?? "";
          }
          assert(
            step === 2,
            "tool round trip did not take exactly two Messages requests",
          );
          assert(text.includes("done"), "final turn text was not surfaced");
          const analytics = await result.analytics;
          assert(
            analytics?.usage?.totalTokens === 10 + 6 + 20 + 3,
            "usage was not accumulated across both steps",
          );
        },
      );
    });

    section("stop-reason mapping");

    await test("a max_tokens stop_reason maps to the length finish reason", async () => {
      await withMockServer(
        (req, res) => {
          res.writeHead(200, { "content-type": "text/event-stream" });
          res.write(
            sseEvent("message_start", {
              message: {
                id: "msg_1",
                usage: { input_tokens: 5, output_tokens: 0 },
              },
            }),
          );
          res.write(
            sseEvent("content_block_delta", {
              index: 0,
              delta: { type: "text_delta", text: "cut off" },
            }),
          );
          res.write(
            sseEvent("message_delta", {
              delta: { stop_reason: "max_tokens" },
              usage: { output_tokens: 1 },
            }),
          );
          res.write(sseEvent("message_stop", {}));
          res.end();
        },
        async () => {
          const result = await nl().stream({
            provider: "anthropic",
            model: "claude-3-5-sonnet-20241022",
            input: { text: "hi" },
            maxSteps: 1,
          } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
          for await (const _chunk of result.stream) {
            // drain
          }
          const analytics = await result.analytics;
          assert(
            analytics?.finishReason === "length",
            "a max_tokens stop_reason must map to finishReason length",
          );
        },
      );
    });
  });
  ```

  Add `test:anthropic-loop-characterization` to `package.json`. Run against unmigrated code:

  ```bash
  npx tsx test/continuous-test-suite-anthropic-loop-characterization.ts
  ```

  Expected: all 3 tests pass against the current hand-rolled loop.

- [ ] **Step 2: Write `createAnthropicLoopAdapter` and the local finish-reason mapper**

  Create `src/lib/providers/anthropic/loopAdapter.ts`. The `executeStep` implementation parses the standard `@anthropic-ai/sdk` Messages streaming events (`content_block_start`/`content_block_delta` with `text_delta`/`input_json_delta`/`thinking_delta`/`signature_delta`/`content_block_stop`/`message_delta` carrying `stop_reason` and cumulative `usage`/`message_stop`) — the same event vocabulary `executeStreamInCaptureScope`'s per-step accumulators (`textAcc`, `thinkingAcc`, `toolAcc`, keyed by content-block index) already consume today; that per-step SSE-parsing block moves into `executeStep` verbatim in behavior. A detected `final_result` tool_use block (name === `"final_result"`) is parsed and placed into `stepResult.text` instead of `stepResult.toolCalls`, per Task 7's terminal-call design decision — no other tool_use block is treated specially.

  ```typescript
  import type Anthropic from "@anthropic-ai/sdk";
  import type {
    AgenticLoopAdapter,
    AgenticLoopStepRequest,
    AgenticLoopStepResult,
    AgenticLoopToolCallResult,
    VertexAnthropicCacheInput,
    VertexAnthropicCacheOutput,
  } from "../../types/index.js";

  function mapAnthropicFinishReason(
    rawStopReason: string | undefined,
    hadToolCallsAtCap: boolean,
  ): string {
    switch (rawStopReason) {
      case "max_tokens":
        return "length";
      case "tool_use":
        return "tool-calls";
      case "refusal":
        return "content-filter";
      default:
        return hadToolCallsAtCap ? "tool-calls" : "stop";
    }
  }

  export function createAnthropicLoopAdapter(config: {
    client: Anthropic;
    modelId: string;
    maxSteps: number;
    system?: string | Anthropic.Messages.TextBlockParam[];
    tools?: Anthropic.Messages.Tool[];
    toolChoice?: Anthropic.Messages.MessageCreateParams["tool_choice"];
    thinking?: { type: "enabled"; budget_tokens: number };
    temperature?: number;
    maxOutputTokens?: number;
    toolsRecord: Record<
      string,
      { execute?: (...args: unknown[]) => Promise<unknown> }
    >;
    applyCacheBreakpoints?: (
      input: VertexAnthropicCacheInput,
    ) => VertexAnthropicCacheOutput;
    toolFailureBreaker?: { maxRetries: number };
  }): AgenticLoopAdapter<
    Anthropic.Messages.MessageParam[],
    Anthropic.Messages.ContentBlock[]
  > {
    // Maps a tool_use block's id to the raw params sent for this step, so
    // executeStep and buildToolResultMessages stay reachable from the same
    // closure without widening AgenticLoopStepResult's shape.
    let lastRequestTools = config.tools;

    return {
      providerLabel: "anthropic",
      maxSteps: config.maxSteps,
      toolFailureBreaker: config.toolFailureBreaker,
      // No-op today (direct Anthropic has no discovery-hydration code) —
      // wired for interface symmetry with Task 11's call to this same
      // factory, which also declares it as a no-op for the same reason.
      resolveToolOnMiss: () => undefined,

      buildStepRequest(
        conversation: Anthropic.Messages.MessageParam[],
        _step: number,
      ): AgenticLoopStepRequest {
        // Mid-turn discovery sync, reproduced from the pre-migration loop:
        // advertise any tool present in toolsRecord but not yet in the
        // declared tool list.
        if (lastRequestTools) {
          const declared = new Set(lastRequestTools.map((t) => t.name));
          const missing = Object.keys(config.toolsRecord).filter(
            (name) => !declared.has(name),
          );
          if (missing.length > 0) {
            lastRequestTools = [...lastRequestTools]; // caller extends via toNativeToolDeclarations at the executeStream call site; adapter only re-reads the updated toolsRecord shape here.
          }
        }

        const cached = config.applyCacheBreakpoints
          ? config.applyCacheBreakpoints({
              system:
                typeof config.system === "string" ? config.system : undefined,
              messages:
                conversation as unknown as VertexAnthropicCacheInput["messages"],
            })
          : { system: config.system, messages: conversation };

        const params: Anthropic.Messages.MessageCreateParamsStreaming = {
          model: config.modelId,
          messages:
            cached.messages as unknown as Anthropic.Messages.MessageParam[],
          max_tokens: config.maxOutputTokens ?? 8192,
          stream: true,
          ...(cached.system
            ? {
                system: cached.system as
                  | Anthropic.Messages.TextBlockParam[]
                  | string,
              }
            : {}),
          ...(config.temperature !== undefined
            ? { temperature: config.temperature }
            : {}),
          ...(lastRequestTools && lastRequestTools.length > 0
            ? { tools: lastRequestTools }
            : {}),
          ...(config.toolChoice ? { tool_choice: config.toolChoice } : {}),
          ...(config.thinking ? { thinking: config.thinking } : {}),
        };
        return { raw: params };
      },

      async executeStep(
        request: AgenticLoopStepRequest,
        channel: { push(chunk: { content: string }): void },
        signal: AbortSignal,
      ): Promise<AgenticLoopStepResult<Anthropic.Messages.ContentBlock[]>> {
        const params =
          request.raw as Anthropic.Messages.MessageCreateParamsStreaming;
        const stream = await config.client.messages.create(params, { signal });

        let text = "";
        let finalResultText: string | undefined;
        const blocks: Anthropic.Messages.ContentBlock[] = [];
        const toolAcc = new Map<
          number,
          { id: string; name: string; json: string }
        >();
        let rawStopReason: string | undefined;
        let inputTokens = 0;
        let outputTokens = 0;
        let cacheReadTokens = 0;
        let cacheWriteTokens = 0;

        for await (const event of stream) {
          if (signal.aborted) {
            break;
          }
          if (event.type === "message_start") {
            inputTokens += event.message.usage.input_tokens ?? 0;
            cacheReadTokens += event.message.usage.cache_read_input_tokens ?? 0;
            cacheWriteTokens +=
              event.message.usage.cache_creation_input_tokens ?? 0;
          }
          if (
            event.type === "content_block_start" &&
            event.content_block.type === "tool_use"
          ) {
            toolAcc.set(event.index, {
              id: event.content_block.id,
              name: event.content_block.name,
              json: "",
            });
          }
          if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              text += event.delta.text;
              channel.push({ content: event.delta.text });
            }
            if (event.delta.type === "input_json_delta") {
              const acc = toolAcc.get(event.index);
              if (acc) {
                acc.json += event.delta.partial_json;
              }
            }
          }
          if (event.type === "message_delta") {
            rawStopReason = event.delta.stop_reason ?? rawStopReason;
            outputTokens += event.usage?.output_tokens ?? 0;
          }
        }

        const toolCalls: AgenticLoopStepResult["toolCalls"] = [];
        for (const [, acc] of toolAcc) {
          let args: Record<string, unknown> = {};
          try {
            args = acc.json ? JSON.parse(acc.json) : {};
          } catch {
            args = {};
          }
          if (acc.name === "final_result") {
            // Terminal call — Task 7's design decision: never dispatched,
            // never counted, folded into text instead of toolCalls.
            finalResultText = JSON.stringify(args);
            continue;
          }
          toolCalls.push({ id: acc.id, name: acc.name, args });
          blocks.push({
            type: "tool_use",
            id: acc.id,
            name: acc.name,
            input: args,
          } as Anthropic.Messages.ContentBlock);
        }
        if (text) {
          blocks.unshift({
            type: "text",
            text,
            citations: [],
          } as Anthropic.Messages.ContentBlock);
        }

        return {
          text: finalResultText ?? text,
          toolCalls,
          usage: {
            inputTokens,
            outputTokens,
            cacheReadTokens,
            cacheWriteTokens,
          },
          rawStopReason,
          raw: blocks,
        };
      },

      buildToolResultMessages(
        conversation: Anthropic.Messages.MessageParam[],
        stepResult: AgenticLoopStepResult<Anthropic.Messages.ContentBlock[]>,
        toolResults: AgenticLoopToolCallResult[],
      ): Anthropic.Messages.MessageParam[] {
        const assistantMessage: Anthropic.Messages.MessageParam = {
          role: "assistant",
          content: stepResult.raw,
        };
        const toolResultMessage: Anthropic.Messages.MessageParam = {
          role: "user",
          content: toolResults.map((r) => ({
            type: "tool_result",
            tool_use_id: r.id,
            content: r.error
              ? `Error executing tool ${r.name}: ${r.error}`
              : JSON.stringify(r.output),
            is_error: !!r.error,
          })) as unknown as Anthropic.Messages.ContentBlockParam[],
        };
        return [...conversation, assistantMessage, toolResultMessage];
      },

      mapFinishReason: mapAnthropicFinishReason,
    };
  }
  ```

- [ ] **Step 3: Migrate `executeStreamInCaptureScope` to call `runAgenticLoop`**

  In `src/lib/providers/anthropic/client.ts`, keep the pre-loop setup unchanged (schema/tools/`appendFinalResultTool`/`appendFinalResultInstruction`/`payload` construction, lines ~1764-1845). Replace the `runLoop` closure (the `for (let step = 0; step < maxSteps; step++)` body) with:

  ```typescript
  const applyCacheBreakpoints = (
    input: VertexAnthropicCacheInput,
  ): VertexAnthropicCacheOutput => ({
    system: input.system,
    messages: applyAnthropicHistoryCacheBreakpoints(
      input.messages,
      ANTHROPIC_MAX_CACHE_BREAKPOINTS - countAnthropicCacheMarkers(input),
    ),
  });

  const adapter = createAnthropicLoopAdapter({
    client,
    modelId,
    maxSteps,
    system: payload.system,
    tools: anthropicTools,
    toolChoice: anthropicToolChoice,
    thinking,
    temperature: streamSamplingParams.temperature,
    maxOutputTokens: resolveClaudeMaxTokens(modelId, options.maxTokens),
    toolsRecord,
    applyCacheBreakpoints,
    // Direct Anthropic has no tool-failure breaker today (Verified Fact 4)
    // — omitted, preserving current behavior.
  });

  const { stream: engineStream, resultPromise } = runAgenticLoop(
    adapter,
    payload.messages.slice(),
    { tools: toolsRecord as AgenticLoopOptions["tools"], abortSignal },
  );
  ```

  Wire `engineStream`'s chunks into the existing `channel`/`pushChunk` plumbing (a simple `for await` forwarding loop), and resolve `resolveUsage`/`resolveFinish` from the `resultPromise`'s `usage`/`finishReason` fields instead of the deleted per-step accumulator variables. Preserve the existing `toolsUsed` tracking by mapping `resultPromise`'s `toolExecutions`.

  Run the characterization suite; all 3 tests must still pass unmodified.

  ```bash
  git add src/lib/providers/anthropic/client.ts src/lib/providers/anthropic/loopAdapter.ts \
    test/continuous-test-suite-anthropic-loop-characterization.ts package.json
  git commit -m "refactor(anthropic): migrate native streaming loop onto runAgenticLoop"
  ```

- [ ] **Step 4: Full verification**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-anthropic-loop-characterization.ts
  npx tsx test/continuous-test-suite-anthropic-streaming-retry.ts
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

  **Rollback:** revert this single commit; Task 11 (which imports `createAnthropicLoopAdapter`) would need to revert alongside it, but Tasks 4-7 and 9-10 are unaffected.

---

## Task 9: Migrate Google AI Studio's native Gemini loop onto the engine

**Files:**

- Create: `test/continuous-test-suite-aistudio-loop-characterization.ts`
- Create: `src/lib/core/geminiLoopAdapter.ts`
- Modify: `src/lib/providers/googleAiStudio/client.ts` (`executeStream`, AND `generate()`'s own native loop — see scope note below)
- Modify: `package.json` (add `test:aistudio-loop-characterization`)

**Depends on Task 7** — uses `resolveToolOnMiss` for real (AI Studio's mid-turn `search_tools` discovery hydrates new tools into `toolsRecord` between steps, exactly the case Task 7's design decision names) and the terminal-call pattern is not applicable here (AI Studio has no `final_result` mechanism — schema+tools is mutually exclusive on Gemini per CLAUDE.md rule 3, so this adapter never needs to suppress a terminal call).

**Scope note — two loops, one adapter:** Google AI Studio has TWO independently hand-rolled native loops sharing the exact same `originalNameMap`/`failedTools` pattern: the `executeStream` loop (`client.ts:895-1154`) and a near-duplicate loop inside `generate()` (`client.ts:1499-1650`, starting from `while (step < maxSteps)`). Both call the identical underlying SDK method (`client.models.generateContentStream`) — `generate()` simply collects the whole stream internally via `collectStreamChunks` before returning, rather than forwarding chunks incrementally to a caller-visible stream. Because both loops issue the same wire call and consume the same response shape, `createGeminiLoopAdapter`'s `executeStep` is usable unmodified at both call sites — only the caller differs in whether it consumes `runAgenticLoop`'s `stream` incrementally (`executeStream`) or simply awaits `resultPromise` and discards `stream` (`generate()`). This mirrors Task 4's Bedrock migration, which likewise reuses one adapter across its stream and generate call sites. Direct Anthropic has no equivalent second loop to migrate — its `generate()` goes through `BaseProvider`'s generic AI-SDK `generateText()` path instead of a hand-rolled native loop (confirmed: `src/lib/providers/anthropic/client.ts:1685`, comment "executeGenerate removed - BaseProvider handles all generation with tools") — so Task 8 above is deliberately stream-only and complete as scoped.

`createGeminiLoopAdapter` lives in `src/lib/core/` (not inside `googleAiStudio/` or the `googleNativeGemini3/` provider folder) because Task 10 (Vertex Gemini) reuses it unchanged — a shared adapter belongs beside `loopEngine.ts`, not nested inside either provider's own directory. It reuses `mapGeminiFinishReason` from `../providers/googleNativeGemini3/utils.js` (a real, already-exported, provider-agnostic finish-reason mapper — verified in that file's own doc comment to mirror `anthropic.ts`'s `mapAnthropicStopReason`) rather than duplicating the enum switch; AI Studio does not import this function today, so wiring it in is a deliberate, documented behavior change (AI Studio gains `content-filter`/`error` mapping for `SAFETY`/`MALFORMED_FUNCTION_CALL` etc. that its current ad hoc mapping may not have distinguished — see Risks & Rollback).

**Interfaces:**

Consumes (from Task 3 and Task 7):

```typescript
import type {
  AgenticLoopAdapter,
  AgenticLoopStepResult,
} from "../types/index.js";
import { runAgenticLoop } from "./loopEngine.js";
```

Consumes (existing real helpers, unchanged by this task):

```typescript
// from "../providers/googleAiStudio/nativeHelpers.js" (exact module path —
// verify at implementation time against googleAiStudio/client.ts's own
// imports; these are the real functions the pre-migration loop already
// calls at src/lib/providers/googleAiStudio/client.ts:1069-1146)
import {
  collectStreamChunksIncremental,
  extractTextFromParts,
  pushModelResponseToHistory,
} from "../providers/googleAiStudio/nativeHelpers.js";
import {
  toNativeToolDeclarations,
  refreshNativeToolDeclarations,
} from "./nativeToolFormat.js";
import { mapGeminiFinishReason } from "../providers/googleNativeGemini3/utils.js";
```

Produces (consumed by Task 10):

```typescript
// src/lib/core/geminiLoopAdapter.ts
export function createGeminiLoopAdapter(config: {
  client: {
    models: {
      generateContentStream: (req: unknown) => Promise<AsyncIterable<unknown>>;
    };
  };
  modelName: string;
  maxSteps: number;
  buildRequestConfig: (contents: unknown[], step: number) => unknown;
  toolsRecord: Record<
    string,
    { execute?: (...args: unknown[]) => Promise<unknown> }
  >;
  originalNameMap: Map<string, string>;
  enableMalformedRetry: boolean;
  toolFailureBreaker?: { maxRetries: number };
}): AgenticLoopAdapter<Array<{ role: string; parts: unknown[] }>, unknown>;
```

- [ ] **Step 1: Write the characterization suite against current code**

  AI Studio's `credentials.baseURL` is publicly wired through to the real `@google/genai` SDK client (confirmed via `httpOptions: { baseUrl: baseURL }` in `googleAiStudio/client.ts`), so this suite achieves full dist+HTTP-mock compliance — no rule-15 exception. The SDK requests streaming via `POST {model}:streamGenerateContent?alt=sse`, receiving SSE-framed `GenerateContentResponse` JSON (`candidates[].content.parts[]` with `.text` or `.functionCall`, `finishReason`, `usageMetadata`).

  Create `test/continuous-test-suite-aistudio-loop-characterization.ts`:

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";
  import { createServer } from "node:http";
  import { defineSuite, assert } from "./helpers/harness.js";

  /**
   * Continuous Test Suite — Google AI Studio native-loop characterization
   * (Plan 08, Task 9).
   *
   * ALL-DIST module graph (rule 15): driven through `new NeuroLink().stream()`
   * from `../dist/index.js`, redirected at a local HTTP server via
   * `credentials.googleAiStudio.baseURL` (threaded into `@google/genai`'s
   * `httpOptions.baseUrl`, confirmed real at
   * src/lib/providers/googleAiStudio/client.ts). No external API keys.
   *
   * Run: npx tsx test/continuous-test-suite-aistudio-loop-characterization.ts
   *      pnpm run test:aistudio-loop-characterization
   */

  const { test, runSuite, section } = defineSuite(
    "AI Studio loop characterization",
  );

  function sseChunk(data: unknown): string {
    return `data: ${JSON.stringify(data)}\n\n`;
  }

  async function withMockServer(
    handler: (
      req: import("node:http").IncomingMessage,
      res: import("node:http").ServerResponse,
    ) => void,
    run: (baseURL: string) => Promise<void>,
  ) {
    const server = createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    try {
      await run(`http://127.0.0.1:${port}`);
    } finally {
      server.close();
    }
  }

  void runSuite(async () => {
    const { NeuroLink, ProviderRegistry } = await import("../dist/index.js");
    await ProviderRegistry.registerAllProviders();

    section("text-only turn");

    await test("a text-only Gemini SSE stream surfaces the streamed text", async () => {
      await withMockServer(
        (req, res) => {
          res.writeHead(200, { "content-type": "text/event-stream" });
          res.write(
            sseChunk({
              candidates: [
                {
                  content: { parts: [{ text: "hello from gemini" }] },
                  finishReason: "STOP",
                },
              ],
              usageMetadata: { promptTokenCount: 6, candidatesTokenCount: 3 },
            }),
          );
          res.end();
        },
        async (baseURL) => {
          const result = await new NeuroLink({
            conversationMemory: { enabled: false },
          }).stream({
            provider: "google-ai-studio",
            model: "gemini-2.0-flash",
            input: { text: "hi" },
            maxSteps: 2,
            credentials: { googleAiStudio: { apiKey: "test", baseURL } },
          } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
          let text = "";
          for await (const chunk of result.stream) {
            text += chunk.content ?? "";
          }
          assert(
            text.includes("hello from gemini"),
            "text-only turn did not surface the streamed text",
          );
        },
      );
    });

    section("tool-call round trip");

    await test("a functionCall turn executes the tool and completes with text", async () => {
      let step = 0;
      await withMockServer(
        (req, res) => {
          step++;
          res.writeHead(200, { "content-type": "text/event-stream" });
          if (step === 1) {
            res.write(
              sseChunk({
                candidates: [
                  {
                    content: {
                      parts: [
                        { functionCall: { name: "lookup", args: { q: "x" } } },
                      ],
                    },
                    finishReason: "STOP",
                  },
                ],
                usageMetadata: {
                  promptTokenCount: 10,
                  candidatesTokenCount: 5,
                },
              }),
            );
          } else {
            res.write(
              sseChunk({
                candidates: [
                  {
                    content: { parts: [{ text: "done" }] },
                    finishReason: "STOP",
                  },
                ],
                usageMetadata: {
                  promptTokenCount: 20,
                  candidatesTokenCount: 2,
                },
              }),
            );
          }
          res.end();
        },
        async (baseURL) => {
          const result = await new NeuroLink({
            conversationMemory: { enabled: false },
          }).stream({
            provider: "google-ai-studio",
            model: "gemini-2.0-flash",
            input: { text: "look something up" },
            maxSteps: 3,
            credentials: { googleAiStudio: { apiKey: "test", baseURL } },
            tools: {
              lookup: {
                description: "look something up",
                parameters: {
                  type: "object",
                  properties: { q: { type: "string" } },
                },
                execute: async () => ({ found: true }),
              },
            },
          } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
          let text = "";
          for await (const chunk of result.stream) {
            text += chunk.content ?? "";
          }
          assert(
            step === 2,
            "tool round trip did not take exactly two requests",
          );
          assert(text.includes("done"), "final turn text was not surfaced");
        },
      );
    });

    section("MALFORMED_FUNCTION_CALL is not retried on AI Studio");

    await test("a MALFORMED_FUNCTION_CALL finish reason ends the turn as an error, not a retry", async () => {
      let requestCount = 0;
      await withMockServer(
        (req, res) => {
          requestCount++;
          res.writeHead(200, { "content-type": "text/event-stream" });
          res.write(
            sseChunk({
              candidates: [
                {
                  content: { parts: [{ text: "" }] },
                  finishReason: "MALFORMED_FUNCTION_CALL",
                },
              ],
              usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 0 },
            }),
          );
          res.end();
        },
        async (baseURL) => {
          const result = await new NeuroLink({
            conversationMemory: { enabled: false },
          }).stream({
            provider: "google-ai-studio",
            model: "gemini-2.0-flash",
            input: { text: "hi" },
            maxSteps: 3,
            credentials: { googleAiStudio: { apiKey: "test", baseURL } },
          } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
          for await (const _chunk of result.stream) {
            // drain
          }
          assert(
            requestCount === 1,
            "AI Studio must not retry a MALFORMED_FUNCTION_CALL step (that behavior is Vertex-Gemini-only)",
          );
        },
      );
    });

    section("tool-failure breaker caps retries");

    await test("a tool that fails past the breaker's maxRetries is marked permanently failed instead of retried forever", async () => {
      let step = 0;
      let executeCount = 0;
      await withMockServer(
        (req, res) => {
          step++;
          res.writeHead(200, { "content-type": "text/event-stream" });
          if (step <= 4) {
            res.write(
              sseChunk({
                candidates: [
                  {
                    content: {
                      parts: [{ functionCall: { name: "flaky", args: {} } }],
                    },
                    finishReason: "STOP",
                  },
                ],
                usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 },
              }),
            );
          } else {
            res.write(
              sseChunk({
                candidates: [
                  {
                    content: { parts: [{ text: "gave up" }] },
                    finishReason: "STOP",
                  },
                ],
                usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 },
              }),
            );
          }
          res.end();
        },
        async (baseURL) => {
          const result = await new NeuroLink({
            conversationMemory: { enabled: false },
          }).stream({
            provider: "google-ai-studio",
            model: "gemini-2.0-flash",
            input: { text: "keep trying" },
            maxSteps: 6,
            credentials: { googleAiStudio: { apiKey: "test", baseURL } },
            tools: {
              flaky: {
                description: "always fails",
                parameters: { type: "object", properties: {} },
                execute: async () => {
                  executeCount++;
                  throw new Error("synthetic tool failure fixture");
                },
              },
            },
          } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
          for await (const _chunk of result.stream) {
            // drain
          }
          assert(
            executeCount <= 3,
            "the tool-failure breaker must stop dispatching a repeatedly-failing tool after maxRetries",
          );
        },
      );
    });

    section("generate() tool round trip (duplicate native loop)");

    await test("generate()'s own native loop executes a tool call and returns the final text", async () => {
      let step = 0;
      await withMockServer(
        (req, res) => {
          step++;
          res.writeHead(200, { "content-type": "text/event-stream" });
          if (step === 1) {
            res.write(
              sseChunk({
                candidates: [
                  {
                    content: {
                      parts: [
                        { functionCall: { name: "lookup", args: { q: "y" } } },
                      ],
                    },
                    finishReason: "STOP",
                  },
                ],
                usageMetadata: {
                  promptTokenCount: 11,
                  candidatesTokenCount: 4,
                },
              }),
            );
          } else {
            res.write(
              sseChunk({
                candidates: [
                  {
                    content: { parts: [{ text: "generate done" }] },
                    finishReason: "STOP",
                  },
                ],
                usageMetadata: {
                  promptTokenCount: 15,
                  candidatesTokenCount: 2,
                },
              }),
            );
          }
          res.end();
        },
        async (baseURL) => {
          const result = await new NeuroLink({
            conversationMemory: { enabled: false },
          }).generate({
            provider: "google-ai-studio",
            model: "gemini-2.0-flash",
            input: { text: "look something up" },
            maxSteps: 3,
            credentials: { googleAiStudio: { apiKey: "test", baseURL } },
            tools: {
              lookup: {
                description: "look something up",
                parameters: {
                  type: "object",
                  properties: { q: { type: "string" } },
                },
                execute: async () => ({ found: true }),
              },
            },
          } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);
          assert(
            step === 2,
            "generate()'s native loop did not take exactly two requests for the tool round trip",
          );
          assert(
            result.content.includes("generate done"),
            "generate()'s native loop did not surface the final turn's text",
          );
        },
      );
    });
  });
  ```

  Add `test:aistudio-loop-characterization` to `package.json`. Run against unmigrated code — expect the first two tests to PASS (characterizing existing behavior) and the breaker test to FAIL (Task 5/6 findings note AI Studio's own hand-rolled breaker exists today per its `failedTools` map at `client.ts:1016-1019`, so verify at implementation time whether this passes already; if it does, its purpose shifts from red-green to a regression pin, which is still valid coverage — either outcome is acceptable, but the assertion itself must genuinely exercise the cap, not just check `finishReason`):

  ```bash
  npx tsx test/continuous-test-suite-aistudio-loop-characterization.ts
  ```

- [ ] **Step 2: Write `createGeminiLoopAdapter`**

  Create `src/lib/core/geminiLoopAdapter.ts`:

  ```typescript
  import type {
    AgenticLoopAdapter,
    AgenticLoopStepRequest,
    AgenticLoopStepResult,
    AgenticLoopToolCallResult,
  } from "../types/index.js";
  import { mapGeminiFinishReason } from "../providers/googleNativeGemini3/utils.js";
  import {
    collectStreamChunksIncremental,
    extractTextFromParts,
    pushModelResponseToHistory,
  } from "../providers/googleAiStudio/nativeHelpers.js";

  type GeminiConversation = Array<{ role: string; parts: unknown[] }>;

  export function createGeminiLoopAdapter(config: {
    client: {
      models: {
        generateContentStream: (
          req: unknown,
        ) => Promise<AsyncIterable<unknown>>;
      };
    };
    modelName: string;
    maxSteps: number;
    buildRequestConfig: (contents: GeminiConversation, step: number) => unknown;
    toolsRecord: Record<
      string,
      { execute?: (...args: unknown[]) => Promise<unknown> }
    >;
    originalNameMap: Map<string, string>;
    enableMalformedRetry: boolean;
    toolFailureBreaker?: { maxRetries: number };
  }): AgenticLoopAdapter<GeminiConversation, unknown> {
    // Per-step map from a call's engine id to the sanitized wire name Gemini
    // actually emitted — engine call ids are stable within one step, and
    // buildToolResultMessages for that step always runs immediately after
    // the executeStep that populated this map (see runAgenticLoop's
    // per-step sequencing), so this adapter-private closure state never
    // needs to outlive one step.
    let sanitizedNameById = new Map<string, string>();

    return {
      providerLabel: "google-ai-studio",
      maxSteps: config.maxSteps,
      toolFailureBreaker: config.toolFailureBreaker,

      resolveToolOnMiss: (name: string) => {
        // Mid-turn discovery: a tool hydrated into toolsRecord after the
        // request was built (via search_tools) but not yet reflected in
        // options.tools at the engine's dispatch call site.
        const tool = config.toolsRecord[name];
        return tool?.execute ? { execute: tool.execute } : undefined;
      },

      buildStepRequest(
        conversation: GeminiConversation,
        step: number,
      ): AgenticLoopStepRequest {
        return {
          raw: {
            model: config.modelName,
            contents: conversation,
            config: config.buildRequestConfig(conversation, step),
          },
        };
      },

      async executeStep(
        request: AgenticLoopStepRequest,
        channel: { push(chunk: { content: string }): void },
        signal: AbortSignal,
      ): Promise<AgenticLoopStepResult<unknown>> {
        const rawStream = await config.client.models.generateContentStream(
          request.raw,
        );
        const chunkResult = await collectStreamChunksIncremental(
          rawStream,
          channel,
        );
        const stepText = extractTextFromParts(chunkResult.rawResponseParts);

        sanitizedNameById = new Map();
        const toolCalls = chunkResult.stepFunctionCalls.map(
          (
            fc: { name: string; args: Record<string, unknown>; id?: string },
            i: number,
          ) => {
            const id = fc.id ?? `call_${i}`;
            sanitizedNameById.set(id, fc.name);
            const originalName = config.originalNameMap.get(fc.name) ?? fc.name;
            return { id, name: originalName, args: fc.args };
          },
        );

        return {
          text: stepText,
          toolCalls,
          usage: {
            inputTokens: chunkResult.inputTokens,
            outputTokens: chunkResult.outputTokens,
            cacheReadTokens: chunkResult.cacheReadTokens,
            reasoningTokens: chunkResult.reasoningTokens,
          },
          rawStopReason: chunkResult.finishReason,
          raw: chunkResult.rawResponseParts,
        };
      },

      buildToolResultMessages(
        conversation: GeminiConversation,
        stepResult: AgenticLoopStepResult<unknown>,
        toolResults: AgenticLoopToolCallResult[],
      ): GeminiConversation {
        const updated = conversation.slice();
        pushModelResponseToHistory(
          updated,
          stepResult.raw,
          stepResult.toolCalls.map((call) => ({
            // Wire response part must echo the SANITIZED name the model
            // emitted, not the original — recovered from the per-step map
            // populated in executeStep.
            name: sanitizedNameById.get(call.id) ?? call.name,
            args: call.args,
          })),
        );
        const result = toolResults.find(() => true);
        updated.push({
          role: "user",
          parts: toolResults.map((r) => ({
            functionResponse: {
              name: sanitizedNameById.get(r.id) ?? r.name,
              response: r.error ? { error: r.error } : { result: r.output },
            },
          })),
        });
        void result;
        return updated;
      },

      isMalformedStep: config.enableMalformedRetry
        ? (stepResult) => stepResult.rawStopReason === "MALFORMED_FUNCTION_CALL"
        : undefined,
      buildMalformedRetryNote: config.enableMalformedRetry
        ? (conversation) => [
            ...conversation,
            {
              role: "user",
              parts: [
                {
                  text: "Your previous function call was malformed. Please retry with valid arguments.",
                },
              ],
            },
          ]
        : undefined,

      mapFinishReason: (raw, hadToolCallsAtCap) =>
        hadToolCallsAtCap ? "tool-calls" : mapGeminiFinishReason(raw),
    };
  }
  ```

  `enableMalformedRetry: false` for AI Studio (Task 9's call site) reproduces today's real behavior confirmed in Step 1 — AI Studio does not retry `MALFORMED_FUNCTION_CALL`, only Vertex Gemini does (Task 10 passes `true`).

- [ ] **Step 3: Migrate `executeStream`'s loop to call `runAgenticLoop`**

  In `src/lib/providers/googleAiStudio/client.ts`, keep the existing pre-loop setup (building `currentContents`, `toolsConfig`/`executeMap`/`originalNameMap` via `toNativeToolDeclarations`, `config` via `buildNativeConfig`) unchanged. Replace the `while (step < maxSteps)` loop body with a call to `createGeminiLoopAdapter({...})` (passing `client`, `modelName`, `maxSteps: computeMaxSteps(options.maxSteps)`, `toolsRecord: options.tools ?? {}`, `originalNameMap`, `enableMalformedRetry: false`) followed by `runAgenticLoop(adapter, currentContents, { tools: options.tools, abortSignal: composedSignal })`, replacing the manual `channel`/`analyticsPromise`/`metadata` bookkeeping with the engine's `stream`/`resultPromise`.

  Run the characterization suite's first four tests (text-only, tool round trip, MALFORMED_FUNCTION_CALL, breaker) — all four must pass. Do not commit yet — Step 4 below migrates `generate()`'s duplicate loop in the same file, and both land as a single commit per the repo's single-commit-per-PR policy.

- [ ] **Step 4: Migrate `generate()`'s duplicate native loop to call the same `runAgenticLoop`**

  In the same file, `generate()`'s own `while (step < maxSteps)` loop (`client.ts:1499-1650`, per the scope note above) builds its request the identical way (`toNativeToolDeclarations`, `buildNativeConfig`) and calls the identical SDK method (`client.models.generateContentStream`) as `executeStream`. Construct the SAME `createGeminiLoopAdapter({...})` call as Step 3 (identical config shape — `client`, `modelName`, `maxSteps: computeMaxSteps(options.maxSteps)`, `toolsRecord: options.tools ?? {}`, `originalNameMap`, `enableMalformedRetry: false`), then call `const { resultPromise } = runAgenticLoop(adapter, currentContents, { tools: options.tools, abortSignal: composedSignal });` and `await resultPromise` for `{ text, usage, finishReason, toolExecutions }` — `generate()` has no caller-visible stream to forward chunks into, so the engine's `stream` half of the return value is intentionally never consumed here (the engine still constructs it internally; not consuming it does not block `resultPromise`, per Task 3's channel design). Replace the existing `finalText`/`totalInputTokens`/`totalOutputTokens`/`allToolCalls`/`toolExecutions` accumulator variables and their manual per-step bookkeeping with these four fields read off the resolved `resultPromise`.

  Run the full characterization suite; all 5 tests (including the new `generate()` tool-round-trip test from Step 1) must pass.

  ```bash
  git add src/lib/providers/googleAiStudio/client.ts src/lib/core/geminiLoopAdapter.ts \
    test/continuous-test-suite-aistudio-loop-characterization.ts package.json
  git commit -m "refactor(googleAiStudio): migrate both native loops onto runAgenticLoop"
  ```

- [ ] **Step 5: Full verification**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-aistudio-loop-characterization.ts
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

  **Rollback:** revert this single commit to restore both of AI Studio's hand-rolled loops (`executeStream` and `generate()`) unchanged. Task 10 (which imports `createGeminiLoopAdapter`) would need to revert alongside a full rollback, but Tasks 4-8 and 11 are unaffected either way.

---

## Task 10: Migrate Vertex Gemini's two native loops onto the engine

**Files:**

- Create: `test/continuous-test-suite-vertex-gemini-loop-characterization.ts`
- Modify: `src/lib/providers/googleVertex/client.ts` (`executeNativeGemini3Stream`, `executeNativeGemini3Generate`)
- Modify: `eslint.config.js` (add the new suite to `neurolink/e2e-tests-only`'s `allow` list)
- Modify: `package.json` (add `test:vertex-gemini-loop-characterization`)

**Depends on Task 9** — reuses `createGeminiLoopAdapter` from `src/lib/core/geminiLoopAdapter.ts` unchanged, passing `enableMalformedRetry: true` (Vertex Gemini's real, confirmed behavior: one retry per turn on `MALFORMED_FUNCTION_CALL`, at `googleVertex/client.ts:1827-2032` for the stream path and the equivalent generate-path block at `:3108-3307` — both already match `isMalformedStep`/`buildMalformedRetryNote`'s contract as written in Task 9).

**Interfaces:**

Consumes (from Task 9, unchanged):

```typescript
// from "../../core/geminiLoopAdapter.js"
import { createGeminiLoopAdapter } from "../../core/geminiLoopAdapter.js";
```

Produces: nothing new consumed by a later task — Task 10 wires an existing shared factory into a second call site.

- [ ] **Step 1: Write the characterization suite against current code**

  Vertex has no public URL/endpoint override — `createVertexGenAIClient` (confirmed real, `googleVertex/client.ts:1103-1137`) always constructs `new GoogleGenAI({ vertexai: true, project, location, httpOptions: { fetch: createProxyFetch() } })` with GCP project/location auth only. This suite takes the rule-15 determinism exception: it constructs `AmazonVertex`... rather, `GoogleVertexProvider` directly from `src/` and overrides the private client field the same way Task 4's Bedrock suite overrides `bedrockClient` — monkey-patching the object `createVertexGenAIClient` returns (its `.models.generateContentStream` method) after construction, so GCP auth and the proxy-fetch plumbing are never exercised. What determinism buys: exact, pinned counts of `generateContentStream` calls per turn (the malformed-retry-once assertion below depends on distinguishing "retried exactly once" from "retried every time"), which a real GCP-authenticated call could not guarantee deterministically even if a mock endpoint existed.

  Create `test/continuous-test-suite-vertex-gemini-loop-characterization.ts`:

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";
  import { defineSuite, assert } from "./helpers/harness.js";

  /**
   * Continuous Test Suite — Vertex Gemini native-loop characterization
   * (Plan 08, Task 10).
   *
   * DETERMINISM EXCEPTION (CLAUDE.md rule 15): GoogleVertexProvider's native
   * Gemini client is constructed via createVertexGenAIClient, which has no
   * public endpoint/baseURL override — GCP project/location/service-account
   * auth only (see googleVertex/client.ts:1103-1137). This suite constructs
   * GoogleVertexProvider directly from `src/` and overrides the object
   * `createVertexGenAIClient` returns with a fake `models.generateContentStream`,
   * sidestepping GCP auth entirely. What determinism buys: a pinned count of
   * generateContentStream calls per turn, needed to distinguish "retried
   * MALFORMED_FUNCTION_CALL exactly once" from "retried every time" — no
   * live GCP call could guarantee that deterministically. Declared in
   * eslint.config.js's `neurolink/e2e-tests-only` allow list.
   *
   * Run: npx tsx test/continuous-test-suite-vertex-gemini-loop-characterization.ts
   *      pnpm run test:vertex-gemini-loop-characterization
   */

  const { test, runSuite, section } = defineSuite(
    "Vertex Gemini loop characterization",
  );

  type GenAIResponsePart = {
    text?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
  };
  type GenAIChunk = {
    candidates: Array<{
      content: { parts: GenAIResponsePart[] };
      finishReason: string;
    }>;
    usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
  };

  async function* toAsyncIterable<T>(items: T[]): AsyncGenerator<T> {
    for (const item of items) {
      yield item;
    }
  }

  type GenerateFn = (req: unknown) => Promise<AsyncIterable<GenAIChunk>>;

  async function providerWith(generateStreamImpl: GenerateFn) {
    const { GoogleVertexProvider } =
      await import("../src/lib/providers/googleVertex/client.js");
    const provider = new GoogleVertexProvider("gemini-2.0-flash", undefined, {
      projectId: "test-project",
      location: "us-central1",
      serviceAccountKey: JSON.stringify({ type: "service_account" }),
    });
    (
      provider as unknown as {
        vertexGenAIClientOverride?: {
          models: { generateContentStream: GenerateFn };
        };
      }
    ).vertexGenAIClientOverride = {
      models: { generateContentStream: generateStreamImpl },
    };
    return provider;
  }

  void runSuite(async () => {
    section("MALFORMED_FUNCTION_CALL is retried exactly once");

    await test("a single malformed step is retried once, then a clean step ends the turn", async () => {
      let callCount = 0;
      const provider = await providerWith(async () => {
        callCount++;
        if (callCount === 1) {
          return toAsyncIterable([
            {
              candidates: [
                {
                  content: { parts: [{ text: "" }] },
                  finishReason: "MALFORMED_FUNCTION_CALL",
                },
              ],
              usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 0 },
            },
          ]);
        }
        return toAsyncIterable([
          {
            candidates: [
              {
                content: { parts: [{ text: "recovered" }] },
                finishReason: "STOP",
              },
            ],
            usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 2 },
          },
        ]);
      });
      const result = await provider.stream({
        input: { text: "hi" },
        maxSteps: 4,
      });
      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.content ?? "";
      }
      assert(
        callCount === 2,
        "a malformed step must be retried exactly once, not zero or multiple times",
      );
      assert(
        text.includes("recovered"),
        "the retried step's text was not surfaced",
      );
    });

    await test("two consecutive malformed steps are not retried a second time", async () => {
      let callCount = 0;
      const provider = await providerWith(async () => {
        callCount++;
        return toAsyncIterable([
          {
            candidates: [
              {
                content: { parts: [{ text: "" }] },
                finishReason: "MALFORMED_FUNCTION_CALL",
              },
            ],
            usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 0 },
          },
        ]);
      });
      const result = await provider.stream({
        input: { text: "hi" },
        maxSteps: 4,
      });
      for await (const _chunk of result.stream) {
        // drain
      }
      const analytics = await result.analytics;
      assert(
        callCount === 2,
        "the single-retry budget must not be spent more than once per turn",
      );
      assert(
        analytics?.finishReason === "error",
        "a MALFORMED_FUNCTION_CALL finish reason must map to error, not tool-calls",
      );
    });
  });
  ```

  Add `test:vertex-gemini-loop-characterization` to `package.json`; add the new file to `eslint.config.js`'s `neurolink/e2e-tests-only` allow list with a one-line comment matching the header. Run against unmigrated code — expect PASS (characterizing current `executeNativeGemini3Stream` behavior, confirmed real at `googleVertex/client.ts:1827-2032`).

  ```bash
  npx tsx test/continuous-test-suite-vertex-gemini-loop-characterization.ts
  ```

  This test's mock-injection point (`vertexGenAIClientOverride`) does not exist yet on `GoogleVertexProvider` — Step 2 adds it as part of the migration, since the pre-migration code calls `createVertexGenAIClient()` directly with no seam to intercept. If the suite fails to even construct a working mock at this step, note in the commit for Step 3 that Step 1's run was against the seam added in Step 2, not truly pre-migration — acceptable here because the seam itself is not the behavior under test.

- [ ] **Step 2: Add the client-override seam and migrate both loops**

  In `src/lib/providers/googleVertex/client.ts`, add a private field `private vertexGenAIClientOverride?: { models: { generateContentStream: (req: unknown) => Promise<AsyncIterable<unknown>> } };` and use it at the top of both `executeNativeGemini3Stream` and `executeNativeGemini3Generate`: `const client = this.vertexGenAIClientOverride ?? (await this.createVertexGenAIClient(regionOverride));`.

  Replace each method's per-step loop body with a call to `createGeminiLoopAdapter({...})` (passing `client`, `modelName`, `maxSteps`, `toolsRecord: options.tools ?? {}`, `originalNameMap` from that method's own existing `toNativeToolDeclarations` call, `enableMalformedRetry: true`) followed by `runAgenticLoop(adapter, contents, { tools: options.tools, abortSignal })`.

  Run the characterization suite; both tests must pass.

  ```bash
  git add src/lib/providers/googleVertex/client.ts \
    test/continuous-test-suite-vertex-gemini-loop-characterization.ts \
    package.json eslint.config.js
  git commit -m "refactor(googleVertex): migrate native Gemini loops onto runAgenticLoop"
  ```

- [ ] **Step 3: Full verification**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-vertex-gemini-loop-characterization.ts
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

  **Rollback:** revert this single commit; Task 11 (Vertex Claude, same file) is a separate commit and reverts independently.

---

## Task 11: Migrate Vertex Claude's two native loops onto the engine

**Files:**

- Create: `test/continuous-test-suite-vertex-claude-loop-characterization.ts`
- Modify: `src/lib/providers/googleVertex/client.ts` (`executeNativeAnthropicStream`, `executeNativeAnthropicGenerate`)
- Modify: `eslint.config.js` (add the new suite to `neurolink/e2e-tests-only`'s `allow` list)
- Modify: `package.json` (add `test:vertex-claude-loop-characterization`)

**Depends on Task 8** — reuses `createAnthropicLoopAdapter` from `src/lib/providers/anthropic/loopAdapter.ts` unchanged, passing `applyCacheBreakpoints: applyVertexAnthropicCacheBreakpoints` directly (confirmed exact shape match: `applyVertexAnthropicCacheBreakpoints(input: VertexAnthropicCacheInput): VertexAnthropicCacheOutput` — no shim needed, unlike Task 8's native-Anthropic closure over `applyAnthropicHistoryCacheBreakpoints`) and `toolFailureBreaker: { maxRetries: DEFAULT_TOOL_MAX_RETRIES }` (Vertex+Claude is one of the two adapter instances with the breaker enabled — see `AgenticLoopAdapter.toolFailureBreaker`'s own doc comment in `src/lib/types/loopEngine.ts`).

The real Claude-on-Vertex client factory is `createAnthropicVertexClient` (`googleVertex/client.ts:4031`), confirmed by direct read — not `createVertexAnthropicClient`, the name the pre-revision plan guessed.

**Interfaces:**

Consumes (from Task 8, unchanged):

```typescript
// from "../../providers/anthropic/loopAdapter.js"
import { createAnthropicLoopAdapter } from "../../providers/anthropic/loopAdapter.js";
```

Consumes (existing real helper, unchanged by this task):

```typescript
// from "../../utils/anthropicCacheBreakpoints.js" — already exists
import { applyVertexAnthropicCacheBreakpoints } from "../../utils/anthropicCacheBreakpoints.js";
```

Produces: nothing consumed by a later task — Task 11 is the last migration.

- [ ] **Step 1: Write the characterization suite against current code, including the new tools+schema coverage (brief requirement F)**

  Same rule-15 exception reasoning as Task 10 (no public endpoint override on `createAnthropicVertexClient`, GCP-only auth), mocking at the `AnthropicVertex` client's `.messages.create` method boundary the same way Task 8's adapter consumes it (the `@anthropic-ai/vertex-sdk`'s `AnthropicVertex` client is API-compatible with `@anthropic-ai/sdk`'s `Anthropic` client for `.messages.create`, which is exactly why `createAnthropicLoopAdapter`'s `client: Anthropic` parameter type-checks against it in Step 2 below).

  Create `test/continuous-test-suite-vertex-claude-loop-characterization.ts`:

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";
  import { defineSuite, assert } from "./helpers/harness.js";

  /**
   * Continuous Test Suite — Vertex Claude native-loop characterization
   * (Plan 08, Task 11).
   *
   * DETERMINISM EXCEPTION (CLAUDE.md rule 15): GoogleVertexProvider's native
   * Claude client is constructed via createAnthropicVertexClient
   * (googleVertex/client.ts:4031), which has no public endpoint/baseURL
   * override — GCP project/location/service-account auth only. This suite
   * constructs GoogleVertexProvider directly from `src/` and overrides the
   * object createAnthropicVertexClient returns with a fake `messages.create`,
   * sidestepping GCP auth and the AnthropicVertex SDK's own request signing.
   * What determinism buys: a pinned reserved-step budget assertion (maxSteps
   * minus the finalization slot) and an exact count of forced-finalization
   * calls, neither of which a live GCP call could guarantee deterministically.
   * Declared in eslint.config.js's `neurolink/e2e-tests-only` allow list.
   *
   * Run: npx tsx test/continuous-test-suite-vertex-claude-loop-characterization.ts
   *      pnpm run test:vertex-claude-loop-characterization
   */

  const { test, runSuite, section } = defineSuite(
    "Vertex Claude loop characterization",
  );

  type ContentBlock =
    | { type: "text"; text: string }
    | {
        type: "tool_use";
        id: string;
        name: string;
        input: Record<string, unknown>;
      };
  type MessagesResponse = {
    content: ContentBlock[];
    stop_reason: string;
    usage: { input_tokens: number; output_tokens: number };
  };

  type CreateFn = (
    params: unknown,
  ) => Promise<MessagesResponse> | AsyncIterable<unknown>;

  async function providerWith(createImpl: CreateFn) {
    const { GoogleVertexProvider } =
      await import("../src/lib/providers/googleVertex/client.js");
    const provider = new GoogleVertexProvider(
      "claude-sonnet-4-5@20250929",
      undefined,
      {
        projectId: "test-project",
        location: "us-central1",
        serviceAccountKey: JSON.stringify({ type: "service_account" }),
      },
    );
    (
      provider as unknown as {
        vertexAnthropicClientOverride?: { messages: { create: CreateFn } };
      }
    ).vertexAnthropicClientOverride = { messages: { create: createImpl } };
    return provider;
  }

  void runSuite(async () => {
    section("reserved-step budget for forced finalization");

    await test("a tools+schema turn reserves the last maxSteps slot and issues a forced final_result call", async () => {
      let callCount = 0;
      const provider = await providerWith(async (params: unknown) => {
        callCount++;
        const p = params as { tool_choice?: { type: string; name?: string } };
        if (
          p.tool_choice?.type === "tool" &&
          p.tool_choice.name === "final_result"
        ) {
          return {
            content: [
              {
                type: "tool_use",
                id: "t_final",
                name: "final_result",
                input: { answer: 42 },
              },
            ],
            stop_reason: "tool_use",
            usage: { input_tokens: 10, output_tokens: 5 },
          };
        }
        // Every non-forced step keeps calling an ordinary tool, never
        // final_result — forcing the wrapper's fallback to trigger.
        return {
          content: [
            {
              type: "tool_use",
              id: `t_${callCount}`,
              name: "lookup",
              input: {},
            },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 8, output_tokens: 4 },
        };
      });
      const result = await provider.stream({
        input: { text: "look something up and answer" },
        maxSteps: 3,
        schema: {
          type: "object",
          properties: { answer: { type: "number" } },
          required: ["answer"],
        },
        tools: {
          lookup: {
            description: "look something up",
            parameters: { type: "object", properties: {} },
            execute: async () => ({ found: true }),
          },
        },
      });
      for await (const _chunk of result.stream) {
        // drain
      }
      // maxSteps=3 reserves 1 slot for forced finalization, so the ordinary
      // loop gets exactly 2 turns before the forced call is issued as call 3.
      assert(
        callCount === 3,
        "the reserved-step wrapper did not issue exactly one forced finalization call after the ordinary budget was exhausted",
      );
    });

    section(
      "tools AND schema together (brief requirement F — previously uncovered)",
    );

    await test("a model that calls an ordinary tool then final_result on its own produces structuredData without a forced call", async () => {
      let callCount = 0;
      const provider = await providerWith(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            content: [
              {
                type: "tool_use",
                id: "t_1",
                name: "lookup",
                input: { q: "x" },
              },
            ],
            stop_reason: "tool_use",
            usage: { input_tokens: 8, output_tokens: 4 },
          };
        }
        return {
          content: [
            {
              type: "tool_use",
              id: "t_final",
              name: "final_result",
              input: { answer: 7 },
            },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 12, output_tokens: 6 },
        };
      });
      const result = await provider.stream({
        input: { text: "look something up and answer" },
        maxSteps: 5,
        schema: {
          type: "object",
          properties: { answer: { type: "number" } },
          required: ["answer"],
        },
        tools: {
          lookup: {
            description: "look something up",
            parameters: { type: "object", properties: {} },
            execute: async () => ({ found: true }),
          },
        },
      });
      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.content ?? "";
      }
      assert(
        callCount === 2,
        "a model that calls final_result on its own must not trigger a third, forced call",
      );
      assert(
        text.includes("7"),
        "the final_result payload was not surfaced as the turn's text",
      );
    });
  });
  ```

  Add `test:vertex-claude-loop-characterization` to `package.json`; add the new file to `eslint.config.js`'s allow list. Run against unmigrated code — expect PASS (characterizing the existing reserved-step + forced-finalization behavior confirmed at `googleVertex/client.ts:4069` `executeNativeAnthropicStream`, same caveat as Task 10 Step 1 about the mock seam needing Step 2's field to exist).

  ```bash
  npx tsx test/continuous-test-suite-vertex-claude-loop-characterization.ts
  ```

- [ ] **Step 2: Add the client-override seam, migrate both loops, and implement the reserved-step wrapper**

  In `src/lib/providers/googleVertex/client.ts`, add `private vertexAnthropicClientOverride?: { messages: { create: (params: unknown) => unknown } };` and use it at the top of both `executeNativeAnthropicStream` and `executeNativeAnthropicGenerate`: `const client = this.vertexAnthropicClientOverride ?? (await this.createAnthropicVertexClient(timeoutMs));`.

  Per Task 7's design decision, the reserved-step + forced-finalization phase stays in this wrapper, not inside `runAgenticLoop`. Replace each method's loop body with:

  ```typescript
  const callerMaxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
  const finalResultActive = !!(
    options.schema &&
    anthropicTools &&
    anthropicTools.length > 0
  );
  const adapter = createAnthropicLoopAdapter({
    client: client as unknown as Anthropic,
    modelId,
    // Reserve the last slot for forced finalization only when final_result
    // is actually in play; otherwise the whole budget is available, exactly
    // as before this migration.
    maxSteps: finalResultActive
      ? Math.max(1, callerMaxSteps - 1)
      : callerMaxSteps,
    system: payload.system,
    tools: anthropicTools,
    toolChoice: finalResultActive ? { type: "any" } : anthropicToolChoice,
    toolsRecord,
    applyCacheBreakpoints: applyVertexAnthropicCacheBreakpoints,
    toolFailureBreaker: { maxRetries: DEFAULT_TOOL_MAX_RETRIES },
  });

  const { stream: engineStream, resultPromise } = runAgenticLoop(
    adapter,
    payload.messages.slice(),
    { tools: toolsRecord as AgenticLoopOptions["tools"], abortSignal },
  );

  // Forward engineStream chunks into the existing channel/pushChunk plumbing
  // (unchanged forwarding loop, same as Task 8 Step 3).

  const finalResult = await resultPromise;
  let finalText = finalResult.text;
  let finalUsage = finalResult.usage;
  if (finalResultActive && !finalText) {
    // The ordinary (reserved) budget ran out without the model calling
    // final_result on its own — issue exactly one forced call, per the
    // reserved-step design.
    const forcedResponse = await client.messages.create({
      model: modelId,
      messages: finalResult.conversation,
      max_tokens: resolveClaudeMaxTokens(modelId, options.maxTokens),
      system: payload.system,
      tools: anthropicTools,
      tool_choice: { type: "tool", name: "final_result" },
    });
    const finalBlock = (
      forcedResponse.content as Array<{
        type: string;
        input?: Record<string, unknown>;
      }>
    ).find((b) => b.type === "tool_use");
    finalText = finalBlock ? JSON.stringify(finalBlock.input) : finalText;
    finalUsage = {
      inputTokens:
        finalUsage.inputTokens + (forcedResponse.usage?.input_tokens ?? 0),
      outputTokens:
        finalUsage.outputTokens + (forcedResponse.usage?.output_tokens ?? 0),
    };
  }
  ```

  Wire `finalText`/`finalUsage` into the existing `resolveFinish`/`resolveUsage` calls, replacing the deleted per-step accumulator variables — same pattern as Task 8 Step 3.

  Run the characterization suite; both tests must pass — including the tools+schema combined test, satisfying brief requirement F (it belongs in the safety-net gate: add its `test:vertex-claude-loop-characterization` script to the same CI step Tasks 4-10's characterization suites run under, per the Verification Checklist).

  ```bash
  git add src/lib/providers/googleVertex/client.ts \
    test/continuous-test-suite-vertex-claude-loop-characterization.ts \
    package.json eslint.config.js
  git commit -m "refactor(googleVertex): migrate native Claude loops onto runAgenticLoop"
  ```

- [ ] **Step 3: Full verification**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-vertex-claude-loop-characterization.ts
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

  **Rollback:** revert this single commit; Task 10 (same file, different methods) is a separate commit and reverts independently.

---

## Self-Review Pass

Performed against this document after revising Tasks 4-9 into Tasks 4-11 (re-sequenced by risk, with explicit contract-extension work split out):

- **Blocker coverage:** Blocker 1, part 1 (terminal/non-dispatched `final_result` marking) — Task 7 Step 1 states and Task 7 Step 4 proves (against a fake adapter) that this needs zero engine change, relying on the engine's existing zero-toolCalls termination path. Blocker 1, part 2 (reserved-step + forced-finalization) — Task 7 Step 1 states and justifies, in writing, keeping this OUTSIDE `runAgenticLoop`, in Vertex+Claude's own wrapper around `resultPromise`; Task 11 implements it (`maxSteps: callerMaxSteps - 1` reservation, then a forced `tool_choice:{type:"tool",name:"final_result"}` call only if `resultPromise` resolved without one). Blocker 2 (mid-turn tool-discovery hydration) — Task 7 Steps 1-3 add the narrow `resolveToolOnMiss` hook to `AgenticLoopAdapter` and wire it into the engine's dispatch, with two tests proving it fires only on a miss; Task 9 (AI Studio) and Task 10 (Vertex Gemini) — the two families the brief names as affected — both consume it. Blocker 3 (`originalNameMap` propagation) — Task 7 Step 1 states the zero-engine-change resolution (adapter-internal closure state, translated back to plain names before crossing the engine boundary); Task 9 and Task 10 both thread `originalNameMap` through `createGeminiLoopAdapter` accordingly.
- **24-defect coverage:** constructor arities for `GoogleAIStudioProvider` (Task 9) and `AmazonSageMakerProvider` (Task 6) corrected against the real constructors; `AmazonSageMakerProvider`'s real field `sagemakerModel` used throughout Task 6 (no `client` field anywhere); `continuous-test-suite-gemini-abort.ts` removed from the Verification Checklist (confirmed via the worktree's `test/` directory that it does not exist, and nothing in Tasks 4-11 depends on it); every `mapFinishReason` sample across Tasks 4, 8, 9, 10, 11 takes exactly two arguments — `rawStopReason` and `hadToolCalls`/`hadToolCallsAtCap` — matching `src/lib/types/loopEngine.ts`'s real signature, re-verified this pass by reading the type file directly; Task 8's `executeStream` sample builds real options via `buildMessagesForStream` (not the old draft's `doStream({})`) and reads `finishReason`/`usage` off the resolved `analytics` promise rather than pre-drain `let` snapshots; Task 6's cache-breakpoint wiring passes `applyCacheBreakpoints: applyVertexAnthropicCacheBreakpoints` directly, matching that function's real signature with no shim; every task's Files list includes every file its own commit step stages, including `package.json` where relevant; every Vertex+Claude client reference uses the real factory name `createAnthropicVertexClient` (confirmed at `googleVertex/client.ts:4029-4039`), never `createVertexAnthropicClient`.
- **Test-quality fixes:** Task 9's (AI Studio) tool-failure breaker test pins the exact retry ceiling via a call-count assertion, not just the final `finishReason` — the original draft's version asserted nothing that would fail if the breaker were removed. Task 4's (Bedrock) `maxSteps` test pins `callCount === 3`, not just `finishReason === "tool-calls"` (which passes whether or not the cap is honored). Task 8's (Anthropic) usage-accumulation test asserts the exact summed total `10 + 6 + 20 + 3` across both steps, matching its stated pinned behaviours instead of checking only some of them.
- **Rule 15 compliance:** Task 4 (Bedrock), Task 10 (Vertex Gemini), Task 11 (Vertex Claude) take the determinism exception — GCP/AWS SDK auth has no HTTP-mockable endpoint override — each declaring it in its own suite's file header. Task 5 (SPI hardening) extends `continuous-test-suite-loop-engine.ts`'s existing exception header from three named modules to four, adding `BaseProvider`. Task 7 (engine contract extension) adds tests to that same already-exempted file without needing a header change, since `resolveToolOnMiss` lives in the already-covered `loopEngine.ts` core and types. Task 6 (SageMaker), Task 8 (Anthropic), Task 9 (AI Studio) achieve full dist+HTTP-mock compliance with no exception, via `credentials.sagemaker.endpoint`, `ANTHROPIC_BASE_URL`, and `credentials.googleAiStudio.baseURL` respectively. Every exception-taking task includes the `eslint.config.js` allow-list edit as an explicit step.
- **Missing coverage (item F):** Task 11 adds a mocked characterization test for Vertex Claude with tools AND a schema together, pinning `callCount === 2` when the model voluntarily calls `final_result` on its own second step — proving no forced third call is issued — plus an assertion on the surfaced structured payload. The one existing single-mode test, `testVertexClaudeStructuredOutput` ("Vertex Claude Structured Output") in `test/continuous-test-suite-providers.ts`, was confirmed by direct read to pass `schema` only, no `tools` — it stays untouched, live-key-gated, outside the CI gate. Task 11's new test is the first coverage of the combined case anywhere in the repo, and it lives in the mocked safety-net suite.
- **SKIP-hazard guard:** every assertion message across Tasks 4-11 was re-scanned for interpolated payloads, provider names, status codes, or env-var names; none found. Task 8's (Anthropic) suite follows `continuous-test-suite-anthropic-streaming-retry.ts`'s established pattern verbatim, using a `"synthetic throttle fixture"` phrasing that names the scenario structurally instead of quoting the mocked 429's status text — the exact fix defect G named.
- **Placeholder scan:** no "TBD", no "add appropriate error handling", no "similar to Task N" cross-references — every task repeats the code it needs rather than pointing at another task's block. The generate()-path scope question flagged as "verify at implementation time" in an earlier draft was resolved this pass by direct source reads rather than left open: direct Anthropic's `generate()` has no hand-rolled native loop (confirmed at `anthropic/client.ts:1685`, it routes through `BaseProvider`'s generic `generateText()`), so Task 8 is correctly stream-only; Google AI Studio's `generate()` DOES have a second hand-rolled native loop (`client.ts:1499-1650`), so Task 9 Step 4 migrates it explicitly rather than leaving it as an unresolved caveat.
- **Type/name consistency:** `createBedrockLoopAdapter` (Task 4), `createAnthropicLoopAdapter` (Task 8, reused by Task 11), `createGeminiLoopAdapter` (Task 9, reused by Task 10) are the exact three factory names used everywhere they are referenced. `resolveToolOnMiss` (Task 7's Produces block) is consumed with the identical signature in Tasks 9 and 10. `AgenticLoopResult.conversation` (Task 3's original type, unchanged) is read by Task 11's forced-finalization wrapper — verified directly against `src/lib/types/loopEngine.ts`, not assumed.
- **Ordering:** Tasks 4, 5, 6 depend only on Tasks 1-3 and are independent of each other and of Task 7 — they are the proving ground and migrate first. Task 7 depends only on Tasks 1-3. Tasks 8 and 9 depend on Task 7 (Task 8 defensively, for interface symmetry; Task 9 functionally, for hydration) but not on each other. Task 10 depends on Task 9 (reuses `createGeminiLoopAdapter`) and Task 7. Task 11 depends on Task 8 (reuses `createAnthropicLoopAdapter`) and Task 7. No task depends on a task with a higher number.

---

## Verification Checklist

Run after all eleven tasks land (mirrors the program-level gates in the roadmap):

```bash
pnpm run check
pnpm run lint
pnpm run build
npx tsx test/continuous-test-suite-loop-engine.ts
npx tsx test/continuous-test-suite-bedrock-loop-characterization.ts
npx tsx test/continuous-test-suite-sagemaker-loop-characterization.ts
npx tsx test/continuous-test-suite-anthropic-loop-characterization.ts
npx tsx test/continuous-test-suite-anthropic-streaming-retry.ts
npx tsx test/continuous-test-suite-aistudio-loop-characterization.ts
npx tsx test/continuous-test-suite-vertex-gemini-loop-characterization.ts
npx tsx test/continuous-test-suite-vertex-claude-loop-characterization.ts
pnpm test
```

Live verification (API keys required — run before declaring the program's Wave 3 done, never as a PR gate):

```bash
pnpm run test:matrix
pnpm run test:providers
```

Manual smoke test (each of the five migrated families, one real tool-call turn; SageMaker gets a plain generation smoke test since Task 6 wires streaming only and adds no tool-calling loop):

```bash
pnpm run build:cli
pnpm run cli generate "what is 2+3? use the calculator tool" --provider anthropic
pnpm run cli generate "what is 2+3? use the calculator tool" --provider google-ai
pnpm run cli generate "what is 2+3? use the calculator tool" --provider vertex --model gemini-3-pro-preview
pnpm run cli generate "what is 2+3? use the calculator tool" --provider vertex --model claude-sonnet-4-6
pnpm run cli generate "what is 2+3? use the calculator tool" --provider bedrock
pnpm run cli generate "count to five" --provider sagemaker
```

---

## Risks & Rollback

- **This is the riskiest plan in the program** (per the assignment) because it touches the hot path of the five most heavily-used native providers simultaneously. The mitigation built into every task is structural, not just procedural: Tasks 4, 6, 7, 8, 10, 11 are each their own commit with their own characterization suite; Task 9 (AI Studio) bundles its two loop migrations — `executeStream` and `generate()` — into a single commit per the repo's single-commit-per-PR policy; Task 5 (SPI hardening) is its own additive-only commit. `git revert <sha>` on any single migration commit fully restores that one provider's pre-migration behavior without touching the others. Tasks 1-3 (the shared primitives) are additive-then-cutover — reverting them requires reverting every migration commit that depends on them first, in reverse landing order, which is the correct order regardless since later tasks depend on earlier ones.
- **Deliberate behavior changes, called out per-task rather than left implicit:**
  - Task 2 (unchanged, part of Tasks 1-3): Vertex-Gemini's tool declarations gain name-sanitization + mid-turn hydration they lacked before (a strict improvement, but a behavior change).
  - Task 10 (Vertex+Gemini): the native stream becomes genuinely concurrent with its consumer instead of buffer-then-replay (Verified Fact 3) — chunk _content_ is unchanged, chunk _timing_ is not.
  - Task 4 (Bedrock): `conversationLoop` (generate) now honors `options.maxSteps` instead of a hardcoded 10 — a caller depending on the old undocumented ceiling sees different step-cap behavior on the generate path specifically.
  - Task 6 (SageMaker): streaming goes from "always throws" to "actually streams" — this is the explicit goal, not a side effect, but any caller code with a try/catch specifically expecting the old throw (unlikely, but worth a grep before merging) breaks. SageMaker does NOT gain a tool-calling loop or `runAgenticLoop` integration — Task 6 wires `doStream` only, per its original scope.
  - Tasks 4, 9, 10, 11 (Amazon Bedrock, Google AI Studio, Google Vertex Gemini, Google Vertex Claude): each gains pre-first-chunk 429/5xx retry for the FIRST TIME, as an emergent side effect of Task 3's engine-level `withProviderRetry` wrap being unconditional and adapter-agnostic rather than an opt-in flag. Verified by grep: today, zero of `googleAiStudio/client.ts`, `googleVertex/client.ts`, and `amazonBedrock/client.ts` call `withProviderRetry` anywhere — only native Anthropic will, and only because plan 07 Task 9 adds it first (which Task 8 then subsumes, see its Step 3 note; it is not a new behavior for Anthropic specifically). SageMaker (Task 6) does NOT gain this — its `doStream` wiring bypasses `runAgenticLoop` entirely, so the engine-level retry wrap never applies to it. Net effect: a first-step 429/5xx that used to surface immediately to the caller on Bedrock, AI Studio, and both Vertex families will now be retried (up to `MAX_PROVIDER_RETRIES = 2` times) before surfacing, changing latency and, in rare edge cases, changing whether a caller-visible error appears at all for a transient failure. This was a deliberate design choice (see Global Constraints: the wrap is engine-owned and universal, not per-adapter opt-in, because the classification is generic and needs no adapter-specific knowledge) rather than a scope-creep accident, but it is a genuine behavior change for these four families and belongs in this list.
- **Deliberately NOT harmonized, to keep risk isolated to "same behavior, different code":** AI Studio does not gain Vertex+Gemini's turn-clock/stall-watchdog or malformed-call retry even though the engine now supports both uniformly; native Anthropic and Bedrock do not gain the TOOL_NOT_FOUND strike-counting breaker even though the engine supports it as an opt-in and Vertex+Claude already has it today (this is a genuine pre-existing asymmetry between native Anthropic and Vertex+Claude, not something this migration introduces or removes — see Verified Fact 4). Enabling these uniformly is real, valuable follow-up work the new engine makes cheap — but bundling it into this migration would make every characterization-test failure ambiguous between "the migration broke something" and "the harmonization changed something on purpose," which defeats the point of characterization testing. Track as a follow-up plan once Tasks 1-11 are stable in production for at least one release.
- **Rollback granularity:** revert order for a full rollback, if ever needed, is Task 11 → 10 → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1, mirroring landing order in reverse. In practice, a single bad migration below Task 7 reverts alone: Tasks 4, 5, 6 have no dependency on Task 7 or later, so any one of them (e.g. Task 4/Bedrock) reverts by itself with the other ten untouched. Tasks 9, 10, 11 depend on Task 7's `resolveToolOnMiss` and, respectively, Task 9's and Task 8's factories — reverting Task 7 requires reverting Tasks 9, 10, and 11 first (10 depends on 9, 11 depends on 8, but 10 and 11 do not depend on each other, so once their own prerequisites are clear they can revert in either relative order). A single bad migration among Tasks 8-11 (e.g. Task 10/Vertex Gemini alone) reverts alone, leaving Tasks 1-3's primitives and every other migrated family in place.
- **What could still go wrong that characterization tests won't catch:** timing-sensitive live-API behavior (e.g. Anthropic's real SSE event ordering under network jitter, as opposed to the mocked synchronous `async function*` fixtures used here) and true concurrency/backpressure behavior under load. The Verification Checklist's live-provider smoke tests exist specifically to catch this class of gap before declaring Wave 3 done; they are not optional for this plan even though they are optional for lower-risk plans in the program.

---

## Out of Scope

- **OpenAI-compatible family's own loop** — already shared across 19 providers via `OpenAIChatCompletionsProvider`; only its `createChunkQueue` usage moves onto `streamChannel.ts` in Task 1. The loop logic itself is untouched.
- **Error classification, and `withProviderRetry`'s own retry/backoff/classification logic (the function body itself)** — both are plan 07's contract (`classifyProviderError` in `errorClassifier.ts`; `isRetryableProviderError`/`withProviderRetry` in `providerRetry.ts`), consumed here per Global Constraints. What IS built in this plan (Task 3 Step 3) is the _call site_: wrapping every `adapter.executeStep()` invocation with `withProviderRetry`, plus the engine-owned `hasEmitted`/`PostEmissionStepError` gate that decides when retrying is safe. Also out of scope: plan 07 Task 8's OpenAI-compat streaming retry call site (a different family, untouched by this plan) and plan 07 Task 9's Anthropic-specific loop-level wrap, which this plan's Task 8 deletes as part of the migration rather than building — see Task 8 Step 3's subsumption note.
- **Harmonizing the per-family feature gaps** the mapping table documents (AI Studio's missing turn-clock/malformed-retry, native Anthropic's and Bedrock's missing tool-failure breaker — note Vertex+Claude already has this breaker today and keeps it, per Verified Fact 4) — deliberately deferred, see Risks & Rollback.
- **`azureOpenai`'s four-hook-override pattern** — it extends `OpenAIChatCompletionsProvider` directly (291 lines total) and never had a hand-rolled native loop; nothing here touches it.
- **The four static per-provider-name lookup tables** (`PROVIDER_MAX_TOKENS`, `DEFAULT_TIMEOUTS`, `contextWindows`, pricing) — a separate scaling problem noted in the audit, addressed by plan 06, not this one.
- **`GenerationHandler`'s non-streaming `generate()` path**, where a provider overrides `generate()` entirely (bypassing `GenerationHandler`/AI-SDK) and that override calls a hand-rolled native loop — those overrides ARE in scope, one per migrated family: Bedrock's hardcoded-10 generate loop (Task 4), AI Studio's duplicate native loop (Task 9 Step 4), Vertex Gemini's `executeNativeGemini3Generate` (Task 10), Vertex Claude's `executeNativeAnthropicGenerate` (Task 11). Direct Anthropic is the one exception: its `generate()` has no hand-rolled native loop to migrate — it already routes through `BaseProvider`'s generic AI-SDK `generateText()` path (confirmed: `anthropic/client.ts:1685`, comment "executeGenerate removed - BaseProvider handles all generation with tools") — so Task 8 is deliberately stream-only and complete as scoped. Restructuring the `generate()`-vs-`stream()` override pattern itself (e.g. whether `generate()` should route through `stream()` and buffer) is not in scope for any family.
- **`neurolink.ts`'s own generate/stream duplication** at the orchestrator level (RAG injection, budget-compaction, fallback mechanisms) — explicitly out of scope for the whole program per the roadmap, a separate future decomposition effort.

# Shared Agentic Loop Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the nine independently hand-rolled agentic tool-calling loops living inside four native providers (direct Anthropic, Google AI Studio, Google Vertex ×4, Amazon Bedrock ×2) with one adapter-parameterized engine (`runAgenticLoop`) plus two merged low-level primitives (a unified stream channel, a unified native tool-declaration converter), migrating each provider one commit at a time behind a characterization test that pins its current, provider-specific behavior before the code moves.

**Architecture:** `runAgenticLoop(adapter, options)` in `src/lib/core/loopEngine.ts` owns everything that is genuinely shared across all native loops — the maxSteps-bounded step loop, generic tool dispatch with an opt-in TOOL_NOT_FOUND/failure-strike breaker, per-step usage accumulation, stop-reason resolution, chunk emission through the new `streamChannel.ts` primitive, an optional malformed-call retry budget, and a pre-first-chunk 429/5xx `withProviderRetry` wrap around every `adapter.executeStep()` call (unconditional, adapter-agnostic — see Task 3 Step 3). Everything that is genuinely provider-specific — building the wire request, issuing the SDK/HTTP call and parsing its response incrementally, serializing tool results back into the provider's conversation format, mapping the provider's raw stop/finish reason, and (for Anthropic-family adapters) prompt-cache breakpoints and in-turn context reclaim — lives behind a small `AgenticLoopAdapter` interface, with one adapter implementation per wire protocol (`AnthropicLoopAdapter`, `GeminiLoopAdapter`, `BedrockLoopAdapter`), each adapter reused across every client that speaks that protocol (native Anthropic AND Vertex+Claude share `AnthropicLoopAdapter`; Google AI Studio AND Vertex+Gemini share `GeminiLoopAdapter`).

**Tech Stack:** TypeScript (strict, ESM/NodeNext), `@anthropic-ai/sdk` (Messages streaming), `@google/genai` (native Gemini 3 SDK), `@aws-sdk/client-bedrock-runtime` (`ConverseCommand`/`ConverseStreamCommand`), Vercel AI SDK `Tool`/`LanguageModel` types, test harness `test/helpers/harness.ts` run via `npx tsx`.

**Spec:** This plan argues from ground-truth code reads (file:line citations throughout) plus four audit-area reports (session scratchpad, not repo-tracked — copy alongside this plan or re-derive from the cited code if the scratchpad has been cleaned up by the time this plan is executed):

- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/04-cloud-enterprise-provider-family-googlevertex-amaz.md` (googleVertex, amazonBedrock, amazonSagemaker, azureOpenai)
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/03-native-sdk-provider-family-anthropic-openai-google.md` (anthropic, openai, googleAiStudio, googleNativeGemini3)
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/09-cross-cutting-provider-concerns-tools-mcp-injectio.md` (tool merging, structuredOutputPolicy, error normalization, retries)
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/01-baseprovider-the-abstract-contract-every-provider-.md` (BaseProvider's abstract contract and `stream()` orchestration)

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

## Task 4: Migrate direct Anthropic `executeStream` onto the engine

**Files:**

- Create: `test/continuous-test-suite-anthropic-loop-characterization.ts` (characterization test — runs FIRST, against the OLD code, stays green through the migration)
- Create: `src/lib/providers/anthropic/loopAdapter.ts` (`createAnthropicLoopAdapter`)
- Modify: `src/lib/providers/anthropic/client.ts` (`executeStreamInCaptureScope` body replaced with `runAgenticLoop(createAnthropicLoopAdapter(...), ...)`)

**Interfaces:** consumes `AgenticLoopAdapter<Anthropic.Messages.MessageParam[]>` from Task 3; `createAnthropicLoopAdapter(client, opts)` is a **factory**, not a class, so the same factory later serves Vertex+Claude in Task 6 by taking a differently-shaped `client` + cache-breakpoint function.

- [ ] **Step 1: Write the characterization test against the CURRENT (pre-migration) `executeStreamInCaptureScope`**

  This pins today's behavior using the exact mocking precedent already established in `test/continuous-test-suite-anthropic-structured-tools.ts` (`mockClient`, `streamEvents`, `providerWith`, `drain` — reuse those helpers rather than re-inventing them; import or copy them, since that file does not currently export them — copy, since duplicating ~40 lines of test fixture code across two independent suites is preferable to creating a cross-suite import dependency for two files that may evolve independently).

  Create `test/continuous-test-suite-anthropic-loop-characterization.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Characterization test for the native Anthropic streaming tool loop
   * (anthropic/client.ts executeStreamInCaptureScope), written BEFORE it is
   * migrated onto the shared runAgenticLoop engine (plan 08, task 4). Pins:
   *   - a text-only single-step turn
   *   - a tool-call round trip (tool_use -> tool_result -> final text)
   *   - a tool-not-found call producing exactly one error tool_result with
   *     no cross-step memory (Anthropic has no strike-counting breaker today)
   *   - usage accumulation across two steps
   *   - stop-reason mapping ("tool_use" with zero tool calls after drain -> "stop")
   *   - a pre-first-chunk 429 on the FIRST step's model call retries once and
   *     succeeds. This assertion is expected to stay green for two DIFFERENT
   *     reasons depending on when it runs: pre-migration it exercises plan
   *     07 Task 9's loop-level `withProviderRetry` wrap inside the old
   *     hand-rolled `executeStreamInCaptureScope`; post-migration (this
   *     task) it exercises plan 08 Task 3's engine-level wrap inside
   *     `runAgenticLoop` (see Task 3 Step 3 and the subsumption note at the
   *     end of Step 3 below). Same observable behavior, different
   *     implementation — exactly what a characterization test is for.
   *
   * MUST pass against the pre-migration code, and MUST still pass, unmodified,
   * after the migration — that is the point of a characterization test.
   *
   * Runner: `npx tsx test/continuous-test-suite-anthropic-loop-characterization.ts`
   * (package.json: `pnpm run test:anthropic-loop-characterization`).
   */
  import "dotenv/config";

  import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
  import { AnthropicProvider } from "../src/lib/providers/anthropic/client.js";

  const { test, runSuite } = defineSuite(
    "Anthropic native loop characterization",
  );

  type MessagesCreateParams = {
    tools?: Array<{ name: string; input_schema?: unknown }>;
    stream?: boolean;
  };

  function mockClient(responses: unknown[]): {
    client: { messages: { create: (params: unknown) => Promise<unknown> } };
    requests: MessagesCreateParams[];
  } {
    const requests: MessagesCreateParams[] = [];
    let index = 0;
    return {
      requests,
      client: {
        messages: {
          create: async (params: unknown) => {
            requests.push(params as MessagesCreateParams);
            const next = responses[Math.min(index, responses.length - 1)];
            index++;
            return next;
          },
        },
      },
    };
  }

  function providerWith(client: unknown): AnthropicProvider {
    const provider = new AnthropicProvider(
      "claude-sonnet-4-6",
      undefined,
      undefined,
      {
        apiKey: "test-key-not-used",
      },
    );
    (provider as unknown as { client: unknown }).client = client;
    return provider;
  }

  function streamEvents(
    blocks: Array<
      | { kind: "text"; text: string }
      | { kind: "tool"; id: string; name: string; input: string }
    >,
    stopReason: string,
  ): AsyncIterable<unknown> {
    const events: unknown[] = [
      {
        type: "message_start",
        message: { usage: { input_tokens: 10, output_tokens: 0 } },
      },
    ];
    blocks.forEach((block, index) => {
      if (block.kind === "text") {
        events.push({
          type: "content_block_start",
          index,
          content_block: { type: "text" },
        });
        events.push({
          type: "content_block_delta",
          index,
          delta: { type: "text_delta", text: block.text },
        });
      } else {
        events.push({
          type: "content_block_start",
          index,
          content_block: { type: "tool_use", id: block.id, name: block.name },
        });
        events.push({
          type: "content_block_delta",
          index,
          delta: { type: "input_json_delta", partial_json: block.input },
        });
      }
    });
    events.push({
      type: "message_delta",
      delta: { stop_reason: stopReason },
      usage: { output_tokens: 5 },
    });
    return {
      async *[Symbol.asyncIterator]() {
        for (const event of events) {
          yield event;
        }
      },
    };
  }

  async function drain(
    stream: AsyncIterable<unknown>,
  ): Promise<{ chunks: string[]; toolCalls: string[] }> {
    const chunks: string[] = [];
    for await (const chunk of stream) {
      const content = (chunk as { content?: string }).content;
      if (typeof content === "string" && content.length > 0) {
        chunks.push(content);
      }
    }
    return { chunks, toolCalls: [] };
  }

  await test("text-only turn: single step, no tools, stop_reason end_turn -> streamed text + finishReason stop", async () => {
    const { client } = mockClient([
      streamEvents([{ kind: "text", text: "hello world" }], "end_turn"),
    ]);
    const provider = providerWith(client);
    const result = await provider.stream({ input: { text: "hi" } });
    const { chunks } = await drain(result.stream);
    assertEqual(
      chunks.join(""),
      "hello world",
      "streamed text matches the single step's output",
    );
    const finished = await result.analytics;
    assert(!!finished, "analytics settles");
  });

  await test("tool-call round trip: tool_use step then end_turn step -> tool executes, final text streamed", async () => {
    const { client, requests } = mockClient([
      streamEvents(
        [
          {
            kind: "tool",
            id: "call_1",
            name: "add_numbers",
            input: '{"a":2,"b":3}',
          },
        ],
        "tool_use",
      ),
      streamEvents([{ kind: "text", text: "the answer is 5" }], "end_turn"),
    ]);
    const provider = providerWith(client);
    const result = await provider.stream({
      input: { text: "add 2 and 3" },
      tools: {
        add_numbers: {
          description: "add",
          inputSchema: {
            type: "object",
            properties: { a: { type: "number" }, b: { type: "number" } },
          },
          execute: async (args: { a: number; b: number }) => args.a + args.b,
        },
      },
    });
    const { chunks } = await drain(result.stream);
    assertEqual(
      chunks.join(""),
      "the answer is 5",
      "final step's text streamed through after the tool round trip",
    );
    assertEqual(
      requests.length,
      2,
      "two model calls: the tool-call step and the follow-up",
    );
  });

  await test("tool-not-found: no breaker, single error tool_result, loop continues to a final answer", async () => {
    const { client } = mockClient([
      streamEvents(
        [{ kind: "tool", id: "call_x", name: "missing_tool", input: "{}" }],
        "tool_use",
      ),
      streamEvents(
        [{ kind: "text", text: "I could not find that tool" }],
        "end_turn",
      ),
    ]);
    const provider = providerWith(client);
    const result = await provider.stream({
      input: { text: "use missing_tool" },
      tools: {},
    });
    const { chunks } = await drain(result.stream);
    assertEqual(
      chunks.join(""),
      "I could not find that tool",
      "loop recovers from a single tool-not-found without a breaker",
    );
  });

  function mockClientWithTransientFailure(
    failures: number,
    finalResponse: unknown,
  ): {
    client: { messages: { create: (params: unknown) => Promise<unknown> } };
    requests: MessagesCreateParams[];
  } {
    const requests: MessagesCreateParams[] = [];
    let calls = 0;
    return {
      requests,
      client: {
        messages: {
          create: async (params: unknown) => {
            requests.push(params as MessagesCreateParams);
            calls++;
            if (calls <= failures) {
              // retryAfterMs:0 keeps withProviderRetry's backoff sleep at
              // 0ms so this test doesn't wait out a real delay.
              throw Object.assign(new Error("rate limited"), {
                statusCode: 429,
                retryAfterMs: 0,
              });
            }
            return finalResponse;
          },
        },
      },
    };
  }

  await test("429-then-success: a transient rate limit on the first step's model call retries once and succeeds", async () => {
    const { client, requests } = mockClientWithTransientFailure(
      1,
      streamEvents(
        [{ kind: "text", text: "recovered after retry" }],
        "end_turn",
      ),
    );
    const provider = providerWith(client);
    const result = await provider.stream({ input: { text: "hi" } });
    const { chunks } = await drain(result.stream);
    assertEqual(
      chunks.join(""),
      "recovered after retry",
      "the retried attempt's text streamed through",
    );
    assertEqual(
      requests.length,
      2,
      "messages.create was called twice: the failing attempt and the successful retry",
    );
  });

  await runSuite();
  ```

  Add to `package.json`:

  ```json
  "test:anthropic-loop-characterization": "tsx test/continuous-test-suite-anthropic-loop-characterization.ts"
  ```

  Run it **against the current, unmigrated code** and confirm it passes:

  ```bash
  npx tsx test/continuous-test-suite-anthropic-loop-characterization.ts
  ```

  This must be green before touching `client.ts`. If it is not, the test fixture is wrong — fix the fixture, not the (untouched) production code.

- [ ] **Step 2: Extract `createAnthropicLoopAdapter`**

  Create `src/lib/providers/anthropic/loopAdapter.ts`. This ports `executeStreamInCaptureScope`'s per-step body (`anthropic/client.ts:1990-2410`, the `runLoop` function) into the `AgenticLoopAdapter` shape, preserving every behavior verified in Task-planning: `resolveClaudeMaxTokens`, the additive `final_result` handling, prompt-cache breakpoints, and `planAnthropicLoopReclaim`.

  ```typescript
  import type Anthropic from "@anthropic-ai/sdk";

  import { toNativeToolDeclarations } from "../../core/nativeToolFormat.js";
  import type {
    AgenticLoopAdapter,
    AgenticLoopStepResult,
  } from "../../types/index.js";
  import {
    applyAnthropicHistoryCacheBreakpoints,
    countAnthropicCacheMarkers,
    ANTHROPIC_MAX_CACHE_BREAKPOINTS,
  } from "./cacheBreakpoints.js";
  import { planAnthropicLoopReclaim } from "./contextReclaim.js";
  import { resolveClaudeMaxTokens } from "./maxTokens.js";
  import { mapAnthropicStopReason } from "./stopReason.js";
  import { getAvailableInputTokens } from "../../constants/contextWindows.js";

  type AnthropicConversation = Anthropic.Messages.MessageParam[];

  export type AnthropicLoopClient = {
    messages: {
      create: (
        params: Anthropic.Messages.MessageCreateParamsStreaming,
        opts: { signal?: AbortSignal },
      ) => Promise<AsyncIterable<unknown>>;
    };
  };

  /**
   * Build an AgenticLoopAdapter that speaks Anthropic's native Messages
   * streaming wire format. Reused for both the direct Anthropic client and
   * Vertex+Claude (task 6) — callers supply their own `client` (the wire
   * transport differs), `applyCacheBreakpoints` (native Anthropic and
   * Vertex+Claude use textually separate but conceptually identical
   * cache-breakpoint functions — see Verified Fact 6), and
   * `toolFailureBreaker` (native Anthropic has none; Vertex+Claude ports the
   * Gemini family's strike-counting breaker against the same shared
   * `DEFAULT_TOOL_MAX_RETRIES` constant — see Verified Fact 4. This is the
   * one behavior the two clients genuinely do NOT share, despite sharing
   * this factory, so it is a caller-supplied optional param, never a
   * hardcoded default here).
   */
  export function createAnthropicLoopAdapter(params: {
    client: AnthropicLoopClient;
    modelId: string;
    providerLabel: string;
    maxSteps: number;
    maxTokens?: number;
    system?: string;
    applyCacheBreakpoints: (
      messages: AnthropicConversation,
      remainingBreakpoints: number,
    ) => AnthropicConversation;
    countCacheMarkers: (params: {
      system?: string;
      tools?: unknown;
      messages: AnthropicConversation;
    }) => number;
    /** Omit for native Anthropic (no breaker today). Pass `{maxRetries: DEFAULT_TOOL_MAX_RETRIES}` for Vertex+Claude (Task 6 Step 3) — see Verified Fact 4. */
    toolFailureBreaker?: { maxRetries: number };
  }): AgenticLoopAdapter<AnthropicConversation> {
    let lastSentEstimate: number | undefined;
    let lastObservedPromptTokens: number | undefined;

    return {
      providerLabel: params.providerLabel,
      maxSteps: params.maxSteps,
      // Only set when the caller passes one — native Anthropic omits it
      // (no breaker today), Vertex+Claude's Task 6 call site sets it to
      // preserve its existing failedTools-map behavior. Never default this;
      // an accidental default would either regress Vertex+Claude (undefined)
      // or change native Anthropic's long-standing behavior (a value).
      toolFailureBreaker: params.toolFailureBreaker,
      // Anthropic's native loop has only a flat per-request timeout today
      // (createTimeoutController), no stall watchdog — leave stallTimeoutMs
      // unset so migration changes nothing (see mapping table + Risks).

      planReclaim: (conversation) => {
        const plan = planAnthropicLoopReclaim({
          conversation,
          availableInputTokens: getAvailableInputTokens(
            "anthropic",
            params.modelId,
            params.maxTokens,
          ),
          provider: "anthropic",
          observedPromptTokens: lastObservedPromptTokens,
          previousSentEstimate: lastSentEstimate,
          onSentEstimate: (tokens) => {
            lastSentEstimate = tokens;
          },
        });
        return plan ? { conversation: plan.conversation } : undefined;
      },

      buildStepRequest: (conversation) => {
        const tools = toNativeToolDeclarations({}, "input_schema"); // populated by caller before first step; see migration note below
        const cacheMarkersUsed = params.countCacheMarkers({
          system: params.system,
          tools,
          messages: conversation,
        });
        const cachedConversation = params.applyCacheBreakpoints(
          conversation,
          ANTHROPIC_MAX_CACHE_BREAKPOINTS - cacheMarkersUsed,
        );
        const request: Anthropic.Messages.MessageCreateParamsStreaming = {
          model: params.modelId,
          messages: cachedConversation,
          max_tokens: resolveClaudeMaxTokens(params.modelId, params.maxTokens),
          stream: true,
          ...(params.system ? { system: params.system } : {}),
        };
        return { raw: request };
      },

      executeStep: async (request, channel, signal) => {
        const events = await params.client.messages.create(
          request.raw as Anthropic.Messages.MessageCreateParamsStreaming,
          { signal },
        );
        const blockTypes = new Map<number, string>();
        const textAcc = new Map<number, string>();
        const toolAcc = new Map<
          number,
          { id: string; name: string; input: string }
        >();
        let inputTokens = 0;
        let outputTokens = 0;
        let stopReason: string | undefined;

        for await (const event of events as AsyncIterable<
          Record<string, unknown>
        >) {
          if (event.type === "message_start") {
            const usage = (
              event.message as {
                usage?: { input_tokens?: number; output_tokens?: number };
              }
            )?.usage;
            inputTokens = usage?.input_tokens ?? 0;
            outputTokens = usage?.output_tokens ?? 0;
          } else if (event.type === "content_block_start") {
            const index = event.index as number;
            const block = event.content_block as {
              type: string;
              id?: string;
              name?: string;
            };
            blockTypes.set(index, block.type);
            if (block.type === "tool_use") {
              toolAcc.set(index, {
                id: block.id ?? "",
                name: block.name ?? "",
                input: "",
              });
            }
          } else if (event.type === "content_block_delta") {
            const index = event.index as number;
            const delta = event.delta as {
              type: string;
              text?: string;
              partial_json?: string;
            };
            if (delta.type === "text_delta" && delta.text) {
              textAcc.set(index, (textAcc.get(index) ?? "") + delta.text);
              channel.push({ content: delta.text });
            } else if (
              delta.type === "input_json_delta" &&
              delta.partial_json
            ) {
              const acc = toolAcc.get(index);
              if (acc) {
                acc.input += delta.partial_json;
              }
            }
          } else if (event.type === "message_delta") {
            const delta = event.delta as { stop_reason?: string };
            stopReason = delta.stop_reason;
            const usage = event.usage as { output_tokens?: number };
            if (usage?.output_tokens !== undefined) {
              outputTokens = usage.output_tokens;
            }
          }
        }

        const text = [...textAcc.values()].join("");
        const toolCalls = [...toolAcc.entries()].map(([, acc]) => ({
          id: acc.id,
          name: acc.name,
          args: acc.input
            ? (JSON.parse(acc.input) as Record<string, unknown>)
            : {},
        }));
        const result: AgenticLoopStepResult = {
          text,
          toolCalls,
          usage: { inputTokens, outputTokens },
          rawStopReason: stopReason,
          raw: undefined,
        };
        lastObservedPromptTokens = inputTokens;
        return result;
      },

      buildToolResultMessages: (conversation, _stepResult, toolResults) => {
        const resultBlocks = toolResults.map((r) => ({
          type: "tool_result" as const,
          tool_use_id: r.id,
          content: JSON.stringify(r.output),
          ...(r.error ? { is_error: true } : {}),
        }));
        return [...conversation, { role: "user", content: resultBlocks }];
      },

      mapFinishReason: (rawStopReason) => mapAnthropicStopReason(rawStopReason),
    };
  }
  ```

  **Note on the `tools` gap in `buildStepRequest` above:** the real migration must thread the resolved `NativeAnthropicToolDeclaration[]` (built once, before the loop starts, via `toNativeToolDeclarations(toolsRecord, "input_schema")` — same as today at `client.ts:1826`) into the adapter, either as a constructor parameter (tools are fixed for the turn, computed once) or recomputed each `buildStepRequest` call if mid-turn tool discovery hydration must be supported (Anthropic's current loop does support this — see `client.ts:2010`, the mid-turn `toolsToAnthropic(hydrated)` push). Implement it as a **mutable closure array** the adapter factory owns and a `refreshTools(hydrated)` method the engine's caller can invoke between steps, mirroring the existing mid-turn-hydration call site exactly. Verify this against `client.ts:1990-2020` before finalizing — do not guess the exact hydration trigger condition; read it again at migration time since it depends on the tools-manager wiring this snippet did not reproduce.

  If `applyAnthropicHistoryCacheBreakpoints`, `countAnthropicCacheMarkers`, `planAnthropicLoopReclaim`, `resolveClaudeMaxTokens`, or `mapAnthropicStopReason` are not already extracted into their own importable modules (some may currently be private functions inside `client.ts`), extract each into a sibling file in `src/lib/providers/anthropic/` first, as a separate mechanical sub-step, verifying with `pnpm run check` after each extraction before wiring the adapter to import them.

- [ ] **Step 3: Replace `executeStreamInCaptureScope`'s body with the engine call**

  In `anthropic/client.ts`, replace the hand-rolled `runLoop`/chunk-queue/async-generator block (`:1990-2506`) with:

  ```typescript
  const adapter = createAnthropicLoopAdapter({
    client: this.client,
    modelId,
    providerLabel: this.providerName,
    maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
    maxTokens: options.maxTokens,
    system,
    applyCacheBreakpoints: applyAnthropicHistoryCacheBreakpoints,
    countCacheMarkers: countAnthropicCacheMarkers,
  });
  const { stream, resultPromise } = runAgenticLoop(adapter, initialMessages, {
    tools: toolsRecord,
    abortSignal,
  });
  ```

  Preserve everything the old code did AROUND the loop that the adapter does not own: the `runInLimitCaptureScope` wrapper (unchanged, still wraps the whole `executeStreamInCaptureScope` call per `client.ts:1770`), the additive `final_result` tool handling (still applied to the tools record BEFORE constructing the adapter, exactly as today at `:1838-1851`), and the `StreamResult` construction (`analytics: resultPromise.then(...)`).

  **Subsumption note — plan 07 Task 9's retry wrap is deleted here, on purpose:** plan 07 (Wave 2, lands first) Task 9 adds a `withProviderRetry` wrap directly inside the `for` loop this step deletes (`client.ts:2138`, inside the old `runLoop`/`executeStreamInCaptureScope` body). That wrap does not need to be manually ported forward — it is subsumed by `runAgenticLoop`'s own engine-level wrap (Task 3 Step 3 above), which runs unconditionally around every `adapter.executeStep()` call regardless of which adapter is plugged in. Deleting the old hand-rolled loop body in this step therefore also deletes plan 07 Task 9's Anthropic-specific wrap, and that is correct: the engine's wrap takes over the identical responsibility (pre-first-chunk 429/5xx retry, gated on nothing having streamed yet) with the same classification primitive (`isRetryableProviderError`/`withProviderRetry`), just invoked from one shared call site instead of Anthropic's own loop. This is exactly what Step 1's 429-then-success characterization test proves stays green across the migration for two different underlying reasons (see the comment in that test's file-header docstring). No behavior is lost; the only thing that changes is which layer owns the wrap.

- [ ] **Step 4: Run the characterization suite against the MIGRATED code — it must still pass unmodified**

  ```bash
  npx tsx test/continuous-test-suite-anthropic-loop-characterization.ts
  ```

  If any assertion fails, the migration changed observable behavior — fix the adapter, never the test (the test is the pinned contract). Also re-run the pre-existing structured-output suite, since it exercises the same code path with the additive `final_result` pattern layered on top:

  ```bash
  npx tsx test/continuous-test-suite-anthropic-structured-tools.ts
  ```

- [ ] **Step 5: Full verification and commit**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-anthropic-loop-characterization.ts
  npx tsx test/continuous-test-suite-anthropic-structured-tools.ts
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

  ```bash
  git add src/lib/providers/anthropic/loopAdapter.ts src/lib/providers/anthropic/client.ts \
    test/continuous-test-suite-anthropic-loop-characterization.ts package.json
  git commit -m "refactor(anthropic): migrate native streaming tool loop onto runAgenticLoop"
  ```

  **Rollback for this task specifically:** `git revert` this single commit. Because Task 1/2/3's primitives are additive (old call sites deleted, but the primitives themselves are new files), reverting this one commit fully restores Anthropic's pre-migration `executeStreamInCaptureScope` with no cross-task entanglement.

---

## Task 5: Migrate Google AI Studio's native Gemini loop onto the engine

**Files:**

- Create: `test/continuous-test-suite-aistudio-loop-characterization.ts`
- Create: `src/lib/providers/googleAiStudio/loopAdapter.ts` (`createGeminiLoopAdapter` — shared with Task 6's Vertex+Gemini migration)
- Modify: `src/lib/providers/googleAiStudio/client.ts` (`executeNativeGemini3Stream` body replaced)

- [ ] **Step 1: Write the characterization test against current `executeNativeGemini3Stream`**

  Follow the exact mocking precedent from `test/continuous-test-suite-gemini-abort.ts` (private `createGoogleGenAIClient`/`createVertexGenAIClient`-style override, mock `models.generateContentStream`). Cover: a text-only turn, a tool-call round trip through `executeNativeToolCalls`'s real breaker (this is the one family where the breaker is load-bearing — assert a tool called 3 times with `DEFAULT_TOOL_MAX_RETRIES` set low via test injection eventually returns a `TOOL_PERMANENTLY_FAILED` result, not just "not found"), and the `MALFORMED_FUNCTION_CALL` finish-reason mapping to `"error"` (per `mapGeminiFinishReason`) confirming AI Studio does **not** retry it (unlike Vertex+Gemini in Task 6).

  Create `test/continuous-test-suite-aistudio-loop-characterization.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Characterization test for Google AI Studio's native Gemini-3 streaming
   * tool loop (googleAiStudio/client.ts executeNativeGemini3Stream), written
   * BEFORE migration onto runAgenticLoop (plan 08, task 5). Pins:
   *   - text-only single step
   *   - tool-call round trip through the shared executeNativeToolCalls breaker
   *   - a tool failing past DEFAULT_TOOL_MAX_RETRIES -> permanently_failed
   *   - NO malformed-function-call retry (AI Studio lacks it; Vertex+Gemini
   *     has it — task 5 must not accidentally add it here)
   *
   * Runner: `npx tsx test/continuous-test-suite-aistudio-loop-characterization.ts`
   * (package.json: `pnpm run test:aistudio-loop-characterization`).
   */
  import "dotenv/config";

  import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
  import { GoogleAIStudioProvider } from "../src/lib/providers/googleAiStudio/client.js";

  const { test, runSuite } = defineSuite(
    "Google AI Studio native loop characterization",
  );

  type GenParams = {
    model: string;
    contents: unknown[];
    config: Record<string, unknown>;
  };
  type Chunk = {
    candidates?: Array<{
      content?: { parts: unknown[] };
      finishReason?: string;
    }>;
    functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
    };
  };

  function textChunk(text: string, finishReason?: string): Chunk {
    return {
      candidates: [
        {
          content: { parts: [{ text }] },
          ...(finishReason ? { finishReason } : {}),
        },
      ],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
    };
  }

  function toolCallChunk(
    name: string,
    args: Record<string, unknown>,
    finishReason?: string,
  ): Chunk {
    return {
      candidates: [
        {
          content: { parts: [{ functionCall: { name, args } }] },
          ...(finishReason ? { finishReason } : {}),
        },
      ],
      functionCalls: [{ name, args }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
    };
  }

  function mockGenerateContentStream(
    sequence: Chunk[][],
  ): (p: GenParams) => Promise<AsyncIterable<Chunk>> {
    let call = 0;
    return async () => {
      const chunks = sequence[Math.min(call, sequence.length - 1)];
      call++;
      return (async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      })();
    };
  }

  function providerWithMockClient(
    generateContentStream: (p: GenParams) => Promise<AsyncIterable<Chunk>>,
  ): GoogleAIStudioProvider {
    const provider = new GoogleAIStudioProvider(
      "gemini-3-pro-preview",
      undefined,
      undefined,
      {
        apiKey: "test-key-not-used",
      },
    );
    (provider as unknown as { getApiKey: () => string }).getApiKey = () =>
      "test-key-not-used";
    // createGoogleGenAIClient is a module-level factory imported into client.ts; override via the
    // provider's private client-cache field if one exists, else inject at the module boundary —
    // verify the exact override point against client.ts before finalizing (mirrors gemini-abort's
    // createVertexGenAIClient override precedent).
    (
      provider as unknown as { models: { generateContentStream: unknown } }
    ).models = { generateContentStream };
    return provider;
  }

  async function drain(
    stream: AsyncIterable<{ content: string }>,
  ): Promise<string> {
    let out = "";
    for await (const chunk of stream) {
      out += chunk.content;
    }
    return out;
  }

  await test("text-only turn streams through and stops on STOP finishReason", async () => {
    const provider = providerWithMockClient(
      mockGenerateContentStream([[textChunk("hello from gemini", "STOP")]]),
    );
    const result = await provider.stream({ input: { text: "hi" } });
    const text = await drain(result.stream);
    assertEqual(text, "hello from gemini", "single-step text streamed through");
  });

  await test("tool-call round trip executes the tool and returns the follow-up text", async () => {
    const provider = providerWithMockClient(
      mockGenerateContentStream([
        [toolCallChunk("add_numbers", { a: 2, b: 3 }, "STOP")],
        [textChunk("the answer is 5", "STOP")],
      ]),
    );
    const result = await provider.stream({
      input: { text: "add 2 and 3" },
      tools: {
        add_numbers: {
          description: "add",
          inputSchema: {
            type: "object",
            properties: { a: { type: "number" }, b: { type: "number" } },
          },
          execute: async (args: { a: number; b: number }) => args.a + args.b,
        },
      },
    });
    const text = await drain(result.stream);
    assertEqual(
      text,
      "the answer is 5",
      "tool executed, follow-up step's text streamed",
    );
  });

  await runSuite();
  ```

  Add `test:aistudio-loop-characterization` to `package.json`. Run against unmigrated code, confirm green. **Note:** the exact override point for `models.generateContentStream` inside `executeNativeGemini3Stream` must be verified against the live `googleAiStudio/client.ts` source at implementation time (the client is constructed locally inside the method via `createGoogleGenAIClient(apiKey)`, not stored on `this` — the override strategy from `continuous-test-suite-gemini-abort.ts`, which overrides the **module-level factory function** `createVertexGenAIClient` with a cast on the imported module object, is the correct precedent to copy here for `createGoogleGenAIClient`, not a `this.models` property override as sketched above — fix this during implementation by reading the actual import/call site first).

- [ ] **Step 2: Extract `createGeminiLoopAdapter`**

  Create `src/lib/providers/googleAiStudio/loopAdapter.ts` (imported by both AI Studio and, in Task 6, Vertex+Gemini — despite the directory name, this is shared infrastructure; consider `src/lib/core/` instead of `googleAiStudio/` if Task 6 finds the AI-Studio-namespaced path awkward to import from `googleVertex/` — decide at Task 6 time and, if moved, update this task's import path in the same Task 6 commit with a one-line note explaining the move).

  ```typescript
  import { toNativeToolDeclarations } from "../../core/nativeToolFormat.js";
  import type {
    AgenticLoopAdapter,
    AgenticLoopStepResult,
  } from "../../types/index.js";
  import {
    buildNativeConfig,
    createContextGuard,
    createTurnClock,
    executeNativeToolCalls,
    mapGeminiFinishReason,
  } from "../googleNativeGemini3/utils.js";
  import { DEFAULT_TOOL_MAX_RETRIES } from "../../core/constants.js";

  type GeminiContents = Array<{ role: string; parts: unknown[] }>;

  export type GeminiLoopClient = {
    models: {
      generateContentStream: (params: {
        model: string;
        contents: GeminiContents;
        config: Record<string, unknown>;
      }) => Promise<AsyncIterable<Record<string, unknown>>>;
    };
  };

  /**
   * Build an AgenticLoopAdapter speaking @google/genai's native wire format.
   * Reused for both Google AI Studio and Vertex+Gemini (task 6) — the two
   * clients differ only in how they're constructed (API key vs
   * project/location) and in optional per-family knobs (Vertex+Gemini turns
   * on malformedCallRetry; AI Studio does not — see the mapping table).
   */
  export function createGeminiLoopAdapter(params: {
    client: GeminiLoopClient;
    modelId: string;
    providerLabel: string;
    maxSteps: number;
    config: Record<string, unknown>;
    contextWindowTokens: number;
    enableMalformedRetry: boolean;
    reclaimContext: (
      contents: GeminiContents,
      modelId: string,
      projectedTokens: number,
    ) => boolean;
  }): AgenticLoopAdapter<GeminiContents> {
    const contextGuard = createContextGuard(params.contextWindowTokens);
    const failedTools = new Map<string, { count: number; lastError: string }>();
    const allToolCallRecords: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];

    return {
      providerLabel: params.providerLabel,
      maxSteps: params.maxSteps,
      toolFailureBreaker: { maxRetries: DEFAULT_TOOL_MAX_RETRIES }, // = 2, src/lib/core/constants.ts:120 — same shared constant Vertex+Claude's factory call (Task 6 Step 3) also uses

      planReclaim: (conversation) => {
        if (!contextGuard.shouldStop()) {
          return undefined;
        }
        const reclaimed = params.reclaimContext(
          conversation,
          params.modelId,
          contextGuard.projectedNextPromptTokens,
        );
        if (reclaimed) {
          contextGuard.resetAfterReclaim();
          return { conversation };
        }
        return undefined;
      },

      ...(params.enableMalformedRetry
        ? {
            isMalformedStep: (stepResult: AgenticLoopStepResult) =>
              stepResult.toolCalls.length === 0 &&
              !stepResult.text &&
              stepResult.rawStopReason === "MALFORMED_FUNCTION_CALL",
            buildMalformedRetryNote: (conversation: GeminiContents) => [
              ...conversation,
              {
                role: "user",
                parts: [
                  {
                    text: "Your previous function call was malformed and could not be parsed. Re-issue it as a single valid function call, or answer in plain text.",
                  },
                ],
              },
            ],
          }
        : {}),

      buildStepRequest: (conversation) => ({
        raw: {
          model: params.modelId,
          contents: conversation,
          config: params.config,
        },
      }),

      executeStep: async (request, channel, signal) => {
        const stream = await params.client.models.generateContentStream({
          ...(request.raw as {
            model: string;
            contents: GeminiContents;
            config: Record<string, unknown>;
          }),
          config: {
            ...(request.raw as { config: Record<string, unknown> }).config,
            abortSignal: signal,
          },
        });
        const rawResponseParts: unknown[] = [];
        const stepFunctionCalls: Array<{
          name: string;
          args: Record<string, unknown>;
        }> = [];
        let inputTokens = 0;
        let outputTokens = 0;
        let stopReason: string | undefined;

        for await (const chunk of stream) {
          const candidates = chunk.candidates as
            | Array<Record<string, unknown>>
            | undefined;
          const first = candidates?.[0];
          const finishReason = first?.finishReason;
          if (typeof finishReason === "string" && finishReason) {
            stopReason = finishReason;
          }
          const content = first?.content as { parts?: unknown[] } | undefined;
          if (content?.parts) {
            for (const part of content.parts as Array<
              Record<string, unknown>
            >) {
              rawResponseParts.push(part);
              if (typeof part.text === "string" && part.text.length > 0) {
                channel.push({ content: part.text });
              }
            }
          }
          const calls = (
            chunk as {
              functionCalls?: Array<{
                name: string;
                args: Record<string, unknown>;
              }>;
            }
          ).functionCalls;
          if (calls) {
            stepFunctionCalls.push(...calls);
          }
          const usage = chunk.usageMetadata as
            | { promptTokenCount?: number; candidatesTokenCount?: number }
            | undefined;
          if (usage?.promptTokenCount) {
            inputTokens = usage.promptTokenCount;
            contextGuard.noteUsage(
              usage.promptTokenCount,
              usage.candidatesTokenCount ?? 0,
            );
          }
          if (usage?.candidatesTokenCount) {
            outputTokens = usage.candidatesTokenCount;
          }
        }

        const text = rawResponseParts
          .filter(
            (p): p is { text: string } =>
              typeof (p as Record<string, unknown>).text === "string",
          )
          .map((p) => p.text)
          .join("");

        return {
          text,
          toolCalls: stepFunctionCalls.map((c) => ({
            id: `${c.name}-${Math.random().toString(36).slice(2)}`,
            name: c.name,
            args: c.args,
          })),
          usage: { inputTokens, outputTokens },
          rawStopReason: stopReason,
          raw: rawResponseParts,
        };
      },

      buildToolResultMessages: (conversation, stepResult, toolResults) => {
        const modelTurn = { role: "model", parts: stepResult.raw as unknown[] };
        const functionResponses = toolResults.map((r) => ({
          functionResponse: {
            name: r.name,
            response: r.error
              ? {
                  error: r.error,
                  status: r.permanentlyFailed ? "permanently_failed" : "failed",
                }
              : { result: r.output },
          },
        }));
        return [
          ...conversation,
          modelTurn,
          { role: "user", parts: functionResponses },
        ];
      },

      mapFinishReason: (rawStopReason, hadToolCallsAtCap) =>
        hadToolCallsAtCap ? "tool-calls" : mapGeminiFinishReason(rawStopReason),
    };
  }
  ```

  **Explicitly deferred to implementation time, flagged here rather than guessed:** the exact call signature of `executeNativeToolCalls` (whether the engine's generic tool-dispatch in `loopEngine.ts` fully subsumes it, or whether the adapter must still call it directly for the mid-turn tool-discovery-hydration behavior at `utils.ts:1160-1186`, which the generic engine dispatcher in Task 3 does not implement). **Resolve this before writing Step 3**, by re-reading `executeNativeToolCalls` alongside the Task 3 engine's tool-dispatch block side by side; if hydration support is lost, either add a `refreshTools` escape hatch to the engine (mirroring the `refreshTools` hook noted in Task 4) or keep `executeNativeToolCalls` as the adapter's own tool-dispatch (bypassing the engine's generic dispatcher entirely for Gemini adapters via a `dispatchTools?` adapter override) — the second option is safer for a first migration pass and is the recommended default; revisit centralizing it only after both Gemini migrations (Tasks 5 and 6) are green.

- [ ] **Step 3: Replace `executeNativeGemini3Stream`'s loop body with the engine call**, wiring `createGeminiLoopAdapter` with `enableMalformedRetry: false` (AI Studio's current behavior — see mapping table).

- [ ] **Step 4: Run the characterization suite against the migrated code — must still pass unmodified.**

  ```bash
  npx tsx test/continuous-test-suite-aistudio-loop-characterization.ts
  ```

- [ ] **Step 5: Full verification and commit**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-aistudio-loop-characterization.ts
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

  ```bash
  git add src/lib/providers/googleAiStudio/loopAdapter.ts src/lib/providers/googleAiStudio/client.ts \
    test/continuous-test-suite-aistudio-loop-characterization.ts package.json
  git commit -m "refactor(googleAiStudio): migrate native Gemini streaming loop onto runAgenticLoop"
  ```

---

## Task 6: Migrate all four Google Vertex loops onto the engine

**Files:**

- Create: `test/continuous-test-suite-vertex-loop-characterization.ts` (covers all four: Gemini stream, Gemini generate, Claude stream, Claude generate)
- Modify: `src/lib/providers/googleVertex/client.ts` (`executeNativeGemini3Stream`, `executeNativeGemini3Generate`, `executeNativeAnthropicStream`, `executeNativeAnthropicGenerate` bodies replaced)
- Possibly move: `src/lib/providers/googleAiStudio/loopAdapter.ts` → `src/lib/core/geminiLoopAdapter.ts` (see Task 5's note — resolve the import-path question here since this is the first cross-directory consumer)

This is the largest migration (four loops, ~4,000-5,000 duplicated lines per the audit's estimate) — split into four sub-steps, each independently characterized and committed, rather than one giant task, so a regression in one loop never blocks the other three from landing.

- [ ] **Step 1: Write the four-part characterization suite against current code**

  Reuse the exact `createVertexGenAIClient` override precedent from `test/continuous-test-suite-gemini-abort.ts` for the two Gemini loops (`executeNativeGemini3Stream`/`Generate`). For the two Claude-on-Vertex loops, the client is Vertex's Anthropic-compatible SDK client (constructed via a different factory — locate it by reading `executeNativeAnthropicStream`'s first ~30 lines at implementation time; likely `createVertexAnthropicClient` or similar, override the same way).

  Structure the suite with four `describe`-style groups (the harness doesn't have `describe`, so use comment-delimited sections and descriptive test names prefixed `[gemini-stream]`, `[gemini-generate]`, `[claude-stream]`, `[claude-generate]`), each covering at minimum: text-only turn, tool-call round trip, and — for the two Gemini loops only — the `MALFORMED_FUNCTION_CALL` retry-once behavior (Vertex+Gemini has this; Vertex+Claude does not, since Claude's wire format has no such finish reason). For the two Claude loops, also cover: (a) a prompt-cache-breakpoint assertion — the mocked `client.messages.create` request must carry a `cache_control` marker on at least one message once the conversation crosses one round trip, proving `applyVertexAnthropicCacheBreakpoints` (or its call site) survived the migration; and (b) a **tool-failure-breaker assertion** — mock a tool that always throws, drive `DEFAULT_TOOL_MAX_RETRIES` (2) failed calls, and assert the next attempt returns a `permanently_failed`/`do_not_retry` result instead of a plain error (this is Verified Fact 4's Vertex+Claude-only divergence from native Anthropic; native Anthropic's own characterization suite in Task 4 asserts the OPPOSITE — no breaker, unbounded plain-error retries — so these two suites must not be copy-pasted from each other without adjusting this one assertion).

  Add `test:vertex-loop-characterization` to `package.json`. Run against unmigrated code; confirm green.

- [ ] **Step 2: Migrate `executeNativeGemini3Stream` and `executeNativeGemini3Generate`**

  Both call `createGeminiLoopAdapter(...)` (from Task 5, now imported cross-directory — resolve the file-location question from Task 5's note in this step, moving the file if needed) with `enableMalformedRetry: true` and Vertex's own `reclaimVertexLoopContext` passed as the `reclaimContext` parameter. This is also where Verified Fact 3's buffered-then-replayed streaming quirk gets fixed as a side effect: the engine always returns `channel.iterable` immediately (background-loop model), so `executeNativeGemini3Stream` becomes genuinely concurrent with its consumer for the first time. Run the characterization suite's `[gemini-stream]`/`[gemini-generate]` sections; they must still pass (they assert chunk _content_, not chunk _timing_, so this is safe). Commit separately:

  ```bash
  git add src/lib/providers/googleVertex/client.ts src/lib/providers/googleAiStudio/loopAdapter.ts \
    test/continuous-test-suite-vertex-loop-characterization.ts
  git commit -m "refactor(googleVertex): migrate native Gemini-3 loops (stream+generate) onto runAgenticLoop"
  ```

- [ ] **Step 3: Migrate `executeNativeAnthropicStream` and `executeNativeAnthropicGenerate`**

  Both call `createAnthropicLoopAdapter(...)` (from Task 4), passing Vertex's client, `applyCacheBreakpoints: applyVertexAnthropicCacheBreakpoints` (its own, per Verified Fact 6 — do not substitute native Anthropic's function here), **and** `toolFailureBreaker: { maxRetries: DEFAULT_TOOL_MAX_RETRIES }` (imported from `core/constants.js`, the same shared constant Vertex's current hand-rolled `failedTools` Map already uses at `client.ts:5096,5438-5441` and `:6668+` — per Verified Fact 4, this is the one field the native-Anthropic call to this same factory correctly omits and this call must not). Run the `[claude-stream]`/`[claude-generate]` characterization sections; they must still pass, including the cache-breakpoint assertion AND the tool-failure-breaker assertion added in Step 1. Commit separately:

  ```bash
  git add src/lib/providers/googleVertex/client.ts src/lib/providers/anthropic/loopAdapter.ts \
    test/continuous-test-suite-vertex-loop-characterization.ts
  git commit -m "refactor(googleVertex): migrate native Claude loops (stream+generate) onto runAgenticLoop"
  ```

- [ ] **Step 4: Full verification**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-vertex-loop-characterization.ts
  npx tsx test/continuous-test-suite-gemini-abort.ts
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

  **Rollback for this task:** each of the two commits (Step 2, Step 3) reverts independently — a regression found only in the Claude-on-Vertex loops does not require reverting the Gemini-on-Vertex migration, and vice versa.

---

## Task 7: Migrate Amazon Bedrock's two loops onto the engine

**Files:**

- Create: `test/continuous-test-suite-bedrock-loop-characterization.ts`
- Create: `src/lib/providers/amazonBedrock/loopAdapter.ts` (`createBedrockLoopAdapter`)
- Modify: `src/lib/providers/amazonBedrock/client.ts` (`conversationLoop`, `streamingConversationLoop` bodies replaced)

- [ ] **Step 1: Write the characterization test — explicitly pinning the pre-existing `maxIterations`/`options.maxSteps` inconsistency**

  No existing mock-Bedrock precedent exists in the test suite; establish one following the `mockClient` pattern from Task 4, overriding the private `bedrockClient` field:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Characterization test for Amazon Bedrock's two native ConverseStream tool
   * loops (amazonBedrock/client.ts conversationLoop + streamingConversationLoop),
   * written BEFORE migration onto runAgenticLoop (plan 08, task 7). Pins:
   *   - text-only turn (both generate and stream paths)
   *   - tool-call round trip (tool_use content block -> toolResult -> final text)
   *   - a raw per-call throw on tool-not-found (Bedrock has no breaker today)
   *   - the PRE-EXISTING maxIterations inconsistency: conversationLoop
   *     (generate) is hardcoded to 10 and IGNORES options.maxSteps;
   *     streamingConversationLoop (stream) honors options.maxSteps. This test
   *     pins BOTH behaviors as they exist today so the migration's decision
   *     to unify them (see this task's Step 3) is a deliberate, visible diff
   *     against a known baseline, not an accidental one.
   *
   * Runner: `npx tsx test/continuous-test-suite-bedrock-loop-characterization.ts`
   * (package.json: `pnpm run test:bedrock-loop-characterization`).
   */
  import "dotenv/config";

  import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
  import { AmazonBedrockProvider } from "../src/lib/providers/amazonBedrock/client.js";

  const { test, runSuite } = defineSuite(
    "Amazon Bedrock native loop characterization",
  );

  type ConverseInput = { messages: unknown[]; toolConfig?: unknown };

  function textConverseResponse(text: string): {
    output: {
      message: { role: string; content: Array<Record<string, unknown>> };
    };
    stopReason: string;
    usage: { inputTokens: number; outputTokens: number };
  } {
    return {
      output: { message: { role: "assistant", content: [{ text }] } },
      stopReason: "end_turn",
      usage: { inputTokens: 10, outputTokens: 5 },
    };
  }

  function toolUseConverseResponse(
    toolUseId: string,
    name: string,
    input: Record<string, unknown>,
  ) {
    return {
      output: {
        message: {
          role: "assistant",
          content: [{ toolUse: { toolUseId, name, input } }],
        },
      },
      stopReason: "tool_use",
      usage: { inputTokens: 10, outputTokens: 5 },
    };
  }

  function mockBedrockClient(responses: unknown[]): {
    send: (command: { input: ConverseInput }) => Promise<unknown>;
  } {
    let index = 0;
    return {
      send: async () => {
        const next = responses[Math.min(index, responses.length - 1)];
        index++;
        return next;
      },
    };
  }

  function providerWith(bedrockClient: unknown): AmazonBedrockProvider {
    const provider = new AmazonBedrockProvider(
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
      undefined,
      undefined,
      {
        region: "us-east-1",
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    );
    (provider as unknown as { bedrockClient: unknown }).bedrockClient =
      bedrockClient;
    return provider;
  }

  await test("[generate] text-only turn produces the message text with no tool calls", async () => {
    const provider = providerWith(
      mockBedrockClient([textConverseResponse("hello from bedrock")]),
    );
    const result = await provider.generate({ input: { text: "hi" } });
    assertEqual(
      result.content,
      "hello from bedrock",
      "generate path returns the single-step text",
    );
  });

  await test("[generate] tool-call round trip: tool_use then end_turn", async () => {
    const provider = providerWith(
      mockBedrockClient([
        toolUseConverseResponse("call_1", "add_numbers", { a: 2, b: 3 }),
        textConverseResponse("the answer is 5"),
      ]),
    );
    const result = await provider.generate({
      input: { text: "add 2 and 3" },
      tools: {
        add_numbers: {
          description: "add",
          execute: async (args: { a: number; b: number }) => args.a + args.b,
        },
      },
    });
    assertEqual(
      result.content,
      "the answer is 5",
      "tool executed, follow-up text returned",
    );
  });

  await runSuite();
  ```

  Add `test:bedrock-loop-characterization` to `package.json`. Run against unmigrated code; confirm green. Extend with a stream-path pair of tests once the streaming mock (a fake `AsyncIterable` matching `ConverseStreamCommand`'s event shape — `contentBlockStart`/`contentBlockDelta`/`contentBlockStop`/`messageStop`/`metadata`, per `client.ts:1949` `processStreamResponse`) is built, mirroring the same round-trip and text-only cases for `streamingConversationLoop`.

- [ ] **Step 2: Extract `createBedrockLoopAdapter`**

  Create `src/lib/providers/amazonBedrock/loopAdapter.ts`, porting `handleBedrockResponse` (`client.ts:703+`)'s stop-reason branch into `mapFinishReason`, `convertToAWSMessages`/`convertToBedrockMessages` (`client.ts:849,1111`) into `buildStepRequest`/`buildToolResultMessages`, and `formatToolsForBedrock`/`convertAISDKToolsToToolDefinitions` (`client.ts:~1014,1049`) into the tool-declaration portion of `buildStepRequest`. No `planReclaim`, no `toolFailureBreaker`, no `isMalformedStep` — all left `undefined`, matching Verified Fact 4/5/6 exactly (Bedrock has none of these today; the migration must not silently add them).

  ```typescript
  import type {
    AgenticLoopAdapter,
    AgenticLoopStepResult,
  } from "../../types/index.js";

  type BedrockConversation = Array<{ role: string; content: unknown[] }>;

  export type BedrockLoopClient = {
    send: (command: { input: unknown }) => Promise<{
      output?: {
        message?: { role: string; content: Array<Record<string, unknown>> };
      };
      stopReason?: string;
      usage?: { inputTokens: number; outputTokens: number };
    }>;
  };

  export function createBedrockLoopAdapter(params: {
    client: BedrockLoopClient;
    modelId: string;
    providerLabel: string;
    maxSteps: number;
    toolConfig?: unknown;
    buildConverseCommand: (input: {
      modelId: string;
      messages: BedrockConversation;
      toolConfig?: unknown;
    }) => { input: unknown };
  }): AgenticLoopAdapter<BedrockConversation> {
    return {
      providerLabel: params.providerLabel,
      maxSteps: params.maxSteps,

      buildStepRequest: (conversation) => ({
        raw: params.buildConverseCommand({
          modelId: params.modelId,
          messages: conversation,
          toolConfig: params.toolConfig,
        }),
      }),

      executeStep: async (request, channel) => {
        const response = await params.client.send(
          request.raw as { input: unknown },
        );
        const content = response.output?.message?.content ?? [];
        let text = "";
        const toolCalls: AgenticLoopStepResult["toolCalls"] = [];
        for (const block of content) {
          if (typeof block.text === "string") {
            text += block.text;
            channel.push({ content: block.text });
          } else if (block.toolUse) {
            const toolUse = block.toolUse as {
              toolUseId: string;
              name: string;
              input: Record<string, unknown>;
            };
            toolCalls.push({
              id: toolUse.toolUseId,
              name: toolUse.name,
              args: toolUse.input,
            });
          }
        }
        return {
          text,
          toolCalls,
          usage: {
            inputTokens: response.usage?.inputTokens ?? 0,
            outputTokens: response.usage?.outputTokens ?? 0,
          },
          rawStopReason: response.stopReason,
          raw: content,
        };
      },

      buildToolResultMessages: (conversation, stepResult, toolResults) => {
        const assistantTurn = {
          role: "assistant",
          content: stepResult.raw as unknown[],
        };
        const toolResultTurn = {
          role: "user",
          content: toolResults.map((r) => ({
            toolResult: {
              toolUseId: r.id,
              content: [{ json: r.output }],
              ...(r.error ? { status: "error" } : {}),
            },
          })),
        };
        return [...conversation, assistantTurn, toolResultTurn];
      },

      mapFinishReason: (rawStopReason, hadToolCallsAtCap) => {
        if (hadToolCallsAtCap) {
          return "tool-calls";
        }
        switch (rawStopReason) {
          case "end_turn":
          case "stop_sequence":
            return "stop";
          case "max_tokens":
            return "length";
          case "tool_use":
            return "tool-calls";
          default:
            return "stop";
        }
      },
    };
  }
  ```

- [ ] **Step 3: Migrate `conversationLoop` (generate) and `streamingConversationLoop` (stream)**

  Wire both to `createBedrockLoopAdapter`. **Deliberate, called-out behavior unification:** replace `conversationLoop`'s hardcoded `maxIterations = 10` with the same `options.maxSteps || DEFAULT_MAX_STEPS` resolution `streamingConversationLoop` already uses — the engine takes one `maxSteps` value per adapter instance, so the two loops can no longer disagree by construction. This is flagged in Risks & Rollback as a real behavior change (a generate-path caller that relied on the undocumented 10-step ceiling could now run up to `DEFAULT_MAX_STEPS`), not swept in silently.

  The stream path also drops Bedrock's bespoke hand-rolled `ReadableStream` in favor of the engine's `streamChannel`-backed `channel.iterable` — the manual `controller.close()` WHATWG-spec requirement noted in the original code's comments (`client.ts:~1449` region) no longer applies since `streamChannel.ts` owns closing.

- [ ] **Step 4: Run the characterization suite against the migrated code — assert the `maxIterations` unification explicitly**

  Add one more test to the characterization suite (written in Step 1, extended here) proving the fix:

  ```typescript
  await test("[generate] maxSteps now honors options.maxSteps instead of the old hardcoded 10 (deliberate unification, see plan 08 task 7)", async () => {
    const alwaysToolUse = toolUseConverseResponse("call_loop", "noop", {});
    const provider = providerWith(mockBedrockClient([alwaysToolUse]));
    const result = await provider.generate({
      input: { text: "loop" },
      maxSteps: 2,
      tools: { noop: { description: "noop", execute: async () => "ok" } },
    });
    assertEqual(
      result.finishReason,
      "tool-calls",
      "step cap honored options.maxSteps=2, not the old hardcoded 10",
    );
  });
  ```

  ```bash
  npx tsx test/continuous-test-suite-bedrock-loop-characterization.ts
  ```

- [ ] **Step 5: Full verification and commit**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-bedrock-loop-characterization.ts
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

  ```bash
  git add src/lib/providers/amazonBedrock/loopAdapter.ts src/lib/providers/amazonBedrock/client.ts \
    test/continuous-test-suite-bedrock-loop-characterization.ts package.json
  git commit -m "refactor(amazonBedrock): migrate both native ConverseStream loops onto runAgenticLoop; unify maxSteps resolution"
  ```

---

## Task 8: SPI hardening — default `executeStream` on `BaseProvider`

**Files:**

- Modify: `src/lib/core/baseProvider.ts` (`executeStream` changes from `protected abstract` to a concrete `protected` method with a default body; `getAISDKModel` stays abstract)
- Modify: `test/continuous-test-suite-loop-engine.ts` (append a section using a minimal fake provider subclass)

This task is independent of Tasks 4-7 (none of the four migrated providers use the default — they all still declare their own explicit `executeStream`). It exists to structurally prevent a repeat of the SageMaker dual-shape trap (Task 9) for any future provider that builds a real `doStream` on its delegating `LanguageModel` but forgets to wire `executeStream` to it.

- [ ] **Step 1: Write the failing test for the default behavior**

  Append to `test/continuous-test-suite-loop-engine.ts`:

  ```typescript
  // ---------------------------------------------------------------------------
  // BaseProvider default executeStream (SPI hardening)
  // ---------------------------------------------------------------------------
  import { BaseProvider } from "../src/lib/core/baseProvider.js";

  class FakeWorkingDoStreamProvider extends BaseProvider {
    protected getProviderName() {
      return "fake-working" as never;
    }
    protected getDefaultModel() {
      return "fake-model";
    }
    protected getAISDKModel() {
      return {
        specificationVersion: "v3" as const,
        provider: "fake-working",
        modelId: "fake-model",
        supportedUrls: {},
        doGenerate: async () => {
          throw new Error("not used in this test");
        },
        doStream: async () => ({
          stream: (async function* () {
            yield { type: "text-delta", textDelta: "hello " };
            yield { type: "text-delta", textDelta: "world" };
            yield {
              type: "finish",
              finishReason: "stop",
              usage: { inputTokens: 3, outputTokens: 2 },
            };
          })(),
          rawCall: { rawPrompt: null, rawSettings: {} },
        }),
      } as never;
    }
    protected formatProviderError(error: unknown): Error {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  class FakeThrowingDoStreamProvider extends BaseProvider {
    protected getProviderName() {
      return "fake-throwing" as never;
    }
    protected getDefaultModel() {
      return "fake-model";
    }
    protected getAISDKModel() {
      return {
        specificationVersion: "v3" as const,
        provider: "fake-throwing",
        modelId: "fake-model",
        supportedUrls: {},
        doGenerate: async () => {
          throw new Error("not used in this test");
        },
        doStream: () => {
          throw new Error(
            "doStream is not implemented on the delegating model",
          );
        },
      } as never;
    }
    protected formatProviderError(error: unknown): Error {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  await test("BaseProvider default executeStream drives doStream directly when it does not throw", async () => {
    const provider = new FakeWorkingDoStreamProvider("fake-model");
    const result = await provider.stream({ input: { text: "hi" } });
    let text = "";
    for await (const chunk of result.stream) {
      const content = (chunk as { content?: string }).content;
      if (content) {
        text += content;
      }
    }
    assertEqual(
      text,
      "hello world",
      "default executeStream drove doStream's real chunks through",
    );
  });

  await test("BaseProvider default executeStream propagates a synchronous doStream throw as a rejection, not a hang or a silently empty stream", async () => {
    const provider = new FakeThrowingDoStreamProvider("fake-model");
    // This fake's doGenerate also throws ("not used in this test"), so
    // BaseProvider.stream()'s narrow-transient-error-string fake-streaming
    // fallback (Verified Fact 8) cannot succeed here either — the correct,
    // testable outcome is that stream() rejects rather than hanging or
    // resolving with an empty/broken stream. This is a real assertion, not
    // a "both outcomes are fine" placeholder: exactly one branch below runs.
    let rejected = false;
    try {
      await provider.stream({ input: { text: "hi" } });
    } catch (err) {
      rejected = true;
      assert(
        err instanceof Error,
        "rejection surfaces as a real Error, not a raw string/undefined",
      );
    }
    assert(
      rejected,
      "stream() rejects when doStream throws synchronously and the fake-streaming fallback also fails, rather than hanging or returning an empty stream",
    );
  });
  ```

  Run — confirm the first test fails (no default `executeStream` exists yet, so `FakeWorkingDoStreamProvider` cannot be instantiated as a concrete class):

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

  Expect a TypeScript/runtime error about `BaseProvider`'s abstract `executeStream` not being implemented.

- [ ] **Step 2: Change `executeStream` from abstract to a concrete default**

  In `core/baseProvider.ts`, change the declaration at `:1937`:

  ```typescript
  // BEFORE
  protected abstract executeStream(
    options: StreamOptions,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult>;
  ```

  ```typescript
  // AFTER
  /**
   * Default real-streaming implementation: drive getAISDKModel().doStream()
   * directly when the model's doStream does not throw. Providers with a
   * genuine custom streaming implementation (the vast majority — every
   * native-loop provider migrated in tasks 4-7, every OpenAI-compatible
   * provider) declare their own `executeStream` override, which JavaScript
   * method resolution picks over this default automatically; this body only
   * runs for a provider that relies on the default. Exists so a provider
   * whose delegating LanguageModel has a real, working doStream (e.g.
   * SageMaker, task 9) is never silently orphaned into always throwing —
   * see docs/superpowers/plans/2026-08-15-08-agentic-loop-engine.md task 9.
   */
  protected async executeStream(
    _options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    const model = await this.getAISDKModel();
    const doStreamResult = await (model as unknown as {
      doStream: (options: Record<string, unknown>) => Promise<{
        stream: AsyncIterable<{ type: string; textDelta?: string; finishReason?: string; usage?: { inputTokens?: number; outputTokens?: number } }>;
      }>;
    }).doStream({});
    const channel = createStreamChannel<{ content: string }>();
    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason = "stop";
    const drainPromise = (async () => {
      try {
        for await (const chunk of doStreamResult.stream) {
          if (chunk.type === "text-delta" && chunk.textDelta) {
            channel.push({ content: chunk.textDelta });
          } else if (chunk.type === "finish") {
            finishReason = chunk.finishReason ?? "stop";
            inputTokens = chunk.usage?.inputTokens ?? 0;
            outputTokens = chunk.usage?.outputTokens ?? 0;
          }
        }
        channel.close();
      } catch (err) {
        channel.error(err);
      }
    })();
    return {
      stream: channel.iterable,
      provider: this.providerName,
      model: this.modelName,
      finishReason,
      usage: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
      toolCalls: [],
      toolsUsed: [],
      analytics: drainPromise.then(() => ({ inputTokens, outputTokens, finishReason })) as never,
    } as StreamResult;
  }
  ```

  Import `createStreamChannel` from `./streamChannel.js` (Task 1) at the top of `baseProvider.ts`.

  Verify every existing provider that currently relies on the abstract contract still compiles — since every one of them (all 30) declares its own `protected async executeStream` override, changing the base from `abstract` to a concrete method is a strictly additive, non-breaking change at the type level; confirm with:

  ```bash
  pnpm run check
  ```

- [ ] **Step 3: Run the Step 1 tests — both must pass**

  ```bash
  npx tsx test/continuous-test-suite-loop-engine.ts
  ```

- [ ] **Step 4: Full verification and commit**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-loop-engine.ts
  pnpm run build
  ```

  ```bash
  git add src/lib/core/baseProvider.ts test/continuous-test-suite-loop-engine.ts
  git commit -m "feat(core): add default BaseProvider.executeStream driving doStream when available"
  ```

---

## Task 9: SageMaker streaming — wire to the existing working `doStream`

**Files:**

- Create: `test/continuous-test-suite-sagemaker-streaming.ts`
- Modify: `src/lib/providers/amazonSagemaker.ts` (delete the throwing `executeStream` override, per the primary path below)

- [ ] **Step 1: Write the test proving `doStream` (already built, per Verified Fact 9) works end-to-end through `BaseProvider.stream()`**

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Proves AmazonSageMakerProvider.executeStream's hardcoded "not yet
   * implemented" throw (amazonSagemaker.ts:120-152, pre-migration) was
   * masking a fully working SageMakerLanguageModel.doStream
   * (sagemaker/language-model.ts:374) the whole time. After task 9's fix
   * (deleting the throwing override so BaseProvider's task-8 default drives
   * doStream directly), this suite exercises that path with a mocked
   * `invokeEndpointWithStreaming` SageMaker client call — no live AWS call.
   *
   * Runner: `npx tsx test/continuous-test-suite-sagemaker-streaming.ts`
   * (package.json: `pnpm run test:sagemaker-streaming`).
   */
  import "dotenv/config";

  import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
  import { AmazonSageMakerProvider } from "../src/lib/providers/amazonSagemaker.js";

  const { test, runSuite } = defineSuite(
    "SageMaker streaming (doStream wiring)",
  );

  function mockSageMakerClient(): {
    invokeEndpointWithStreaming: (input: unknown) => Promise<{
      Body: AsyncIterable<{ PayloadPart?: { Bytes: Uint8Array } }>;
      ContentType?: string;
      InvokedProductionVariant?: string;
    }>;
  } {
    const encoder = new TextEncoder();
    return {
      invokeEndpointWithStreaming: async () => ({
        ContentType: "application/json",
        InvokedProductionVariant: "AllTraffic",
        Body: (async function* () {
          yield {
            PayloadPart: {
              Bytes: encoder.encode(
                JSON.stringify({ token: { text: "hello " } }),
              ),
            },
          };
          yield {
            PayloadPart: {
              Bytes: encoder.encode(
                JSON.stringify({ token: { text: "world" } }),
              ),
            },
          };
        })(),
      }),
    };
  }

  await test("stream() drives SageMakerLanguageModel.doStream end-to-end via BaseProvider's default executeStream", async () => {
    const provider = new AmazonSageMakerProvider(
      "fake-endpoint",
      undefined,
      undefined,
      {
        endpointName: "fake-endpoint",
        region: "us-east-1",
      },
    );
    (provider as unknown as { client: unknown }).client = mockSageMakerClient();
    const result = await provider.stream({ input: { text: "hi" } });
    let text = "";
    for await (const chunk of result.stream) {
      const content = (chunk as { content?: string }).content;
      if (content) {
        text += content;
      }
    }
    assert(
      text.length > 0,
      "streaming produced real output instead of throwing 'not yet fully implemented'",
    );
  });

  await runSuite();
  ```

  Add `test:sagemaker-streaming` to `package.json`. Run against the **current** code first — confirm it FAILS with the "not yet fully implemented" error (proving the test correctly detects the bug before the fix):

  ```bash
  npx tsx test/continuous-test-suite-sagemaker-streaming.ts
  ```

- [ ] **Step 2 (primary path): delete the throwing `executeStream` override**

  In `amazonSagemaker.ts`, delete the entire `protected async executeStream(...)` block (`:120-152`) that unconditionally throws. With Task 8 landed, `BaseProvider`'s default `executeStream` now drives `getAISDKModel().doStream()` (which for SageMaker is `this.sagemakerModel.doStream`, per Verified Fact 9) automatically — no SageMaker-specific code is needed at all. This is the cleanest possible outcome: recovering all ~1,500 lines of already-built streaming machinery (`streaming.ts`, `language-model.ts`'s `doStream`) by deleting code, not writing it.

  Verify the class still compiles without an `executeStream` override (it now inherits the default):

  ```bash
  pnpm run check
  ```

- [ ] **Step 2b (fallback path — only if Step 2 reveals rot): wire an explicit thin override instead of deleting**

  If running Step 1's test against the post-Task-8, override-deleted provider surfaces a real defect in `doStream`'s chunk shape not anticipated by Task 8's generic `{type:"text-delta"|"finish"}` handling (e.g. SageMaker's `doStream` emits a chunk shape Task 8's default doesn't recognize, or the synthetic-stream fallback path inside `doStream` itself needs a warning surfaced that the generic default silently drops), do **not** force-fit SageMaker into the generic default. Instead, write a SageMaker-specific `protected async executeStream` that calls `this.sagemakerModel.doStream({})` directly and adapts its `ReadableStream<{type,textDelta}>` into a `StreamResult` explicitly, preserving the `warnings` array (`language-model.ts:521-528`, e.g. "Streaming not supported, using synthetic stream") by logging it rather than dropping it — something Task 8's generic default has no SageMaker-specific place to surface. This fallback keeps the recovered `doStream`/`streaming.ts` machinery either way; the only question Step 2 vs Step 2b answers is whether the generic Task-8 default is a sufficient adapter or whether SageMaker needs its own thin one. Spell out the decision in the commit message regardless of which path is taken.

- [ ] **Step 3: Run the test against the fixed code — must now pass**

  ```bash
  npx tsx test/continuous-test-suite-sagemaker-streaming.ts
  ```

- [ ] **Step 4: Full verification and commit**

  ```bash
  pnpm run check
  pnpm run lint
  npx tsx test/continuous-test-suite-sagemaker-streaming.ts
  pnpm run build
  ```

  ```bash
  git add src/lib/providers/amazonSagemaker.ts test/continuous-test-suite-sagemaker-streaming.ts package.json
  git commit -m "fix(amazonSagemaker): wire executeStream to the existing working doStream implementation"
  ```

---

## Self-Review Pass

Performed against this document before treating it as final:

- **Scope coverage against the six assigned items:** (1) stream channel — Task 1 ✅. (2) native tool converter — Task 2 ✅. (3) the engine + `AgenticLoopAdapter` — Task 3 ✅, hooks grounded in the mapping table, `planReclaim`/`toolFailureBreaker`/`isMalformedStep` all optional and gated per real per-family evidence rather than assumed uniform. (4) four migrations, one provider per task, characterization-first — Tasks 4-7 ✅, each starts with a characterization suite proven green against the OLD code before any production line moves. (5) SageMaker decision task with both paths spelled out — Task 9 ✅ (primary: delete; fallback: thin explicit override — both concrete, neither hand-waved). (6) SPI hardening — Task 8 ✅, default is additive (concrete method, not abstract), verified non-breaking for all 30 existing overriding providers via `pnpm run check`.
- **Placeholder scan:** every code block in every task is real, compilable-shape TypeScript with concrete logic — no `// TODO: implement`, no `...`, no `throw new Error("not implemented")` left as a final state anywhere outside the deliberate SageMaker-characterization fixture (which exists specifically to assert that error, pre-fix). The two spots that explicitly say "verify the exact X at implementation time" (Task 4's mid-turn tool-hydration trigger, Task 5's `models.generateContentStream` override point, Task 5's `executeNativeToolCalls`-vs-engine-dispatcher decision) are flagged as such deliberately, because pinning them further requires re-reading live code that will have shifted by the time an engineer executes this task — a plan asserting false certainty on those three points would be worse than one that names exactly what to re-verify and why. This is different from a placeholder: every one of them has a recommended default and a concrete fallback, not an open question with no path forward.
- **Adapter-signature consistency across Tasks 4-7:** all four `create*LoopAdapter` factories return `AgenticLoopAdapter<TConversation>` from the single Task 3 type; all four accept a `client` (wire-transport-specific), `modelId`, `providerLabel`, `maxSteps`; all four either populate or explicitly omit `toolFailureBreaker`/`planReclaim`/`isMalformedStep` per the mapping table (native Anthropic: all three omitted; Bedrock: all three omitted; AI Studio: `toolFailureBreaker` set, `planReclaim` set, `isMalformedStep` omitted; Vertex+Gemini: all three set; **Vertex+Claude: `planReclaim` set via Anthropic's own function, `toolFailureBreaker` set to `{maxRetries: DEFAULT_TOOL_MAX_RETRIES}` in Task 6 Step 3, `isMalformedStep` omitted — deliberately NOT matching native Anthropic on `toolFailureBreaker`, since the two clients diverge there today (Verified Fact 4)**). Checked against the mapping table row-by-row while drafting Tasks 4-7 — this exact check caught the Vertex+Claude breaker error during self-review (the mapping table's "Lands as" cell and Task 6 Step 3's factory call were both corrected to match the grep-verified code once the contradiction with "all four share exactly two adapter shapes with uniform per-family fields" surfaced it).
- **Fixed during self-review:** the original hook list from the assignment (`buildStepRequest` → `executeStepStream`/`executeStep` → separate `parseStepResult`) was collapsed into a single `executeStep` that streams AND parses in one pass, because every real loop (Anthropic's SSE handler, Gemini's chunk-metadata accumulator, Bedrock's `processStreamResponse`) interleaves parsing with incremental chunk emission — a genuinely separate "parse the raw response" step does not exist in any of the four families' real code, and inventing one would force an artificial buffer-then-parse step that reintroduces Vertex+Gemini's own non-concurrency bug (Verified Fact 3) into the other three families. This deviation from the assignment's suggested hook names is called out explicitly here rather than silently — the assignment asked for a design "provably sufficient for all four," and the evidence showed the suggested split wasn't how any of the four actually work.
- **Fixed post-authoring, driven by a cross-plan critic finding:** an earlier draft of Global Constraints and the Architecture summary claimed `runAgenticLoop` routes retryable failures through `withProviderRetry` "pre-first-chunk only," but Task 3's `runAgenticLoop` implementation at the time called `adapter.executeStep()` directly with zero wrapping — a real defect (verified independently against this document, not taken on faith) that would have silently dropped plan 07 Task 9's Anthropic retry protection the moment Task 4's migration replaced the old loop body, with no compile error and no failing test to catch it. Fixed by: (1) wrapping the step call in `withProviderRetry` inside Task 3 Step 3, gated by a `hasEmitted`/`PostEmissionStepError` mechanism so a step that already streamed a chunk is never retried; (2) two new engine-level tests in Task 3 Step 1 proving the pre- and post-emission cases directly against the fake adapter; (3) a 429-then-success characterization test added to Task 4 Step 1, plus a subsumption note in Task 4 Step 3 explaining why deleting plan 07 Task 9's Anthropic-specific wrap during migration is correct rather than a regression; (4) Out of Scope and Risks & Rollback reconciled to match — including disclosing that AI Studio, Vertex, and Bedrock each gain this retry protection for the first time as a consequence of the wrap being engine-owned and unconditional rather than an opt-in per adapter.

---

## Verification Checklist

Run after all nine tasks land (mirrors the program-level gates in the roadmap):

```bash
pnpm run check
pnpm run lint
pnpm run build
npx tsx test/continuous-test-suite-loop-engine.ts
npx tsx test/continuous-test-suite-anthropic-loop-characterization.ts
npx tsx test/continuous-test-suite-anthropic-structured-tools.ts
npx tsx test/continuous-test-suite-aistudio-loop-characterization.ts
npx tsx test/continuous-test-suite-vertex-loop-characterization.ts
npx tsx test/continuous-test-suite-gemini-abort.ts
npx tsx test/continuous-test-suite-bedrock-loop-characterization.ts
npx tsx test/continuous-test-suite-sagemaker-streaming.ts
pnpm test
```

Live verification (API keys required — run before declaring the program's Wave 3 done, never as a PR gate):

```bash
pnpm run test:matrix
pnpm run test:providers
```

Manual smoke test (each of the four migrated families, one real tool-call turn):

```bash
pnpm run build:cli
pnpm run cli generate "what is 2+3? use the calculator tool" --provider anthropic
pnpm run cli generate "what is 2+3? use the calculator tool" --provider google-ai
pnpm run cli generate "what is 2+3? use the calculator tool" --provider vertex --model gemini-3-pro-preview
pnpm run cli generate "what is 2+3? use the calculator tool" --provider vertex --model claude-sonnet-4-6
pnpm run cli generate "what is 2+3? use the calculator tool" --provider bedrock
```

---

## Risks & Rollback

- **This is the riskiest plan in the program** (per the assignment) because it touches the hot path of the four most heavily-used native providers simultaneously. The mitigation built into every task is structural, not just procedural: each of Tasks 4, 5, 7 (and each of Task 6's two sub-migrations) is its own commit with its own characterization suite, so `git revert <sha>` on any single migration commit fully restores that one provider's pre-migration behavior without touching the other three/five. Tasks 1-3 (the shared primitives) are additive-then-cutover — reverting them requires reverting every migration commit that depends on them first, in reverse order, which is the correct order regardless since later tasks depend on earlier ones.
- **Deliberate behavior changes, called out per-task rather than left implicit:**
  - Task 2: Vertex-Gemini's tool declarations gain name-sanitization + mid-turn hydration they lacked before (a strict improvement, but a behavior change).
  - Task 6 (Gemini sub-step): Vertex+Gemini's stream becomes genuinely concurrent with its consumer instead of buffer-then-replay (Verified Fact 3) — chunk _content_ is unchanged, chunk _timing_ is not.
  - Task 7: Bedrock's `conversationLoop` (generate) now honors `options.maxSteps` instead of a hardcoded 10 — a caller depending on the old undocumented ceiling sees different step-cap behavior on the generate path specifically.
  - Task 9: SageMaker streaming goes from "always throws" to "actually streams" — this is the explicit goal, not a side effect, but any caller code with a try/catch specifically expecting the old throw (unlikely, but worth a grep before merging) breaks.
  - Tasks 5, 6, 7 (Google AI Studio, Google Vertex, Amazon Bedrock): each gains pre-first-chunk 429/5xx retry for the FIRST TIME, as an emergent side effect of Task 3's engine-level `withProviderRetry` wrap being unconditional and adapter-agnostic rather than an opt-in flag. Verified by grep: today, zero of `googleAiStudio/client.ts`, `googleVertex/client.ts`, and `amazonBedrock/client.ts` call `withProviderRetry` anywhere — only native Anthropic will, and only because plan 07 Task 9 adds it first (which Task 4 then subsumes, see its Step 3 note; it is not a new behavior for Anthropic specifically). Net effect: a first-step 429/5xx that used to surface immediately to the caller on these three families will now be retried (up to `MAX_PROVIDER_RETRIES = 2` times) before surfacing, changing latency and, in rare edge cases, changing whether a caller-visible error appears at all for a transient failure. This was a deliberate design choice (see Global Constraints: the wrap is engine-owned and universal, not per-adapter opt-in, because the classification is generic and needs no adapter-specific knowledge) rather than a scope-creep accident, but it is a genuine behavior change for these three families and belongs in this list.
- **Deliberately NOT harmonized, to keep risk isolated to "same behavior, different code":** AI Studio does not gain Vertex+Gemini's turn-clock/stall-watchdog or malformed-call retry even though the engine now supports both uniformly; native Anthropic and Bedrock do not gain the TOOL_NOT_FOUND strike-counting breaker even though the engine supports it as an opt-in and Vertex+Claude already has it today (this is a genuine pre-existing asymmetry between native Anthropic and Vertex+Claude, not something this migration introduces or removes — see Verified Fact 4). Enabling these uniformly is real, valuable follow-up work the new engine makes cheap — but bundling it into this migration would make every characterization-test failure ambiguous between "the migration broke something" and "the harmonization changed something on purpose," which defeats the point of characterization testing. Track as a follow-up plan once Tasks 1-9 are stable in production for at least one release.
- **Rollback granularity:** revert order for a full rollback, if ever needed, is Task 9 → 8 → 7 → 6 (Claude sub-step, then Gemini sub-step) → 5 → 4 → 3 → 2 → 1, since each depends on the ones before it. In practice, a single bad migration (e.g. Task 7/Bedrock) reverts alone — Tasks 1-3's primitives stay in place for the other three already-migrated families, and Bedrock's old `conversationLoop`/`streamingConversationLoop` code comes back exactly as it was pre-migration (the revert is of the whole "replace body with engine call" commit, not a partial edit).
- **What could still go wrong that characterization tests won't catch:** timing-sensitive live-API behavior (e.g. Anthropic's real SSE event ordering under network jitter, as opposed to the mocked synchronous `async function*` fixtures used here) and true concurrency/backpressure behavior under load. The Verification Checklist's live-provider smoke tests exist specifically to catch this class of gap before declaring Wave 3 done; they are not optional for this plan even though they are optional for lower-risk plans in the program.

---

## Out of Scope

- **OpenAI-compatible family's own loop** — already shared across 19 providers via `OpenAIChatCompletionsProvider`; only its `createChunkQueue` usage moves onto `streamChannel.ts` in Task 1. The loop logic itself is untouched.
- **Error classification, and `withProviderRetry`'s own retry/backoff/classification logic (the function body itself)** — both are plan 07's contract (`classifyProviderError` in `errorClassifier.ts`; `isRetryableProviderError`/`withProviderRetry` in `providerRetry.ts`), consumed here per Global Constraints. What IS built in this plan (Task 3 Step 3) is the _call site_: wrapping every `adapter.executeStep()` invocation with `withProviderRetry`, plus the engine-owned `hasEmitted`/`PostEmissionStepError` gate that decides when retrying is safe. Also out of scope: plan 07 Task 8's OpenAI-compat streaming retry call site (a different family, untouched by this plan) and plan 07 Task 9's Anthropic-specific loop-level wrap, which this plan's Task 4 deletes as part of the migration rather than building — see Task 4 Step 3's subsumption note.
- **Harmonizing the per-family feature gaps** the mapping table documents (AI Studio's missing turn-clock/malformed-retry, native Anthropic's and Bedrock's missing tool-failure breaker — note Vertex+Claude already has this breaker today and keeps it, per Verified Fact 4) — deliberately deferred, see Risks & Rollback.
- **`azureOpenai`'s four-hook-override pattern** — it extends `OpenAIChatCompletionsProvider` directly (291 lines total) and never had a hand-rolled native loop; nothing here touches it.
- **The four static per-provider-name lookup tables** (`PROVIDER_MAX_TOKENS`, `DEFAULT_TIMEOUTS`, `contextWindows`, pricing) — a separate scaling problem noted in the audit, addressed by plan 06, not this one.
- **`GenerationHandler`'s non-streaming `generate()` path for Anthropic/Bedrock/Vertex** where those providers override `generate()` entirely (bypassing `GenerationHandler`/AI-SDK) — those overrides call the SAME migrated `conversationLoop`/`executeNativeAnthropicGenerate`/etc. functions this plan migrates, so they are covered as part of Tasks 4-7, but restructuring the `generate()`-vs-`stream()` override pattern itself (e.g. whether `generate()` should route through `stream()` and buffer) is not in scope.
- **`neurolink.ts`'s own generate/stream duplication** at the orchestrator level (RAG injection, budget-compaction, fallback mechanisms) — explicitly out of scope for the whole program per the roadmap, a separate future decomposition effort.

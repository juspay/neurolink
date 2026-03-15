# Continuous Test Suite — Fix Plan

**Date:** 2026-03-14
**Companion Document:** `CONTINUOUS-TEST-SUITE-ANALYSIS.md`
**Objective:** Fix every test to do what it was originally planned to do, following the principle that every feature must be tested through `generate()` and `stream()` from both SDK and CLI, exactly as consumers use the product.

---

## The Core Principle

Every feature in NeuroLink is consumed through two operations: **generate** and **stream**. A customer never imports `BudgetChecker` or instantiates `StreamableHTTPClientTransport`. They call:

- **SDK:** `sdk.generate({ prompt, ...options })` or `sdk.stream({ prompt, ...options })`
- **CLI:** `neurolink generate "prompt" --flags` or `neurolink stream "prompt" --flags`

Everything else — tools, memory, RAG, TTS, structured output, context compaction, observability — is configuration passed to generate/stream, and the results come back through the response.

Features that wrap generate/stream internally:
- **Workflows:** `sdk.executeWorkflow()` / `neurolink workflow execute` — orchestrates multiple generate calls
- **Server adapters:** `POST /api/agent/execute` / `POST /api/agent/stream` — exposes generate/stream over HTTP
- **Evaluation:** `sdk.evaluate()` — scores the output of a generate call

**Every test should follow this pattern:**

```
1. Configure the feature (options, flags, server config)
2. Call generate() or stream() (or the wrapper: executeWorkflow, HTTP endpoint, evaluate)
3. Verify the response contains the expected output for that feature
4. Do it from both SDK and CLI
```

---

## 0. Cross-Cutting Fix: Shared Test Infrastructure

**Before touching any individual suite**, extract duplicated boilerplate into a shared module.

### File: `test/utils/continuousTestHelpers.ts`

Create once, import everywhere. Contains:

```
- colors, log(), logSection(), logTest()
- PROVIDER_MAX_TOKENS map
- TEST_CONFIG builder with CLI arg parsing (--provider, --model, --help)
- buildBaseCLIArgs(), buildBaseSDKOptions()
- runCommand() — spawn CLI process with timeout
- isExpectedProviderError() — TIGHTENED version (remove "not found", "unknown error", "bad request")
- validateResponseContent()
- globalCleanup()
- assertOrFail(condition, testName, details) — replaces the pattern of computing then ignoring assertions
- createTestSDK(overrides?) — standardized SDK construction
- generateTestSessionId() — UUID-based session IDs
```

**Key change in `assertOrFail`:**
```typescript
function assertOrFail(passed: boolean, testName: string, details: string): boolean {
  if (passed) {
    logTest(testName, "PASS", details);
    return true;
  }
  logTest(testName, "FAIL", details);
  return false;
}
```

This eliminates the "always-pass" anti-pattern by making the return value depend on the assertion.

**SKIP handling standard:** All suites must return `null` for SKIP (not `true`). This is already correct in 13 of 14 suites; fix the main suite.

**Import standard:** All suites must import from `../dist/index.js` (the built package). Fix the RAG suite.

**Test shape standard:** Every feature test must have all four variants where applicable:

| Variant | Entry Point | How |
|---------|-------------|-----|
| SDK generate | `sdk.generate({ prompt, ...featureOptions })` | Direct SDK call |
| SDK stream | `sdk.stream({ prompt, ...featureOptions })` | Direct SDK call, consume chunks |
| CLI generate | `neurolink generate "prompt" --feature-flags` | Spawn process, check stdout |
| CLI stream | `neurolink stream "prompt" --feature-flags` | Spawn process, check streaming output |

---

## 1. `continuous-test-suite.ts` — 30 tests

### Original intent
Core CLI and SDK verification: MCP tool discovery, tool execution, business tools with deterministic data, HITL confirmation flow, enterprise proxy, CSV/PDF/image input, Zod schemas.

### Fixes

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 1.1 | CLI Generate — Tool Discovery | Passes on generic words like `"file"` or `response.length >= 100` | Require `read_file` or `write_file` (actual MCP tool names) AND `filesystem` in response. Remove the `response.length >= 100` fallback. |
| 1.2 | CLI Generate — Data Verification | `validatePackageJson` passes if 2/3 very generic patterns match | Require all 3 specific patterns from `package.json`: the actual package name `"@juspay/neurolink"`, a version pattern `\d+\.\d+\.\d+`, and `"main"` or `"exports"`. |
| 1.3 | CLI Stream — Tool Discovery | Same as 1.1 | Same fix as 1.1. |
| 1.4 | CLI Stream — No streaming verification | Never checks that chunks arrive incrementally | Count chunks received. Assert `chunkCount > 1` (not just concatenated text). Assert first chunk arrives within 10s. |
| 1.5 | SDK Generate — Data Verification | `foundData.length >= 1` out of `["ES2022", "CommonJS", "strict"]` — "strict" matches anything | Replace with patterns unique to `tsconfig.json`: `"compilerOptions"`, `"ES2022"` or `"ESNext"`, `"outDir"`. Require at least 2. |
| 1.6 | SDK Stream — Completion indicator | Period `"."` in `completionIndicators` matches everything | Remove `"."` from completion indicators. Keep `"---"`, `"END"`, `"DONE"`, `"complete"`. |
| 1.7 | CLI Business Tools | Named "CLI" but uses `sdk.generate()` directly | Rename to "SDK Business Tools (CLI Simulation)" since CLI cannot register custom tools. Add a comment explaining why CLI cannot be used here. |
| 1.8 | HITL Generate | Non-deterministic (AI may not call tool); commented out | Rewrite using Option C from the TODO: Register the dangerous tool, call `generate()`, check if HITL event fires. If AI didn't call the tool, return `null` (SKIP) with a clear message. Never return `true` (PASS) when the tool wasn't called. Track skip rate over multiple runs to validate the test. |
| 1.9 | HITL Stream | Stream never consumed so events never fire | After `sdk.stream()`, consume the stream with `for await (const chunk of stream)` before checking `confirmationReceived`. Then apply the same Option C logic as 1.8. |
| 1.10 | Enterprise Proxy | Tests nothing about proxies — just checks env vars | Remove this test entirely or rename to "SDK Init With Proxy Env Vars (Smoke)". Add a comment that actual proxy routing cannot be tested without a proxy server. Do NOT claim it tests proxy support. |
| 1.11 | Image SKIP handling | `return true` on SKIP (credential errors) | Change to `return null` for all SKIP paths across the entire file. |
| 1.12 | Image Unsupported Provider | Any exception passes | Assert the error message contains `"model"` or `"provider"` or `"not supported"`. Do not pass on unrelated errors (network, auth). |
| 1.13 | SDK CSV/PDF via subprocess | Writes `.mjs` scripts to temp dir, spawns as subprocess | Rewrite to use direct SDK calls in-process (like `testSDKBusinessTools` does). Remove temp file indirection. |

---

## 2. `continuous-test-suite-providers.ts` — 25 tests

### Original intent
Provider-specific features: structured output with Zod schemas, provider-specific model variants, thinking levels, OpenRouter, model registry, retry, fallback, all-provider loops.

### Fixes

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 2.1 | Structured Output (Vertex/Alt/Flash) — 3 tests | Falls back to keyword matching when JSON parse fails | Remove the keyword fallback entirely. If JSON.parse fails, the test FAILS — that IS the point of structured output. Assert `parsed.name`, `parsed.capital`, AND `parsed.population` (all 3 fields from schema). |
| 2.2 | Gemini Tool+Schema Limitation | Only tests success path (disableTools: true) | Add a second call WITH tools enabled AND schema simultaneously. Assert it throws an error containing `"Function calling"` or `"tools"` and `"json"` or `"schema"`. If it succeeds (Google fixes the limitation), update the test. |
| 2.3 | Vertex Chat | Passes if `response.length > 10` even without "canberra" | Remove the length fallback. The test asks "What is the capital of Australia?" — if the answer doesn't contain "canberra", it's FAIL. |
| 2.4 | Vertex Pro | `content.length > 5` on a haiku test | Assert the response has at least 2 line breaks (haiku = 3 lines). Assert `content.length > 20`. |
| 2.5 | Gemini 3 Token Counting | Passes when usage data is absent | If `usage` is absent, FAIL (not SKIP). Token counting is the stated purpose of this test. Assert `usage.promptTokens > 0` AND `usage.completionTokens > 0`. |
| 2.6 | OpenRouter Streaming | Returns `true` unconditionally after validation | Gate return on `validation.passed`. If validation fails, return `false`. |
| 2.7 | OpenRouter Tool Use | Passes when tool is never called | Check `result.toolsUsed` or `result.toolCalls`. If the tool was not invoked, return `null` (SKIP) with message "Model did not invoke tool." Do NOT return `true`. |
| 2.8 | OpenRouter Structured Output | Falls back to keyword matching | Same fix as 2.1 — remove keyword fallback. |
| 2.9 | Thinking Levels — 4 tests | All accept any non-empty response; levels not compared | For at least the "high" test, assert the response is longer than the "minimal" response (compare `highResult.content.length > minimalResult.content.length`). Store minimal result and pass it to the high test. |
| 2.10 | Network Retry | Makes one successful request — tests nothing about retry | Rewrite: Use an intentionally invalid model name (to trigger a retryable error), configure `maxRetries: 0`, assert it fails. Then configure `maxRetries: 3` and assert it either succeeds or produces a retry-count metric. If SDK doesn't expose retry internals, document this as "untestable without mocking" and SKIP with explanation. |
| 2.11 | Provider Fallback Chain | Manual try/catch loop, not SDK fallback | Use SDK's built-in fallback API (if it exists: `sdk.generate({ fallbackProviders: [...] })`). If SDK doesn't have this API, rename the test to "Manual Provider Loop" and document that SDK-level fallback isn't implemented yet. |
| 2.12 | `isExpectedProviderError` | Matches 28+ patterns including "not found", "bad request" | Remove generic patterns: `"not found"`, `"unknown error"`, `"bad request"`, `"could not be resolved"`. Keep only authentication/billing-specific: `"API key"`, `"authentication"`, `"UNAUTHENTICATED"`, `"credentials"`, `"billing"`, `"quota"`, `"rate limit"`. |

---

## 3. `continuous-test-suite-tts.ts` — 15 tests

### Original intent
TTS processor init, Google TTS synthesis, voices/languages, audio format validation (MP3/WAV), CLI flags, error handling, streaming integration, result shape validation, observability.

### Fixes

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 3.1 | TTS Processor Init | Can't fail — passes if handlers aren't registered | Call `TTSProcessor.supports("google-ai")` and assert it returns `true`. Call `TTSProcessor.supports("nonexistent-provider")` and assert it returns `false`. Remove the "handlers depend on credentials" fallback. |
| 3.2 | Google TTS Synthesize | No format validation on audio buffer | Assert `result.audio.format === "mp3"`. Call `isValidMP3(result.audio.buffer)` and assert it returns `true`. Assert `result.content` also exists (TTS is additive to text). |
| 3.3 | Get Voices | Empty voice list is PASS | Assert `voices.length > 0`. Assert at least one voice has `languageCode` starting with `"en"`. |
| 3.4 | TTS in generate() Options | Duplicate of 3.2 | Merge with 3.2, or differentiate: this test should NOT specify a format and then assert the default format is returned. Assert `result.audio.format` has a value (verify default format behavior). |
| 3.5 | Different Voices | No verification voices produce different audio | Compare `buffer1.length !== buffer2.length` OR `!buffer1.equals(buffer2)` for at least 2 voices. If all voices produce identical bytes, FAIL. |
| 3.6 | Different Languages | No verification languages produce different audio | Same as 3.5 — compare buffers across languages. Assert at least 2 languages produce different audio. |
| 3.7 | Audio File Output | No MP3 format validation on written file | After writing to disk, read back, call `isValidMP3()` on the read-back buffer, assert `true`. Assert file size matches `result.audio.buffer.length`. |
| 3.8 | MP3 Output | No check on `result.audio.format` | Add: `assert result.audio.format === "mp3"`. Add minimum size check: `assert buffer.length > 100`. |
| 3.9 | WAV Output | Falls back to accepting any non-empty buffer | Remove the fallback at line 918. If RIFF header is missing, FAIL. If LINEAR16 produces raw PCM, the SDK should still wrap it with a RIFF header. If it doesn't, that's a bug the test should catch. |
| 3.10 | CLI TTS Generate | Only checks exit code | Assert stdout or stderr contains `"audio"` or `"tts"` or a file path. If CLI saves audio to a file, assert the file exists. |
| 3.11 | CLI TTS Voice Flag | Only checks exit code | Same as 3.10, plus assert the output mentions the requested voice name or that a different audio file is produced vs. default voice. |
| 3.12 | Error Handling | No code path returns false | Test with `provider: "openai"` (unsupported for TTS). If `result.audio` is present, FAIL (OpenAI shouldn't produce TTS audio). If error thrown, assert error message contains `"not supported"` or `"tts"`. Any other outcome is FAIL. |
| 3.13 | Stream Integration | Always passes | Assert `chunkCount > 0`. If TTS audio chunks exist in stream, count them. If no audio chunks and no text chunks, FAIL. |
| 3.14 | GenerateResult.audio Shape | Doesn't verify format matches request | Assert `result.audio.format === "mp3"` (matches requested format). Assert `result.audio.size === result.audio.buffer.length`. If `result.audio.voice` is present, assert it matches the requested voice. |
| 3.15 | Observability Spans | Creates synthetic spans as fallback | Remove the synthetic fallback. Use InMemorySpanExporter (like tracing suite does). After a real TTS generate() call, assert a span with name containing `"tts"` exists. Assert it has `SpanStatusCode.OK`. |

---

## 4. `continuous-test-suite-tracing.ts` — 10 tests

### Original intent
End-to-end OTEL tracing: span chains for generate/stream, message build, cost, input recording, error tracing, tool execution, memory, parent-child hierarchy, status codes.

### Fixes

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 4.1 | Generate Span Chain | Token attributes are existence-only | Assert `neurolink.provider` attribute has a non-empty string value. Assert `gen_ai.request.model` attribute matches the configured model. Assert token values are `> 0` (not just present). |
| 4.2 | Stream Span Chain | Misses 2 of 4 stream spans | Add checks for `neurolink.stream.validate` and `neurolink.stream.analytics` spans. If they don't exist, FAIL (they ARE instrumented in source). |
| 4.3 | Message Build Span | SKIPs when missing (should FAIL) | Change from SKIP to FAIL when span is not found — the span IS instrumented in `MessageBuilder.ts:93`. Fix the attribute name check from `message.count` to `message.build.count` (matching `ATTR.MSG_COUNT`). |
| 4.4 | Cost on Spans | SKIP when absent | Keep SKIP for providers that don't report cost. But if the provider IS vertex (which does report cost), FAIL if cost is absent. Check `costValue > 0` (not just `>= 0`). |
| 4.5 | Input Recording | No value check | Assert `inputLength >= 20` for the given prompt (which is ~35 chars). Also check `gen_ai.usage.output_tokens > 0`. |
| 4.6 | Error Tracing | No error attributes checked | Assert the error span has `error.type` or `exception.type` attribute. Assert `status.message` is non-empty. |
| 4.7 | Tool Execution Span | Non-deterministic | Use `toolChoice: "required"` if provider supports it. If not, register a tool AND include a prompt that explicitly says "You MUST call the getCurrentTime tool." If tool span still not found, return `null` (SKIP) with message "Model did not invoke tool despite prompt instruction." |
| 4.8 | Memory Spans | Skips too aggressively | Assert at least ONE of `storeTurn` or `buildContext` spans exists (not both). Add coverage for `neurolink.memory.clear` span by calling `sdk.clearMemory()` and checking for the span. |
| 4.9 | Span Parent-Child | Good but fragile `unknown` cast | Use `(span as any).parentSpanId` which is the standard ReadableSpan property. Remove the unnecessary `unknown` intermediary. Also verify the 3-level hierarchy: `generate` → `executeGeneration` → `provider.generate`. |
| 4.10 | All Spans Have Status | Missing timing check | Add: assert every NeuroLink-namespaced span has `endTime > startTime` (duration > 0). |

---

## 5. `continuous-test-suite-workflow.ts` — 19 tests

### Original intent
Workflow engine: consensus (majority agreement), multi-judge (best response selection), fallback (tiered recovery), adaptive (complexity-based routing), checkpointing, HITL suspend/resume, registry management, ensemble executor, judge scorer, response conditioner, CLI commands, branching, parallel execution.

### Fixes

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 5.1 | Basic 3-Step | Doesn't check answer correctness | Assert response contains `"Paris"` (the prompt asks about France's capital). Gate return on assertion. |
| 5.2 | Fluent API | Doesn't verify fluent API difference | Assert the workflow config has `defaultSystemPrompt` set to the provided value. Assert response is math-related (contains `"56"` or `"multiply"`). Gate return on `validation.passed`. |
| 5.3 | Consensus | Always returns `true` | Gate return on `validation.passed`. Assert `responseCount >= 2` as a separate assertion. Assert `result.confidence` exists and is between 0 and 1. |
| 5.4 | Multi-Judge | Always returns `true` | Gate return on `validation.passed`. Assert `judgeScores` has at least 2 entries. Assert `result.selectedResponse` is the one with the highest score. |
| 5.5 | Fallback Chain | All models succeed — fallback never tested | Inject failure: use a first-tier model name that doesn't exist (e.g., `"nonexistent-model-xyz"`). Assert the workflow still succeeds (proving fallback worked). Check `result.workflowName` indicates the fallback tier that succeeded. |
| 5.6 | Adaptive | Doesn't verify tier selection | Assert `result.content` contains `"4"` (answer to "2+2"). Verify the speed-first strategy used the fast tier by checking response time < a reasonable threshold. Gate return on `validation.passed`. |
| 5.7 | Checkpointing | Doesn't test checkpoint/resume | If Redis is available: Execute workflow step 1, call checkpoint API, abort, restore from checkpoint, verify metadata is preserved. If Redis not available: SKIP with message "Requires Redis for checkpoint persistence." Do NOT pass without Redis. |
| 5.8 | HITL Suspend | Just runs a regular workflow | If the SDK has a real HITL suspend API: call it, verify workflow status is `"suspended"`, verify `pendingApproval` data exists. If no real API exists: SKIP with "HITL suspend not implemented in workflow engine." Do NOT pass with a regular workflow. |
| 5.9 | HITL Resume | Starts a new workflow, not resuming | Same as 5.8. If resume API exists, test it. If not, SKIP. |
| 5.10 | Registry | Good but missing negative cases | Add: test `getWorkflow("nonexistent-id")` returns null/undefined. Test duplicate registration throws or overwrites. |
| 5.11 | Ensemble Executor | Always returns `true` | Gate on `validation.passed`. Assert `ensembleResponses` has expected count. Assert each response has a different `model` field. |
| 5.12 | Judge Scorer | All assertions computed but never used | Gate on ALL of: `hasScore`, `hasReasoning`, `hasSelected`. Assert `score` is within 0-100 range (the configured `scoreScale`). Assert `selectedResponse` matches the highest-scoring response. |
| 5.13 | Response Conditioner | Always returns `true` | Gate on `validation.passed`. Assert `content !== originalContent` (conditioning SHOULD modify the response). If they're identical, FAIL (conditioning didn't run). |
| 5.14-16 | CLI Tests | Pass on any keyword in output | CLI List: Assert output contains at least 3 workflow names. CLI Info: Assert output contains the specific workflow type and model list. CLI Execute: Assert exit code 0 AND output contains a non-empty response. |
| 5.17 | Branch Execution | Doesn't verify which branch taken | Check `result.metadata` or `result.tier` for which branch executed. Assert response is about Python (the requested topic). |
| 5.18 | Parallel Execution | `parallelEfficiency` never asserted | Assert `parallelEfficiency > 0` (parallel IS faster than sequential). If not, FAIL with the timing details. |
| 5.19 | Observability Spans | Synthetic fallback masks real failures | Remove the OR condition (`realWorkflowPassed || syntheticPassed`). If the real workflow can't run, the test should SKIP, not silently fall back to synthetic. |

---

## 6. `continuous-test-suite-ppt.ts` — 16 tests

### Original intent
PPT generation pipeline: types validation, content planning, slide type inference, slide renderers, full orchestrator, themes, logo placement, PPTX openability, CLI, AI images, audience targeting.

### Fixes

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 6.1 | PPT Types Validation | Reads source `.ts` files | Import PPT types from `../dist/index.js`. Verify they are defined: `typeof PPTOutputOptions !== 'undefined'`, etc. Remove all `fs.readFileSync` on source files. |
| 6.2 | Content Planner | No slide count or content verification | Assert `pptResult.totalSlides === 5` (matching `pages: 5`). Assert `pptResult.slides` array exists and has content. |
| 6.3 | Slide Type Inference | Reads source file for function names | Import inference functions from dist. Call `inferFromTitle("Agenda")` and assert result is `"agenda"`. Call `inferFromTitle("Conclusion")` and assert result is `"conclusion"`. Remove source file reading. |
| 6.4 | Slide Generator | Named "Single" but generates 5 slides; no count check | Rename to "Slide Generation (5 slides)". Assert `totalSlides === 5`. |
| 6.5 | Slide Renderers All Types | Reads source for function names; allows 5 missing | Import renderers from dist. Verify each function is callable (`typeof renderTitleSlide === 'function'`). Require ALL renderers present (not missing > 5). |
| 6.6 | Full Pipeline | Only checks file size >10KB | Add: Parse the PPTX with JSZip. Extract `ppt/presentation.xml`. Count `<p:sld>` references. Assert count matches requested 10 slides. Assert file contains text related to "Quarterly Business Review". |
| 6.7-11 | Theme Tests | Never verify theme in output | After generation, parse PPTX with JSZip. Extract `ppt/theme/theme1.xml`. Assert it exists. Check for theme-specific color values (modern=blue, corporate=navy, creative=vibrant, minimal=gray, dark=dark background). |
| 6.12 | Logo Placement | Only checks "file exists" | Parse PPTX with JSZip. Check `ppt/media/` directory for an image file. Assert at least one image entry exists in the media folder. |
| 6.13 | PPTX Openable | Accepts any valid ZIP | Require BOTH `[Content_Types].xml` AND `ppt/presentation.xml` (not just 1 of 2). Use JSZip to actually parse the file and enumerate entries. |
| 6.14 | CLI PPT Generate | No PPT flags used | Add `--output-mode=ppt`, `--ppt-pages=5`, `--ppt-theme=modern` flags to the CLI command. Assert a `.pptx` file is produced. If CLI doesn't support these flags yet, SKIP with message "PPT CLI flags not implemented." |
| 6.15 | AI Images | Error masking: logs "PASS" but returns `null` | Clean up: if AI images fail, return `null` (SKIP) with consistent SKIP label. Never log "PASS" when returning SKIP. |
| 6.16 | Different Audiences | Passes if only 1/2 succeed; no content comparison | Require both audiences to succeed. Compare output file sizes — technical should generally be larger (more detailed). If comparison impossible, at least assert both files exist. |

**Dependency:** Tests 6.6-6.13 require `jszip` as a devDependency. Add: `pnpm add -D jszip @types/jszip`.

---

## 7. `continuous-test-suite-servers.ts` — 36 tests

### Original intent
Server adapters for Hono/Express/Fastify/Koa: factory, adapters, routes (Agent/Tool/MCP/Memory/Health), middleware (auth/rate-limit/cache/validation/common), streaming, WebSocket, error handling, config, CLI.

### Fixes — COMPLETE REWRITE

This suite needs a complete rewrite. Every test currently does `fs.readFileSync` on source files. The fix replaces ALL tests with runtime server tests.

**The principle:** Server adapters expose generate/stream over HTTP. So the test is: start a server, call the generate/stream HTTP endpoints, verify the response is the same as calling `sdk.generate()` / `sdk.stream()` directly.

**Architecture for the rewrite:**

```typescript
// For EACH framework (hono, express, fastify, koa):
async function testFrameworkGenerateAndStream(framework: string, port: number) {
  // 1. Create and start server
  const adapter = ServerAdapterFactory.create(framework, { port, neurolink: sdk });
  await adapter.start();
  
  // 2. Test generate through HTTP (the core test)
  const genResult = await httpRequest("POST", `http://localhost:${port}/api/agent/execute`,
    { prompt: "What is 2+2?", provider: TEST_CONFIG.provider });
  assert(genResult.status === 200);
  assert(genResult.json.content.includes("4"));
  
  // 3. Test stream through HTTP (SSE)
  const streamResult = await httpStreamRequest("POST", `http://localhost:${port}/api/agent/stream`,
    { prompt: "What is 2+2?", provider: TEST_CONFIG.provider });
  assert(streamResult.contentType === "text/event-stream");
  assert(streamResult.chunks.length > 1);  // Actually streamed, not batched
  assert(streamResult.fullText.includes("4"));
  
  // 4. Stop server
  await adapter.stop();
}
```

**Test groups in the rewrite:**

| Group | Tests | What They Verify |
|-------|-------|-----------------|
| Framework Generate + Stream (x4) | Hono, Express, Fastify, Koa | `start → POST generate → POST stream → verify response → stop` |
| Health endpoint (x1) | Any framework | `GET /health` returns 200 with status |
| Auth Middleware — Generate (x2) | Auth rejection + success | `POST /api/agent/execute` without auth → 401; with auth → 200 + valid response |
| Auth Middleware — Stream (x1) | Auth on stream | `POST /api/agent/stream` with auth → 200 + SSE chunks |
| Rate Limiting (x1) | Rapid generate calls | N+1 `POST /api/agent/execute` requests → 429 |
| Streaming fidelity (x1) | Stream produces chunks | `POST /api/agent/stream` → `text/event-stream`, `chunks > 1`, each chunk valid |
| Error Handling (x2) | Bad requests | Invalid JSON body → 400; invalid provider → error response with details |

**Total: ~12 tests replacing 36 source-grep tests.** Fewer tests but every one exercises generate/stream through HTTP, which is exactly what a consumer does.

---

## 8. `continuous-test-suite-rag.ts` — 15 suites

### Original intent
RAG pipeline: 10 chunking strategies, ChunkerFactory/Registry, RerankerFactory/Registry, hybrid search (BM25 + vector fusion), generate/stream with RAG files, CLI.

### Fixes

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 8.0 | ALL imports | Import from `src/` | Change all imports to `../dist/index.js`. Verify the package exports these symbols. |
| 8.1 | All Chunkers | Missing `semantic` strategy | Add `semantic` to the test loop. If it requires an embedding model and none is configured, SKIP that specific strategy. |
| 8.2 | Reranker Factory | Only `simple` reranker tested | Create `llm` reranker with the configured test provider. Call `reranker.rerank(query, results)`. Assert results are returned in descending score order. |
| 8.3 | Hybrid Search | `createHybridSearch()` never called | Add a test that calls `createHybridSearch({ bm25Index, vectorStore, fusionMethod: 'rrf' })` and then `hybridSearch.search(query, { topK: 5 })`. Assert results returned. |
| 8.4 | Error Handling — Empty Input | Always passes | If chunker accepts empty input without error, assert it returns an empty array. If it throws, assert specific error type. Remove the dual-pass pattern. |
| 8.5 | Error Handling — Non-existent File | Always passes | Assert the error is thrown AND contains `"not found"` or `"ENOENT"`. If no error is thrown, FAIL. |
| 8.6 | RAG with Generate | `|| generateResult` makes any truthy object pass | Remove the `||` fallback. Assert `generateResult.content.length > 50`. Assert content is relevant to the query (contains at least one keyword from the RAG documents). |
| 8.7 | RAG with Stream | Same weak assertions | Same fix as 8.6 for streaming. Also assert `chunkCount > 0`. |
| 8.8 | CLI RAG Query | Always passes ("no indexed documents" is PASS) | If no indexed documents, SKIP (not PASS). Only PASS if the query returns relevant results. |

---

## 9. `continuous-test-suite-evaluation.ts` — 13 tests

### Original intent
RAGAS evaluator: init, faithfulness/relevancy/precision/recall scoring, direct scoring API, context builder, retry manager, providers, batch evaluation, custom prompts, observability.

### Fixes — MAJOR REWRITE (tests currently call zero evaluation APIs)

**The principle:** Evaluation scores the quality of a generate() response. The consumer flow is: (1) call `sdk.generate()` to get an answer, (2) call `sdk.evaluate()` or `evaluator.evaluate()` to score that answer, (3) check the score. Evaluation internally uses generate() to run judge prompts — but the consumer never sees that. They get a score back.

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 9.1 | RAGAS Init | Only checks file existence | Import `RAGASEvaluator` from dist. Instantiate with provider. Assert `evaluate()` method exists. |
| 9.2 | Faithfulness | Manual judge prompt | Step 1: `sdk.generate({ prompt: question })` → get answer. Step 2: `evaluator.evaluate({ question, answer, context })` → get score. Step 3: Assert score is between 0 and 1. Step 4: Repeat with `EVAL_TEST_DATA.poorAnswer` → assert `goodScore > poorScore`. |
| 9.3 | Answer Relevancy | Manual judge prompt | Same pattern as 9.2 — generate answer, evaluate, compare good vs poor. |
| 9.4 | Context Precision | Manual judge prompt | Same pattern — evaluate with relevant context vs irrelevant context. |
| 9.5 | Context Recall | Manual judge prompt | Same pattern — evaluate with complete context vs partial context. |
| 9.6 | Direct Scoring API | No API called | Call `sdk.evaluate()` if it exists, or `evaluator.score()`. Assert all dimensions returned. |
| 9.7 | Context Builder | Source file grep | Import `ContextBuilder` from dist. Call `builder.buildContext(question, contexts)`. Assert output contains context content. |
| 9.8-9 | Retry Manager | Source file grep | Import `RetryManager`. Test `shouldRetry(0)` → true, `shouldRetry(max+1)` → false, `getDelay(0)` → positive number. |
| 9.10 | Multi-Provider Eval | Source file grep | Call `evaluator.evaluate()` with test provider. Assert valid score. |
| 9.11 | Batch Evaluation | Sequential generate | Call `evaluator.evaluateBatch(items)` with 3 Q/A pairs. Assert all return scores 0-1. |
| 9.12 | Custom Prompt | Source file grep | Call `evaluator.evaluate()` with custom `promptTemplate`. Assert score returned. |
| 9.13 | Observability | Synthetic fallback | After `evaluator.evaluate()`, check InMemorySpanExporter for evaluation spans. |

**Note:** If `RAGASEvaluator` is not exported from dist, export it first, then test it. Tests must not work around missing exports by reading source files.

---

## 10. `continuous-test-suite-context.ts` — 20 tests

### Original intent
Context compaction (4-stage pipeline), 80% budget threshold, tool output pruning, file dedup, sliding window, LLM summarization, abort signals, prompt caching, token estimation, concurrent conversations.

### Fixes

**The principle:** Context compaction is invisible to the consumer. They call `generate()` many times and it keeps working even when the context gets large. The test is: fill the context via many `generate()` calls, verify the next `generate()` still succeeds and produces a relevant response. The compaction happened transparently.

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 10.1 | Budget Checker Threshold | Never measures context utilization | Send 20+ turns via `sdk.generate()` with long responses to push context past 80%. Assert the subsequent `generate()` still succeeds (proving budget checker triggered compaction transparently). Check `result.usage.promptTokens` on the last turn — it should be LESS than the raw sum of all turns. |
| 10.2-5 | Context Compaction (x4 variants) | Only counts generate() successes | After filling context with N turns via `sdk.generate()`, check `result.usage.promptTokens` on the final turn. Assert it is less than `N * avgTokensPerTurn` (compaction reduced tokens). Also do via `sdk.stream()` — same assertion on stream completion usage. |
| 10.6 | Tool Output Pruning | No pruning verification | Via `sdk.generate()`: call a tool that returns 10KB of data. Send 5 more `generate()` turns. Then `sdk.generate({ prompt: "Quote the exact tool output word for word" })`. If the AI cannot (it was pruned), PASS. If it quotes the full 10KB, FAIL. |
| 10.7 | File Read Deduplication | No dedup verification | Via `sdk.generate()`: read the same file 10 times across 10 turns. On turn 11, check `result.usage.promptTokens`. It should be much closer to 1 file read than 10. |
| 10.8 | Sliding Window | Good design but indirect | Keep current approach — many `sdk.generate()` turns, verify recent content recalled, early content may be gone. Add `sdk.stream()` variant. |
| 10.9 | LLM Summarization | Falls back to any non-empty response | After 15+ `sdk.generate()` turns on different topics, ask "Summarize everything we discussed." Assert response contains at least 2 of 5 topic keywords. FAIL if 0 keywords appear (summarization lost information). |
| 10.10 | Abort Signal Generate | Passes if call completes before abort | `sdk.generate({ prompt: "...", signal: AbortSignal.timeout(1) })`. Timeout of 1ms guarantees abort fires before any API call completes. Assert `AbortError` or error contains `"abort"`. |
| 10.11 | Abort Signal Stream | Good — keep as is | `sdk.stream({ prompt: "...", signal: AbortSignal.timeout(500) })`. Assert some chunks received before abort. |
| 10.12-14 | Abort Signal Vertex variants (x3) | Near-identical copies | Parameterize: `testAbortSignal(provider, model)`. Test both `generate()` and `stream()` in one function. Remove 200 lines of duplication. |
| 10.15 | Compose Abort Signals | "Completed before abort" escape | Same as 10.10 — 1ms timeout via `sdk.generate()`. |
| 10.16 | Prompt Caching | Single call can't verify cache | Make 2 identical `sdk.generate()` calls with same system prompt. Compare `time2 < time1 * 0.8`. Also test via `sdk.stream()`. |
| 10.17 | Token Estimation | Tests `text.length/4`, not SDK | Call `sdk.generate({ prompt: "Hello world" })`. Check `result.usage.promptTokens` is a reasonable number (2-10, not 0 or 1000). This tests the SDK's token estimation through the real path. |
| 10.18 | Concurrent Conversations | No isolation verification | Run 3 concurrent `sdk.generate()` calls with different session IDs on different topics. Then `sdk.generate()` on each session asking "What were we discussing?" Assert each session recalls its own topic. |
| 10.19 | Observability Spans | Good — minor scope expansion | After compaction-triggering `sdk.generate()` calls, check spans for compaction-related names. |

---

## 11. `continuous-test-suite-observability.ts` — 14 tests

### Original intent
OTEL instrumentation: telemetry init, external TracerProvider, getSpanProcessors, setLangfuseContext (with/without callback), operation name detection, trace name format, custom metadata, OTEL peer dependency, getTracer, all context fields, CLI, operation override, wrapper spans.

### Fixes

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 11.1 | Telemetry Init | Only checks constructor doesn't crash | After init, call `isUsingExternalTracerProvider()` and assert `true` (since the test registers an external provider). |
| 11.2 | External TracerProvider Mode | Never asserts spans > 0 | After `generate()`, call `spanExporter.getFinishedSpans()`. Assert `spans.length > 0`. Assert at least one span has name starting with `neurolink.` or `ai.`. |
| 11.3 | getSpanProcessors | Only checks array shape | Assert `processors.length === 2` (ContextEnricher + LangfuseSpanProcessor per CLAUDE.md). Test the actual integration: add processors to a fresh `NodeTracerProvider`, create a span, end it, verify the span was processed (ContextEnricher should have enriched it). |
| 11.4 | setLangfuseContext | Basic roundtrip only | Add: test concurrent async branches. Call `setLangfuseContext({userId: "A"})` in one async branch and `setLangfuseContext({userId: "B"})` in another. Assert each branch reads back its own userId (AsyncLocalStorage isolation). |
| 11.5 | Context Callback + Generate | Never verifies context on spans | After `generate()`, get spans. Find the root span. Assert it has `user.id === "test-user"`, `session.id === "test-session"`, and `langfuse.trace.name` containing the userId. |
| 11.6 | Operation Name Auto-Detection | Never checks the attribute | After `generate()`, find the `ai.generateText` or `neurolink.generate` span. Assert it has `gen_ai.operation.name` attribute with value `"ai.generateText"` or similar. |
| 11.7 | Trace Name Format | `formatCalled` never asserted; output never verified | Assert `formatCalled === true`. Get root span. Assert `langfuse.trace.name` attribute matches the format function's output pattern. |
| 11.8 | Custom Metadata | Metadata verified in context but not on spans | After `generate()`, get spans. Assert root span has `metadata.feature === "test-feature"` attribute (or however metadata is serialized to span attributes). |
| 11.9 | OTEL Peer Dependency | Can't test missing OTEL in an env that has it | Rename to "OTEL Exports Availability". Verify all documented exports are defined and have correct types. Remove the misleading "graceful degradation" framing. |
| 11.10 | getTracer | Good — keep as is | No changes needed. Best test in the suite. |
| 11.11 | All Context Fields | Context storage verified but not enrichment | After `generate()`, get spans. Assert each extended field appears as a span attribute: `user.id`, `session.id`, `conversation.id`, `request.id`, `langfuse.trace.name`. |
| 11.12 | CLI with Observability | Only checks exit code | Keep as smoke test. Rename to "CLI Observability Smoke Test". Accept this provides limited coverage. |
| 11.13 | Operation Name Override | Tests context, not span override | After `generate()`, get spans. Assert `gen_ai.operation.name` attribute equals the explicit override value, NOT the auto-detected value. |
| 11.14 | Wrapper Span Support | Doesn't verify trace name update | After `generate()` inside the wrapper span, get the wrapper span from exporter. Assert `langfuse.trace.name` attribute was updated to include the detected operation from the child AI span. |

---

## 12. `continuous-test-suite-media-gen.ts` — 18 tests

### Original intent
Image generation/editing/caching, video generation, CLI integration, format validation.

### Fixes

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 12.1-2 | CLI Generate/Stream Image | Minor: no format validation | After file creation, read first 4 bytes. Assert PNG magic (`89 50 4E 47`) or JPEG magic (`FF D8 FF`). |
| 12.3-4 | SDK Generate/Stream Image | Child process pattern; text-fallback PASS | Rewrite as in-process SDK calls (remove `.mjs` temp file pattern). If result is text instead of image, return `null` (SKIP) — NOT `true` (PASS). |
| 12.5 | Unsupported Provider | Both success and failure are PASS | Use `provider: "anthropic"` with `model: "gemini-2.5-flash-image"` (actual mismatch). Assert error is thrown. Assert error message contains `"model"` or `"provider"` or `"not supported"`. If no error thrown, FAIL. |
| 12.6 | Google AI Studio | Returns SKIP on success (bug) | Change `return null` to `return true` on the success path (line 739). |
| 12.7-9 | Image Edit (URL/Base64/File) | Text-fallback counts as PASS | If result is text, return `null` (SKIP) not `true` (PASS). If result is an image, validate format (PNG/JPEG magic bytes). |
| 12.10 | Image Count Limits | Tests via natural language prompt | If SDK has `numberOfImages` parameter: test it directly. If not: SKIP with "SDK does not expose image count parameter." Do not test via prompt text. |
| 12.11 | Image LRU Cache | Timing never asserted | Assert `time2 < time1 * 0.5` (second request should be significantly faster from cache). If timing is unreliable, check for a `cache.hit` metric. If neither is possible, SKIP with "Cache hit verification not exposed by SDK." |
| 12.12 | Image Cache Eviction | Only 3 calls; doesn't fill cache | Determine cache capacity (e.g., 10). Make `capacity + 1` requests. Then re-request the first URL and measure time. If time is similar to a fresh request (not cached), PASS (eviction worked). If SDK doesn't expose cache capacity, SKIP. |
| 12.13 | Image Retry Logic | No failure injection | If SDK exposes retry metrics: make a request and check retry count is 0 (no retries needed). Then test with an invalid endpoint and check that retries were attempted. If SDK doesn't expose this, SKIP with "Retry metrics not exposed." |
| 12.14 | Image Output Validation | Good but text-fallback weakens | Remove text-fallback PASS path. If image is not returned, FAIL (or SKIP if provider doesn't support image gen). |
| 12.15 | Video Generation | Too many SKIP escape hatches | Keep the SKIP for `"not configured"` and `"not supported"`. Remove SKIP for generic errors. If video data is returned, validate first 4 bytes match MP4 (`00 00 00 xx 66 74 79 70`) or WebM (`1A 45 DF A3`). |
| 12.16 | Video Validation | Both code paths are PASS | If no error thrown on invalid params, FAIL (validation didn't reject them). Only PASS in the catch path with the correct error type. |
| 12.17 | CLI Video | `stdout.length > 0` accepts error messages | Assert exit code 0 AND output does NOT contain `"error"` (case-insensitive). |
| 12.18 | Video Types | Tests mock objects, not SDK | Rewrite: Call `sdk.generate({ output: { mode: 'video' } })` and verify the result type has the expected fields. Remove the temp `.mjs` script pattern. |

---

## 13. `continuous-test-suite-mcp-http.ts` — 17 tests

### Original intent
MCP HTTP transport: connection, auth (Bearer/API key), tool discovery, tool execution via generate(), retry, rate limiting, timeout, SSE/WebSocket transports, real servers, blocked tools, session management.

### Fixes

**The principle:** A consumer connects to an MCP server via `sdk.addExternalMCPServer()`, then calls `sdk.generate()` or `sdk.stream()` and the AI uses those external tools. The tests should follow exactly this flow. Never instantiate raw MCP protocol clients.

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 13.1 | HTTP Connection + Generate | Uses raw MCP SDK | `sdk.addExternalMCPServer("deepwiki", { transport: "http", url: "..." })` → `sdk.generate({ prompt: "Use the read tool to look up Node.js" })` → assert response contains content from DeepWiki. |
| 13.2 | HTTP Connection + Stream | Not tested | Same as 13.1 but via `sdk.stream()` → consume chunks → assert final text contains DeepWiki content. |
| 13.3 | Bearer Auth | Unfalsifiable | Local mock MCP server requiring Bearer token. Wrong token: `sdk.addExternalMCPServer()` should fail or `sdk.generate()` should error. Correct token: `sdk.generate()` should succeed with tool data. |
| 13.4 | API Key Auth | Unfalsifiable | Same as 13.3 with `X-API-Key`. |
| 13.5 | Tool Discovery via Generate | Raw MCP SDK | `sdk.addExternalMCPServer()` → `sdk.generate({ prompt: "List all available tools" })` → assert response mentions the remote server's tool names. |
| 13.6 | Tool Execution via Generate | OK but weak assertions | Tighten: `sdk.generate({ prompt: "Use the fetch tool to get https://example.com" })` → assert response contains content from example.com, not just any text > 20 chars. |
| 13.7 | Tool Execution via Stream | Not tested | Same as 13.6 via `sdk.stream()`. |
| 13.8 | Retry via Generate | No failure scenario | Local mock server: 503 on first call, 200 on second. `sdk.addExternalMCPServer({ retries: 3 })` → `sdk.generate()` → assert it succeeds (retry worked). |
| 13.9 | Rate Limiter | Config acceptance only | Test via timed `sdk.generate()` calls with rate-limited server. Assert total time > expected if all ran instantly. |
| 13.10 | Timeout | Loose timing | `sdk.addExternalMCPServer({ timeout: 3000 })` with unreachable server → assert `sdk.generate()` fails within ~3-6 seconds. |
| 13.11 | SSE Transport + Generate | Raw SSE SDK | `sdk.addExternalMCPServer({ transport: "sse", url: localMockSSE })` → `sdk.generate()` → assert tool data in response. |
| 13.12 | WebSocket Transport + Generate | Only instantiates constructor | `sdk.addExternalMCPServer({ transport: "websocket", url: localMockWS })` → `sdk.generate()` → assert tool data in response. |
| 13.13 | Blocked Tools via Generate | Never calls generate | Register tool, block it, `sdk.generate()` → assert blocked tool was NOT invoked. |
| 13.14 | Session Persistence via Generate | Checks tool count | Two `sdk.generate()` calls → verify consistent behavior (session maintained). |
| 13.15 | CLI MCP HTTP Generate | Not tested | `neurolink generate "Use the tool" --mcp-server url=https://...` → assert output contains tool data. |
| 13.16 | CLI MCP HTTP Stream | Not tested | `neurolink stream "Use the tool" --mcp-server url=https://...` → assert streaming output. |
| 13.17 | Observability | Always passes | After `sdk.generate()` with MCP tool, check spans for `mcp.` prefix. Assert ≥ 1 span with `mcp.tool_name`. |

---

## 14. `continuous-test-suite-memory.ts` — 15 tests

### Original intent
Conversation memory: multi-turn, sequence ordering, token-based summarization, enable/disable, Redis persistence, connection pooling, retrieval tool, Mem0, title generation, CLI persistence, cleanup, large context, cross-session, tools with memory.

### Fixes

| # | Test | What's Broken | Fix |
|---|------|--------------|-----|
| 14.1a | Basic Multi-turn (generate) | Good — keep as is | No changes. Best test in the suite. |
| 14.1b | Basic Multi-turn (stream) | Missing — zero stream() tests in memory suite | Replicate 14.1a but using `sdk.stream()` for each turn. Consume chunks, verify the final turn's text recalls the fact from turn 1. This is a critical gap — stream() is a separate code path. |
| 14.2 | Sequence | Out-of-order recall is PASS | If order is wrong, return `false` (FAIL). Sequence verification is the stated purpose of this test. |
| 14.3 | Token-Based Summarization | Only checks `content.length > 20` | After 8 turns, check SDK internals or events for summarization trigger. Assert the final response references content from early turns (proving summarization preserved information). If 0 keywords from early turns appear, FAIL. |
| 14.4 | Summarization Enable/Disable | Only tests disabled | Add a second phase: enable summarization, add enough turns to trigger it, verify it fires. Use an event listener or span check to confirm summarization ran. |
| 14.5 | Redis Persistence | Passes when data not recalled | If Redis is available AND the second instance doesn't recall, FAIL (persistence is broken). Only SKIP if Redis is not configured. |
| 14.6 | Redis Connection Pooling | Always passes | Make 3 concurrent requests. Assert all 3 succeed. Check SDK internals for connection reuse (if exposed). If not exposed, at minimum assert all 3 complete without connection errors. |
| 14.7 | Memory Retrieval Tool | Falls to unconditional PASS | After storing a fact and asking the AI to retrieve it, assert the response contains the stored fact. If it doesn't, FAIL. Do NOT fall back to "registered without errors." |
| 14.8 | Mem0 Integration | Smoke test only | If `MEM0_API_KEY` is set: store a fact, then in a new session, ask about it. Assert the fact is recalled (proving Mem0 persisted it). If key not set, SKIP. |
| 14.9 | Title Generation | Can never fail | If `conversationTitleGenerated` event fires, assert the title is a non-empty string > 3 chars. If it doesn't fire after 2+ turns, SKIP (not PASS). |
| 14.10 | CLI Memory Persistence | Doesn't use --session-id | Rewrite: Run CLI command 1 with `--session-id=test-123 --memory`. Run CLI command 2 with same `--session-id=test-123 --memory` asking about content from command 1. Assert command 2's output references command 1's content. |
| 14.11 | Memory Cleanup | Only checks shutdown time | After `sdk.shutdown()`, attempt to access the old session. Assert it's no longer available or returns empty history. |
| 14.12 | Large Context | 5/15 success threshold too low | Raise to 10/15. If fewer than 10 turns succeed, FAIL (the memory system can't handle moderately long conversations). |
| 14.13 | Cross-Session | Result never checked | Assert the second session does NOT recall content from the first session (sessions are isolated). Currently the test passes without checking — verify isolation explicitly. |
| 14.14 | Tools with Memory | Falls to unconditional PASS | Assert the turn 2 response references the weather data from turn 1's tool call. If it doesn't, FAIL. |
| 14.15 | Observability Spans | Good | Keep as is. Minor: also check for `memory.store` span with `session.id` attribute. |

---

## Summary

### By Suite

| Suite | Tests | Tests Needing Fix | New Tests (stream/CLI gaps) | Rewrite Level |
|-------|-------|-------------------|---------------------------|---------------|
| Main | 30 | 13 | 0 | Moderate |
| Providers | 25 | 12 | 3 (stream for structured output, thinking) | Moderate |
| TTS | 15 | 15 | 2 (CLI stream, stream verify) | Heavy |
| Tracing | 10 | 10 | 0 | Light (assertions only) |
| Workflow | 19 | 19 | 0 (stream not applicable to workflows) | Heavy |
| PPT | 16 | 16 | 1 (CLI with PPT flags) | Heavy (needs JSZip) |
| Servers | 36 | 36 | 0 (rewrite covers generate+stream over HTTP) | Complete rewrite |
| RAG | 15 | 9 | 1 (`createHybridSearch`) | Moderate |
| Evaluation | 13 | 13 | 0 (evaluation wraps generate internally) | Complete rewrite |
| Context | 20 | 18 | 3 (stream variants of compaction/abort) | Heavy |
| Observability | 14 | 13 | 2 (stream span verification) | Heavy (span assertions) |
| Media-Gen | 18 | 18 | 0 | Heavy |
| MCP HTTP | 17 | 17 | 4 (stream via MCP, CLI MCP generate/stream) | Heavy (needs mock servers) |
| Memory | 15 | 13 | 2 (stream multi-turn, CLI with --session-id) | Moderate |
| **Totals** | **~263** | **~222** | **~18** | — |

### By the Generate/Stream Principle

| What needs to happen | Count |
|---------------------|-------|
| Existing tests that need to use generate/stream instead of internal APIs | 45+ (MCP HTTP, context, evaluation, servers) |
| Missing stream() variants for features only tested via generate() | ~18 new tests |
| Missing CLI variants for features only tested via SDK | ~15 new tests |
| Tests that already follow the principle and just need assertion fixes | ~150 |
| Tests that are fine as-is | ~13 |

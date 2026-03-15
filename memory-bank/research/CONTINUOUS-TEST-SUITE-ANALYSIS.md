# Continuous Test Suite — Findings & Analysis Report

**Date:** 2026-03-14
**Scope:** All 14 continuous test suite files in `test/`
**Total Lines Analyzed:** ~30,000
**Total Tests Analyzed:** ~263

---

## 1. What Are the Continuous Test Suites?

The continuous test suites are NeuroLink's **live integration and regression testing layer**. They exist separately from the Vitest unit/integration tests that run in CI. Their role is specific and critical:

### 1.1 Their Purpose (from `test/TESTING_SCRIPTS.md` and file headers)

These suites make **real API calls to real AI providers** to verify the SDK and CLI work correctly end-to-end. They are the only tests in the project that exercise the full stack — from user-facing APIs down to actual provider responses.

### 1.2 When They Run

| Trigger | What Runs | Duration |
|---------|-----------|----------|
| During development | Single suite against one provider | 1-2 min |
| Before commits | `test-all-providers.sh` (smoke test, 6 providers) | 2-5 min |
| Before releases | `run-all-providers-sequential.sh` (11 providers) | 15-20 min |
| CI/CD | Not integrated yet (recommended but not implemented) | — |

Only the **main suite** (`continuous-test-suite.ts`) is referenced by the shell runners and `test:legacy` npm script. The 13 specialized suites are run individually via `npx tsx`.

### 1.3 The Core Testing Principle

Every feature in NeuroLink is consumed through two operations: **`generate()`** and **`stream()`**. These are the only two entry points that matter to a customer. Everything else — tools, memory, RAG, TTS, structured output, workflows, observability, context management — flows through these two operations as configuration options, and the results come back through the response.

Therefore, **every feature must be tested by calling `generate()` or `stream()` with the appropriate configuration, and verifying the output is correct.** And this must be done from both consumption paths:

- **SDK** — `sdk.generate({ prompt, ...options })` and `sdk.stream({ prompt, ...options })`
- **CLI** — `neurolink generate "prompt" --flag value` and `neurolink stream "prompt" --flag value`

Some features have entry points that wrap generate/stream internally:
- **Workflows** — `sdk.executeWorkflow()` / `neurolink workflow execute` (orchestrates multiple generate calls)
- **Server adapters** — `POST /api/agent/execute` / `POST /api/agent/stream` (expose generate/stream over HTTP)
- **Evaluation** — `sdk.evaluate()` (scores the output of a generate call)

Even these should be tested by verifying that the underlying generate/stream calls produce correct results.

### 1.4 What They Must Prove

The suites exist to answer these questions:

1. **Does the SDK work with every provider?** — The main suite runs against all 11 providers. Results feed directly into `docs/reference/provider-feature-compatibility.md`, which labels providers as "Production-Ready" (100% pass = production-ready).

2. **Does every feature work end-to-end through generate/stream?** — Each specialized suite covers one feature area. Every test should exercise generate() or stream() with that feature enabled.

3. **Do CLI and SDK produce the same results?** — Tests come in pairs: SDK generate + CLI generate, SDK stream + CLI stream.

4. **Do enterprise features work?** — Redis memory, OTEL tracing, Langfuse integration, proxy support, HITL confirmation.

5. **Are multimodal inputs processed correctly?** — Images, PDFs, CSV, and 50+ file types across providers.

### 1.5 How They Feed Into Product Quality

The **provider feature compatibility matrix** (`docs/reference/provider-feature-compatibility.md`) is built directly from continuous test results:

```
Google AI Studio:  19/19 (100%) → ✅ Production-Ready
Vertex AI:         19/19 (100%) → ✅ Production-Ready
OpenAI:            19/19 (100%) → ✅ Production-Ready
LiteLLM:           19/19 (100%) → ✅ Production-Ready
Azure OpenAI:      13/19 (68%)  → Production* (non-PDF)
Mistral:            9/19 (47%)  → Development
Ollama:             7/19 (37%)  → Development
```

This matrix is published in documentation and used to guide customers on which providers to choose. If the tests are unreliable, the matrix is unreliable, and customers get wrong guidance.

---

## 2. The 14 Suites and Their Goals

| # | Suite | Goal | Tests |
|---|-------|------|-------|
| 1 | **Main (core)** | Prove SDK + CLI work with MCP tools, business tools, multimodal inputs (CSV/PDF/image), HITL, Zod schemas | ~30 |
| 2 | **Providers** | Prove provider-specific features: structured output, model variants, thinking levels, OpenRouter, model registry, retry, fallback | 25 |
| 3 | **TTS** | Prove TTS works: processor init, synthesis, voices, languages, audio formats (MP3/WAV), CLI flags, error handling, streaming | 15 |
| 4 | **Tracing** | Prove OTEL span chains are correct: generate, stream, message build, cost, errors, tools, memory, parent-child hierarchy | 10 |
| 5 | **Workflow** | Prove workflow engine: consensus, multi-judge, fallback, adaptive, checkpointing, HITL suspend/resume, registry, ensemble, judge scorer | 19 |
| 6 | **PPT** | Prove PPT generation: content planning, slide types, renderers, themes, logos, PPTX validity, CLI | 16 |
| 7 | **Servers** | Prove server adapters: 4 frameworks (Hono/Express/Fastify/Koa), 5 route groups, middleware, streaming, lifecycle | 36 |
| 8 | **RAG** | Prove RAG pipeline: 10 chunking strategies, rerankers, hybrid search, generate/stream with RAG files, CLI | 16 |
| 9 | **Evaluation** | Prove RAGAS evaluation: scorer init, faithfulness/relevancy/precision/recall, direct scoring, context builder, retry, batch | 13 |
| 10 | **Context** | Prove context management: compaction, 80% budget threshold, tool pruning, file dedup, sliding window, summarization, abort signals, token estimation | 20 |
| 11 | **Observability** | Prove OTEL integration: external TracerProvider, getSpanProcessors, setLangfuseContext, operation name detection, trace name format | 14 |
| 12 | **Media-Gen** | Prove media generation: image gen/edit/cache, video gen, format validation, CLI | 18 |
| 13 | **MCP HTTP** | Prove MCP HTTP transport: connection, auth, tool discovery, tool execution, retry, rate limiting, SSE, WebSocket, session management | 17 |
| 14 | **Memory** | Prove conversation memory: multi-turn, summarization, Redis persistence, retrieval tools, Mem0, cross-session, CLI persistence | 15 |

---

## 3. Current Status: Are We Achieving These Goals?

### 3.1 Goal-by-Goal Assessment

#### Goal 1: Does the SDK work with every provider?

**Partially achieved.** The main suite does run against all 11 providers and produces pass/fail counts. But the pass criteria are so generous (`response.length > 10`, fallback keyword matching after JSON parse failure, SKIP counted as PASS) that a provider with broken structured output, broken tool calling, or broken streaming could still show 19/19.

**Specific gaps:**
- Structured output tests accept unstructured text when JSON parse fails (providers suite, tests 1-3)
- Tool execution is non-deterministic — if the AI doesn't call the tool, the test SKIPs (and SKIPs count as PASS in the main suite)
- Stream tests accept any text with a period as "completion" — `"."` matches virtually anything

#### Goal 2: Does every feature work end-to-end?

**Not achieved for 6 of 14 feature areas.**

| Feature Area | Status | Reason |
|-------------|--------|--------|
| Core SDK/CLI | Partial | Tool discovery validation too loose; HITL broken |
| Providers | Partial | Structured output fallback to keywords; retry/fallback don't test the actual feature |
| TTS | Partial | 4 tests can never fail; format validation bypassed |
| **Tracing** | **Best suite** | Spans verified but attribute values not checked |
| Workflow | Not achieved | 11/19 tests always pass regardless of outcome |
| PPT | Not achieved | Only checks "file exists"; no content validation |
| **Servers** | **Not achieved** | Zero functional tests (all source grep) |
| RAG | Partial | Chunkers/rerankers tested well; generate/stream integration weak |
| **Evaluation** | **Not achieved** | Zero evaluation APIs called; all tests use manual prompts |
| Context | Not achieved | Zero token count measurements; budget threshold never verified |
| Observability | Not achieved | Context fields never verified on spans |
| Media-Gen | Partial | Text responses accepted as image generation success |
| MCP HTTP | Not achieved | 15/17 tests bypass the SDK |
| Memory | Partial | Basic multi-turn works; Redis persistence always-passes |

#### Goal 3: Do CLI and SDK produce the same results?

**Partially achieved.** CLI tests exist but have issues:
- PPT CLI test doesn't use PPT flags (`--output-mode=ppt`)
- Memory CLI test doesn't use `--session-id`
- TTS CLI tests only check exit code
- Server CLI tests read source files
- Several "CLI" tests actually use SDK directly (e.g., `testCLIBusinessTools`)

#### Goal 4: Do enterprise features work?

**Not achieved.**
- Enterprise proxy test checks env vars exist, not that proxying works
- Redis persistence test passes even when data isn't recalled
- OTEL external TracerProvider test never verifies spans arrive in the external exporter
- HITL tests are commented out (main suite) or don't actually suspend/resume (workflow suite)

#### Goal 5: Are multimodal inputs processed correctly?

**Partially achieved.** CSV and PDF tests in the main suite do verify content extraction. Image tests in media-gen accept text responses as success (the image may not have been generated at all).

---

### 3.2 The Five Systemic Problems

These problems cut across multiple suites and prevent the goals from being achieved:

**Problem 1: "Always-Pass" Anti-Pattern (47+ tests)**

Tests compute assertions but never gate pass/fail on them. They unconditionally `return true`.

| Suite | Affected | Fraction |
|-------|----------|----------|
| Workflow | 11 of 19 | 58% |
| Memory | 7 of 15 | 47% |
| PPT | 5 of 16 | 31% |
| Media-Gen | 5 of 18 | 28% |
| Providers | 3 of 25 | 12% |

**Problem 2: Source-Code Inspection Instead of Functional Testing (28+ tests)**

Tests read `.ts` source files with `fs.readFileSync` and do `content.includes("functionName")` string checks.

| Suite | All Source Grep? | Impact |
|-------|-----------------|--------|
| Servers | Yes — entire suite (36 tests) | 0% functional coverage. `httpRequest()` helper defined but never called. |
| PPT | 4 tests | Types, inference, renderers checked by string presence |
| Evaluation | 7 tests | Class methods checked by string presence |

**Problem 3: Tests That Bypass the SDK (17 tests)**

Tests in the MCP HTTP suite use raw `@modelcontextprotocol/sdk` instead of `sdk.addExternalMCPServer()`. 15 of 17 tests bypass the NeuroLink integration layer entirely.

**Problem 4: Feature Names That Don't Match What's Tested (14 tests)**

| Test Name | What's Actually Tested |
|-----------|----------------------|
| Network Retry Exponential Backoff | A single successful request |
| Workflow Checkpointing | Metadata passthrough (no checkpoint/resume) |
| HITL Suspend/Resume | Regular workflow execution |
| Rate Limiter Token Bucket | Config acceptance check |
| Blocked Tool Support | Tool registration (never blocks) |
| Redis Persistence | Passes when data not recalled |
| CLI Memory Persistence | Doesn't use `--session-id` |
| Token Estimation Accuracy | Tests `text.length/4`, not SDK utility |
| Image Cache Eviction | 3 calls (doesn't fill cache) |
| Image Retry Logic | Normal generation (no failure injection) |

**Problem 5: Overly Generous Pass Criteria**

| Pattern | Impact |
|---------|--------|
| `response.length > 10` passes structured output | Unstructured text passes |
| `isExpectedProviderError()` matches 28+ generic strings | Real bugs become SKIPs |
| `"."` as stream completion | Matches any text |
| Keyword fallback after JSON parse failure | Defeats structured output purpose |
| SKIP returns `true` (main suite) | Pass count inflated |

---

### 3.3 Suite-by-Suite Status Against Original Goals

#### Main Suite (Goal: Core SDK + CLI + MCP + Business Tools + HITL)

| Sub-Goal | Achieved? | Issue |
|----------|-----------|-------|
| MCP tool discovery via CLI | Partial | Passes on generic words (`"file"`, `"tool"`) or `response.length >= 100` |
| MCP tool execution (read real files) | Yes | Verifies real data from package.json/tsconfig.json |
| Business tools with deterministic data | Yes | Checks for hardcoded revenue numbers |
| HITL confirmation flow | No | Commented out; stream version never consumes stream |
| Enterprise proxy | No | Only checks env vars exist |
| CSV processing | Yes | Verifies extracted data |
| PDF processing | Yes | Verifies extracted data |
| Image generation | Partial | SKIP counted as PASS |
| Zod schema multi-provider | Depends on imported function | Not analyzed independently |

#### Providers Suite (Goal: Provider-Specific Features)

| Sub-Goal | Achieved? | Issue |
|----------|-----------|-------|
| Structured output with Zod | No | Falls back to keyword matching on JSON parse failure |
| Gemini tool+schema limitation | No | Only tests success path |
| Vertex model variants | Yes | Tests thinking, chat, pro |
| Gemini 3 features | No | Token counting passes when data absent |
| OpenRouter | Partial | Streaming returns true unconditionally |
| Thinking levels | No | No verification that levels affect output |
| Model registry | Yes | Checks enum completeness |
| Network retry | No | Single successful request |
| Provider fallback | No | Manual try/catch, not SDK fallback |
| All-provider loops | Yes | Loops through 11 providers, counts pass/fail |

#### TTS Suite (Goal: Text-to-Speech End-to-End)

| Sub-Goal | Achieved? | Issue |
|----------|-----------|-------|
| Processor init | No | Can't fail if handlers aren't registered |
| Google TTS synthesis | Partial | No format validation on audio buffer |
| Voice listing | No | Empty list is PASS |
| Multiple voices | No | No verification voices produce different audio |
| Multiple languages | No | No verification languages produce different audio |
| MP3 format validation | Yes | Magic byte check |
| WAV format validation | No | Falls back to any non-empty buffer |
| CLI TTS flags | No | Only checks exit code |
| Error handling | No | No code path returns false |
| Stream integration | No | Always passes |
| Result shape | Yes | Validates field types |

#### Tracing Suite (Goal: OTEL Span Chain Verification)

This is the **best-structured suite**. No critical issues.

| Sub-Goal | Achieved? | Issue |
|----------|-----------|-------|
| Generate span chain | Partial | Existence-only; attribute values not verified |
| Stream span chain | Partial | Misses 2 of 4 stream spans |
| Message build span | No | SKIPs when missing (should fail) |
| Cost on spans | Partial | Value range not checked |
| Input recording | Partial | Input length not range-checked |
| Error tracing | Partial | Error attributes not checked |
| Tool execution | No | Non-deterministic (model may not invoke tool) |
| Memory spans | No | SKIPs too aggressively |
| Parent-child hierarchy | Yes | Verifies trace ID and ancestor walk |
| All spans have status | Yes | Checks for non-UNSET status |

#### Workflow Suite (Goal: Workflow Engine Patterns)

| Sub-Goal | Achieved? | Issue |
|----------|-----------|-------|
| Basic execution | No | Doesn't check answer correctness |
| Consensus (majority) | No | Always returns true; never checks majority selection |
| Multi-judge (best response) | No | Always returns true; never verifies best score selected |
| Fallback chain | No | All models succeed; fallback never triggered |
| Adaptive (complexity routing) | No | Never verifies tier selection |
| Checkpointing | No | Admits "requires Redis"; just metadata passthrough |
| HITL suspend/resume | No | Regular execution; no actual suspend |
| Registry management | Partial | Good structure but missing negative cases |
| Ensemble executor | No | Always returns true |
| Judge scorer | No | Assertions computed but never used |
| Response conditioner | No | Always returns true |
| CLI commands | Partial | Pass on any keyword in output |
| Branch execution | No | Never verifies which branch taken |
| Parallel execution | No | Efficiency computed but never asserted |

#### PPT Suite (Goal: PowerPoint Generation Pipeline)

| Sub-Goal | Achieved? | Issue |
|----------|-----------|-------|
| Types validation | No | Source-code grep |
| Content planner | No | No slide count or content verification |
| Slide type inference | No | Source-code grep |
| Slide renderers | No | Source-code grep; allows 5 missing |
| Full pipeline | No | Only checks file size > 10KB |
| 5 themes | No | Theme never verified in output |
| Logo placement | No | Only checks file exists |
| PPTX openable | Partial | Only checks ZIP magic bytes, not full structure |
| CLI PPT | No | No PPT flags used |
| AI images in PPT | No | Error masking |
| Different audiences | No | No content comparison |

#### Servers Suite (Goal: Server Adapter Lifecycle)

**0% of goals achieved.** Every test reads source files. Zero servers started. Zero HTTP requests made. The stated goals from the header are:

> 1) Creates server adapters for all 4 frameworks
> 2) Registers and responds to all 5 route groups
> 3) Applies middleware correctly
> 4) Handles streaming responses via SSE
> 5) Manages server lifecycle (start, stop, status)

None of these 5 goals have any functional test coverage.

#### RAG Suite (Goal: RAG Pipeline End-to-End)

| Sub-Goal | Achieved? | Issue |
|----------|-----------|-------|
| All 10 chunking strategies | Partial | 9 of 10 tested; `semantic` excluded |
| ChunkerFactory/Registry | Yes | Functional tests |
| RerankerFactory/Registry | Partial | Only `simple` reranker functionally tested |
| Hybrid search (BM25 + vector) | No | `createHybridSearch()` imported but never called |
| Generate with RAG files | Partial | Weak assertions; all skippable |
| Stream with RAG files | Partial | Same issues |
| CLI RAG commands | Partial | Some tests always pass |
| Error handling | No | Error tests always pass |

**Also:** Imports from `src/` instead of `dist/`, so tests don't verify the shipped package.

#### Evaluation Suite (Goal: RAGAS Scoring System)

**0% of goals achieved.** Zero evaluation APIs called. All 13 tests either:
- Read source files for substring matching (7 tests), or
- Send manually-crafted "judge" prompts to `sdk.generate()` and regex-parse the response (6 tests)

`RAGASEvaluator`, `ContextBuilder`, `RetryManager`, `PromptBuilder` — none are ever instantiated. `EVAL_TEST_DATA.poorAnswer` is defined but never used.

#### Context Suite (Goal: Context Compaction & Budget Management)

| Sub-Goal | Achieved? | Issue |
|----------|-----------|-------|
| 80% budget threshold | No | Never measures context utilization |
| Context compaction | No | Only counts generate() successes; no token measurement |
| Tool output pruning | No | No pruning verification |
| File read deduplication | No | No dedup verification |
| Sliding window | Partial | Good design but indirect (relies on LLM recall) |
| LLM summarization | No | Falls back to any non-empty response |
| Abort signals | Partial | Passes if call completes before abort fires |
| Prompt caching | No | Single call can't verify cache hit |
| Token estimation | No | Tests `text.length/4`, not SDK's utility |
| Concurrent conversations | No | No isolation verification |

#### Observability Suite (Goal: OTEL Integration & Context Enrichment)

| Sub-Goal | Achieved? | Issue |
|----------|-----------|-------|
| External TracerProvider mode | No | Never asserts span count > 0 or checks `isUsingExternalTracerProvider()` |
| getSpanProcessors | Partial | Shape only; not integrated with external NodeSDK |
| setLangfuseContext roundtrip | Yes | Basic storage/retrieval works |
| Context → span enrichment | No | Never verifies context fields appear on spans |
| Operation name auto-detection | No | Never checks `gen_ai.operation.name` attribute |
| Trace name format | No | `formatCalled` logged but never asserted; output not verified on spans |
| Custom metadata | No | Metadata verified in context but not on spans |
| getTracer | Yes | Best test: creates span, verifies in exporter with correct name |
| All context fields | No | Storage verified, enrichment not verified |
| Operation name override | No | Tests context, not actual override in span processing |
| Wrapper span support | No | Doesn't verify trace name update |

#### Media-Gen Suite (Goal: Image/Video Generation)

| Sub-Goal | Achieved? | Issue |
|----------|-----------|-------|
| CLI image generation | Partial | No format validation |
| SDK image generation | No | Child process pattern; text-fallback PASS |
| Unsupported provider error | No | Tests a supported combination; both paths pass |
| Image editing (URL/base64/file) | No | Text-fallback counts as PASS |
| Image count limits | No | Tests via prompt text, not SDK parameter |
| Image LRU cache | No | Timing never asserted |
| Image cache eviction | No | Doesn't fill cache |
| Image retry logic | No | No failure injection |
| Image output validation | Yes | Good magic byte validation |
| Video generation | Partial | Too many SKIP escape hatches |
| Video validation | No | Both code paths are PASS |
| CLI video | No | `stdout.length > 0` accepts error messages |
| Video types | No | Tests mock objects, not SDK |

#### MCP HTTP Suite (Goal: MCP Transport Integration)

| Sub-Goal | Achieved? | Issue |
|----------|-----------|-------|
| HTTP connection via SDK | No | Uses raw MCP SDK client (15/17 tests) |
| Bearer auth forwarding | No | Server doesn't require auth; unfalsifiable |
| API key auth forwarding | No | Same issue |
| Tool discovery via SDK | No | Raw MCP SDK |
| Tool execution via generate() | Yes | Test #5 is the only SDK-path test |
| Retry with exponential backoff | No | No retry scenario triggered |
| Rate limiting enforcement | No | Only checks config acceptance |
| Timeout behavior | Partial | Good concept but loose timing |
| SSE transport via SDK | No | Uses raw SSE SDK |
| WebSocket transport via SDK | No | Only instantiates constructor |
| Blocked tool filtering | No | Never calls generate() with blocked tools |
| Session management | No | Checks tool count equality, not session ID header |

#### Memory Suite (Goal: Conversation Memory Persistence)

| Sub-Goal | Achieved? | Issue |
|----------|-----------|-------|
| Multi-turn recall | Yes | Best test in suite — proper retry logic |
| Sequence ordering | Partial | Out-of-order recall is PASS |
| Token-based summarization | No | Only checks `content.length > 20` |
| Enable/disable summarization | No | Only tests disabled side |
| Redis cross-instance persistence | No | Passes when data not recalled |
| Redis connection pooling | No | Always passes |
| Memory retrieval tool | No | Falls to unconditional pass |
| Mem0 integration | No | Smoke test only |
| Conversation title generation | No | Can never fail |
| CLI memory persistence | No | Doesn't use `--session-id` |
| Memory cleanup | Partial | Only checks shutdown time |
| Large context handling | Partial | 5/15 threshold too low |
| Cross-session isolation | No | Result never checked |
| Tools with memory | No | Falls to unconditional pass |

---

## 4. Generate/Stream Coverage Gap Analysis

Every feature should be tested through `generate()` and `stream()` from both SDK and CLI. Here is the current status for each feature area.

### 4.1 Coverage Matrix

| Feature | SDK generate() | SDK stream() | CLI generate | CLI stream | Gap |
|---------|---------------|-------------|-------------|------------|-----|
| **Basic text** | Yes | Yes | Yes | Yes | None |
| **MCP tool discovery** | Yes | Yes | Yes | Yes | Assertions too loose |
| **MCP tool execution** | Yes | Yes | Yes | Yes | Assertions too loose |
| **Business tools** | Yes | Yes | SDK only (labeled CLI) | No | CLI can't register tools; test mislabeled |
| **Structured output (Zod)** | Yes | No | No | No | Keyword fallback defeats purpose; no stream/CLI |
| **CSV input** | Yes | Yes | Yes | Yes | Subprocess pattern for SDK |
| **PDF input** | Yes | Yes | Yes | Yes | Subprocess pattern for SDK |
| **Image input** | Yes | Yes | Yes | Yes | SKIP counts as PASS |
| **Image generation** | Partial | Partial | Partial | No | Text-fallback PASS; child-process pattern |
| **Video generation** | Partial | No | Partial | No | Both code paths pass; no stream test |
| **TTS** | Partial | Partial | Exit-code only | No | No format/voice verification; no CLI stream |
| **RAG files** | Partial | Partial | Partial | Partial | Weak assertions; imports from src/ |
| **Memory (multi-turn)** | Yes | No | No (no --session-id) | No | Zero stream() tests; CLI doesn't use flags |
| **Memory (Redis)** | No | No | No | No | Always passes regardless |
| **Memory (summarization)** | No | No | No | No | No verification summarization occurred |
| **Context compaction** | No | No | No | No | Zero token measurements |
| **Abort signals** | Partial | Partial | No | No | Passes if call completes before abort |
| **Thinking levels** | Yes | No | No | No | No verification level affects output |
| **HITL** | No | No | No | No | Commented out; stream never consumed |
| **Observability spans** | Yes (but weak) | No | Exit-code only | No | Context never verified on spans; no stream |
| **Workflows** | Via executeWorkflow | No | Via CLI command | No | 11/19 always pass; no stream path |
| **PPT generation** | Via generate+ppt | No | No flags used | No | No content validation in output |
| **MCP HTTP transport** | 1 of 17 tests | No | No | No | 15/17 bypass SDK |
| **MCP SSE transport** | No | No | No | No | Uses raw MCP SDK |
| **MCP WebSocket transport** | No | No | No | No | Only instantiates constructor |
| **Server adapters** | No | No | No | No | Entire suite is source-code grep |
| **Evaluation scoring** | No | No | No | No | Zero evaluation APIs called |
| **Provider fallback** | No (manual loop) | No | No | No | SDK fallback API not tested |
| **Network retry** | No | No | No | No | Single successful request |
| **Provider aliases** | No | No | No | No | Zero tests |

### 4.2 The Pattern That Emerges

Looking at this matrix, clear patterns emerge:

**Pattern A: generate() tested, stream() missing.** 12+ features are tested via `generate()` only. Stream is a completely separate code path in the SDK (different providers, different token handling, different error surfaces). A feature working in `generate()` does not guarantee it works in `stream()`.

Missing stream() tests: structured output, memory, thinking levels, observability, workflows, PPT, MCP transports, evaluation, server adapter endpoints.

**Pattern B: SDK tested, CLI missing.** Even features that have SDK generate() tests often lack CLI equivalents. The CLI is a distinct consumption path with its own argument parsing, process management, and output formatting. CLI flags like `--session-id`, `--rag-files`, `--tts`, `--tts-voice`, `--output-mode=ppt`, `--thinking-level` need dedicated tests.

Missing CLI tests: structured output, memory (with flags), context, observability, workflows (stream), MCP HTTP, evaluation, server adapters.

**Pattern C: Feature tested, but not through generate/stream.** Several suites test internal components directly instead of through the consumer path:
- Evaluation: sends manual "judge" prompts instead of calling `sdk.evaluate()`
- Context: tests `text.length/4` instead of generate() with compaction
- MCP HTTP: uses raw MCP SDK instead of `sdk.addExternalMCPServer()` → `sdk.generate()`
- Servers: reads source files instead of starting a server and POSTing to generate/stream endpoints
- PPT: checks file existence instead of verifying generate() output content

---

## 5. Impact on Product Quality

### 5.1 The Provider Compatibility Matrix Is Unreliable

The matrix at `docs/reference/provider-feature-compatibility.md` shows "19/19 (100%)" for 4 providers and uses this to label them "Production-Ready." But if 47+ tests always pass regardless of actual behavior, those 19/19 scores could include tests that never validated anything. A provider with broken structured output, broken tool calling, or broken streaming could still score 19/19.

### 5.2 Features Labeled "Complete" May Not Work

The `CLAUDE.md` lists feature implementation status:

| Feature | CLAUDE.md Status | Test Coverage Status |
|---------|-----------------|---------------------|
| Observability | "100% pattern compliance" | Context enrichment never verified on spans |
| Server Adapters | "4 adapters, 5 route groups" | Zero functional tests |
| RAG Processing | "9 chunkers, hybrid search" | `createHybridSearch()` never called |
| Evaluation/Scoring | "~663 lines, ~5 scoring dimensions" | Zero evaluation APIs called |
| Streaming Architecture | "All 4 patterns, 24 event types" | Stream tests accept any text |
| Context Compaction | "4-stage pipeline, BudgetChecker" | Zero token measurements |
| Workflow System | "Full engine, checkpointing, HITL" | Checkpointing and HITL not actually tested |

### 5.3 Enterprise Customers Have Zero Regression Protection For

- Server adapter HTTP endpoints
- RAGAS evaluation scoring accuracy
- Context compaction effectiveness
- MCP HTTP transport through SDK APIs
- Redis memory persistence
- HITL workflow suspend/resume
- Workflow checkpointing
- OTEL span enrichment with Langfuse context

---

## 6. Severity Summary

| Suite | Critical | Major | Minor | Good | Total |
|-------|----------|-------|-------|------|-------|
| Main (core) | 4 | 8 | 3 | 2 | ~30 |
| Providers | 6 | 6 | 3 | 1 | 25 |
| TTS | 4 | 5 | 2 | 1 | 15 |
| Tracing | 0 | 5 | 4 | 1 | 10 |
| Workflow | 6 | 5 | 1 | 1 | 19 |
| PPT | 5 | 6 | 0 | 0 | 16 |
| Servers | 25 | 2 | 0 | 0 | 27 |
| RAG | 1 | 7 | 3 | 3 | 16 |
| Evaluation | 8 | 3 | 0 | 0 | 13 |
| Context | 4 | 7 | 3 | 1 | 20 |
| Observability | 5 | 4 | 3 | 1 | 14 |
| Media-Gen | 5 | 7 | 3 | 0 | 18 |
| MCP HTTP | 7 | 5 | 2 | 1 | 17 |
| Memory | 4 | 4 | 4 | 1 | 15 |
| **Totals** | **84** | **74** | **31** | **13** | **~263** |

---

## 7. Standards for Fixes

All fixes must follow these principles:

1. **Everything through generate() and stream().** Every feature must be tested by calling `sdk.generate()` or `sdk.stream()` with the right configuration, then verifying the output. No testing internal classes directly. No testing raw protocol libraries. The consumer calls generate/stream — so we test generate/stream.
2. **Both SDK and CLI.** Every feature tested via SDK must also be tested via CLI with the corresponding flags. SDK: `sdk.generate({ prompt, rag: { files } })`. CLI: `neurolink generate "prompt" --rag-files ./doc.md`. Both paths must work.
3. **Test as the consumer uses it.** Import from `dist/`, call SDK/CLI APIs exactly as documented, verify outputs that consumers depend on.
4. **Every test must have a real fail path.** If the feature is broken, the test must turn red. No unconditional `return true`.
5. **No source-code inspection.** Never `fs.readFileSync` a `.ts` file. Import and exercise the API.
6. **Specific assertions over generic ones.** Check exact values, specific error types, correct attribute names — not just `response.length > 10`.
7. **Both success and failure paths.** Every feature should have at least one test for correct behavior and one for error behavior.
8. **Deterministic tests.** If AI non-determinism is involved, use `toolChoice: "required"`, direct `executeTool()`, or mark as conditional — never rely on AI voluntarily calling tools.
9. **SKIP means SKIP, not PASS.** Return `null` for SKIP, `true` for PASS, `false` for FAIL. Never `return true` when a test is skipped.

---

## 8. Companion Document

The detailed fix plan for all 263 tests is in:
**`memory-bank/research/CONTINUOUS-TEST-SUITE-FIX-PLAN.md`**

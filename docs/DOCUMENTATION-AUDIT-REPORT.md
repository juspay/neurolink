# NeuroLink Documentation Audit Report

> **⚠️ HISTORICAL DOCUMENT (August 2025)**
>
> This audit was conducted when NeuroLink shipped 9 providers. The current package (v9.62.0, May 2026) supports 21+ providers including DeepSeek, NVIDIA NIM, LM Studio, llama.cpp, plus voice (TTS/STT/realtime). References to "9 providers" or "8/9 working" in this file reflect the state at time of analysis.
>
> For current capabilities see [README on GitHub](https://github.com/juspay/neurolink/blob/main/README.md) and [Provider Capabilities Audit](https://github.com/juspay/neurolink/blob/main/docs/reference/provider-capabilities-audit.md).

> **Snapshot Date:** 2026-03-17 | **Branch:** `fix/documentation` | **Status:** Historical audit record — most items have been resolved. This document is retained for reference.

## Goal

Perform a comprehensive audit of the NeuroLink documentation served at **docs.neurolink.ink** to identify every gap, broken element, missing content, incorrect code, navigation issue, and quality problem. This report is the output of **16 parallel investigation agents** that examined the documentation from every angle. This initial audit phase used 16 agents. The full fix cycle across all phases used 77+ agents total. The findings here should be used by a verification agent to confirm each issue and by implementation agents to systematically fix them.

### What Was Investigated

1. **Documentation directory structure** — Complete inventory of all 481 files across 28 directories
2. **Documentation build system** — Docusaurus 3.9.2 config, CI/CD, plugins, search, analytics
3. **SDK API reference** — Every public method on the `NeuroLink` class vs what's documented
4. **CLI documentation** — Every CLI command, flag, and option vs what's documented
5. **Provider documentation** — All 13 providers vs their dedicated setup guides
6. **Feature documentation** — All 15 major features vs their feature guides
7. **Git commit patterns** — How documentation is typically written, what got missed
8. **Broken links and references** — Every internal link, anchor, and image reference
9. **Code example correctness** — Every code block compared against actual SDK and CLI APIs
10. **Public exports vs documentation** — Every `index.ts` export vs its API reference page
11. **Documentation quality and consistency** — Formatting, frontmatter, heading structure, terminology
12. **Sidebar navigation completeness** — Every sidebar entry verified, orphaned pages identified
13. **TypeScript type documentation** — All 42 type files vs TypeDoc pages and narrative docs
14. **README accuracy** — Every claim in README.md vs actual codebase capabilities
15. **Recently added features** — Features from recent commits vs documentation coverage
16. **Guides, examples, and tutorials** — Getting started path, cookbook, runnable examples quality

### Verified False Positives (5 corrections applied)

The following claims from the original 16-agent audit were verified as false positives and have been struck through in-place throughout this document:

| Original Claim                                                                                                | Correction                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Claim 1.7b** — `registerTool` using `parameters` is wrong, should be `inputSchema`                          | **FALSE POSITIVE.** Runtime compatibility shim handles `parameters` including Zod schemas. The documented code works correctly.                                                                                          |
| **Claim 6.2** — `#examples--recipes`, `#use-cases--examples`, `#retry--backoff-strategies` are broken anchors | **FALSE POSITIVE.** These are valid anchors where `&` in headings correctly becomes `--` in generated slugs. 3 of 8 broken anchor claims removed.                                                                        |
| **Claim 7.1** — 351 MkDocs tabbed syntax instances                                                            | **OVERSTATED ~7x.** Actual count outside code blocks: ~49. The grep matched `===` inside fenced code blocks (Python comparisons, test assertions).                                                                       |
| **Claim 12.2** — WebSocket Handler not mentioned in README                                                    | **FALSE POSITIVE.** WebSocket IS mentioned at 2 locations in README.                                                                                                                                                     |
| **Claim 2.6** — ToolRouter, ToolCache, RequestBatcher undocumented                                            | **FALSE POSITIVE / CLAUDE.md INACCURACY.** These source files **do not exist in the codebase**. The CLAUDE.md claim is stale or aspirational. Not a doc gap — the code doesn't exist. CLAUDE.md itself needs correction. |

### Verification Criteria

For each issue category, a verification agent should:

- **Confirm the issue exists** by checking the referenced file path and line number
- **Assess current severity** (it may have been partially fixed since audit)
- **Flag additional false positives** if further analysis reveals incorrect claims
- **Note dependencies** between issues (e.g., fixing MkDocs syntax may fix some broken rendering)

---

## Documentation Infrastructure Summary

| Property           | Value                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| **Framework**      | Docusaurus 3.9.2 (React-based static site generator)                                            |
| **URL**            | https://docs.neurolink.ink                                                                      |
| **Hosting**        | GitHub Pages with custom domain (CNAME)                                                         |
| **Source docs**    | `/docs/` directory (synced to `/docs-site/docs/` at build time)                                 |
| **Site config**    | `/docs-site/docusaurus.config.ts`                                                               |
| **Sidebar config** | `/docs-site/sidebars.ts`                                                                        |
| **Sync script**    | `/docs-site/scripts/sync-docs.ts` (MkDocs → Docusaurus transformation)                          |
| **Search**         | Algolia (primary) + MiniSearch (local fallback)                                                 |
| **Analytics**      | PostHog (GDPR-compliant) + Google Analytics                                                     |
| **Total files**    | 481 (410 markdown + 71 media/assets)                                                            |
| **API docs**       | 137 auto-generated TypeDoc pages in `/docs/api/`                                                |
| **CI/CD**          | `.github/workflows/docs-deploy.yml`, `docs-pr-validation.yml`, `docs-version.yml`               |
| **Custom plugins** | `docusaurus-plugin-new-docs` (badge detection), `docusaurus-plugin-search-index` (local search) |
| **Redirects**      | 70+ static redirects in `/docs-site/config/redirects.ts`                                        |
| **LLM docs**       | `llms.txt` (~50KB summary) and `llms-full.txt` (~3.8MB full) generated at build                 |

---

## CATEGORY 1: Broken Code Examples

### 1.1 README Hero Example (CRITICAL)

**File:** `/README.md`, lines 9-17

**Current broken code:**

```typescript
const pipe = new NeuroLink({ defaultProvider: "anthropic" });
for await (const token of pipe.stream({ prompt: "Hello" })) {
  process.stdout.write(token);
}
```

**Why it's broken (3 distinct errors):**

1. `NeurolinkConstructorConfig` has no `defaultProvider` field. Valid fields are: `conversationMemory`, `enableOrchestration`, `hitl`, `toolRegistry`, `observability`, `modelAliasConfig`.
2. `stream()` returns `Promise<StreamResult>`, not an async iterable. Must use `result.stream` to get the iterable.
3. Stream chunks are objects (`{ content: string }` or `StreamChunk`), not raw strings. `process.stdout.write(token)` would output `[object Object]`.

**Correct code should be:**

```typescript
const pipe = new NeuroLink();
const result = await pipe.stream({
  input: { text: "Hello" },
  provider: "anthropic",
});
for await (const chunk of result.stream) {
  process.stdout.write(chunk.content);
}
```

**Verification:** Read `src/lib/types/configTypes.ts` for constructor options, `src/lib/types/streamTypes.ts` for `StreamResult` and `StreamChunk` types.

---

### 1.2 `prompt` vs `input.text` (20+ instances)

**The problem:** `GenerateOptions` and `StreamOptions` do NOT have a `prompt` field. The correct field is `input: { text: "..." }`, or you can pass a bare string to `generate("Hello")`.

**Affected files (verified instances):**

| File                                  | Lines                                           | Pattern                                              |
| ------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `README.md`                           | 586                                             | `generate({ prompt: "...", rag: {...} })`            |
| `docs/features/observability.md`      | 72, 204, 216, 228, 248, 281, 305, 337, 583, 587 | `generate({ prompt: "Hello" })`                      |
| `docs/features/rag.md`                | 921-940                                         | Both `generate({ prompt })` and `stream({ prompt })` |
| `docs/advanced/builtin-middleware.md` | 165, 217, 241, 662, 686, 746                    | `generate({ prompt })` and `stream({ prompt })`      |
| `docs/telemetry-guide.md`             | 82                                              | `generate({ prompt: "Hello" })`                      |
| `docs/sdk/api-reference.md`           | 523                                             | `generate({ prompt: "...", rag: {...} })`            |

**Verification:** Read `src/lib/types/generateTypes.ts` — search for `prompt` field on `GenerateOptions`. It does not exist. The `generate()` method at `src/lib/neurolink.ts:2857` accepts `GenerateOptions | string`.

---

### 1.3 Streaming Iteration Pattern (10+ instances)

**The problem:** `stream()` returns `Promise<StreamResult>` where `StreamResult.stream` is the async iterable. Code must use `result.stream`, not iterate the result directly.

**Affected files:**

| File                                   | Lines                      | Broken Pattern                      |
| -------------------------------------- | -------------------------- | ----------------------------------- |
| `docs/advanced/streaming.md`           | 33-36, 51-53, 68-74, 92-94 | `for await (const chunk of stream)` |
| `docs/features/rag.md`                 | 133-150                    | `for await (const chunk of stream)` |
| `docs/reference/faq.md`                | 264                        | `for await (const chunk of stream)` |
| `docs/mem0-integration.md`             | 221                        | `for await (const chunk of stream)` |
| `docs/reference/provider-selection.md` | 141                        | `for await (const chunk of stream)` |
| `docs/playground/index.md`             | 60                         | `for await (const chunk of stream)` |
| `docs/cookbook/error-recovery.md`      | 301                        | `process.stdout.write(chunk)`       |
| `docs/features/file-processors.md`     | 192                        | `process.stdout.write(chunk)`       |

**Verification:** Read `src/lib/types/streamTypes.ts` — `StreamResult` has a `.stream` property that yields `StreamChunk` objects.

---

### 1.4 Invalid Constructor Options (5 instances)

**Affected files:**

| File                           | Lines   | Invalid Options                                              |
| ------------------------------ | ------- | ------------------------------------------------------------ |
| `README.md`                    | 12      | `defaultProvider: "anthropic"`                               |
| `README.md`                    | 345-368 | `store: "redis"`, `ttl: 86400`                               |
| `docs/sdk/index.md`            | 113-117 | `defaultProvider`, `timeout`, `enableAnalytics`              |
| `docs/sdk/index.md`            | 167-172 | `memory: { type: "redis" }` (should be `conversationMemory`) |
| `docs/examples/basic-usage.md` | 673-693 | `defaultProvider`, `timeout`, `retryAttempts`, `analytics`   |

**Verification:** Read `src/lib/types/configTypes.ts` for `NeurolinkConstructorConfig`.

---

### 1.5 Non-Existent Methods Referenced

| File        | Line | Method                 | Reality                           |
| ----------- | ---- | ---------------------- | --------------------------------- |
| `README.md` | 76   | `generateImage()`      | Does not exist on NeuroLink class |
| `README.md` | 371  | `exportConversation()` | Does not exist on NeuroLink class |

**Verification:** `grep -n "generateImage\|exportConversation" src/lib/neurolink.ts` — returns no results.

---

### 1.6 Tools Passed as Array Instead of Record

**File:** `docs/features/rag.md`, lines 124, 139, 245, 320, 349

**Broken:** `tools: [ragTool]`
**Correct:** `tools: { [ragTool.name]: ragTool }`

**Verification:** `GenerateOptions.tools` type in `src/lib/types/generateTypes.ts` is `Record<string, Tool>`, not `Tool[]`.

---

### 1.7 Other Broken Examples

| File                         | Line     | Issue                                                                                                                                                                     |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                  | 610      | `thinkingLevel` used as top-level `GenerateOptions` field (should be inside `thinkingConfig`)                                                                             |
| `docs/sdk/index.md`          | 148-155  | `createProviderWithFallback()` used synchronously (missing `await`)                                                                                                       |
| `docs/sdk/index.md`          | 176-183  | `sessionId` used in `GenerateOptions` (doesn't exist on this type)                                                                                                        |
| `docs/sdk/index.md`          | 224-271  | ~~`registerTool` uses `parameters: z.object(...)`~~ **FALSE POSITIVE** — Runtime compatibility shim handles `parameters` including Zod schemas; this code works correctly |
| `docs/features/rag.md`       | 691      | `GOOGLE_API_KEY` env var (should be `GOOGLE_AI_API_KEY`)                                                                                                                  |
| `docs/advanced/streaming.md` | 71       | `chunk.type === "tool_use"` (valid types are `"text"` and `"audio"` only)                                                                                                 |
| `docs/cli/examples.md`       | 365, 369 | `--criteria speed` and `--use-case cheapest` flags don't exist                                                                                                            |
| `docs/cli/advanced.md`       | 628      | `neurolink mcp list --server "$name"` — `--server` flag doesn't exist                                                                                                     |
| `docs/cli/advanced.md`       | 138      | `neurolink status --json` — should be `--format json`                                                                                                                     |

---

## CATEGORY 2: Missing Documentation — Features

### 2.1 Workflow System (CRITICAL — 25 files, ~20K lines, zero user guide)

**Source code:** `src/lib/workflow/` — 25 files including:

- `core/workflowRunner.ts` — Main execution engine
- `core/ensembleExecutor.ts` — Multi-model ensemble execution
- `core/judgeScorer.ts` — Judge-based scoring
- `workflows/consensusWorkflow.ts`, `fallbackWorkflow.ts`, `adaptiveWorkflow.ts`, `multiJudgeWorkflow.ts`
- `utils/workflowValidation.ts`, `workflowMetrics.ts`

**What exists in docs:**

- `docs/WORKFLOW-ENGINE-HLD.md` (847 lines) — Internal design doc, **NOT in sidebar**
- `docs/WORKFLOW-ENGINE-LLD.md` (2,024 lines) — Internal design doc, **NOT in sidebar**
- `docs/advanced-orchestration.md` (448 lines) — Maps to sidebar but is generic orchestration, not workflow-engine-specific

**What's completely missing:**

- User-facing feature guide explaining how to use the workflow engine
- Documentation for `runWorkflow()` function
- Documentation for 9 pre-built workflow constants: `CONSENSUS_3_WORKFLOW`, `CONSENSUS_3_FAST_WORKFLOW`, `BALANCED_ADAPTIVE_WORKFLOW`, `QUALITY_MAX_WORKFLOW`, `SPEED_FIRST_WORKFLOW`, `AGGRESSIVE_FALLBACK_WORKFLOW`, `FAST_FALLBACK_WORKFLOW`, `MULTI_JUDGE_3_WORKFLOW`, `MULTI_JUDGE_5_WORKFLOW`
- Documentation for `WorkflowConfig`, `WorkflowType`, `WorkflowResult` types
- CLI `workflow` command documentation (`workflow list`, `workflow info <name>`, `workflow execute <name> <prompt>`)
- Fluent API documentation
- Checkpointing documentation
- HITL integration with workflows

**Verification:** `ls src/lib/workflow/` and `grep -r "workflow" docs-site/sidebars.ts` — the sidebar references `workflows/orchestration` but NOT the workflow engine docs.

---

### 2.2 Observability — 8 of 9 Exporters Undocumented (CRITICAL — ~6,800 lines)

**Source code:** `src/lib/observability/` — includes exporters for:

| Exporter      | Source File                       | Documented?                            |
| ------------- | --------------------------------- | -------------------------------------- |
| Langfuse      | `exporters/langfuseExporter.ts`   | YES — `docs/features/observability.md` |
| LangSmith     | `exporters/langsmithExporter.ts`  | NO                                     |
| Datadog       | `exporters/datadogExporter.ts`    | NO                                     |
| Sentry        | `exporters/sentryExporter.ts`     | NO                                     |
| Braintrust    | `exporters/braintrustExporter.ts` | NO                                     |
| Arize         | `exporters/arizeExporter.ts`      | NO                                     |
| PostHog       | `exporters/posthogExporter.ts`    | NO                                     |
| Laminar       | `exporters/laminarExporter.ts`    | NO                                     |
| OpenTelemetry | `exporters/otelExporter.ts`       | NO                                     |

**Also undocumented:**

- 9 samplers: AlwaysSampler, NeverSampler, RatioSampler, TraceIdRatioSampler, AttributeBasedSampler, PrioritySampler, ErrorOnlySampler, CompositeSampler, CustomSampler
- 7 span processors: PassThrough, AttributeEnrichment, Filter, Redaction, Truncation, Composite, Batch
- ExporterRegistry, MetricsAggregator, TokenTracker
- 5 retry policies: Exponential, Linear, Fixed, NoRetry, CircuitBreakerAware

**The internal status file** `src/lib/observability/FEATURE-STATUS.md` documents all of this but is NOT synced to the docs site.

**Verification:** `ls src/lib/observability/exporters/` and `grep -i "langsmith\|datadog\|sentry\|braintrust\|arize\|posthog\|laminar" docs/features/observability.md` — returns 0 matches.

---

### 2.3 Dynamic Arguments (CRITICAL — zero docs, 269 tests)

CLAUDE.md states: "Dynamic Arguments: Complete — CLI context flags, runtime resolution, 269 tests"

**What's missing:** No documentation file exists. Zero mentions of "dynamic arguments" in any doc.

**Verification:** `grep -ri "dynamic.arg" docs/` — returns 0 results. `docs/advanced/dynamic-models.md` is a different feature (dynamic model configuration).

---

### 2.4 Embeddings (HIGH — no dedicated page)

**Source code:**

- `src/lib/core/baseProvider.ts` — `embed()` and `embedMany()` stubs
- Provider implementations in OpenAI, Google AI Studio, Vertex, Bedrock
- Server routes: `POST /api/agent/embed`, `POST /api/agent/embed-many`

**What exists:** Brief mention in `docs/sdk/api-reference.md` (lines 474-513) — 2 code snippets, provider table.

**What's missing:**

- No `docs/features/embeddings.md` page
- Not in sidebar navigation
- No documentation on which providers do NOT support embeddings (and what error they throw)
- No batch size limits or chunking behavior for `embedMany`
- No usage examples with `InMemoryVectorStore`
- Server route documentation not in API reference (only in server adapters guide)

---

### 2.5 Bash Tool (HIGH — zero docs)

**Source:** Commit `9a915e6f` added the bash tool as a built-in tool option.

**What's missing:** Zero documentation anywhere. The README's "6 Core Tools" table does not list it.

**Verification:** `grep -ri "bash.tool\|bashTool\|enableBashTool" docs/` — check results.

---

### ~~2.6 MCP Enhancements — ToolRouter, ToolCache, RequestBatcher~~

> **FALSE POSITIVE / CLAUDE.md INACCURACY:** CLAUDE.md states "ToolRouter, ToolCache, RequestBatcher (1,702 new lines)" but verification confirmed these source files **do not exist in the codebase**. The CLAUDE.md claim is stale or aspirational. This is not a documentation gap — the code itself doesn't exist. However, this means **CLAUDE.md itself needs to be corrected** to remove this false claim.
>
> The MCP circuit breaker (`mcpCircuitBreaker.ts`) does exist and remains undocumented — that is a real gap.

---

### 2.7 Streaming Architecture — 24 Event Types (MEDIUM)

CLAUDE.md claims: "All 4 streaming patterns, 24 event types, backpressure"

**What's missing:**

- No enumeration of the 24 event types in any doc
- No description of the 4 streaming patterns
- Backpressure gets a single bullet mention with no guidance
- `StreamChunk` discriminated union (text vs audio variants) undocumented

---

## CATEGORY 3: Missing Documentation — Providers

### 3.1 Providers With Zero Documentation

| Provider      | Source File                            | Default Model  | Key Env Vars                                                                                          |
| ------------- | -------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| **OpenAI**    | `src/lib/providers/openAI.ts`          | `gpt-4o`       | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL`                                            |
| **Ollama**    | `src/lib/providers/ollama.ts`          | `llama3.1:8b`  | `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT`, `OLLAMA_OPENAI_COMPATIBLE`                       |
| **SageMaker** | `src/lib/providers/amazonSagemaker.ts` | Endpoint-based | `SAGEMAKER_REGION`, `SAGEMAKER_DEFAULT_ENDPOINT`, `SAGEMAKER_MODEL`, `SAGEMAKER_MODEL_TYPE` + 10 more |

**Critical SageMaker note:** Streaming is explicitly NOT implemented (throws `SageMakerError`) — this is completely undisclosed.

**Verification:** `ls docs/getting-started/providers/` — confirm no `openai.md`, no `ollama.md`, no `sagemaker.md`.

---

### 3.2 Providers With Incorrect Documentation

**LiteLLM** (`docs/getting-started/providers/litellm.md`):

- The entire doc explains how to install and configure the **external LiteLLM proxy server**
- It NEVER explains the dedicated NeuroLink `litellm` provider (`--provider litellm`)
- Actual env vars `LITELLM_BASE_URL`, `LITELLM_API_KEY`, `LITELLM_MODEL` are undocumented
- No model list from `LiteLLMModels` enum

**HuggingFace** (`docs/getting-started/providers/huggingface.md`):

- Docs use `HUGGINGFACE_DEFAULT_MODEL` but code reads `HUGGINGFACE_MODEL`
- Default model documented as `Mistral-7B-Instruct-v0.2` but code defaults to `QWEN_2_5_72B_INSTRUCT`

**Verification:** Read `src/lib/factories/providerRegistry.ts` — find the HuggingFace and LiteLLM registration entries to confirm env var names and default models.

---

### 3.3 Provider Documentation Gaps (per provider)

| Provider             | Missing                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| **Google AI Studio** | Embedding support (`GOOGLE_AI_EMBEDDING_MODEL`, `gemini-embedding-001`)            |
| **Google Vertex**    | Embedding support (`VERTEX_EMBEDDING_MODEL`, `text-embedding-004`), TTS support    |
| **Amazon Bedrock**   | `BEDROCK_MODEL` env var, ARN format examples, streaming behavior                   |
| **Azure OpenAI**     | Vision/image support for GPT-4o, embedding usage examples, 4 of 5 env var variants |
| **Mistral**          | Vision models (Pixtral), tool/function calling examples, correct embedding API     |
| **Anthropic**        | `CLAUDE_SONNET_4_6` (registry default) missing from model table                    |

---

## CATEGORY 4: Missing Documentation — CLI

### 4.1 Entirely Undocumented Commands

| Command                                  | Source                              | Subcommands                                               | Key Flags                                            |
| ---------------------------------------- | ----------------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| `workflow`                               | `src/cli/commands/workflow.ts`      | `list`, `info <name>`, `execute <name> <prompt>`          | `--provider`, `--model`, `--timeout`, `--verbose`    |
| `observability` (aliases: `obs`, `otel`) | `src/cli/commands/observability.ts` | `status`, `metrics`, `exporters`, `costs`                 | —                                                    |
| `telemetry` (alias: `tel`)               | `src/cli/commands/telemetry.ts`     | `status`, `configure`, `list-exporters`, `flush`, `stats` | 9 exporters                                          |
| `docs`                                   | `src/cli/commands/docs.ts`          | —                                                         | `--transport` (stdio/http), `--port`                 |
| `rag index`                              | `src/cli/commands/rag.ts:507`       | —                                                         | `--index-name`, `--strategy`, `--graph`, `--verbose` |
| `rag query`                              | `src/cli/commands/rag.ts:740`       | —                                                         | `--index-name`, `--top-k`, `--hybrid`, `--graph`     |

---

### 4.2 Incorrect Flag Documentation

| Issue                           | Docs Say                              | Code Says                                      |
| ------------------------------- | ------------------------------------- | ---------------------------------------------- |
| `rag chunk --chunk-size`        | `--chunk-size`                        | `--maxSize` (`-m`)                             |
| `rag chunk --chunk-overlap`     | `--chunk-overlap`                     | `--overlap` (`-o`)                             |
| `mcp add --url` and `--headers` | Listed as flags                       | Not implemented as CLI flags                   |
| `--enable-beta`                 | Defaults to `true` for OAuth          | Code has `default: false`                      |
| `--dry-run`                     | "Returns mocked analytics/evaluation" | "Test command without making actual API calls" |
| `--thinking-budget`             | "Gemini 2.5+ models only"             | "Anthropic Claude and Gemini 2.5+"             |

---

### 4.3 Missing `models` Subcommands (5 of 6 undocumented)

Only `models list` is documented. Missing from docs:

- `models search [query]` — `--use-case`, `--max-cost`, `--min-context`, `--performance`
- `models best` — `--coding`, `--creative`, `--analysis`, `--fast`, `--require-vision`, etc.
- `models resolve <model>` — `--fuzzy`
- `models compare <models..>`
- `models stats` — `--detailed`

---

### 4.4 PPT Generation Flags (6 flags, all absent)

`--ppt-pages`, `--ppt-theme`, `--ppt-audience`, `--ppt-tone`, `--ppt-output`, `--ppt-aspect-ratio`, `--ppt-no-images` — none documented. The `--output-mode` flag doesn't mention `ppt` as a valid choice.

**Verification:** Read `src/cli/factories/commandFactory.ts` lines 340-410.

---

## CATEGORY 5: Missing Documentation — SDK API Surface

### 5.1 Undocumented Public Methods on NeuroLink Class

Source: `/src/lib/neurolink.ts` (10,249 lines)

**Lifecycle (essential for production):**

- `shutdown()` — Graceful shutdown (flushes OTEL, closes Redis, shuts down MCP servers). Line 2440.
- `dispose()` — Full resource disposal. Line 9954.

**Context Compaction API:**

- `compactSession(sessionId, config?)` — Manual 4-stage compaction. Line 10120.
- `getContextStats(sessionId, provider?, model?)` — Token usage and compaction readiness. Line 10171.
- `needsCompaction(sessionId, provider?, model?)` — Boolean check. Line 10213.

**Provider Diagnostics (11 methods):**

- `getProviderStatus(options?)` — Line 8372
- `testProvider(providerName)` — Line 8558
- `getBestProvider(requestedProvider?)` — Line 8590
- `getAvailableProviders()` — Line 8599
- `isValidProvider(providerName)` — Line 8609
- `hasProviderEnvVars(providerName)` — Line 8748
- `checkProviderHealth(providerName, options?)` — Line 8774
- `checkAllProvidersHealth(options)` — Line 8820
- `getProviderHealthSummary()` — Line 8864
- `clearProviderHealthCache(providerName?)` — Line 8911
- `getToolHealthReport()` — Line 9037

**Observability/Metrics (5 methods):**

- `getMetrics()` — Returns `MetricsSummary`. Line 2346.
- `getSpans()` — Returns `SpanData[]`. Line 2353.
- `getTraces()` — Returns `TraceView[]`. Line 2360.
- `resetMetrics()` — Line 2367.
- `initializeLangfuseObservability()` — Line 2414.

**MCP Management (14 methods):**

- `removeExternalMCPServer(serverId, options?)` — Line 9575
- `executeExternalMCPTool(serverId, toolName, args)` — Line 9660
- `testExternalMCPConnection(config)` — Line 9713
- `shutdownExternalMCPServers()` — Line 9753
- `addInMemoryMCPServer(serverId, serverInfo)` — Line 7563
- `getInMemoryServers()` — Line 7607
- `getInMemoryServerInfos()` — Line 7634
- `getAutoDiscoveredServerInfos()` — Line 7650
- `listMCPServers()` — Line 8692
- `testMCPServer(serverId)` — Line 8707
- `getAllAvailableTools()` — Line 8207
- `getCustomTools()` — Line 7434
- `getToolRegistry()` — Line 10112
- `getExternalServerManager()` — Line 10246

**Memory Management (8 methods):**

- `getConversationStats()` — Line 9185
- `ensureConversationMemoryInitialized()` — Line 9165
- `storeToolExecutions(sessionId, userId, toolCalls, toolResults)` — Line 9325
- `isToolExecutionStorageAvailable()` — Line 9382
- `getSessionMessages(sessionId, userId?)` — Line 9398
- `setSessionMessages(sessionId, userId, messages)` — Line 9439
- `modifyLastAssistantMessage(sessionId, content)` — Line 9487
- `updateAgenticLoopReport(sessionId, report, userId?)` — Line 7398

**Event System (entire subsystem):**
The `NeuroLink` class is a `TypedEventEmitter<NeuroLinkEvents>`. Events defined in `src/lib/types/common.ts` lines 157-210:

- `tool:start`, `tool:end`
- `stream:start`, `stream:end`, `stream:chunk`, `stream:complete`, `stream:error`
- `generation:start`, `generation:end`
- `response:start`, `response:end`
- `externalMCP:serverConnected`, `externalMCP:serverDisconnected`, `externalMCP:serverFailed`, `externalMCP:toolDiscovered`, `externalMCP:toolRemoved`, `externalMCP:serverAdded`, `externalMCP:serverRemoved`
- `tools-register:start`
- `hitl:confirmation-request`, `hitl:timeout`, `hitl:confirmation-response`

---

### 5.2 Missing `generate()`/`stream()` Parameters

**Parameters present in code but missing from API reference:**

| Parameter                 | Type                       | Purpose                                                   |
| ------------------------- | -------------------------- | --------------------------------------------------------- |
| `tts`                     | `TTSOptions`               | Text-to-Speech configuration                              |
| `abortSignal`             | `AbortSignal`              | External cancellation                                     |
| `toolFilter`              | `string[]`                 | Whitelist of tools to include                             |
| `excludeTools`            | `string[]`                 | Blacklist of tools to exclude                             |
| `skipToolPromptInjection` | `boolean`                  | Performance optimization (~30K tokens saved)              |
| `thinkingConfig`          | `object`                   | Full thinking config (not just `thinkingLevel` shorthand) |
| `workflow`                | `string`                   | Predefined workflow ID                                    |
| `workflowConfig`          | `WorkflowConfig`           | Inline workflow configuration                             |
| `maxBudgetUsd`            | `number`                   | Per-session USD budget cap                                |
| `requestId`               | `string`                   | Observability correlation ID                              |
| `csvOptions`              | `object`                   | CSV processing options                                    |
| `videoOptions`            | `object`                   | Video processing options                                  |
| `factoryConfig`           | `object`                   | Factory configuration override                            |
| `middleware`              | `MiddlewareFactoryOptions` | Middleware configuration                                  |
| `input.videoFiles`        | —                          | Video file input                                          |
| `input.segments`          | —                          | Director Mode segments                                    |
| `input.audio`             | `AudioInputSpec`           | Streaming audio input (stream only)                       |
| `output.director`         | —                          | Director Mode configuration                               |

**Missing `GenerateResult` fields:** `audio` (TTSResult), `workflow.*` (ensemble responses), `retryMetadata`

**Missing `StreamResult` fields:** `usage`, `finishReason`, `toolCalls`, `toolResults`, `toolEvents`, `toolExecutions`, `toolsUsed`, `metadata.guardrailsBlocked`, `metadata.thoughtSignature`, `metadata.thoughts`

---

### 5.3 Server Sub-Entry — Zero API Reference

The `@juspay/neurolink/server` sub-entry (`src/lib/server/index.ts`) exports ~120 named exports with zero `docs/api/` pages:

- Framework adapters (Hono, Express, Fastify, Koa)
- All middleware functions (20+ functions)
- All error classes
- All route factories
- OpenAPI generation (`OpenAPIGenerator`, `generateOpenAPISpec`, `createOpenApiRoutes`)
- Stream security (`createStreamRedactor`, `redactStreamChunk`)
- WebSocket utilities (`WebStreamWriter`, `BaseDataStreamWriter`)
- All validation schemas

---

## CATEGORY 6: Broken Links & References

### 6.1 Missing Files Linked from `docs/api/`

**Missing `docs/api/interfaces/` directory** (entire directory absent — 6 interface files referenced):

- `Chunker.md`, `BM25Index.md`, `VectorStore.md`, `VectorQueryResult.md`, `Reranker.md`, `RerankerMetadata.md`

**Missing `docs/api/type-aliases/` files** (20 files):

- `BM25Result.md`, `MetadataFilter.md`, `RerankResult.md`, `HybridSearchResult.md`
- 9 chunker config types: `CharacterChunkerConfig.md`, `RecursiveChunkerConfig.md`, `SentenceChunkerConfig.md`, `TokenChunkerConfig.md`, `MarkdownChunkerConfig.md`, `HTMLChunkerConfig.md`, `JSONChunkerConfig.md`, `LaTeXChunkerConfig.md`, `SemanticChunkerConfig.md`
- 5 metadata extractor configs: `TitleExtractorConfig.md`, `SummaryExtractorConfig.md`, `KeywordExtractorConfig.md`, `QuestionExtractorConfig.md`, `CustomSchemaExtractorConfig.md`
- `RAGConfig.md` (listed in `docs/api/README.md` index but file doesn't exist)
- `RAGPreparedTool.md`

**Missing `docs/api/functions/` files** (7 files):

- `prepareRAGTool.md`, `formatContextWithCitations.md`, `summarizeContext.md`
- `getRerankerMetadata.md`, `getRerankerDefaultConfig.md`, `getDefaultConfig.md`, `embed.md`

### 6.2 Broken Anchor Links (8 confirmed)

| Source File                                 | Broken Link                                       | Issue                                                              |
| ------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/api/type-aliases/GenerateOptions.md`  | `sdk-custom-tools.md#-controlling-tool-execution` | Section doesn't exist                                              |
| ~~`docs/features/multimodal.md`~~           | ~~`#examples--recipes`~~                          | **FALSE POSITIVE** — `&` in heading correctly becomes `--` in slug |
| ~~`docs/features/tts.md`~~                  | ~~`#use-cases--examples`~~                        | **FALSE POSITIVE** — `&` in heading correctly becomes `--` in slug |
| ~~`docs/guides/examples/code-patterns.md`~~ | ~~`#retry--backoff-strategies`~~                  | **FALSE POSITIVE** — `&` in heading correctly becomes `--` in slug |
| `docs/troubleshooting.md`                   | `features/ppt-generation.md#error-handling`       | Closest: `#error-handling-validation`                              |
| `docs/troubleshooting.md`                   | `features/ppt-generation.md#file-output`          | No close match                                                     |
| `docs/troubleshooting.md`                   | `features/ppt-generation.md#ai-image-generation`  | Closest: `#disable-ai-image-generation`                            |

### 6.3 Broken Image References (2)

| Source                      | Path                                     | Likely Correct                       |
| --------------------------- | ---------------------------------------- | ------------------------------------ |
| `docs/demos/index.md`       | `../assets/images/cli-demo.png`          | `../assets/images/cli-help-demo.png` |
| `docs/demos/screenshots.md` | `../assets/images/cli-help-overview.png` | `../assets/images/cli-help-demo.png` |

### 6.4 Placeholder Links (7)

Links using `(#)` as URL: `docs/tutorials/videos.md` (1), `docs/api/classes/NeuroLink.md` (5), `docs/api/type-aliases/AIProvider.md` (1)

### 6.5 Phantom API Documentation (5 files documenting non-existent code)

| File                                 | Phantom Class/API                         |
| ------------------------------------ | ----------------------------------------- |
| `docs/health-monitoring-guide.md`    | `HealthMonitor` class                     |
| `docs/mcp-testing-guide.md`          | `ContextManager` class                    |
| `docs/advanced/mcp-testing-guide.md` | `ContextManager` class (duplicate)        |
| `docs/ai-orchestration-guide.md`     | `DynamicOrchestrator` class               |
| `docs/mcp-concurrency-guide.md`      | `SemaphoreManager` class                  |
| `docs/features/enterprise-hitl.md`   | States features "are not yet implemented" |

### 6.6 "Coming Soon" Placeholder Content (40+ instances across 14 files)

**Heaviest offenders:**

- `docs/tutorials/videos.md` — 15 "Coming Soon" sections with `<!-- [Video embed placeholder] -->` markers
- `docs/features/audio-input.md` — 10+ "Coming Soon" entries for provider support
- `docs/mcp-integration.md` — 3 "Coming Soon" sections
- `docs/changelog.md` — 3 "Coming Soon" items (migration guides that never materialized)
- `docs/features/index.md` — Video Generation marked "Coming Soon"

### 6.7 Duplicate Documentation Files (16 pairs)

| Root File                        | Duplicate(s)                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `docs/api-reference.md`          | `docs/advanced/api-reference.md`, `docs/getting-started/api-reference.md`, `docs/sdk/api-reference.md` |
| `docs/troubleshooting.md`        | `docs/guides/troubleshooting.md`, `docs/reference/troubleshooting.md`                                  |
| `docs/configuration.md`          | `docs/reference/configuration.md`                                                                      |
| `docs/mcp-integration.md`        | `docs/advanced/mcp-integration.md`                                                                     |
| `docs/mcp-testing-guide.md`      | `docs/advanced/mcp-testing-guide.md`                                                                   |
| `docs/cli-guide.md`              | `docs/advanced/cli-guide.md`                                                                           |
| `docs/contributing.md`           | `docs/development/contributing.md`                                                                     |
| `docs/dynamic-models.md`         | `docs/advanced/dynamic-models.md`                                                                      |
| `docs/enterprise-proxy-setup.md` | `docs/getting-started/enterprise-proxy-setup.md`                                                       |
| `docs/framework-integration.md`  | `docs/sdk/framework-integration.md`                                                                    |
| `docs/middleware.md`             | `docs/guides/server-adapters/middleware.md`                                                            |
| `docs/provider-comparison.md`    | `docs/reference/provider-comparison.md`                                                                |
| `docs/testing.md`                | `docs/development/testing.md`                                                                          |
| `docs/use-cases.md`              | `docs/guides/examples/use-cases.md`, `docs/examples/use-cases.md`                                      |
| `docs/sdk/custom-tools.md`       | `docs/sdk-custom-tools.md` (near-duplicate, 1814 vs 1668 lines)                                        |

---

## CATEGORY 7: Rendering Issues — MkDocs Syntax in Docusaurus

### 7.1 MkDocs Tabbed Syntax (~49 instances, NOT 351)

> **Correction:** The original count of 351 was ~7x overstated. The grep included `===` inside fenced code blocks (e.g., Python comparisons, test assertions). Actual MkDocs tab syntax instances outside code blocks: ~49.

The `=== "Tab Name"` syntax renders as raw text in Docusaurus. Affected files include:

- `docs/getting-started/installation.md`
- `docs/sdk/index.md`
- `docs/cli/index.md`
- `docs/features/rag.md`
- `docs/features/guardrails.md`
- And additional files

**Fix:** Convert to Docusaurus `<Tabs>` component or use the `sync-docs.ts` script transformation (which may already handle some of this but is clearly missing many).

### 7.2 MkDocs Material Icons (11 files)

`:material-image:`, `:material-security:`, etc. render as literal text. Files include:

- `docs/features/index.md` — all table entries
- `docs/guides/index.md`

### 7.3 MkDocs Admonitions (20+ files)

`!!!` admonition syntax renders as raw text. Files include:

- `docs/features/guardrails.md`
- `docs/features/hitl.md`
- `docs/features/multimodal-chat.md`

### 7.4 MkDocs Grid Cards (9 files)

`<div class="grid cards" markdown>` syntax renders as broken HTML. Files include:

- `docs/sdk/index.md`

---

## CATEGORY 8: Navigation & Sidebar Issues

### 8.1 Sidebar Structure (from `/docs-site/sidebars.ts`)

**16 top-level categories:** Getting Started, SDK, CLI, Features, MCP, Memory, Workflows, Observability, Deployment, Guides, Cookbook, Tutorials, Examples, Reference, Demos, Development, Community

**Key problems:**

1. **Features category: 31 flat items** — Needs sub-grouping into: Input/Output (7), Generation (5), Conversation (5), Safety (3), Infrastructure (5), Special (6)

2. **3 duplicate entries:** Migration guides (`from-langchain`, `from-vercel-ai-sdk`, `migration-guide`) appear in BOTH "Getting Started > Migration Guides" AND "Guides > Migration"

3. **8 cross-directory references:** Pages from `advanced/` placed in unrelated categories (e.g., `advanced/streaming` in Features, `advanced/builtin-middleware` in Workflows)

4. **Category overlap:** Cookbook vs Examples vs Tutorials (3 categories for usage patterns). MCP/Memory/Workflows/Observability are features but get separate top-level categories while 31 other features are in a flat list.

### 8.2 Orphaned Pages (70 total — not in sidebar)

**High-value orphaned content:**

| Page                              | Lines | Why It Matters                       |
| --------------------------------- | ----- | ------------------------------------ |
| `features/context-compaction.md`  | 980   | Major feature with comprehensive doc |
| `features/video-director-mode.md` | 1,144 | Major feature doc                    |
| `features/video-analysis.md`      | 150   | Feature doc with real content        |
| `WORKFLOW-ENGINE-HLD.md`          | 847   | Workflow system design               |
| `WORKFLOW-ENGINE-LLD.md`          | 2,024 | Workflow system detailed design      |
| `connectors/index.md`             | 35    | Connector catalog                    |
| `connectors/tara.md`              | —     | Connector doc                        |
| `connectors/yama.md`              | —     | Connector doc                        |
| `playground/index.md`             | 133   | Interactive playground               |
| `about/nervous-system-model.md`   | 62    | Architecture concept                 |
| `about/pipe-architecture.md`      | 113   | Architecture concept                 |
| `advanced/index.md`               | —     | Advanced section landing page        |
| `advanced/factory-patterns.md`    | —     | Factory pattern guide                |
| `sdk/custom-tools.md`             | 1,814 | Near-duplicate                       |

Other orphans: Internal docs in `plans/`, `phases/`, `tracking/`, `test-reports/`, `analysis/`, `visual-content/`, `rag/` — likely intentionally excluded.

---

## CATEGORY 9: Type Documentation Gaps

### 9.1 Auto-Generated TypeDoc Status

**Stale:** All TypeDoc pages are pinned to an old commit (`1be79595b7d7307795c98da4267c1728cb50033d`). Fields added after that commit are missing from all auto-generated pages.

**`VERSION` constant:** Hardcoded as `"1.0.0"` in `docs/api/variables/VERSION.md` — actual version is `9.26.1`.

### 9.2 Critical Types With No Documentation

| Type                                    | File               | Impact                                                                  |
| --------------------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `StreamOptions`                         | `streamTypes.ts`   | Primary streaming input type — no TypeDoc page                          |
| `StreamResult`                          | `streamTypes.ts`   | Primary streaming output — no TypeDoc page, narrative omits 60%+ fields |
| `StreamChunk`                           | `streamTypes.ts`   | What `stream` yields — no docs, audio variant invisible                 |
| `ChatMessage`                           | `conversation.ts`  | Central message type — no TypeDoc page                                  |
| `NeurolinkConstructorConfig`            | `configTypes.ts`   | `toolRegistry` and `modelAliasConfig` fields missing                    |
| `NeuroLinkConfig`                       | `configTypes.ts`   | Runtime config — no page, no narrative                                  |
| `RAGConfig`                             | `rag/types.ts`     | Broken link in API README                                               |
| `TTSOptions` / `TTSResult` / `TTSChunk` | `ttsTypes.ts`      | Good in-source TSDoc but no TypeDoc pages                               |
| `HITLConfig`                            | `hitlTypes.ts`     | No TypeDoc page                                                         |
| `WorkflowConfig` / `WorkflowType`       | `workflowTypes.ts` | No TypeDoc page                                                         |
| `TokenUsage`                            | `analytics.ts`     | Used in every response — no page                                        |
| `MCPTransportType`                      | `mcpTypes.ts`      | `ws`, `tcp`, `unix` values undocumented                                 |
| `ExternalMCPServerConfig`               | `externalMcp.ts`   | No TypeDoc page                                                         |

### 9.3 Missing Model Enumerations

Only `AIProviderName`, `BedrockModels`, `OpenAIModels`, `VertexModels` have TypeDoc pages. Missing:

- `AnthropicModels`, `GoogleAIModels`, `MistralModels`, `AzureModels`, `OllamaModels`, `LiteLLMModels`, `HuggingFaceModels`, `OpenRouterModels`

---

## CATEGORY 10: Quality & Consistency Issues

### 10.1 Nonsensical Migration Notes

4+ files contain migration notes comparing `generate()` to itself:

- `docs/configuration.md` line 12: "Configuration remains identical for both generate() and generate()."
- `docs/troubleshooting.md` line 89: "What's the difference between the new generate() and the legacy generate()?"

This is leftover from a method rename where a previous name was globally replaced with `generate()`.

### 10.2 Internal Status Banners in User-Facing Docs

7+ files have `IMPLEMENTATION STATUS: COMPLETE (2025-01-07)` banners with checkbox items that read like developer notes, not documentation.

Files: `troubleshooting.md`, `configuration.md`, `reference/troubleshooting.md`, `reference/configuration.md`, `advanced/mcp-integration.md`, `mcp-integration.md`, `cli-reference.md`

### 10.3 Frontmatter Inconsistency

- ~40% of feature docs lack YAML frontmatter (title, description, keywords)
- Keywords format varies: some inline `keywords: rag, chunking`, some YAML array
- Only 9 of 31 feature docs have the `> **Since**: vX.X.X | **Status**: Stable` banner

### 10.4 Heading Structure Issues

- 3 files start with H2 instead of H1: `video-director-mode.md`, `video-generation.md`, `multimodal-chat.md`
- `multimodal-chat.md` has no H1 at all
- Emoji usage in headings: present in `getting-started/`, `sdk/`, `cli/`; absent in `features/`

### 10.5 Terminology Inconsistencies

| Term              | Variations Found                                                         |
| ----------------- | ------------------------------------------------------------------------ |
| Provider count    | "9 providers", "12+ providers", "13 Providers", "14+ providers"          |
| Tool count        | "58+ MCP Tools", "64+ built-in tools and MCP servers"                    |
| OpenRouter models | "200+ Models" (table) vs "300+ models" (text)                            |
| Product name      | "NeuroLink" (correct) vs "Neurolink" (wrong — in HLD/LLD, some API docs) |
| Google AI         | "google-ai", "googleAiStudio", "Google AI" used interchangeably          |

### 10.6 Other Quality Issues

- Contributing guide (`docs/development/contributing.md`) uses `npm` instead of `pnpm`, and references `npm run type-check` (should be `pnpm run check`)
- Discord badge in `docs/index.md` uses placeholder `DISCORD_SERVER_ID`
- `docs/troubleshooting.md` references v7.47.0 (Sep 2025) — project is at v9.26.1
- `docs/reference/troubleshooting.md` references v1.7.1 (Jan 2025)
- `docs/features/multimodal-chat.md` references "NeuroLink 7.47.0"
- `docs/sdk/advanced-features.md` is a 55-line stub with placeholder patterns (`generateStream`, `generateBatch`, `cache`)

---

## CATEGORY 11: Missing Guides & Examples

### 11.1 Missing Documentation Pages

| Page Needed                                   | Why                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `docs/features/embeddings.md`                 | User-facing embedding feature guide                                                       |
| `docs/features/workflow-engine.md`            | User-facing workflow engine guide                                                         |
| `docs/features/streaming.md`                  | Dedicated streaming feature guide (current `advanced/streaming.md` is enterprise-focused) |
| `docs/getting-started/providers/openai.md`    | Most popular provider                                                                     |
| `docs/getting-started/providers/ollama.md`    | Local model execution                                                                     |
| `docs/getting-started/providers/sagemaker.md` | AWS SageMaker                                                                             |
| `docs/guides/migration/from-openai-sdk.md`    | Most common migration path                                                                |

### 11.2 Missing Quick Start Subsections in Feature Docs

11 feature docs lack a Quick Start section: `auto-evaluation.md`, `structured-output.md`, `thinking-configuration.md`, `mcp-tools-showcase.md`, `provider-orchestration.md`, `regional-streaming.md`, `video-analysis.md`, `file-processors.md`, `cli-loop-sessions.md`, `claude-subscription.md`, `claude-subscription-testing.md`

### 11.3 Missing Runnable Examples

No example files exist for: streaming, memory/conversation, embeddings, provider switching, middleware, observability/Langfuse, context compaction, guardrails.

### 11.4 Missing Cookbook Recipes

No recipes for: basic streaming, multimodal images, memory persistence, provider switching, embeddings, observability setup.

### 11.5 Missing Migration Guides

- No major version migration guide (v7→v8, v8→v9)
- No migration from OpenAI SDK directly
- No migration from AWS SDK/Bedrock SDK

---

## CATEGORY 12: README Issues

### 12.1 Hero Code Example (see Category 1.1)

### 12.2 Features Missing from README

| Feature                          | Code Size                       | README Mention                                                       |
| -------------------------------- | ------------------------------- | -------------------------------------------------------------------- |
| Workflow System                  | 25 files, ~20K lines            | Zero                                                                 |
| TTS                              | TTSProcessor + GoogleTTSHandler | Zero                                                                 |
| Full Observability (9 exporters) | ~6,800 lines                    | Brief "OpenTelemetry" mention                                        |
| Context Compaction               | 12 files                        | Single buried bullet                                                 |
| Audio/Video/Archive processors   | 3 processor classes             | Not in file processing table                                         |
| GraphRAG                         | `graphRAG.ts`                   | Not mentioned                                                        |
| File Reference Tools (5 tools)   | `fileTools.ts`                  | Not mentioned                                                        |
| Embeddings API                   | 4 providers, server routes      | Not mentioned                                                        |
| Claude OAuth/Subscription        | Auth command + types            | Not mentioned                                                        |
| ~~WebSocket Handler~~            | ~~`WebSocketHandler.ts`~~       | **FALSE POSITIVE** — WebSocket IS mentioned at 2 locations in README |

### 12.3 README Inconsistencies

- OpenRouter: "200+" in table vs "300+" in feature bullets
- "64+ built-in tools and MCP servers" conflates two things (6 tools + 58 MCP servers)
- Core tools table shows 6 but omits `analyzeCSV` and conditional `bashTool`
- "Platform Capabilities" table has stale Q3/Q4 markers for features already shipped

---

## Verification Checklist for Agent (Historical — most items resolved)

A verification agent should confirm each category by:

1. **Code examples (Cat 1):** Run `grep -n "prompt:" docs/features/observability.md` and verify `prompt` is used where `input.text` should be
2. **Missing features (Cat 2):** Run `ls docs/features/` and confirm no `embeddings.md`, `workflow-engine.md` exist
3. **Missing providers (Cat 3):** Run `ls docs/getting-started/providers/` and confirm no `openai.md`, `ollama.md`, `sagemaker.md`
4. **CLI commands (Cat 4):** Run `grep -r "workflow\|observability\|telemetry" docs/cli/commands.md` and confirm 0 matches
5. **Undocumented methods (Cat 5):** Run `grep -n "shutdown\|dispose\|compactSession\|getContextStats" docs/sdk/api-reference.md` and confirm 0 matches
6. **Broken links (Cat 6):** Run `ls docs/api/interfaces/` and confirm directory doesn't exist
7. **MkDocs syntax (Cat 7):** Run `grep -c "=== " docs/getting-started/installation.md` and confirm non-zero count
8. **Sidebar (Cat 8):** Read `docs-site/sidebars.ts` and confirm `context-compaction` is absent from the items list
9. **Types (Cat 9):** Run `ls docs/api/type-aliases/StreamOptions.md` and confirm file doesn't exist
10. **Quality (Cat 10):** Read `docs/configuration.md` line 12 and confirm nonsensical migration note
11. **Missing guides (Cat 11):** Run `ls examples/` and confirm no `streaming-basic.ts` or `embeddings.ts`
12. **README (Cat 12):** Read `README.md` lines 9-17 and confirm hero code uses wrong API

---

## Statistics

| Metric                                      | Count                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| Total documentation files                   | 481                                                                      |
| Total issues identified                     | 200+                                                                     |
| Broken code examples                        | 32                                                                       |
| Missing feature documentation pages         | 7                                                                        |
| Missing provider documentation pages        | 3                                                                        |
| Incorrect provider documentation            | 2                                                                        |
| Undocumented CLI commands                   | 5                                                                        |
| Undocumented SDK public methods             | ~50+                                                                     |
| Broken internal links                       | 66                                                                       |
| Broken anchor links                         | 5 (3 of original 8 were false positives — valid `&` → `--` slugs)        |
| Orphaned pages (not in sidebar)             | 70                                                                       |
| Duplicate documentation files               | 16 pairs                                                                 |
| MkDocs syntax instances (won't render)      | ~49 tabs (corrected from overstated 351), 20+ admonitions, 11 icon files |
| "Coming Soon" placeholders                  | 40+                                                                      |
| Phantom API docs (non-existent code)        | 5 files                                                                  |
| Missing TypeDoc pages for critical types    | 17+                                                                      |
| Missing model enum TypeDoc pages            | 8                                                                        |
| Server sub-entry exports with zero API docs | ~120                                                                     |
| Feature doc sections missing Quick Start    | 11                                                                       |
| Missing runnable example files              | 8                                                                        |
| Missing cookbook recipes                    | 6                                                                        |

---

## Audit Metadata

- **Date:** 2026-03-17
- **Branch:** `fix/documentation`
- **Package version:** 9.26.1
- **Agents used:** 16 parallel investigation agents
- **Agent types:** Explore (2), feature-dev:code-explorer (4), general-purpose (10)
- **Total investigation time:** ~45 minutes wall clock (parallel execution)
- **Files examined:** 481 documentation files + ~200 source files

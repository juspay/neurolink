# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Contents

1. [Project Overview](#project-overview)
2. [Critical Rules](#critical-rules)
3. [Architecture](#architecture)
4. [Key Files](#key-files)
5. [Development Commands](#development-commands)
6. [How-To Guides](#how-to-guides)
7. [Common Patterns](#common-patterns)

---

## Project Overview

NeuroLink is a unified AI development platform shipping as both a **TypeScript SDK** and **CLI**. It wraps 21+ AI providers (OpenAI, Anthropic, Google AI Studio, Vertex, AWS Bedrock, Azure, Mistral, LiteLLM, SageMaker, Hugging Face, Ollama, OpenAI-compatible, DeepSeek, NVIDIA NIM, LM Studio, llama.cpp, OpenRouter, ElevenLabs, Deepgram, Azure Speech, and more) behind a single consistent API, with full MCP support, multimodal file processing, voice (TTS/STT/realtime), RAG pipelines, observability, and a workflow engine.

---

## Critical Rules

These are non-negotiable. Violating them breaks the build or introduces bugs.

1. **Dynamic imports only in registry** — All providers must use dynamic imports inside factory functions in `providerRegistry.ts`. Static imports create circular dependencies.
2. **Types in canonical location** — All type definitions go in `src/lib/types/`. Never create type files inside feature subdirectories.
3. **Gemini tools + JSON schema are mutually exclusive** — Google AI Studio and Vertex AI cannot use tools and `structuredOutput` with a JSON schema simultaneously. It's an API limitation. Design workflows to use one or the other.
4. **CLI ≠ SDK** — CLI can use manual MCP connections; the SDK cannot. Keep concerns separate.
5. **Backward compatibility** — Public SDK API must not break existing callers.
6. **`formatProviderError` must return, never throw** — Any provider error formatter must return the error object, not throw it.
7. **Zero `interface` — always use `type`** — Never use `interface`. Always use `type X = { ... }`. The only exception is `declare global { interface Window { ... } }` which TypeScript requires for declaration merging. Use intersection (`&`) instead of `extends`.
8. **No "Types" suffix in type filenames** — Files inside `src/lib/types/` must not contain "Types" or "Type" in their name. The folder IS the types folder — `mcp.ts` not `mcpTypes.ts`, `auth.ts` not `authTypes.ts`.
9. **Unique type names across all files** — Every exported type name must be globally unique across all files in `src/lib/types/`. Use domain prefixes to disambiguate:
   - Client SDK types: `Client*` prefix (e.g., `ClientAuthConfig`, `ClientToolInfo`, `ClientStreamResult`)
   - CLI types: `Cli*` prefix (e.g., `CliGenerateResult`, `CliStreamChunk`)
   - Server types: `Server*` prefix (e.g., `ServerAuthConfig`)
   - Stream types: `Stream*` prefix (e.g., `StreamToolCall`, `StreamToolResult`)
   - Processor types: `Processor*` prefix (e.g., `ProcessorRetryConfig`)
   - Workflow judge types: `Judge*` prefix (e.g., `JudgeScoreResult`)
10. **Barrel uses `export *` only** — `src/lib/types/index.ts` must only contain `export * from "./file.js"` lines. No selective exports (`export type { X, Y }`), no aliases (`X as Y`). If adding `export *` causes a name collision, rename the type at the source with a domain prefix per rule 9.
11. **No local `types/` directories** — There must be no `types/` directory anywhere except `src/lib/types/`. No `src/lib/observability/types/`, no `src/lib/workflow/core/types/`, etc. Move those types into the canonical `src/lib/types/` folder.
12. **No type re-exports from non-type files** — Files outside `src/lib/types/` must not re-export types (`export type { X } from`). Consumers should import types from `src/lib/types/` directly. Module `index.ts` files should only re-export runtime values (classes, functions, constants), never types.

13. **Barrel-only imports for internal types** — Code outside `src/lib/types/` must import internal types from the barrel (`../types/index.js` or `../types`), never from specific type files (`../types/rag.js`, `../types/mcp.js`). External library types (`zod`, `@ai-sdk/provider`, etc.) can be imported normally. Files inside `src/lib/types/` are exempt (they import from each other).

**Enforcement:** All rules (2, 7-13) are enforced by custom ESLint rules in `eslint-rules/`. Run `pnpm run lint` (or the pre-commit hook) — no shell scripts, no regex heuristics, everything AST-based.

| Rule     | ESLint rule                              |
| -------- | ---------------------------------------- |
| 2        | `neurolink/no-local-type-alias`          |
| 7        | `neurolink/no-interface`                 |
| 8        | `neurolink/no-types-suffix-filename`     |
| 9        | `neurolink/unique-type-names`            |
| 10       | `neurolink/types-barrel-exports-only`    |
| 11 & 11b | `neurolink/no-local-types-folder`        |
| 12       | `neurolink/no-type-export-outside-types` |
| 13       | `neurolink/barrel-type-imports`          |

---

## Architecture

### Pattern: Factory + Registry

Every extensible system (providers, processors, chunkers, rerankers) follows the same pattern:

```
Factory  →  creates instances
Registry →  holds factory functions (via dynamic import)
```

- `ProviderFactory` + `ProviderRegistry` — AI providers
- `ProcessorRegistry` — file/multimodal processors
- `ChunkerFactory` + `ChunkerRegistry` — RAG chunking strategies
- `RerankerFactory` + `RerankerRegistry` — RAG rerankers

### Directory Map

```
src/
├── lib/
│   ├── neurolink.ts          # Main SDK entry point
│   ├── providers/            # 21+ AI provider implementations
│   ├── factories/            # ProviderFactory + ProviderRegistry
│   ├── core/                 # BaseProvider, constants, infrastructure
│   ├── adapters/             # Provider-specific content adapters (image, TTS, video)
│   ├── utils/                # MessageBuilder, FileDetector, transformations
│   ├── types/                # ALL type definitions (28+ files)
│   ├── mcp/                  # MCPToolRegistry, client factory, HTTP transport
│   ├── memory/               # Redis + in-memory conversation memory
│   ├── context/              # Context compaction, budget checking
│   ├── processors/           # File processors (17+ types)
│   ├── rag/                  # Chunkers, hybrid search, rerankers, pipeline
│   ├── evaluation/           # RAGAS-based evaluator (no unit tests yet)
│   ├── telemetry/            # OpenTelemetry + Langfuse observability
│   ├── workflow/             # Workflow engine with HITL and checkpointing
│   ├── server/               # Hono/Express/Fastify/Koa adapters
│   ├── config/               # Configuration management
│   └── models/               # Model definitions per provider
├── cli/
│   ├── index.ts              # CLI entry point
│   ├── factories/            # CommandFactory (yargs)
│   ├── commands/             # Individual command implementations
│   └── loop/                 # Interactive REPL session
└── test/
    ├── continuous-test-suite.ts              # Main orchestrator (pnpm test)
    ├── continuous-test-suite-<name>.ts       # Per-domain suites (auth, mcp, rag, ppt, …)
    └── fixtures/                             # CSVs, PDFs, PNG, JSON used by suites
```

### Message Flow

```
User input (text + files)
  → MessageBuilder (src/lib/utils/messageBuilder.ts)
  → FileDetector detects MIME types
  → ProcessorRegistry selects processor per file
  → ProviderImageAdapter formats for target provider
  → Provider sends to AI API
```

### Context Compaction Pipeline

`BudgetChecker` fires before every LLM call. If context exceeds 80% of the model window, `ContextCompactor` runs 4 stages:

1. Tool output pruning (protect recent 40K tokens)
2. File read deduplication
3. LLM summarization (9-section structured summary)
4. Sliding window truncation

### MCP Transport Protocols

| Transport   | Config key        | Use case                    |
| ----------- | ----------------- | --------------------------- |
| `stdio`     | `command`, `args` | Local server via subprocess |
| `http`      | `url`, `headers`  | Remote HTTP/Streamable HTTP |
| `sse`       | `url`, `headers`  | Server-Sent Events          |
| `websocket` | `url`, `headers`  | WebSocket connection        |

---

## Key Files

| File                                               | Purpose                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `src/lib/neurolink.ts`                             | Main SDK class — orchestrates everything                           |
| `src/lib/factories/providerRegistry.ts`            | Provider registration (use dynamic imports here)                   |
| `src/lib/core/baseProvider.ts`                     | Base class all providers extend; central `stream()` tool merge     |
| `src/lib/utils/messageBuilder.ts`                  | Constructs messages; handles all file types                        |
| `src/lib/adapters/providerImageAdapter.ts`         | Per-provider multimodal formatting + vision capability map         |
| `src/lib/adapters/tts/`                            | TTS provider handlers (Google TTS, Cartesia); new handlers go here |
| `src/lib/mcp/toolRegistry.ts`                      | Tool management + MCP server registry                              |
| `src/lib/mcp/mcpClientFactory.ts`                  | Creates MCP clients for all transport types                        |
| `src/lib/processors/registry/ProcessorRegistry.ts` | Selects file processor by MIME type + priority                     |
| `src/lib/types/index.ts`                           | Main type exports (start here for any type lookup)                 |
| `src/lib/types/providers.ts`                       | `AIProvider` interface, `AIProviderName` enum                      |
| `src/lib/types/mcp.ts`                             | `MCPTransportType` and MCP config types                            |
| `src/lib/constants/contextWindows.ts`              | Per-provider, per-model context window sizes                       |
| `src/lib/context/contextCompactor.ts`              | Multi-stage context reduction orchestrator                         |
| `src/lib/context/budgetChecker.ts`                 | Pre-call budget validation                                         |
| `src/lib/rag/ragIntegration.ts`                    | `prepareRAGTool()` — auto RAG setup for generate/stream            |
| `src/cli/factories/commandFactory.ts`              | All CLI command options and flag definitions                       |
| `src/lib/server/routes/agentRoutes.ts`             | HTTP server routes including `/api/agent/embed`                    |

---

## Development Commands

```bash
# Build
pnpm run build            # Full SDK + CLI build
pnpm run build:cli        # CLI only (faster iteration)
pnpm run build:complete   # Build + validation

# Type checking
pnpm run check            # Type check
pnpm run check:watch      # Watch mode

# Quality
pnpm run lint             # Check lint + format
pnpm run format           # Auto-format
pnpm run check:all        # All quality checks

# Testing (all suites run via tsx; there is no vitest runner despite vitest.config.ts existing)
pnpm test                 # Main suite (test/continuous-test-suite.ts)
pnpm run test:ci          # test + test:client
pnpm run test:client      # SDK client suite
pnpm run test:context     # Context compaction + file handling
pnpm run test:mcp         # MCP HTTP suite
pnpm run test:rag         # RAG suite
pnpm run test:providers   # Providers suite
pnpm run test:media       # Media generation suite
pnpm run test:memory      # Memory suite
pnpm run test:observability
pnpm run test:ppt
pnpm run test:servers
pnpm run test:tracing
pnpm run test:tts
pnpm run test:workflow
pnpm run test:credentials
pnpm run test:evaluation
pnpm run test:middleware

# Run a single suite directly
npx tsx test/continuous-test-suite-<name>.ts

# Environment
pnpm run env:validate     # Validate .env setup
pnpm run env:setup        # Interactive setup

# CLI smoke test
pnpm run build:cli && pnpm run cli <command>
```

**Workflow:** edit → `pnpm run check` → `pnpm run lint` → `pnpm test` → `pnpm run build`

---

## How-To Guides

### Adding a New Provider

1. Create `src/lib/providers/yourProvider.ts` — extend `BaseProvider`
2. Add name to `AIProviderName` enum in `src/lib/types/providers.ts`
3. Add model constants to `src/lib/models/`
4. Register in `ProviderRegistry.registerAllProviders()` using a dynamic import:

   ```typescript
   ProviderFactory.registerProvider(
     AIProviderName.YOUR_PROVIDER,
     async (modelName?, _providerName?, sdk?) => {
       const { YourProvider } = await import("../providers/yourProvider.js");
       return new YourProvider(modelName, sdk as NeuroLink | undefined);
     },
     YourModels.DEFAULT,
     ["alias1", "alias2"],
   );
   ```

5. If multimodal: add vision capabilities to `ProviderImageAdapter.VISION_CAPABILITIES`
6. Add to CLI provider choices in `src/cli/factories/commandFactory.ts`
7. Add tests to the most relevant `test/continuous-test-suite-*.ts` (e.g. `-providers.ts`), or create a new suite `test/continuous-test-suite-<name>.ts` and add a matching `test:<name>` script in `package.json`

### Adding a New File Processor

1. Create processor in the appropriate category under `src/lib/processors/`:
   - `document/` — Excel, Word, RTF, OpenDocument
   - `data/` — JSON, YAML, XML
   - `markup/` — HTML, SVG, Markdown, Text
   - `code/` — source code, config files
   - `media/` — video, audio
   - `archive/` — zip, tar, gz
2. Extend `BaseFileProcessor` and implement `canProcess()`, `process()`, `getInfo()`
3. Register in `ProcessorRegistry` with a priority (lower number = higher priority)
4. Add MIME type mappings in `src/lib/processors/config/mimeTypes.ts`
5. Add tests to the closest existing suite (e.g. `test/continuous-test-suite-context.ts` for file-handling, or `continuous-test-suite.ts` for CLI-level coverage). There is no dedicated `file-processor-test-suite.ts`.

### Modifying Message Building

1. Core logic: `src/lib/utils/messageBuilder.ts`
2. Provider formatting: `src/lib/adapters/` (add provider-specific adapter if needed)
3. Type changes: `src/lib/types/conversation.ts`
4. Ensure backward compatibility — existing message formats must still work

### Working with Embeddings

Four providers support embeddings natively: OpenAI, Google AI Studio, Google Vertex, Amazon Bedrock. All expose `embed()` / `embedMany()` on the provider interface. Unsupported providers throw descriptive errors.

Server endpoints: `POST /api/agent/embed` and `POST /api/agent/embed-many` in `src/lib/server/routes/agentRoutes.ts`.

### RAG Integration

**Simple path** — pass `rag` config directly to `generate()` or `stream()`:

```typescript
const result = await neurolink.generate({
  prompt: "What are the key features?",
  rag: {
    files: ["./docs/guide.md", "./docs/api.md"],
    strategy: "markdown", // auto-detected from extension if omitted
    chunkSize: 512, // default: 1000
    topK: 5, // default: 5
  },
});
```

CLI equivalent: `neurolink generate "query" --rag-files ./docs/guide.md --rag-strategy markdown`

NeuroLink creates a `search_knowledge_base` tool the model can call. For full control (custom vector stores, embeddings), use `createVectorQueryTool` from `src/lib/rag/retrieval/vectorQueryTool.ts` directly.

**Chunking strategies:** `character`, `recursive`, `sentence`, `token`, `markdown`, `html`, `json`, `latex`, `semantic`, `semantic-markdown`

**Rerankers:** `simple` (TF-IDF, no LLM), `llm`, `batch`, `cross-encoder` (stub), `cohere` (stub)

### Observability (Langfuse + OTEL)

NeuroLink initializes its own `TracerProvider` by default. If your app already has one, set `useExternalTracerProvider: true` to avoid duplicate registration errors, then add NeuroLink's span processors via `getSpanProcessors()` to your OTEL SDK setup.

Use `setLangfuseContext({ userId, sessionId, conversationId, ... }, callback)` to attach context to traces. Trace names default to `userId:operationName`; customize with `traceNameFormat`.

Key exports: `getSpanProcessors`, `setLangfuseContext`, `getLangfuseContext`, `getTracer`, `createContextEnricher`, `isUsingExternalTracerProvider`.

### Thinking Level

Supported by Anthropic Claude, Gemini 2.5+, Gemini 3:

```typescript
await neurolink.generate({ prompt: "...", thinkingLevel: "high" });
// CLI: neurolink generate "..." --thinking-level high
```

Levels: `minimal` | `low` | `medium` (default) | `high`

### Per-Request Credentials

Pass provider credentials at instance level or per-call. Per-call wins over instance, instance wins over env vars.

```typescript
// Instance-level default
const nl = new NeuroLink({
  credentials: { openai: { apiKey: "sk-..." } },
});

// Per-call override
await nl.generate({
  input: { text: "hello" },
  provider: "openai",
  credentials: { openai: { apiKey: "sk-user-key" } },
});
```

Credentials flow through the factory chain (`neurolink.ts` → `core/factory.ts` → `providerFactory.ts` → `providerRegistry.ts` → provider constructor). Each provider's constructor accepts a provider-scoped slice (e.g. `{ apiKey }` for OpenAI, `{ accessKeyId, secretAccessKey }` for Bedrock, `{ projectId, serviceAccountKey }` for Vertex).

CLI-only usage still relies on env vars — credentials field is excluded from `textGenerationOptionsSchema` to avoid shell-history leaks.

See `docs/features/per-request-credentials.md` for the full provider reference.

---

## Common Patterns

### Error Handling

- Use `ErrorFactory` for typed errors
- Wrap async calls with `withTimeout` utility
- `formatProviderError` must **return** errors, never throw

### Tool Transformations

- `transformToolExecutions()` — convert tool results for providers
- `transformAvailableTools()` — format tools for AI model calls
- `transformParamsForLogging()` — safely strip secrets before logging

### Memory

- Development: in-memory store
- Production: Redis (set `REDIS_URL`)
- Long conversations auto-compact via `SummarizationEngine` + `BudgetChecker`

### Streaming Tool Injection

`BaseProvider.stream()` merges base tools (MCP/built-in) with user-provided tools before calling provider-specific `executeStream()`. Individual providers use `options.tools || await this.getAllTools()` as fallback. This is the canonical pattern — do not bypass it.

### Logger Guard

Always wrap expensive serialization with `logger.shouldLog("debug")` before calling it.

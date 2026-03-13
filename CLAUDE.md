# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeuroLink is an enterprise AI development platform that provides unified access to 12+ AI providers (OpenAI, Anthropic, Google AI Studio, AWS Bedrock, Azure, Vertex, Mistral, LiteLLM, SageMaker, Hugging Face, Ollama, and OpenAI-compatible endpoints) through a single consistent API. It ships as both a TypeScript SDK and a professional CLI (`@juspay/neurolink`).

Key characteristics: factory architecture with provider registry pattern, comprehensive multimodal support (50+ file types), full MCP integration with 58+ external servers (stdio, HTTP, SSE, WebSocket transports), production-ready enterprise features (Redis memory, failover, telemetry).

## Requirements

- **Node.js** >=20.18.1, **pnpm** >=8.0.0
- **ffmpeg** (optional) - required for media file processing (video/audio metadata extraction)
- Run `svelte-kit sync` before first build (generates TypeScript configs)

## Essential Development Commands

```bash
# Building
pnpm run build              # Full build (SDK + CLI)
pnpm run build:cli          # CLI only (rapid iteration)
pnpm run build:complete     # Full pipeline with validation

# Testing (Vitest)
pnpm test                   # Run all tests
pnpm run test:watch         # Watch mode
pnpm run test:coverage      # Coverage report
pnpm run test:providers     # Provider unit tests
pnpm run test:cli           # CLI integration tests
pnpm run test:sdk           # SDK unit tests
pnpm run test:integration   # Integration tests
pnpm run test:e2e           # End-to-end tests
pnpm run test:ci            # CI mode (coverage + reporters)
vitest run path/to/test.ts  # Run a single test file

# Linting and Formatting
pnpm run lint               # Prettier check + ESLint
pnpm run format             # Auto-format with Prettier
pnpm run check              # TypeScript type checking (svelte-check + tsc --noEmit --strict)
pnpm run check:all          # lint + format check + validate + commit validation

# Validation (run before PR)
pnpm run validate:all       # Build rules + env + security validation
pnpm run validate:security  # Security checks only

# Environment
pnpm run env:validate       # Validate environment setup
pnpm run setup:complete     # Full setup with project organization + validation
```

## Code Quality Tooling

**Three tools** handle code quality with distinct roles:

| Tool         | Role                    | Config                        |
| ------------ | ----------------------- | ----------------------------- |
| **Biome**    | Formatter + linter      | `biome.json` (v2.1.4)         |
| **ESLint**   | TypeScript linting (CI) | `eslint.config.js` (v9 flat)  |
| **Prettier** | Formatting (CI check)   | `package.json` prettier field |

**Biome settings:** 2-space indent, 120 line width, double quotes, semicolons always, trailing commas, organize imports on save.

**ESLint enforced rules (src/):**

- `@typescript-eslint/no-explicit-any`: **error** (warn in test/)
- `@typescript-eslint/no-unused-vars`: **error** (prefix `_` to ignore)
- `max-depth`: 6, `max-params`: 6, `max-lines-per-function`: 300 (warn)
- `no-eval`, `no-implied-eval`: **error**
- `no-console`: error except `warn`, `error`, `info` (off in test/)
- **CI max-warnings:** 300 for `src/`, 10 for `test/`

**Pre-commit hooks** (Husky + lint-staged): formatting and linting run automatically on staged files.

## Testing Configuration

Vitest with Node.js environment. Setup file: `test/setup.ts` (global AI provider mocks).

- **Timeout:** 30s per test, **max concurrency:** 10
- **Mock strategy:** `clearMocks: true` (NOT `resetMocks` - resetMocks breaks `vi.mock()` implementations by returning undefined)
- **Path aliases:** `@` → `./src`, `@test` → `./test`, `@mocks` → `./test/mocks`
- **Coverage thresholds:** SDK (`src/lib/`) 90%, CLI (`src/cli/`) 85%, Global 85%

**Test directory structure:**

```
test/
├── setup.ts              # Global test setup with AI provider mocks
├── suites/               # Feature-specific test suites
├── integration/cli/      # CLI integration tests
├── sdk/                  # SDK unit tests
├── rag/                  # RAG tests
├── adapters/             # Adapter tests
├── server/               # Server tests
└── fixtures/             # Test data
```

## High-Level Architecture

### Core Architecture Pattern: Factory + Registry

NeuroLink uses a **factory pattern with dynamic provider registration** to avoid circular dependencies and enable lazy loading:

1. **ProviderFactory** (`src/lib/factories/providerFactory.ts`) - Central factory for creating provider instances
2. **ProviderRegistry** (`src/lib/factories/providerRegistry.ts`) - Registers all providers with factory functions using dynamic imports
3. **NeuroLink** (`src/lib/neurolink.ts`) - Main SDK class that orchestrates providers, tools, and memory

**Critical design decision:** All providers are loaded via dynamic imports to break circular dependency chains. Never use static imports for providers in the registry.

### Directory Structure

```
src/
├── lib/                    # Core SDK implementation
│   ├── neurolink.ts       # Main SDK entry point (very large file ~277KB)
│   ├── providers/         # AI provider implementations (13 providers)
│   ├── factories/         # Provider factory and registry
│   ├── adapters/          # Provider-specific adapters (image, PDF, etc.)
│   ├── utils/             # Utilities (messageBuilder, transformations, etc.)
│   ├── types/             # TypeScript type definitions (28+ type files)
│   ├── mcp/              # MCP tool registry, ToolRouter, ToolCache, RequestBatcher
│   ├── memory/           # Conversation memory (Redis, in-memory)
│   ├── context/          # Context compaction, budget management, file summarization
│   ├── middleware/       # Request/response middleware system
│   ├── core/             # Core factory, constants, baseProvider
│   │   └── infrastructure/ # Base factories, registries, errors
│   ├── config/           # Configuration management
│   ├── processors/       # I/O file processors (17+ types, ProcessorRegistry)
│   ├── rag/              # RAG pipeline (chunkers, rerankers, hybrid search)
│   ├── telemetry/        # Observability (Langfuse, OpenTelemetry)
│   ├── workflow/         # Workflow engine (fluent API, checkpointing, HITL)
│   ├── evaluation/       # RAGAS-based evaluation/scoring (0 test coverage)
│   ├── tts/              # Text-to-speech (TTSProcessor, Google TTS handler)
│   ├── agent/            # Agent implementations
│   ├── image-gen/        # Image generation
│   ├── proxy/            # Proxy support
│   ├── server/           # Server adapters (Hono, Express, Fastify, Koa)
│   ├── session/          # Session management
│   ├── services/         # Service layer
│   ├── hitl/             # Human-in-the-loop workflows
│   └── models/           # Model definitions and utilities
├── cli/                   # CLI implementation
│   ├── factories/        # Command factories (yargs modules)
│   ├── commands/         # CLI command implementations
│   ├── loop/             # Interactive REPL session
│   └── utils/            # CLI-specific utilities
└── test/                  # Test suites
```

### Provider System Architecture

**Provider Implementation Pattern:**

1. Each provider extends a base provider or implements the provider interface
2. Providers are registered in `ProviderRegistry.registerAllProviders()` with:
   - Provider name (from `AIProviderName` enum)
   - Factory function (async, uses dynamic import)
   - Default model
   - Aliases (e.g., "gpt", "chatgpt" for OpenAI)

**Example provider registration:**

```typescript
ProviderFactory.registerProvider(
  AIProviderName.GOOGLE_AI,
  async (modelName?, _providerName?, sdk?) => {
    const { GoogleAIStudioProvider } =
      await import("../providers/googleAiStudio.js");
    return new GoogleAIStudioProvider(modelName, sdk as NeuroLink | undefined);
  },
  GoogleAIModels.GEMINI_2_5_FLASH,
  ["googleAiStudio", "google", "gemini", "google-ai"],
);
```

**Key provider files:**

- `src/lib/providers/openAI.ts` - OpenAI integration
- `src/lib/providers/anthropic.ts` - Anthropic Claude
- `src/lib/providers/googleAiStudio.ts` - Google AI Studio (Gemini 2.x and Gemini 3)
- `src/lib/providers/googleVertex.ts` - Google Vertex AI
- `src/lib/providers/amazonBedrock.ts` - AWS Bedrock
- `src/lib/providers/azureOpenai.ts` - Azure OpenAI
- `src/lib/providers/mistral.ts` - Mistral AI
- `src/lib/providers/litellm.ts` - LiteLLM proxy (100+ models)
- `src/lib/providers/amazonSagemaker.ts` - AWS SageMaker
- `src/lib/providers/ollama.ts` - Ollama (local models)
- `src/lib/providers/huggingFace.ts` - Hugging Face

### Message Building and Multimodal Support

**MessageBuilder** (`src/lib/utils/messageBuilder.ts`) is the central component for constructing messages:

- Handles text, images, PDFs, CSV, and 17+ file types via ProcessorRegistry
- Converts between different message formats (NeuroLink → CoreMessage for ai SDK)
- Integrates with `FileDetector` to automatically detect file types
- Uses `ProviderImageAdapter` for provider-specific image formatting
- Processes PDFs with `PDFProcessor` for native document support
- Delegates to specialized file processors for documents, data, markup, and code files

**Flow:**

1. User provides input (text + files)
2. `MessageBuilder` detects file types via `FileDetector`
3. `ProcessorRegistry` selects appropriate processor based on MIME type and priority
4. Files are processed (images → base64, PDFs → structured content, documents → extracted text)
5. Provider-specific adapters format content for each provider's API
6. Messages are sent to the AI provider

**Key files:**

- `src/lib/utils/messageBuilder.ts` - Message construction
- `src/lib/adapters/providerImageAdapter.ts` - Provider-specific image formatting
- `src/lib/utils/fileDetector.ts` - File type detection
- `src/lib/utils/pdfProcessor.ts` - PDF processing
- `src/lib/utils/imageProcessor.ts` - Image processing
- `src/lib/processors/registry/` - ProcessorRegistry for file processor selection
- `src/lib/processors/base/` - BaseFileProcessor abstract class

### Tool System (MCP Integration)

**MCPToolRegistry** (`src/lib/mcp/toolRegistry.ts`) manages all tools:

- Built-in tools (getCurrentTime, readFile, writeFile, listDirectory, calculateMath, websearchGrounding)
- External MCP servers (GitHub, PostgreSQL, Google Drive, etc.)
- Custom tools defined by users

**MCP Transport Protocols:**

NeuroLink supports multiple transport protocols for MCP servers:

| Transport     | Use Case                                | Configuration                  |
| ------------- | --------------------------------------- | ------------------------------ |
| **stdio**     | Local MCP servers via command execution | `command`, `args`, `env`       |
| **http**      | Remote HTTP/Streamable HTTP servers     | `url`, `headers`, HTTP options |
| **sse**       | Server-Sent Events connections          | `url`, `headers`               |
| **websocket** | WebSocket connections                   | `url`, `headers`               |

**HTTP Transport Features:**

- URL-based server configuration (vs command-based for stdio)
- Authentication via custom headers (Bearer tokens, API keys)
- HTTP options: `timeout`, `retries`, `healthCheckInterval`
- Rate limiting with configurable limits
- Automatic retry with exponential backoff
- Session management via `Mcp-Session-Id` header

**Example configurations:**

```typescript
// stdio transport (local server)
await neurolink.addExternalMCPServer("github", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  transport: "stdio",
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
});

// HTTP transport (remote server)
await neurolink.addExternalMCPServer("github-copilot", {
  transport: "http",
  url: "https://api.githubcopilot.com/mcp",
  headers: { Authorization: "Bearer YOUR_TOKEN" },
  timeout: 15000,
  retries: 5,
});
```

**Tool execution flow:**

1. Tools registered with MCPToolRegistry
2. Available tools transformed to provider-specific format
3. AI model calls tools during generation
4. Tool results sent back to AI for continued reasoning

**Key files:**

- `src/lib/mcp/toolRegistry.ts` - Tool registry
- `src/lib/mcp/mcpClientFactory.ts` - MCP client creation for all transports
- `src/lib/mcp/externalServerManager.ts` - External server lifecycle management
- `src/lib/mcp/httpRetryHandler.ts` - HTTP retry with exponential backoff
- `src/lib/mcp/httpRateLimiter.ts` - Rate limiting for HTTP transport
- `src/lib/utils/transformationUtils.ts` - Tool format transformations
- `src/lib/types/mcpTypes.ts` - MCP type definitions (includes `MCPTransportType`)
- `src/lib/types/externalMcp.ts` - External MCP server types
- `src/lib/types/tools.ts` - Tool type definitions

### MCP Enhancement Modules

NeuroLink includes 14 MCP enhancement modules that extend the core MCP infrastructure:

| Module                | File                                            | Purpose                                    |
| --------------------- | ----------------------------------------------- | ------------------------------------------ |
| ToolRouter            | `src/lib/mcp/routing/toolRouter.ts`             | Multi-server routing (6 strategies)        |
| ToolResultCache       | `src/lib/mcp/caching/toolCache.ts`              | LRU/FIFO/LFU caching with TTL              |
| RequestBatcher        | `src/lib/mcp/batching/requestBatcher.ts`        | Automatic request batching                 |
| Tool Annotations      | `src/lib/mcp/toolAnnotations.ts`                | Auto-infer safety metadata                 |
| ToolIntegration       | `src/lib/mcp/toolIntegration.ts`                | Middleware chain (logging, retry, timeout) |
| EnhancedToolDiscovery | `src/lib/mcp/enhancedToolDiscovery.ts`          | Search/filter tools                        |
| MCPServerBase         | `src/lib/mcp/mcpServerBase.ts`                  | Abstract base for custom servers           |
| AgentExposure         | `src/lib/mcp/agentExposure.ts`                  | Expose agents as MCP tools                 |
| ServerCapabilities    | `src/lib/mcp/serverCapabilities.ts`             | Resource/prompt management                 |
| ToolConverter         | `src/lib/mcp/toolConverter.ts`                  | NeuroLink ↔ MCP format conversion          |
| MCPRegistryClient     | `src/lib/mcp/mcpRegistryClient.ts`              | Registry search/discovery                  |
| MultiServerManager    | `src/lib/mcp/multiServerManager.ts`             | Load balancing and failover                |
| ElicitationManager    | `src/lib/mcp/elicitation/elicitationManager.ts` | Interactive user input                     |
| ElicitationProtocol   | `src/lib/mcp/elicitationProtocol.ts`            | Wire protocol for elicitation              |

**SDK Configuration** via `NeurolinkConstructorConfig.mcp`:

- `cache.enabled` (default: false) — Tool result caching
- `annotations.autoInfer` (default: true) — Auto-infer safety hints from tool names
- `router` — Lazy-initialized when 2+ external servers exist
- `batcher.enabled` (default: false) — Request batching
- `discovery.enabled` (default: true) — Enhanced tool discovery
- `middleware` (default: []) — Composable middleware chain

**Architecture**: `ToolsManager` routes custom tool execution through `NeuroLink.executeTool()` (not direct `toolInfo.execute()`), so cache/middleware/annotations apply automatically during `generate()`/`stream()`.

### Type System

NeuroLink has a comprehensive TypeScript type system with 28+ type definition files:

**Critical type files:**

- `src/lib/types/index.ts` - Main type exports
- `src/lib/types/providers.ts` - Provider types
- `src/lib/types/generateTypes.ts` - Generate operation types
- `src/lib/types/streamTypes.ts` - Streaming operation types
- `src/lib/types/mcpTypes.ts` - MCP integration types
- `src/lib/types/conversation.ts` - Conversation and memory types
- `src/lib/types/tools.ts` - Tool definition types
- `src/lib/types/common.ts` - Shared common types

**Type organization principle:** Types are organized by domain (providers, generation, streaming, MCP, etc.) to avoid circular dependencies.

### CLI Architecture

**CommandFactory Pattern** (`src/cli/factories/commandFactory.ts`):

- Creates yargs command modules
- Handles common options (provider, model, temperature, etc.)
- Integrates with global session state for loop mode
- Supports multimodal inputs (--image, --pdf, --csv flags)

**Loop Mode** (`src/cli/loop/session.ts`):

- Interactive REPL-style session
- Persistent conversation memory
- Session-wide configuration (set provider, set temperature, etc.)
- Command history and context preservation

**MCP CLI Subcommands** (`src/cli/commands/mcp.ts`):

12 MCP subcommands: list, servers, tools, discover, create-server, annotate, install, add, test, exec, remove, registry

**Key CLI files:**

- `src/cli/index.ts` - CLI entry point
- `src/cli/factories/commandFactory.ts` - Command creation
- `src/cli/commands/` - Individual command implementations
- `src/cli/loop/session.ts` - Interactive loop session

### Build System

**Dual Build Process:**

1. **SDK Build** (Vite + SvelteKit): `vite build` → `svelte-kit sync` → `svelte-package` → `publint`
2. **CLI Build** (TypeScript): `tsc --project tsconfig.cli.json` → `dist/cli/`

Two tsconfig files: `tsconfig.json` (main, extends SvelteKit) and `tsconfig.cli.json` (NodeNext module resolution). Path aliases: `$lib`, `$lib/*`.

### Provider System Architecture

Providers are registered in `ProviderRegistry.registerAllProviders()` with: provider name (from `AIProviderName` enum), async factory function (dynamic import), default model, and aliases. Example: `["googleAiStudio", "google", "gemini", "google-ai"]` all resolve to Google AI Studio.

**Provider files:** `src/lib/providers/` contains `openAI.ts`, `anthropic.ts`, `googleAiStudio.ts`, `googleVertex.ts`, `amazonBedrock.ts`, `azureOpenai.ts`, `mistral.ts`, `litellm.ts`, `amazonSagemaker.ts`, `ollama.ts`, `huggingFace.ts`.

### Message Building and Multimodal Support

**MessageBuilder** (`src/lib/utils/messageBuilder.ts`) is the central message construction component. Flow: user input → `FileDetector` detects types → `ProcessorRegistry` selects processor by MIME type → files processed (images→base64, PDFs→structured content, docs→extracted text) → `ProviderImageAdapter` formats for provider API → messages sent.

**Key files:** `messageBuilder.ts`, `providerImageAdapter.ts`, `fileDetector.ts`, `pdfProcessor.ts`, `imageProcessor.ts`, `src/lib/processors/registry/`, `src/lib/processors/base/`.

### File Processor System

Processors organized by category in `src/lib/processors/`:

- **document/** - Excel, Word, RTF, OpenDocument
- **data/** - JSON, YAML, XML (auto-validates and formats)
- **markup/** - HTML (OWASP-sanitized), SVG (sanitized text, not binary), Markdown, Text
- **code/** - 50+ languages via SourceCodeProcessor, config files via ConfigProcessor
- **media/** - Video/Audio metadata extraction via `music-metadata` (structured text, not binary)
- **archive/** - ZIP/TAR contents listing with ZIP bomb detection and path traversal prevention

To add a new processor: extend `BaseFileProcessor`, implement `canProcess()`/`process()`/`getInfo()`, register in `ProcessorRegistry` with priority, add MIME mappings in `src/lib/processors/config/mimeTypes.ts`.

### Tool System (MCP Integration)

**MCPToolRegistry** (`src/lib/mcp/toolRegistry.ts`) manages built-in tools, external MCP servers, and custom tools. Four transport protocols: stdio (local), HTTP (remote with retry/rate-limiting), SSE, WebSocket. HTTP transport supports auth headers, configurable timeout/retries, session management via `Mcp-Session-Id`.

**Key files:** `toolRegistry.ts`, `mcpClientFactory.ts`, `externalServerManager.ts`, `httpRetryHandler.ts`, `httpRateLimiter.ts`.

### Context Compaction System

**ContextCompactor** (`src/lib/context/contextCompactor.ts`) manages context window size through 4 stages: tool output pruning → file read deduplication → LLM summarization → sliding window truncation. **BudgetChecker** triggers auto-compaction when usage exceeds 80% of model's context window.

**Key files:** `contextWindows.ts` (per-provider window sizes), `budgetChecker.ts`, `contextCompactor.ts`, `errorDetection.ts`, `effectiveHistory.ts`, `fileTokenBudget.ts`, `fileSummarizer.ts`, `tokenEstimation.ts`.

### RAG Processing

Factory + Registry pattern: 10 chunking strategies via `ChunkerFactory` (character, recursive, sentence, token, markdown, html, json, latex, semantic, semantic-markdown), 5 reranker types via `RerankerFactory` (simple, llm, batch, cross-encoder, cohere), hybrid search combining BM25 + vector similarity with RRF or linear fusion.

**Simplified API:** Pass `rag: { files: [...] }` to `generate()`/`stream()` for automatic pipeline. CLI: `--rag-files`, `--rag-strategy`, `--rag-chunk-size`, `--rag-top-k`. Advanced: use `createVectorQueryTool` directly.

**Key files:** `src/lib/rag/` - `ChunkerFactory.ts`, `ChunkerRegistry.ts`, `reranker/RerankerFactory.ts`, `retrieval/hybridSearch.ts`, `ragIntegration.ts`, `pipeline/RAGPipeline.ts`.

### Observability

External OpenTelemetry integration via `useExternalTracerProvider`/`autoDetectExternalProvider`. Key exports: `getSpanProcessors()`, `setLangfuseContext()`, `getLangfuseContext()`, `getTracer()`. Context fields: `userId`, `sessionId`, `conversationId`, `requestId`, `traceName`, `metadata`. Operation name auto-detection from Vercel AI SDK spans. See `src/lib/telemetry/`.

### CLI Architecture

**CommandFactory** (`src/cli/factories/commandFactory.ts`) creates yargs command modules with common options (provider, model, temperature, etc.) and multimodal input flags (`--image`, `--pdf`, `--csv`, `--file`). **Loop Mode** (`src/cli/loop/session.ts`) provides interactive REPL with persistent memory and session-wide configuration.

## Working with Providers

### Adding a New Provider

1. Create provider file in `src/lib/providers/yourProvider.ts`
2. Implement provider interface (extend base provider)
3. Register in `ProviderRegistry.registerAllProviders()` using dynamic import
4. Add provider name to `AIProviderName` enum in `src/lib/types/index.ts`
5. Add model definitions to appropriate model enum
6. Update vision capabilities in `src/lib/adapters/providerImageAdapter.ts` if multimodal
7. Add to CLI choices in `src/cli/factories/commandFactory.ts`
8. Add tests in `test/suites/` and `test/integration/`

### Modifying Message Building

1. Modify `src/lib/utils/messageBuilder.ts` for core logic
2. Update adapters in `src/lib/adapters/` for provider-specific formatting
3. Ensure backward compatibility with existing message formats
4. Add tests for new message types
5. Update type definitions in `src/lib/types/conversation.ts`

### Embeddings

Providers expose `embed()` and `embedMany()` methods for generating vector embeddings. The `AIProvider` type interface includes both methods; unsupported providers throw descriptive errors.

**Supported providers and defaults:**

| Provider         | Default Model                  | Env Override                |
| ---------------- | ------------------------------ | --------------------------- |
| OpenAI           | `text-embedding-3-small`       | —                           |
| Google AI Studio | `gemini-embedding-001`         | `GOOGLE_AI_EMBEDDING_MODEL` |
| Google Vertex    | `text-embedding-004`           | `VERTEX_EMBEDDING_MODEL`    |
| Amazon Bedrock   | `amazon.titan-embed-text-v2:0` | —                           |

**Server routes:** `POST /api/agent/embed` (single) and `POST /api/agent/embed-many` (batch) in `src/lib/server/routes/agentRoutes.ts`.

**Key files:**

- `src/lib/core/baseProvider.ts` — Base `embed()` / `embedMany()` stubs
- `src/lib/types/providers.ts` — `AIProvider` type with embedding methods
- `src/lib/server/routes/agentRoutes.ts` — Server embedding endpoints
- `src/lib/server/utils/validation.ts` — `EmbedRequestSchema` / `EmbedManyRequestSchema`
- `src/lib/server/types.ts` — `EmbedRequest`, `EmbedResponse`, `EmbedManyRequest`, `EmbedManyResponse`

### Working with Multimodal Content

**For images:**

- Add to `ProviderImageAdapter.VISION_CAPABILITIES` if new model supports vision
- Update `ProviderImageAdapter.adaptImageForProvider()` for provider-specific formatting
- Test with `--image` flag in CLI

**For PDFs:**

- Modify `PDFProcessor` (`src/lib/utils/pdfProcessor.ts`) for processing logic
- Update provider-specific handling in message builder
- Currently supported: Vertex AI, Anthropic, Bedrock, AI Studio

**For CSV:**

- Modify `FileDetector` for CSV detection
- Update message builder to handle CSV content
- Test with `--csv` flag in CLI

**For Documents (Excel, Word, RTF, OpenDocument):**

- Processors in `src/lib/processors/document/`
- `ExcelProcessor` - Handles `.xlsx`, `.xls` files with sheet extraction
- `WordProcessor` - Handles `.docx` files with text extraction
- `RtfProcessor` - Handles `.rtf` files
- `OpenDocumentProcessor` - Handles `.odt`, `.ods`, `.odp` files
- Test with `--file` flag in CLI

**For Data Files (JSON, YAML, XML):**

- Processors in `src/lib/processors/data/`
- Auto-validates and formats data for AI consumption
- Supports syntax highlighting in prompts
- Test with `--file` flag in CLI

**For Markup (HTML, SVG, Markdown, Text):**

- Processors in `src/lib/processors/markup/`
- `SvgProcessor` - Sanitizes SVG and injects as text (not binary image)
- `HtmlProcessor` - OWASP-compliant HTML sanitization
- `MarkdownProcessor` - Preserves formatting
- `TextProcessor` - Plain text handling
- Test with `--file` flag in CLI

**For Source Code (50+ languages):**

- Processors in `src/lib/processors/code/`
- `SourceCodeProcessor` - Handles `.ts`, `.js`, `.py`, `.java`, `.go`, etc.
- `ConfigProcessor` - Handles `.env`, `.ini`, `.toml`, `.cfg` files
- Auto-detects language from extension
- Adds syntax metadata for AI context
- Test with `--file` flag in CLI

**For Video (.mp4, .mkv, .webm, .avi, .mov, .m4v):**

- Processor in `src/lib/processors/media/VideoProcessor.ts`
- Extracts metadata via `music-metadata`: duration, resolution, codec, frame rate, bitrate
- Returns structured text (~50-200 tokens), not binary data
- Test with `--file` flag in CLI

**For Audio (.mp3, .wav, .ogg, .flac, .aac, .m4a, .wma):**

- Processor in `src/lib/processors/media/AudioProcessor.ts`
- Extracts metadata via `music-metadata`: codec, bitrate, sample rate, channels, duration
- Returns structured text (~50-150 tokens), not binary data
- Test with `--file` flag in CLI

**For Archives (.zip, .tar, .gz, .tar.gz, .tgz):**

- Processor in `src/lib/processors/archive/ArchiveProcessor.ts`
- Lists archive contents with file sizes
- Optionally extracts text from contained files via existing processors
- Security: ZIP bomb detection, path traversal prevention, entry count limits
- Test with `--file` flag in CLI

**Adding a New File Processor:**

1. Create processor class extending `BaseFileProcessor` in appropriate category folder
2. Implement `canProcess()`, `process()`, and `getInfo()` methods
3. Register in `ProcessorRegistry` with priority (lower = higher priority)
4. Add MIME type mappings in `src/lib/processors/config/mimeTypes.ts`
5. Update `FileDetector` if new file type detection needed
6. Add tests in `test/file-processor-test-suite.ts`

## Testing Strategy

**Test organization:**

- `test/suites/` - Feature-specific test suites (tool discovery, business tools, file operations, consistency)
- `test/integration/` - Integration tests with real providers
- Vitest as test runner

**Running specific tests:**

```bash
vitest run test/suites/tool-discovery.test.ts
vitest run test/integration/openai.test.ts
```

**Test best practices:**

- Mock external API calls for unit tests
- Use real API calls sparingly in integration tests
- Test provider consistency across all providers
- Validate multimodal content handling

## Common Patterns

- **Error handling:** Use `ErrorFactory` for typed errors, `withTimeout` for async operations, graceful degradation with provider fallback
- **Transformations:** `transformToolExecutions()`, `transformAvailableTools()`, `transformParamsForLogging()`
- **Configuration:** Environment variables from `.env` (see `.env.example` for 200+ options), validated with `env:validate`, config manager in `src/cli/commands/config.ts`
- **Thinking levels:** `thinkingLevel` option (`minimal`/`low`/`medium`/`high`) for Anthropic Claude, Gemini 2.5+. SDK: `thinkingLevel: "high"` in generate options. CLI: `--thinking-level high`
- **Memory:** Redis (production), in-memory (development), token-based context compaction via SummarizationEngine and BudgetChecker
- **Type organization:** Types organized by domain in `src/lib/types/` (providers, generation, streaming, MCP, conversation, tools, common) to avoid circular dependencies

## Important Constraints

1. **No Circular Dependencies:** All providers use dynamic imports in registry
2. **Type Safety:** Strict TypeScript (`--strict`), `no-explicit-any` is an error in `src/`
3. **Provider Consistency:** All providers must support the same core interface
4. **Backward Compatibility:** SDK changes must maintain existing API
5. **Environment Isolation:** CLI and SDK have separate concerns (CLI can use manual MCP, SDK cannot)
6. **Gemini Tool + JSON Schema Limitation:** Gemini models cannot use tools and JSON schema output simultaneously. Design workflows for either tools OR structured JSON output, not both
7. **ESLint Warning Budgets:** CI enforces max 300 warnings for `src/`, 10 for `test/`

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on PRs to `release` branch:

1. Install dependencies + ffmpeg + SvelteKit sync
2. Format check (`prettier --check`)
3. ESLint with warning limits (300 src, 10 test)
4. Security & environment validation (`validate:all`)
5. Build SDK + CLI
6. Quality gate: TypeScript strict check, commit message validation, security validation

## Key Files to Know

| File                                               | Purpose                                                   |
| -------------------------------------------------- | --------------------------------------------------------- |
| `src/lib/neurolink.ts`                             | Main SDK class, orchestrates everything                   |
| `src/lib/factories/providerRegistry.ts`            | Provider registration with dynamic imports                |
| `src/lib/utils/messageBuilder.ts`                  | Central message construction logic                        |
| `src/lib/adapters/providerImageAdapter.ts`         | Multimodal content adaptation                             |
| `src/lib/mcp/toolRegistry.ts`                      | Tool management and MCP integration                       |
| `src/lib/mcp/mcpClientFactory.ts`                  | MCP client creation for all transports                    |
| `src/lib/mcp/externalServerManager.ts`             | External MCP server lifecycle management                  |
| `src/lib/core/modules/ToolsManager.ts`             | Custom tool execution routing for MCP enhancement support |
| `src/lib/processors/index.ts`                      | I/O Processor exports (pipeline, registry)                |
| `src/lib/processors/registry/ProcessorRegistry.ts` | ProcessorRegistry for processor management                |
| `src/cli/factories/commandFactory.ts`              | CLI command creation                                      |
| `src/lib/types/index.ts`                           | Main type definitions and exports                         |
| `src/lib/types/externalMcp.ts`                     | External MCP server types (HTTP config, etc.)             |
| `src/lib/constants/contextWindows.ts`              | Per-provider context window registry                      |
| `src/lib/context/contextCompactor.ts`              | Multi-stage context compaction orchestrator               |
| `src/lib/context/budgetChecker.ts`                 | Pre-generation context budget validation                  |
| `src/lib/context/errorDetection.ts`                | Cross-provider context overflow detection                 |
| `src/lib/context/summarizationEngine.ts`           | Shared summarization engine for memory managers           |
| `src/lib/context/fileTokenBudget.ts`               | Aggregate file budget enforcement                         |
| `src/lib/context/fileSummarizer.ts`                | File content budget planning                              |
| `src/lib/context/fileSummarizationService.ts`      | LLM-based file summarization                              |
| `src/lib/utils/tokenEstimation.ts`                 | Token estimation with provider multipliers                |

## New set of Features

NeuroLink has been enhanced with new features beyond the core unified AI provider SDK.

### Implementation Status

| Feature                    | Status                    | Notes                                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gateway Provider**       | ✅ Complete               | 69+ providers, CLI support, full integration                                                                                                                                                                                                                   |
| **I/O Processors**         | ✅ Complete               | 52 files, 17+ file type processors, ProcessorRegistry, security sanitization                                                                                                                                                                                   |
| **Evaluation/Scoring**     | ⚠️ Code complete, 0 tests | RAGAS-based evaluator (~663 lines), ~5 scoring dimensions, CLI — no tests                                                                                                                                                                                      |
| **Observability**          | ✅ Complete               | 100% pattern compliance, 9 exporters, 9 samplers                                                                                                                                                                                                               |
| **Server Adapters**        | ✅ Complete               | 4 adapters (Hono, Express, Fastify, Koa), 5 route groups                                                                                                                                                                                                       |
| **RAG Processing**         | ✅ Complete               | 10 chunkers, hybrid search, RerankerFactory/Registry                                                                                                                                                                                                           |
| **MCP Enhancements**       | ✅ Complete               | 14 modules (~19K lines), 172+ test assertions (`pnpm vitest run test/mcp/`): ToolRouter, ToolCache, RequestBatcher, Annotations, Converter, Discovery, Elicitation, MultiServer, ServerBase, AgentExposure, Capabilities, RegistryClient, Integration, Factory |
| **Streaming Architecture** | ✅ Complete               | All 4 streaming patterns, 24 event types, backpressure                                                                                                                                                                                                         |
| **Dynamic Arguments**      | ✅ Complete               | CLI context flags, runtime resolution, 269 tests                                                                                                                                                                                                               |
| **Context Compaction**     | ✅ Complete               | 4-stage pipeline, BudgetChecker, file summarization                                                                                                                                                                                                            |
| **Workflow System**        | ✅ Complete               | Full engine with fluent API, checkpointing, HITL, 26 files (~20K lines)                                                                                                                                                                                        |
| **Basic TTS**              | ✅ Complete               | TTSProcessor (~398 lines), Google TTS handler, TTS in generate/stream paths                                                                                                                                                                                    |

### New Feature Directories

```
src/lib/processors/             # I/O processors
src/lib/context/                # Context compaction system
src/lib/rag/                    # RAG processing pipeline
src/lib/evaluation/             # Evaluation/scoring (0 tests)
src/lib/mcp/                    # MCP enhancements
src/lib/telemetry/              # Observability/telemetry
src/lib/workflow/               # Workflow engine (26 files, ~20K lines)
src/lib/utils/ttsProcessor.ts   # Basic TTS — TTSProcessor orchestrator
src/lib/adapters/tts/           # TTS provider handlers (googleTTSHandler.ts)
```

**Key Notes:**

- Type-safe implementations using TypeScript strict mode
- All implemented features integrate with existing Factory + Registry patterns
- Backward compatibility with existing SDK APIs maintained
- Evaluation/Scoring has 11 source files (1,822 lines) with zero test coverage — tests planned

## Documentation

- Full documentation in `docs/` directory
- README.md has comprehensive feature overview
- Each major feature has dedicated guide in `docs/features/`
- API reference in `docs/sdk/api-reference.md`
- CLI reference in `docs/cli/commands.md`

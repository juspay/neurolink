# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeuroLink is an enterprise AI development platform that provides unified access to 12+ AI providers (OpenAI, Anthropic, Google AI Studio, AWS Bedrock, Azure, Vertex, Mistral, LiteLLM, SageMaker, Hugging Face, Ollama, and OpenAI-compatible endpoints) through a single consistent API. It ships as both a TypeScript SDK and a professional CLI.

**Key characteristics:**

- Extracted from production systems at Juspay
- Battle-tested at enterprise scale
- Opinionated factory architecture with provider registry pattern
- Comprehensive multimodal support (text, images, PDFs, CSV, Excel, Word, RTF, JSON, YAML, XML, HTML, SVG, Markdown, video, audio, archives, 50+ code languages)
- Full MCP (Model Context Protocol) integration with 58+ external servers
- Multiple MCP transports: stdio (local), HTTP/Streamable HTTP (remote), SSE, WebSocket
- Production-ready enterprise features (Redis memory, failover, telemetry)

## Essential Development Commands

### Building

```bash
# Full build (SDK + CLI)
pnpm run build

# CLI only (for rapid testing)
pnpm run build:cli

# Complete build pipeline with validation
pnpm run build:complete
```

### Testing

```bash
# Run all tests (once)
pnpm test

# Watch mode
pnpm run test:watch

# Coverage report
pnpm run test:coverage

# Run specific test subsets
pnpm run test:providers        # Provider unit tests
pnpm run test:cli              # CLI integration tests
pnpm run test:sdk              # SDK unit tests
pnpm run test:integration      # Integration tests only
pnpm run test:e2e              # End-to-end tests

# CI mode (coverage + reporters)
pnpm run test:ci

# Debugging
pnpm run test:debug            # Debug with inspector
pnpm run test:ui               # Vitest UI
```

### Linting and Formatting

```bash
# Check formatting and lint
pnpm run lint

# Auto-format code
pnpm run format

# Check all quality metrics
pnpm run check:all
```

### Development

```bash
# Start development server
pnpm run dev

# Build and run CLI locally
pnpm run build:cli && pnpm run cli

# Type checking
pnpm run check
pnpm run check:watch  # Watch mode
```

### Environment Validation

```bash
# Validate environment setup
pnpm run env:validate

# Setup environment
pnpm run env:setup

# Complete setup with validation
pnpm run setup:complete
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
│   ├── neurolink.ts       # Main SDK entry point
│   ├── providers/         # AI provider implementations (13 providers)
│   ├── factories/         # Provider factory and registry
│   ├── adapters/          # Provider-specific adapters (image, PDF, etc.)
│   ├── utils/             # Utilities (messageBuilder, transformations, etc.)
│   ├── types/             # TypeScript type definitions (28+ type files)
│   ├── mcp/              # MCP tool registry and integration
│   ├── memory/           # Conversation memory (Redis, in-memory)
│   ├── context/          # Context compaction, budget management, file summarization
│   ├── middleware/       # Request/response middleware system
│   ├── core/             # Core factory and constants
│   │   └── infrastructure/ # Base factories, registries, errors
│   ├── config/           # Configuration management
│   ├── hitl/             # Human-in-the-loop workflows
│   └── models/           # Model definitions and utilities
├── cli/                   # CLI implementation
│   ├── factories/        # Command factories
│   ├── commands/         # CLI command implementations
│   ├── loop/             # Interactive loop session
│   └── utils/            # CLI-specific utilities
└── test/                  # Test suites

feature docs and guides

dist/                      # Build output (generated)
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
    const { GoogleAIStudioProvider } = await import(
      "../providers/googleAiStudio.js"
    );
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
| ToolConverter         | `src/lib/mcp/toolConverter.ts`                  | NeuroLink ↔ MCP format conversion         |
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

1. **SDK Build** (via SvelteKit): Outputs to `dist/` for npm package
2. **CLI Build** (via TypeScript): Compiles CLI to `dist/cli/` with executable

**Build configuration:**

- `vite.config.ts` - Vite configuration for SDK
- `tsconfig.json` - Main TypeScript config
- `tsconfig.cli.json` - CLI-specific TypeScript config
- `svelte.config.js` - SvelteKit packaging config

**Build process:**

```bash
# Full build executes:
1. vite build         # Build SDK with Vite
2. svelte-kit sync    # Sync SvelteKit types
3. svelte-package     # Package for npm
4. tsc --project tsconfig.cli.json  # Build CLI
5. publint           # Validate package
```

## Working with Providers

### Adding a New Provider

1. Create provider file in `src/lib/providers/yourProvider.ts`
2. Implement provider interface (extend base provider if available)
3. Register in `ProviderRegistry.registerAllProviders()` using dynamic import
4. Add provider name to `AIProviderName` enum in `src/lib/types/index.ts`
5. Add model definitions to appropriate model enum
6. Update vision capabilities in `src/lib/adapters/providerImageAdapter.ts` if multimodal
7. Add to CLI choices in `src/cli/factories/commandFactory.ts`
8. Add tests in `test/suites/` and `test/integration/`

### Modifying Message Building

When changing how messages are constructed:

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

### Error Handling

- Use `ErrorFactory` for creating typed errors
- Wrap async operations with `withTimeout` utility
- Implement graceful degradation with provider fallback

### Transformation Utilities

- `transformToolExecutions()` - Convert tool results for providers
- `transformAvailableTools()` - Format tools for AI models
- `transformParamsForLogging()` - Safe parameter logging

### Configuration Management

- Environment variables loaded from `.env`
- Configuration validated with `env:validate` script
- Config manager in `src/cli/commands/config.ts`

### Thinking Level Configuration

The `thinkingLevel` option controls extended thinking for supported models (Anthropic Claude, Gemini 2.5+, Gemini 3):

- `"minimal"` - Minimal thinking budget (fastest responses)
- `"low"` - Low thinking budget
- `"medium"` - Moderate thinking budget (default)
- `"high"` - Maximum thinking budget (deep reasoning)

**Usage in SDK:**

```typescript
const result = await neurolink.generate({
  prompt: "Complex reasoning task",
  thinkingLevel: "high",
});
```

**Usage in CLI:**

```bash
neurolink generate "Complex task" --thinking-level high
```

Note: When `thinkingLevel` is enabled, some providers may have limitations (see Important Constraints).

### External TracerProvider Support

NeuroLink supports integration with applications that have existing OpenTelemetry instrumentation:

**Configuration Options:**

- `useExternalTracerProvider: true` - Skip TracerProvider creation/registration
- `autoDetectExternalProvider: true` - Auto-detect existing provider

**Exports for External Provider Integration:**

- `getSpanProcessors()` - Returns [ContextEnricher, LangfuseSpanProcessor]
- `createContextEnricher()` - Factory for ContextEnricher
- `isUsingExternalTracerProvider()` - Check if in external mode

**Context Management Exports:**

- `setLangfuseContext<T>(context, callback?)` - Set context with extended fields, returns callback result
- `getLangfuseContext()` - Read current context from AsyncLocalStorage
- `getTracer(name?, version?)` - Get OpenTelemetry Tracer for custom spans

**Extended Context Fields:**

- `userId`, `sessionId` - User and session identification
- `conversationId` - Group related traces by conversation/thread
- `requestId` - Correlate with application logs
- `traceName` - Custom trace names in Langfuse UI
- `metadata` - Custom key-value metadata on spans

**Type Exports:**

- `LangfuseSpanAttributes` - GenAI semantic convention attributes from Vercel AI SDK

**Use Case:** When your application already initializes OpenTelemetry (e.g., for HTTP/DB tracing to Jaeger), enable external mode to avoid "duplicate registration" errors.

**Example - External Provider Mode:**

```typescript
import { NeuroLink, getSpanProcessors } from "@juspay/neurolink";
import { NodeSDK } from "@opentelemetry/sdk-node";

// Initialize NeuroLink with external provider mode
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      useExternalTracerProvider: true,
    },
  },
});

// Add NeuroLink's processors to your existing OTEL setup
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

const sdk = new NodeSDK({
  spanProcessors: [
    new BatchSpanProcessor(yourExistingExporter),
    ...getSpanProcessors(),
  ],
});
```

**Example - Enhanced Context with Callback:**

```typescript
import {
  setLangfuseContext,
  getLangfuseContext,
  getTracer,
} from "@juspay/neurolink";

// Set context and get result from callback
const result = await setLangfuseContext(
  {
    userId: "user-123",
    sessionId: "session-456",
    conversationId: "conv-789",
    requestId: "req-abc",
    traceName: "chat-completion",
    metadata: { feature: "customer-support", tier: "premium" },
  },
  async () => {
    return await neurolink.generate({ prompt: "Hello" });
  },
);

// Read current context
const context = getLangfuseContext();
console.log(context?.userId, context?.conversationId);

// Create custom spans
const tracer = getTracer("my-app");
const span = tracer.startSpan("custom-operation");
try {
  // ... do work
} finally {
  span.end();
}
```

### Operation Name Support

NeuroLink automatically detects and includes operation names in trace naming for better observability in Langfuse.

**Auto-detection:**

- Automatically detects operation names from Vercel AI SDK spans (`ai.streamText`, `ai.generateText`, etc.)
- Falls back to `unknown` if no operation can be detected

**Trace Name Format:**

- Default format: `userId:operationName` (e.g., `user@email.com:ai.streamText`)
- When userId is not set: uses just the operation name
- Customizable via `traceNameFormat` function

**Configuration Options:**

- `autoDetectOperationName: boolean` (default: `true`) - Enable/disable automatic operation detection from spans
- `traceNameFormat: TraceNameFormat` - Custom function to format trace names
- `operationName` in context - Explicit operation name override (takes precedence over auto-detection)

**Example - Custom Trace Name Format:**

```typescript
import { NeuroLink, setLangfuseContext } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      autoDetectOperationName: true, // default
      traceNameFormat: (context) => {
        // Custom format: "op/streamText/user@email.com"
        return `op/${context.operationName}/${context.userId || "anonymous"}`;
      },
    },
  },
});

// Explicit operation name override in context
await setLangfuseContext(
  {
    userId: "user@email.com",
    operationName: "customer-support-chat", // overrides auto-detected operation
  },
  async () => {
    return await neurolink.stream({ prompt: "Hello" });
  },
);
```

**Wrapper Span Support:**

When host apps create wrapper spans before AI operations, auto-detection in `onStart()` fails because the AI span does not exist yet. NeuroLink handles this automatically by detecting operations from child spans and updating the trace name in `onEnd()` of the wrapper span. No code changes required.

### Memory Management

- Redis for distributed memory (production)
- In-memory store for development
- Conversation summarization for long contexts
- Token-based context compaction via SummarizationEngine and BudgetChecker (replaces turn-based limits)

### Context Compaction System

**ContextCompactor** (`src/lib/context/contextCompactor.ts`) manages context window size through a multi-stage reduction pipeline:

1. **Tool Output Pruning** - Replace old tool results with placeholders (protect recent 40K tokens)
2. **File Read Deduplication** - Keep only latest read of each file
3. **LLM Summarization** - Structured 9-section summary with iterative merging
4. **Sliding Window Truncation** - Non-destructive tagging of oldest messages

**BudgetChecker** (`src/lib/context/budgetChecker.ts`) validates context fits within model's window before every LLM call, triggering auto-compaction when usage exceeds 80%.

**Key files:**

- `src/lib/constants/contextWindows.ts` - Per-provider, per-model context window sizes
- `src/lib/context/budgetChecker.ts` - Pre-generation budget validation
- `src/lib/context/contextCompactor.ts` - Multi-stage compaction orchestrator
- `src/lib/context/errorDetection.ts` - Cross-provider overflow detection
- `src/lib/context/effectiveHistory.ts` - Non-destructive message filtering
- `src/lib/context/fileTokenBudget.ts` - Aggregate file budget enforcement
- `src/lib/context/fileSummarizer.ts` - File content budget planning
- `src/lib/context/fileSummarizationService.ts` - LLM-based file summarization
- `src/lib/utils/tokenEstimation.ts` - Token estimation with provider multipliers

### RAG Document Processing

NeuroLink provides a comprehensive RAG (Retrieval-Augmented Generation) processing system for document chunking, hybrid search, and result reranking. The system follows the Factory + Registry pattern used throughout NeuroLink, enabling extensible and pluggable components for building production RAG pipelines.

**Chunking Strategies:**

NeuroLink supports 10 chunking strategies via `ChunkerFactory` and `ChunkerRegistry`:

| Strategy            | Description                                     | Use Case                    |
| ------------------- | ----------------------------------------------- | --------------------------- |
| `character`         | Fixed character-count chunks with overlap       | Simple text, logs           |
| `recursive`         | Hierarchical splitting by separators            | General-purpose documents   |
| `sentence`          | Sentence-boundary aware splitting               | Natural language text       |
| `token`             | Token-count based chunks (model-aware)          | LLM context optimization    |
| `markdown`          | Markdown structure-aware (headers, code blocks) | Documentation, READMEs      |
| `html`              | HTML element-aware parsing                      | Web content, scraped pages  |
| `json`              | JSON structure-preserving chunks                | API responses, config files |
| `latex`             | LaTeX document structure (sections, equations)  | Academic papers, math docs  |
| `semantic`          | Semantic similarity-based chunking              | Context-aware splitting     |
| `semantic-markdown` | Semantic sections within markdown               | Technical documentation     |

**Reranker Types:**

NeuroLink provides 5 reranker types via `RerankerFactory` and `RerankerRegistry`:

| Type            | LLM Required | Status      | Description                                 |
| --------------- | ------------ | ----------- | ------------------------------------------- |
| `simple`        | No           | Functional  | Keyword/TF-IDF based scoring, fast and free |
| `llm`           | Yes          | Functional  | Single LLM call for relevance scoring       |
| `batch`         | Yes          | Functional  | Batched LLM calls for large result sets     |
| `cross-encoder` | No           | Placeholder | Cross-encoder model integration (future)    |
| `cohere`        | No           | Placeholder | Cohere Rerank API integration (future)      |

**Hybrid Search:**

Combines BM25 lexical search with vector similarity for improved retrieval accuracy:

- **BM25 Index:** In-memory BM25 implementation (`InMemoryBM25Index`) for keyword matching
- **Vector Search:** Integrates with NeuroLink's vector store adapters
- **Fusion Methods:**
  - `reciprocalRankFusion` (RRF) - Rank-based combination, robust to score scale differences
  - `linearCombination` - Weighted score combination with configurable alpha

**Key Exports:**

```typescript
// Chunking
import {
  createChunker,
  ChunkerRegistry,
  getAvailableStrategies,
} from "@juspay/neurolink";

// Reranking
import {
  createReranker,
  RerankerRegistry,
  simpleRerank,
} from "@juspay/neurolink";

// Hybrid Search
import {
  createHybridSearch,
  InMemoryBM25Index,
  reciprocalRankFusion,
} from "@juspay/neurolink";

// Pipeline
import { RAGPipeline, MDocument, loadDocument } from "@juspay/neurolink";
```

**Example - Complete RAG Workflow:**

```typescript
import {
  createChunker,
  createHybridSearch,
  createReranker,
  MDocument,
  InMemoryBM25Index,
} from "@juspay/neurolink";

// 1. Chunk documents
const chunker = createChunker("recursive", {
  chunkSize: 512,
  chunkOverlap: 50,
});

const doc = new MDocument({ content: documentText, type: "text" });
const chunks = await chunker.chunk(doc);

// 2. Build search indices
const bm25Index = new InMemoryBM25Index();
await bm25Index.addDocuments(chunks.map((c) => c.content));

// 3. Hybrid search (BM25 + vector)
const hybridSearch = createHybridSearch({
  bm25Index,
  vectorStore, // Your configured vector store
  fusionMethod: "rrf",
  bm25Weight: 0.3,
  vectorWeight: 0.7,
});

const searchResults = await hybridSearch.search(query, { topK: 20 });

// 4. Rerank results
const reranker = createReranker("simple", {
  weights: { keywordMatch: 0.4, positionBoost: 0.3, lengthPenalty: 0.3 },
});

const rerankedResults = await reranker.rerank(query, searchResults, {
  topK: 5,
});

// 5. Use top results for generation
const context = rerankedResults.map((r) => r.content).join("\n\n");
const response = await neurolink.generate({
  prompt: `Context:\n${context}\n\nQuestion: ${query}`,
});
```

**Key Files:**

| File                                           | Purpose                                 |
| ---------------------------------------------- | --------------------------------------- |
| `src/lib/rag/ChunkerFactory.ts`                | Factory for creating chunker instances  |
| `src/lib/rag/ChunkerRegistry.ts`               | Registry for chunking strategies        |
| `src/lib/rag/reranker/RerankerFactory.ts`      | Factory for creating reranker instances |
| `src/lib/rag/reranker/RerankerRegistry.ts`     | Registry for reranker types             |
| `src/lib/rag/retrieval/hybridSearch.ts`        | Hybrid search implementation            |
| `src/lib/rag/retrieval/vectorQueryTool.ts`     | createVectorQueryTool factory           |
| `src/lib/rag/retrieval/InMemoryVectorStore.ts` | In-memory vector store for testing      |
| `src/lib/rag/pipeline/RAGPipeline.ts`          | End-to-end RAG pipeline orchestration   |

**Configuration Options:**

Chunkers and rerankers can be configured via options:

```typescript
// Chunker options
const chunker = createChunker("token", {
  chunkSize: 256, // Target chunk size
  chunkOverlap: 32, // Overlap between chunks
  tokenizer: "cl100k_base", // Tokenizer for token-based chunking
});

// Reranker options
const reranker = createReranker("llm", {
  model: "gpt-4o-mini", // LLM model for scoring
  batchSize: 10, // Documents per batch
  scoreThreshold: 0.5, // Minimum relevance score
});

// Hybrid search options
const hybridSearch = createHybridSearch({
  fusionMethod: "linear", // 'rrf' or 'linear'
  rrf_k: 60, // RRF constant (default: 60)
  alpha: 0.5, // Linear combination weight for vector scores
});
```

### RAG Integration with generate()/stream()

**Simplified API (Recommended):** Pass `rag: { files: [...] }` directly to `generate()` or `stream()`. NeuroLink handles file loading, chunking, embedding, vector storage, and tool creation automatically. The AI model receives a `search_knowledge_base` tool it can invoke to search the indexed documents.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Generate with RAG - just pass files
const result = await neurolink.generate({
  prompt: "What are the key features described in the docs?",
  rag: {
    files: ["./docs/guide.md", "./docs/api.md"],
    strategy: "markdown", // Optional: auto-detected from extension
    chunkSize: 512, // Optional: default 1000
    chunkOverlap: 50, // Optional: default 200
    topK: 5, // Optional: default 5
  },
});

// Stream with RAG - same API
const stream = await neurolink.stream({
  prompt: "Summarize the architecture",
  rag: { files: ["./docs/architecture.md"] },
});
```

**`RAGConfig` type:**

```typescript
type RAGConfig = {
  files: string[]; // Required: file paths to load
  strategy?: ChunkingStrategy; // Default: auto-detected from file extension
  chunkSize?: number; // Default: 1000
  chunkOverlap?: number; // Default: 200
  topK?: number; // Default: 5
  toolName?: string; // Default: "search_knowledge_base"
  toolDescription?: string; // Custom tool description for the AI
  embeddingProvider?: string; // Defaults to generation provider
  embeddingModel?: string; // Defaults to provider's default
};
```

**CLI Usage:**

```bash
neurolink generate "What is this about?" --rag-files ./docs/guide.md
neurolink generate "Explain chunking" --rag-files ./docs/guide.md --rag-strategy markdown --rag-chunk-size 512
neurolink stream "Summarize" --rag-files ./docs/a.md ./docs/b.md --rag-top-k 10
```

**Advanced API:** For full control over embeddings and vector stores, use `createVectorQueryTool` directly:

```typescript
const ragTool = createVectorQueryTool(config, vectorStore);

const result = await neurolink.generate({
  input: { text: "query" },
  tools: { [ragTool.name]: ragTool },
});
```

**Streaming Tool Architecture:**

`BaseProvider.stream()` centrally pre-merges base tools (MCP/built-in) with user-provided tools (including RAG) into `options.tools` before calling provider-specific `executeStream()`. All 10 providers now support external tools in streaming via this central merge pattern. Individual providers use `options.tools || await this.getAllTools()` as a defensive fallback.

**Key Files:**

| File                                           | Purpose                                      |
| ---------------------------------------------- | -------------------------------------------- |
| `src/lib/rag/ragIntegration.ts`                | `prepareRAGTool()` - auto RAG pipeline setup |
| `src/lib/rag/types.ts`                         | `RAGConfig` type definition                  |
| `src/lib/rag/retrieval/vectorQueryTool.ts`     | `createVectorQueryTool` factory (Zod params) |
| `src/lib/rag/retrieval/InMemoryVectorStore.ts` | In-memory vector store for testing           |
| `src/lib/core/baseProvider.ts`                 | Central tool merge in `stream()`             |
| `src/lib/neurolink.ts`                         | RAG auto-injection in generate/stream        |
| `src/cli/factories/commandFactory.ts`          | CLI `--rag-files` flags                      |

## Important Constraints

1. **No Circular Dependencies:** All providers use dynamic imports in registry
2. **Type Safety:** Maintain strict TypeScript across all modules
3. **Provider Consistency:** All providers must support same core interface
4. **Backward Compatibility:** SDK changes must maintain existing API
5. **File Size Limits:** Consider token limits for multimodal content
6. **Environment Isolation:** CLI and SDK have separate concerns (CLI can use manual MCP, SDK cannot)
7. **Gemini Tool + JSON Schema Limitation:** Google Gemini models (AI Studio and Vertex) cannot use tools and JSON schema output simultaneously. When `structuredOutput` with a JSON schema is specified, tools must be disabled. This is a limitation of the Gemini API. Design workflows to either use tools OR structured JSON output, not both together.

## Development Workflow

1. Make changes in `src/`
2. Run `pnpm run check` to validate types
3. Run `pnpm run lint` and `pnpm run format` for code quality
4. Run relevant tests with `pnpm test` or `pnpm run test:coverage`
5. Build with `pnpm run build`
6. Test CLI with `pnpm run build:cli && pnpm run cli <command>`
7. Validate all changes with `pnpm run validate:all`

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
| **RAG Processing**         | ✅ Complete               | 9 chunkers, hybrid search, RerankerFactory/Registry                                                                                                                                                                                                            |
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

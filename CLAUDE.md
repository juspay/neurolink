# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeuroLink is an enterprise AI development platform that provides unified access to 12+ AI providers (OpenAI, Anthropic, Google AI Studio, AWS Bedrock, Azure, Vertex, Mistral, LiteLLM, SageMaker, Hugging Face, Ollama, and OpenAI-compatible endpoints) through a single consistent API. It ships as both a TypeScript SDK and a professional CLI.

**Key characteristics:**

- Extracted from production systems at Juspay
- Battle-tested at enterprise scale
- Opinionated factory architecture with provider registry pattern
- Comprehensive multimodal support (text, images, PDFs, CSV)
- Full MCP (Model Context Protocol) integration with 58+ external servers
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
# Run all tests
pnpm test

# Run tests once (CI mode)
pnpm run test:run

# Run specific test suites
pnpm run test:suites           # All suites
pnpm run test:integration      # Integration tests only
pnpm run test:tool-discovery   # Tool discovery tests
pnpm run test:consistency      # Provider consistency tests

# Smart test runner (adaptive)
pnpm run test:smart

# Coverage report
pnpm run test:coverage
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
│   ├── middleware/       # Request/response middleware system
│   ├── core/             # Core factory and constants
│   ├── config/           # Configuration management
│   ├── hitl/             # Human-in-the-loop workflows
│   └── models/           # Model definitions and utilities
├── cli/                   # CLI implementation
│   ├── factories/        # Command factories
│   ├── commands/         # CLI command implementations
│   ├── loop/             # Interactive loop session
│   └── utils/            # CLI-specific utilities
└── test/                  # Test suites

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

- Handles text, images, PDFs, and CSV files
- Converts between different message formats (NeuroLink → CoreMessage for ai SDK)
- Integrates with `FileDetector` to automatically detect file types
- Uses `ProviderImageAdapter` for provider-specific image formatting
- Processes PDFs with `PDFProcessor` for native document support

**Flow:**

1. User provides input (text + files)
2. `MessageBuilder` detects file types
3. Files are processed (images → base64, PDFs → structured content, CSV → parsed data)
4. Provider-specific adapters format content for each provider's API
5. Messages are sent to the AI provider

**Key files:**

- `src/lib/utils/messageBuilder.ts` - Message construction
- `src/lib/adapters/providerImageAdapter.ts` - Provider-specific image formatting
- `src/lib/utils/fileDetector.ts` - File type detection
- `src/lib/utils/pdfProcessor.ts` - PDF processing
- `src/lib/utils/imageProcessor.ts` - Image processing

### Tool System (MCP Integration)

**MCPToolRegistry** (`src/lib/mcp/toolRegistry.ts`) manages all tools:

- Built-in tools (getCurrentTime, readFile, writeFile, listDirectory, calculateMath, websearchGrounding)
- External MCP servers (GitHub, PostgreSQL, Google Drive, etc.)
- Custom tools defined by users

**Tool execution flow:**

1. Tools registered with MCPToolRegistry
2. Available tools transformed to provider-specific format
3. AI model calls tools during generation
4. Tool results sent back to AI for continued reasoning

**Key files:**

- `src/lib/mcp/toolRegistry.ts` - Tool registry
- `src/lib/utils/transformationUtils.ts` - Tool format transformations
- `src/lib/types/mcpTypes.ts` - MCP type definitions
- `src/lib/types/tools.ts` - Tool type definitions

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

### Memory Management

- Redis for distributed memory (production)
- In-memory store for development
- Conversation summarization for long contexts

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
4. Run relevant tests with `pnpm test` or `pnpm run test:run`
5. Build with `pnpm run build`
6. Test CLI with `pnpm run build:cli && pnpm run cli <command>`
7. Validate all changes with `pnpm run validate:all`

## Key Files to Know

| File                                       | Purpose                                    |
| ------------------------------------------ | ------------------------------------------ |
| `src/lib/neurolink.ts`                     | Main SDK class, orchestrates everything    |
| `src/lib/factories/providerRegistry.ts`    | Provider registration with dynamic imports |
| `src/lib/utils/messageBuilder.ts`          | Central message construction logic         |
| `src/lib/adapters/providerImageAdapter.ts` | Multimodal content adaptation              |
| `src/lib/mcp/toolRegistry.ts`              | Tool management and MCP integration        |
| `src/cli/factories/commandFactory.ts`      | CLI command creation                       |
| `src/lib/types/index.ts`                   | Main type definitions and exports          |

## Documentation

- Full documentation in `docs/` directory
- README.md has comprehensive feature overview
- Each major feature has dedicated guide in `docs/features/`
- API reference in `docs/sdk/api-reference.md`
- CLI reference in `docs/cli/commands.md`

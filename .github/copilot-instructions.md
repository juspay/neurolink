# NeuroLink - GitHub Copilot Instructions

This file guides GitHub Copilot when working with the NeuroLink codebase.

## Project Overview

NeuroLink is an enterprise AI development platform that provides unified access to 12+ AI providers (OpenAI, Anthropic, Google AI Studio, AWS Bedrock, Azure, Vertex, Mistral, LiteLLM, SageMaker, Hugging Face, Ollama, and OpenAI-compatible endpoints) through a single consistent API.

**Core Value Proposition:**

- Universal AI integration platform unifying 12 major providers and 100+ models
- Extracted from production systems at Juspay and battle-tested at enterprise scale
- Ships as both a TypeScript SDK and a professional CLI
- Production-ready with Redis memory, failover, and telemetry

## Tech Stack

**Languages & Frameworks:**

- TypeScript (strict mode enabled)
- Node.js (>=20.18.1)
- SvelteKit (for SDK packaging)
- Vitest (testing framework)

**Package Manager:**

- pnpm (>=8.0.0) - ALWAYS use pnpm, not npm or yarn

**Key Dependencies:**

- `ai` SDK (v4.3.16) - Core AI abstraction layer
- `@modelcontextprotocol/sdk` - MCP tool integration
- Provider SDKs: `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, etc.
- `zod` - Schema validation
- `yargs` - CLI argument parsing
- `redis` - Conversation memory (production)

## Essential Commands

```bash
# Build
pnpm run build              # Full build (SDK + CLI)
pnpm run build:cli          # CLI only (rapid testing)
pnpm run build:complete     # Complete pipeline with validation

# Test
pnpm test                   # Run all tests
pnpm run test:ci            # Tests once (CI mode)
pnpm run test:integration   # Integration tests
pnpm run test:smart         # Adaptive test runner

# Code Quality
pnpm run lint               # Check formatting and lint
pnpm run format             # Auto-format code
pnpm run check              # Type checking
pnpm run check:all          # All quality checks

# Development
pnpm run dev                # Development server
pnpm run check:watch        # Type checking in watch mode

# Environment
pnpm run env:validate       # Validate environment setup
pnpm run setup:complete     # Complete setup with validation
```

## Core Architecture

### Factory + Registry Pattern (CRITICAL)

NeuroLink uses a **factory pattern with dynamic provider registration** to avoid circular dependencies:

1. **ProviderFactory** (`src/lib/factories/providerFactory.ts`) - Creates provider instances
2. **ProviderRegistry** (`src/lib/factories/providerRegistry.ts`) - Registers providers with factory functions
3. **NeuroLink** (`src/lib/neurolink.ts`) - Main SDK orchestration

**CRITICAL RULE:** All providers MUST use dynamic imports in the registry. Never use static imports for providers.

**Example:**

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

### Repository Structure

```
src/
├── lib/                    # Core SDK implementation
│   ├── neurolink.ts       # Main SDK entry point (orchestrates everything)
│   ├── providers/         # AI provider implementations (12 providers)
│   ├── factories/         # Provider factory and registry
│   ├── adapters/          # Provider-specific adapters (image, PDF, CSV)
│   ├── utils/             # Utilities (messageBuilder, transformations)
│   ├── types/             # TypeScript type definitions (28+ files)
│   ├── mcp/              # MCP tool registry and integration
│   ├── memory/           # Conversation memory (Redis, in-memory)
│   ├── middleware/       # Request/response middleware
│   ├── config/           # Configuration management
│   └── models/           # Model definitions
├── cli/                   # CLI implementation
│   ├── factories/        # Command factories
│   ├── commands/         # CLI command implementations
│   ├── loop/             # Interactive loop session
│   └── utils/            # CLI-specific utilities
└── test/                  # Test suites
    ├── suites/           # Feature-specific tests
    └── integration/      # Provider integration tests
```

## Coding Guidelines

### TypeScript Standards

- **Strict mode ALWAYS enabled** - No `any` types without justification
- Use explicit types for function parameters
- Prefer `const` over `let`
- Use type imports: `import type { Type } from '...'`
- Avoid `// @ts-ignore` - fix type issues properly

**Examples:**

```typescript
// ✅ GOOD
export function createMessage(content: string, role: MessageRole): Message {
  return { content, role };
}

// ❌ BAD
export function createMessage(content: any, role: any) {
  return { content, role };
}
```

### Naming Conventions

- **Classes:** PascalCase - `MessageBuilder`, `ProviderFactory`
- **Functions:** camelCase - `buildMessage`, `createProvider`
- **Constants:** UPPER_SNAKE_CASE - `DEFAULT_TEMPERATURE`, `MAX_TOKENS`
- **Interfaces/Types:** PascalCase with descriptive names - `GenerateOptions`, `StreamConfig`
- **Files:** camelCase or kebab-case consistently within directories

### Error Handling

- Use `ErrorFactory` for creating typed errors
- Wrap async operations with `withTimeout` utility
- Implement graceful degradation with provider fallback
- Never swallow errors silently - log or rethrow

**Example:**

```typescript
try {
  const result = await provider.generate(prompt);
  return result;
} catch (error) {
  logger.error("Generation failed", { error, provider: provider.name });
  throw ErrorFactory.createProviderError(error, provider.name);
}
```

### Security Standards (CRITICAL)

- **NEVER hardcode API keys** - always use environment variables
- **NEVER log sensitive data** - use `transformParamsForLogging()` utility
- **Validate all user input** - especially for file paths and shell commands
- **Use parameterized queries** - for any database operations
- **Sanitize file paths** - prevent directory traversal attacks

### Provider Implementation

When adding a new provider:

1. Create file in `src/lib/providers/yourProvider.ts`
2. Extend base provider or implement interface
3. Register in `ProviderRegistry.registerAllProviders()` with **dynamic import**
4. Add provider name to `AIProviderName` enum
5. Add model definitions to appropriate enum
6. Update vision capabilities in `ProviderImageAdapter` if multimodal
7. Add tests in `test/suites/` and `test/integration/`

### Message Building

**MessageBuilder** (`src/lib/utils/messageBuilder.ts`) is the central component:

- Handles text, images, PDFs, and CSV files
- Converts between formats (NeuroLink → CoreMessage)
- Uses `FileDetector` for automatic type detection
- Uses `ProviderImageAdapter` for provider-specific image formatting

**When modifying:**

1. Update `messageBuilder.ts` for core logic
2. Update adapters in `src/lib/adapters/` for provider-specific formatting
3. Ensure backward compatibility
4. Add tests for new message types

### Tool System (MCP)

**MCPToolRegistry** manages all tools:

- Built-in tools (getCurrentTime, readFile, writeFile, etc.)
- External MCP servers (GitHub, PostgreSQL, Google Drive)
- Custom user-defined tools

**Tool execution flow:**

1. Register with MCPToolRegistry
2. Transform to provider-specific format
3. AI model calls tools during generation
4. Results sent back to AI

## Development Best Practices

### Type Organization

- Types are organized by domain to avoid circular dependencies
- Import types with `import type` syntax
- Never create circular type dependencies
- Use `index.ts` for public exports only

### Build System

**Dual Build Process:**

1. **SDK Build** (SvelteKit): Outputs to `dist/` for npm
2. **CLI Build** (TypeScript): Compiles to `dist/cli/` with executable

**Configuration files:**

- `vite.config.ts` - Vite/SDK config
- `tsconfig.json` - Main TypeScript config
- `tsconfig.cli.json` - CLI-specific config
- `svelte.config.js` - SvelteKit packaging

### Testing Strategy

- Mock external API calls for unit tests
- Use real API calls sparingly in integration tests
- Test provider consistency across all providers
- Validate multimodal content handling
- Use Vitest as test runner

**Test organization:**

```
test/
├── suites/              # Feature tests (tool discovery, file ops)
└── integration/         # Provider integration tests
```

### Performance

- Lazy load providers with dynamic imports
- Use streaming for large responses
- Implement connection pooling for Redis
- Cache provider instances when appropriate

### Documentation

- Update documentation for new features
- Keep examples in sync with code
- Document breaking changes in CHANGELOG.md
- Add JSDoc comments for public APIs (concise, not verbose)

## Important Constraints

1. **No Circular Dependencies** - All providers use dynamic imports
2. **Type Safety** - Maintain strict TypeScript across all modules
3. **Provider Consistency** - All providers support same core interface
4. **Backward Compatibility** - SDK changes must maintain existing API
5. **File Size Limits** - Consider token limits for multimodal content
6. **Environment Isolation** - CLI and SDK have separate concerns

## Key Files Reference

| File                                       | Purpose                                 |
| ------------------------------------------ | --------------------------------------- |
| `src/lib/neurolink.ts`                     | Main SDK class, orchestrates everything |
| `src/lib/factories/providerRegistry.ts`    | Provider registration (dynamic imports) |
| `src/lib/utils/messageBuilder.ts`          | Central message construction logic      |
| `src/lib/adapters/providerImageAdapter.ts` | Multimodal content adaptation           |
| `src/lib/mcp/toolRegistry.ts`              | Tool management and MCP integration     |
| `src/cli/factories/commandFactory.ts`      | CLI command creation                    |
| `src/lib/types/index.ts`                   | Main type definitions and exports       |

## Common Patterns

### Transformation Utilities

```typescript
// Tool results for providers
transformToolExecutions(toolResults);

// Format tools for AI models
transformAvailableTools(tools);

// Safe parameter logging (removes sensitive data)
transformParamsForLogging(params);
```

### Configuration Management

- Environment variables loaded from `.env`
- Configuration validated with `env:validate` script
- Config manager in `src/cli/commands/config.ts`

### Memory Management

- Redis for distributed memory (production)
- In-memory store for development
- Conversation summarization for long contexts

## Development Workflow

1. Make changes in `src/`
2. Run `pnpm run check` to validate types
3. Run `pnpm run lint` and `pnpm run format`
4. Run tests with `pnpm test`
5. Build with `pnpm run build`
6. Test CLI with `pnpm run build:cli && pnpm run cli <command>`
7. Validate all with `pnpm run validate:all`

## Quality Standards

- ESLint errors MUST be fixed (warnings max 50 in src/, 0 in test/)
- Prettier formatting MUST pass
- All tests MUST pass
- Type checking MUST pass with strict mode
- Build validations MUST pass
- Security checks MUST pass

## Release Process

- Semantic versioning (semver)
- Changesets for version management
- CI/CD validates all checks before merge
- Single commit policy enforced (squash merges)

## Resources

- [Main Documentation](docs/)
- [API Reference](docs/sdk/api-reference.md)
- [CLI Reference](docs/cli/commands.md)
- [Provider Setup Guide](docs/getting-started/provider-setup.md)
- [Contributing Guide](CONTRIBUTING.md)

## Copilot-Specific Guidance

When suggesting code:

- Prioritize type safety over convenience
- Follow existing patterns in similar files
- Consider security implications
- Maintain backward compatibility
- Add appropriate error handling
- Keep code DRY (Don't Repeat Yourself)
- Write self-documenting code with clear names

When suggesting fixes:

- Understand the root cause before suggesting a fix
- Consider impact on other parts of the system
- Check for similar patterns elsewhere that may need updating
- Ensure tests cover the fix

When suggesting tests:

- Follow existing test patterns in the repository
- Use descriptive test names: `it("should handle X when Y")`
- Mock external dependencies appropriately
- Test both success and failure paths
- Consider edge cases

Remember: NeuroLink is an enterprise platform with strict quality standards. Code suggestions should be production-ready, secure, and maintainable.

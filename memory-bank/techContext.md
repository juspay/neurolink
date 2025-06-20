# NeuroLink Technical Context

## Core Architecture

- **SDK Architecture**: `./systemPatterns.md`
- **Provider Patterns**: Critical authentication flows documented in `.clinerules`

## Development Resources

- **CLI Development**: `./cli/cli-strategic-roadmap.md`
- **Testing Strategy**: `./development/testing-strategy.md`
- **Build & Publishing**: `./development/npm-publishing-guide.md`

## Implementation Files

- **Core SDK**: `src/lib/` directory structure
- **CLI Implementation**: `src/cli/index.ts`
- **Provider Implementations**: `src/lib/providers/`
- **Utility Functions**: `src/lib/utils/`

## Visual Documentation

- **CLI Screenshots**: `cli-screenshots/` (Professional terminal demos)
- **CLI Videos**: `cli-videos/` (Feature demonstrations)
- **Demo Screenshots**: `neurolink-demo/screenshots/`
- **Demo Videos**: `neurolink-demo/videos/`

## Configuration & Environment

- **Environment Setup**: `.env.example`
- **Package Configuration**: `package.json` with CLI bin setup
- **TypeScript Config**: `tsconfig.json`
- **Build Config**: `vite.config.ts`, `svelte.config.js`

## Testing Infrastructure

- **Test Strategy**: `./development/testing-strategy.md`
- **AI Workflow Tools Testing**: `./development/ai-workflow-tools-testing-guide.md`
- **Test Files**: `src/test/` directory
- **Test Reports**: `./reports/build-summary.md`, `./reports/test-summary.md`

## Research & Documentation

- **Research Archive**: `./research/ai-analysis-archive.md`
- **Demo Documentation**: `./demo-documentation/`

## Function Calling Architecture

### AI SDK Integration Pattern
- **Core Integration**: `src/lib/providers/googleAIStudio.ts` with `maxSteps: 5`
- **Tool Registration**: `src/lib/mcp/unified-registry.ts` for tool discovery
- **Function Calling Provider**: `src/lib/providers/function-calling-provider.ts`
- **Auto-Discovery**: `src/lib/mcp/auto-discovery.ts` for system-wide tool finding
- **Debug Tools**: `debug-multi-turn.js`, `debug-ai-sdk-tools.js`

### Multi-turn Conversation Flow
- **Step 1**: AI analyzes prompt and identifies tool needs
- **Step 2**: AI SDK calls appropriate tools with parameters
- **Step 3**: Tools execute and return results
- **Step 4**: AI generates response incorporating tool results
- **Step 5**: User receives complete response with real data

### Function Calling Components

#### Enhanced Provider Architecture
```typescript
// MCPEnhancedProvider: Auto-injects discovered tools
src/lib/core/factory.ts              # Factory with MCP integration
src/lib/providers/function-calling-provider.ts  # Function calling wrapper
src/lib/mcp/function-calling.ts      # Core function calling logic
```

#### MCP Tool Integration
```typescript
// Unified tool registry and discovery
src/lib/mcp/unified-registry.ts      # Central tool registry
src/lib/mcp/auto-discovery.ts        # System-wide tool discovery
src/lib/mcp/factory.ts              # MCP server factory
```

#### Critical Configuration
```typescript
// The key fix: maxSteps for multi-turn conversations
generateText({
  model: provider,
  tools: discoveredTools,
  maxSteps: 5,  // NOT maxToolRoundtrips - enables continuation
  prompt: userPrompt
})
```

### Tool Categories Available
- **Time & Date**: get-current-time, calculate-date-difference
- **File Operations**: read-file, write-file, list-directory
- **AI Analysis**: analyze-ai-usage, benchmark-provider-performance
- **Code Tools**: refactor-code, generate-documentation, debug-ai-output
- **External APIs**: Via 82+ auto-discovered MCP servers

### Performance Characteristics
- **Tool Discovery**: <1 second for 82+ tools
- **Tool Execution**: Individual tools <1ms to 100ms
- **AI Response**: Complete cycle <8 seconds
- **Memory Usage**: Minimal impact with tool caching
- **Error Handling**: Graceful fallback to non-tool responses

## Technology Stack

### Core Technologies

- **TypeScript**: Strongly typed language for development
- **ESM/CommonJS**: Support for both module systems
- **Node.js**: Runtime environment (Node.js 16+)
- **SvelteKit**: Development framework (for package structure)
- **Vite**: Build system
- **Vitest**: Testing framework

### Dependencies

- **AI Provider SDKs** (as peer dependencies):
  - `ai`: Core AI utilities from Vercel
  - `@ai-sdk/openai`: OpenAI integration
  - `@ai-sdk/amazon-bedrock`: Amazon Bedrock integration
  - `@ai-sdk/google-vertex`: Google Vertex AI integration
  - `zod`: Schema validation

## Development Environment

### Setup

```bash
# Clone repository
git clone https://github.com/juspay/neurolink
cd neurolink

# Install dependencies
pnpm install

# Build package
pnpm build

# Run tests
pnpm test
```

### Directory Structure

```
/
├── src/
│   ├── lib/
│   │   ├── core/          # Core interfaces and factory
│   │   ├── providers/     # Provider implementations
│   │   ├── utils/         # Utility functions
│   │   └── index.ts       # Public API
│   ├── test/              # Tests
│   └── app.d.ts           # TypeScript declarations
├── dist/                  # Built package
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
├── svelte.config.js       # SvelteKit configuration
└── package.json           # Package configuration
```

### Key Files

- `src/lib/core/types.ts`: Core interfaces
- `src/lib/core/factory.ts`: Provider factory
- `src/lib/providers/`: Provider implementations
- `src/lib/index.ts`: Public exports
- `src/test/providers.test.ts`: Provider tests

## Technical Decisions

### Why TypeScript?

- Strong typing for better developer experience
- Catch errors at compile time
- Better tooling and IntelliSense support

### Why Factory Pattern?

- Dynamic provider selection at runtime
- Encapsulate provider creation logic
- Easy to extend with new providers

### Why SvelteKit?

- Modern build system with Vite
- Great TypeScript support
- Simple package structure
- Easy testing setup

### Why Peer Dependencies?

- Avoid bundling large dependencies
- Allow users to install only what they need
- Compatible with various package managers

## Technical Constraints

### Browser Compatibility

- ES2020+ JavaScript features
- No direct DOM manipulation
- Works in all modern browsers

### Node.js Compatibility

- Node.js 16.0.0 or higher
- ESM and CommonJS support
- No Node.js-specific features in browser code

### Package Size

- Minimal bundle size
- No unnecessary dependencies
- Tree-shakable exports

### API Limitations

- Limited to text generation capabilities
- No support for embeddings, image generation, etc.
- No direct file handling

## Integration Points

### Provider APIs

- **OpenAI API**: REST API for OpenAI models
- **Amazon Bedrock API**: AWS SDK for Bedrock models
- **Google Vertex AI API**: Google Cloud SDK for Vertex models

### Application Integration

- **Node.js Applications**: Direct import and use
- **Frontend Frameworks**: Use in API routes or client-side
- **Server Environments**: Compatible with all Node.js servers

## Security Considerations

### API Keys

- All API keys stored in environment variables
- No hardcoded credentials
- Clear documentation on securing keys

### Rate Limiting

- Providers have their own rate limits
- No built-in rate limiting
- Documentation on handling rate limits

### Error Handling

- Secure error messages (no leaking of credentials)
- Clear error types for common issues
- Fallback mechanisms for reliability

## Performance Considerations

### Caching

- No built-in caching
- Examples for implementing caching
- Recommendations for production use

### Concurrent Requests

- Support for concurrent requests
- No request queuing or batching
- Each request is independent

### Memory Usage

- Minimal memory footprint
- No large data structures
- Efficient streaming implementation

## Known Technical Debt

1. **Google Vertex AI Anthropic Import**: The Google Vertex AI provider imports `@ai-sdk/google-vertex/anthropic` which is not exported by the Google Vertex package. This needs to be fixed in a future release.

2. **Error Handling Consistency**: Error handling could be more consistent across providers, especially for network errors and rate limiting.

3. **Documentation Coverage**: Not all error scenarios are fully documented with examples.

4. **Test Coverage**: More comprehensive test coverage for edge cases needed.

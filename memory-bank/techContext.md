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
- **Test Files**: `src/test/` directory
- **Test Reports**: `./reports/build-summary.md`, `./reports/test-summary.md`

## Research & Documentation
- **Research Archive**: `./research/ai-analysis-archive.md`
- **Demo Documentation**: `./demo-documentation/`

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

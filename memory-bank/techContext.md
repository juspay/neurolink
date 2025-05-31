# TECH CONTEXT: Zephyr-Mind AI Toolkit

## Technology Stack

### Core Framework
**SvelteKit Library**: Latest version with TypeScript support
- **Framework**: SvelteKit 2.16.0+
- **Language**: TypeScript 5.0+
- **Build Tool**: Vite 6.2.6+
- **Package Manager**: pnpm (preferred)

### AI Provider Integrations
**AI SDK Dependencies** (peer dependencies - user provides):
- `ai`: ^4.0.0 (Vercel AI SDK)
- `@ai-sdk/amazon-bedrock`: ^1.0.0
- `@ai-sdk/openai`: ^1.0.0
- `@ai-sdk/google-vertex`: ^1.0.0
- `zod`: ^3.22.0 (schema validation)

### Development Tools
**Build System**:
- `@sveltejs/package`: Library packaging
- `publint`: Package validation
- `svelte-check`: TypeScript checking
- `vitest`: Testing framework

**Code Quality**:
- `eslint`: Linting
- `prettier`: Code formatting
- TypeScript strict mode enabled

## Environment Configuration

### Required Environment Variables
```bash
# Amazon Bedrock
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# OpenAI
OPENAI_API_KEY=your_openai_key

# Google Vertex AI
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
GOOGLE_VERTEX_PROJECT_ID=your_project_id
GOOGLE_VERTEX_LOCATION=us-central1
```

### Environment Validation
**Runtime Checks**: Provider availability determined by env vars
**Fallback Strategy**: Graceful degradation when providers unavailable
**Error Messages**: Clear guidance for missing configuration

## Build Configuration

### Package.json Configuration
```json
{
  "name": "zephyr-mind",
  "version": "1.0.0",
  "type": "module",
  "svelte": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "import": "./dist/index.js"
    }
  }
}
```

### Build Scripts
- `build`: Full production build
- `prepack`: Prepare for distribution
- `check`: TypeScript validation
- `test`: Run test suite
- `dev`: Development server

### TypeScript Configuration
**Strict Mode**: Enabled for type safety
**Target**: ES2022+ for modern features
**Module**: ESNext for tree shaking
**SvelteKit Integration**: Full type support

## Testing Infrastructure

### Test Framework: Vitest
**Location**: `src/test/providers.test.ts`
**Coverage**: 10 comprehensive tests
**Testing Strategy**:
- Unit tests for provider creation
- Environment validation testing
- Error condition simulation
- Factory method verification

### Test Execution
```bash
npm test          # Run tests once
npm run test:run  # CI mode
```

## Dependency Management

### Peer Dependencies Strategy
**Philosophy**: Users provide AI SDK dependencies
**Benefits**:
- Avoid version conflicts
- Users control SDK versions
- Smaller package size
- Better compatibility

### Development Dependencies Only
**Build Tools**: SvelteKit, Vite, TypeScript
**Testing**: Vitest framework
**Code Quality**: ESLint, Prettier
**Package Tools**: Publint, svelte-package

## Deployment and Distribution

### NPM Package Structure
```
dist/
├── index.js          # Main entry point
├── index.d.ts        # TypeScript definitions
├── core/             # Core modules
├── providers/        # Provider implementations
└── utils/           # Utility functions
```

### Publishing Configuration
**Registry**: NPM public registry
**License**: MIT
**Files**: Only `dist/` directory included
**Side Effects**: CSS files marked as side effects

## Performance Considerations

### Bundle Size Optimization
- Tree-shaking friendly exports
- Minimal runtime dependencies
- Lazy provider initialization
- Clean import/export structure

### Runtime Performance
- Provider creation caching
- Environment check optimization
- Minimal memory footprint
- Fast startup time

## Security Considerations

### Credential Management
**User Responsibility**: API keys provided by users
**No Storage**: No credentials stored in package
**Environment Only**: Configuration via env vars
**Validation**: Runtime checks for required credentials

### Code Security
**No Network Calls**: Package doesn't make direct API calls
**Type Safety**: Full TypeScript coverage prevents many errors
**Input Validation**: Zod schema validation where needed

## Constraints and Limitations

### Platform Support
**Node.js**: 18+ required (for AI SDK compatibility)
**Browsers**: Modern browsers with ESM support
**Environments**: Server-side primary, client-side possible

### AI Provider Limitations
**API Keys Required**: Users must provide their own credentials
**Rate Limits**: Subject to individual provider limits
**Model Availability**: Depends on provider account access
**Costs**: Users responsible for AI service costs

### Package Limitations
**No UI Components**: Library package only, no Svelte components
**No Rate Limiting**: Left to user implementation
**No Caching**: Users implement caching if needed
**No Auth Management**: Basic credential passing only

## Development Workflow

### Local Development
1. Clone repository
2. Install dependencies: `pnpm install`
3. Set environment variables
4. Run tests: `pnpm test`
5. Build package: `pnpm build`

### Continuous Integration
**Testing**: All tests must pass
**Type Checking**: Strict TypeScript validation
**Build Verification**: Package must build successfully
**Linting**: Code quality checks

### Release Process
1. Update version in package.json
2. Run full test suite
3. Build and validate package
4. Publish to NPM registry
5. Tag release in Git

## Integration Guidelines

### Import Patterns
```typescript
// Main factory
import { AIProviderFactory } from 'zephyr-mind';

// Specific providers
import { OpenAI, AmazonBedrock } from 'zephyr-mind';

// Utility functions
import { getBestProvider } from 'zephyr-mind';

// Types
import type { AIProvider, ProviderConfig } from 'zephyr-mind';
```

### Error Handling
**Strategy**: Comprehensive error boundaries
**Messages**: Clear, actionable error descriptions
**Fallback**: Graceful degradation patterns
**Logging**: Console-based for development

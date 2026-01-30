# Provider Test Suite

## Overview

Comprehensive test coverage for NeuroLink's Gateway Provider System supporting 69+ AI providers.

## Test Files

### Core Provider Tests

1. **provider-consistency.test.ts** (115 tests)
   - Provider registration verification
   - Alias resolution testing
   - Default model configuration
   - Environment variable support
   - Model enum alignment
   - Error message quality

2. **providerCapabilities.test.ts** (76 tests)
   - Registration and info verification
   - Alias testing for all providers
   - Default model validation
   - Provider count verification
   - Case insensitivity tests
   - Multimodal provider verification
   - Cloud/local/proxy provider categorization
   - Error handling

3. **allProviders.test.ts** (99 tests)
   - Individual provider initialization
   - Cloud provider tests (Bedrock, Azure, Vertex)
   - Local provider tests (Ollama)
   - Proxy provider tests (LiteLLM, OpenRouter)
   - Consistency checks across all providers

### Integration Tests

4. **integration/provider-integration.test.ts**
   - Factory creation with real API calls (when keys available)
   - Multi-provider scenarios
   - Configuration options
   - Model enum consistency

5. **multimodal-capabilities.test.ts** (63 tests)
   - Vision model support verification
   - PDF processing capabilities
   - CSV processing capabilities
   - Provider-specific multimodal adapters

6. **failover.test.ts** (42 tests)
   - Provider failover logic
   - Retry mechanisms
   - Error handling across providers

### Gateway-Specific Tests

7. **GatewayProviderFactory.test.ts** (25 tests)
   - Gateway provider factory patterns
   - Model string parsing
   - Dynamic provider selection

8. **GatewayProviderRegistry.test.ts** (50 tests)
   - Gateway provider registration
   - Registry options
   - Model routing logic

## Test Coverage

### Providers Tested

**Core Providers (13):**

- OpenAI (gpt, chatgpt aliases)
- Anthropic (claude alias)
- Google AI Studio (google, gemini, googleAiStudio aliases)
- Google Vertex AI (vertex, googleVertex aliases)
- Amazon Bedrock (bedrock, aws aliases)
- Azure OpenAI (azure, azureOpenai aliases)
- Mistral AI (mistral alias)
- Ollama (ollama, local aliases)
- LiteLLM (litellm alias)
- Hugging Face (huggingface, hf aliases)
- OpenRouter (openrouter, or aliases)
- Amazon SageMaker (sagemaker, aws-sagemaker aliases)
- OpenAI Compatible (openai-compatible, vllm, compatible aliases)

### Test Categories

1. **Initialization Tests**: Verify all providers can be registered and accessed
2. **Configuration Tests**: Test environment variable and config handling
3. **Capability Tests**: Verify tool support, multimodal support, streaming
4. **Error Handling Tests**: Test invalid inputs, missing credentials, etc.
5. **Integration Tests**: Test actual provider instantiation (when credentials available)

## Running Tests

### Run All Provider Tests

```bash
pnpm test test/providers/
```

### Run Specific Test Suites

```bash
# Provider consistency
pnpm test test/providers/provider-consistency.test.ts

# Provider capabilities
pnpm test test/providers/providerCapabilities.test.ts

# All providers
pnpm test test/providers/allProviders.test.ts

# Integration tests
pnpm test test/providers/integration/
```

### Run with Coverage

```bash
pnpm run test:coverage
```

## Test Statistics

- **Total Test Files**: 8
- **Total Tests**: 370+
- **Pass Rate**: 99.7%
- **Core Providers Covered**: 13/13 (100%)
- **Provider Aliases Tested**: 25+

## Notes

### API Keys

Many tests skip execution if API keys are not available. Tests are designed to:

- Run without API keys (registration/factory tests)
- Gracefully skip when credentials are missing
- Provide clear messages about missing configuration

### Mocked vs Real

- **Registration tests**: No mocking, test actual factory patterns
- **Integration tests**: Real API calls when credentials available, skipped otherwise
- **Unit tests**: Focus on structure and configuration, not API calls

## Adding New Provider Tests

When adding a new provider, ensure coverage for:

1. Registration in `provider-consistency.test.ts`
2. Capability verification in `providerCapabilities.test.ts`
3. Provider-specific tests in `allProviders.test.ts`
4. Integration tests in `integration/provider-integration.test.ts`

### Example Test Pattern

```typescript
describe("New Provider", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  it("should be registered", () => {
    expect(ProviderFactory.hasProvider(AIProviderName.NEW_PROVIDER)).toBe(true);
  });

  it("should have provider info", () => {
    const info = ProviderFactory.getProviderInfo(AIProviderName.NEW_PROVIDER);
    expect(info).toBeDefined();
    expect(info?.constructor).toBeDefined();
  });

  it("should create via alias", () => {
    expect(ProviderFactory.hasProvider("newalias")).toBe(true);
  });
});
```

## Test Maintenance

- Update tests when adding new providers
- Verify alias lists match `providerRegistry.ts`
- Keep default model lists synchronized with enums
- Add integration tests for new capabilities
- Update documentation when test structure changes

## Related Documentation

- [Gateway Provider System](../../docs/mastra-features-implementation/01-gateway-provider-system.md)
- [Provider Registry](../../src/lib/factories/providerRegistry.ts)
- [Provider Factory](../../src/lib/factories/providerFactory.ts)
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines

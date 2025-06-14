# NeuroLink System Patterns

## Architecture Overview

The NeuroLink toolkit follows a structured architecture based on the following principles:

1. **Interface-Driven Design**: All providers implement a common interface
2. **Factory Pattern**: Providers are created through factory methods
3. **Strategy Pattern**: Different providers can be selected at runtime
4. **Adapter Pattern**: Each provider adapts its specific API to our common interface
5. **Singleton Pattern**: Provider instances are reused when possible

## Core Components

### 1. AIProvider Interface

The central interface that all providers implement:

```typescript
interface AIProvider {
  generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;
  streamText(options: StreamTextOptions): Promise<StreamTextResult>;
}
```

### 2. Provider Implementations

Each provider implements the AIProvider interface:

```
- OpenAI
- AmazonBedrock
- GoogleVertexAI
```

### 3. Factory

The AIProviderFactory creates and manages provider instances:

```typescript
class AIProviderFactory {
  static createProvider(providerName: string, modelName?: string): AIProvider;
  static createBestProvider(
    requestedProvider?: string,
    modelName?: string,
  ): AIProvider;
  static createProviderWithFallback(
    primary: string,
    fallback: string,
    modelName?: string,
  ): {
    primary: AIProvider;
    fallback: AIProvider;
  };
}
```

### 4. Utility Functions

Public utility functions for easier usage:

```typescript
export function createBestAIProvider(
  requestedProvider?: string,
  modelName?: string,
): AIProvider;
export function createAIProviderWithFallback(
  primary: string,
  fallback: string,
  modelName?: string,
): {
  primary: AIProvider;
  fallback: AIProvider;
};
```

## Data Flow

### Text Generation Flow

```
User → AIProviderFactory → Provider → AI Service → Response → User
```

1. User requests text generation
2. AIProviderFactory creates or reuses provider instance
3. Provider transforms request to provider-specific format
4. Provider sends request to AI service
5. Provider transforms response to common format
6. Response is returned to user

### Fallback Flow

```
User → Primary Provider → [Error] → Fallback Provider → Response → User
```

1. User requests text generation with fallback
2. Primary provider attempts request
3. If error occurs, fallback provider is used
4. Fallback provider processes request
5. Response is returned to user

## Provider Selection Logic

The best provider is selected based on the following priorities:

1. Explicitly requested provider (if specified)
2. Environment variable `AI_DEFAULT_PROVIDER` (if set)
3. Available providers in this order:
   - Amazon Bedrock (if AWS credentials available)
   - OpenAI (if API key available)
   - Google Vertex AI (if credentials available)
4. If no providers are available, an error is thrown

## Error Handling Patterns

1. **Provider-Level Error Handling**:

   - Each provider handles provider-specific errors
   - Errors are translated to common error formats
   - Detailed error information is preserved

2. **Factory-Level Error Handling**:

   - Factory detects missing credentials and configuration
   - Factory handles provider creation failures
   - Factory implements fallback mechanisms

3. **User-Level Error Handling**:
   - Clear error messages for common issues
   - Error types for programmatic handling
   - Examples for proper error handling in documentation

## Configuration Patterns

1. **Environment Variables**:

   - Provider API keys and credentials
   - Default provider selection
   - Debug mode

2. **Runtime Configuration**:
   - Model selection
   - Generation parameters (temperature, max tokens, etc.)
   - Provider-specific options

## Testing Patterns

1. **Unit Testing**:

   - Each provider is tested in isolation
   - Mock responses for AI services
   - Error scenarios are tested

2. **Integration Testing**:

   - Factory methods are tested with mock providers
   - Provider selection logic is tested
   - Fallback mechanisms are tested

3. **End-to-End Testing**:
   - Real API calls with test credentials
   - Success and failure scenarios
   - Performance testing

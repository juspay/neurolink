# Providers Module Refactoring

**Status**: `[ ]` Not started  
**Priority**: 🔴 Critical  
**Estimated Effort**: 12-16 hours  
**Prerequisites**: 01-global-imports.md, 02-core-module.md must be completed

## Objective

Refactor all 12+ AI provider implementations in `src/lib/providers/` to achieve strict TypeScript compliance, improve type safety, standardize error handling, and ensure consistent provider interfaces.

## Files to Modify

### Main Provider Index

- `src/lib/providers/index.ts` - Provider registry and exports

### Individual Provider Files (12 providers)

- `src/lib/providers/amazonBedrock.ts` - AWS Bedrock
- `src/lib/providers/amazonSagemaker.ts` - AWS SageMaker
- `src/lib/providers/openAI.ts` - OpenAI
- `src/lib/providers/openaiCompatible.ts` - OpenAI Compatible
- `src/lib/providers/googleVertex.ts` - Google Vertex AI
- `src/lib/providers/googleAiStudio.ts` - Google AI Studio
- `src/lib/providers/anthropic.ts` - Anthropic
- `src/lib/providers/azureOpenai.ts` - Azure OpenAI
- `src/lib/providers/huggingFace.ts` - Hugging Face
- `src/lib/providers/ollama.ts` - Ollama
- `src/lib/providers/mistral.ts` - Mistral
- `src/lib/providers/litellm.ts` - LiteLLM

### SageMaker Subdirectory

- `src/lib/providers/sagemaker/index.ts`
- `src/lib/providers/sagemaker/client.ts`
- `src/lib/providers/sagemaker/config.ts`
- `src/lib/providers/sagemaker/errors.ts`

## Step-by-Step Instructions

### Step 1: Backup and Setup

```bash
# Create feature branch
git checkout -b refactor/providers-module
git add -A
git commit -m "Backup before providers module refactor"
```

### Step 2: Refactor Provider Index (CRITICAL)

**File**: `src/lib/providers/index.ts`

#### 2.1 Improve Provider Registry Types

```typescript
// ❌ Current
export const PROVIDERS = {
  vertex: "GoogleVertexAI",
  bedrock: "AmazonBedrock",
  // ...
} as const;

// ✅ Improve to
export type ProviderKey =
  | "vertex"
  | "bedrock"
  | "sagemaker"
  | "openai"
  | "openai-compatible"
  | "anthropic"
  | "azure"
  | "google-ai"
  | "huggingface"
  | "ollama"
  | "mistral"
  | "litellm";

export type ProviderClassName =
  | "GoogleVertexAI"
  | "AmazonBedrock"
  | "AmazonSageMaker"
  | "OpenAI"
  | "OpenAICompatible"
  | "AnthropicProvider"
  | "AzureOpenAIProvider"
  | "GoogleAIStudio"
  | "HuggingFace"
  | "Ollama"
  | "MistralAI"
  | "LiteLLM";

export const PROVIDERS: Record<ProviderKey, ProviderClassName> = {
  vertex: "GoogleVertexAI",
  bedrock: "AmazonBedrock",
  sagemaker: "AmazonSageMaker",
  openai: "OpenAI",
  "openai-compatible": "OpenAICompatible",
  anthropic: "AnthropicProvider",
  azure: "AzureOpenAIProvider",
  "google-ai": "GoogleAIStudio",
  huggingface: "HuggingFace",
  ollama: "Ollama",
  mistral: "MistralAI",
  litellm: "LiteLLM",
} as const;
```

#### 2.2 Add Provider Metadata Type

```typescript
export type ProviderMetadata = {
  key: ProviderKey;
  name: string;
  className: ProviderClassName;
  description: string;
  supportedModels: string[];
  capabilities: ProviderCapability[];
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  configSchema?: JsonObject;
};

export type ProviderCapability =
  | "text-generation"
  | "streaming"
  | "tool-calling"
  | "image-generation"
  | "embeddings"
  | "function-calling"
  | "multimodal";
```

### Step 3: Create Provider Configuration Types

**File**: `src/lib/providers/types.ts` (create new file)

```typescript
import type { UnknownRecord, JsonValue } from "../types/common";

// Base provider configuration
export type BaseProviderConfig = {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  headers?: Record<string, string>;
  proxy?: ProxyConfig;
};

// Provider-specific configurations
export type BedrockConfig = BaseProviderConfig & {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  profile?: string;
};

export type OpenAIConfig = BaseProviderConfig & {
  organization?: string;
  project?: string;
};

export type VertexConfig = BaseProviderConfig & {
  projectId?: string;
  region?: string;
  credentials?: JsonValue;
  serviceAccountKey?: string;
};

export type AnthropicConfig = BaseProviderConfig & {
  version?: string;
};

export type AzureConfig = BaseProviderConfig & {
  resourceName?: string;
  deploymentName?: string;
  apiVersion?: string;
};

// ... (add more provider-specific configs)

export type ProxyConfig = {
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
  protocol?: "http" | "https";
};

// Union of all provider configs
export type ProviderConfig =
  | BedrockConfig
  | OpenAIConfig
  | VertexConfig
  | AnthropicConfig
  | AzureConfig;
```

### Step 4: Refactor Individual Providers

**For EACH provider file, follow this pattern:**

#### 4.1 Improve Constructor Typing

```typescript
// ❌ Current (example from amazonBedrock.ts)
constructor(
  config?: any,
  modelName?: string,
  options?: any
) {
  // implementation
}

// ✅ Improve to
constructor(
  config?: BedrockConfig,
  modelName?: BedrockModels | string,
  options?: ProviderOptions
) {
  super();
  // implementation with proper typing
}
```

#### 4.2 Add Explicit Return Types

```typescript
// ❌ Current
async stream(optionsOrPrompt: StreamOptions | string, analysisSchema?: ValidationSchema) {
  // implementation
}

// ✅ Add explicit return type
async stream(
  optionsOrPrompt: StreamOptions | string,
  analysisSchema?: ValidationSchema
): Promise<StreamResult> {
  // implementation
}

async generate(
  optionsOrPrompt: TextGenerationOptions | string,
  analysisSchema?: ValidationSchema
): Promise<EnhancedGenerateResult | null> {
  // implementation
}
```

#### 4.3 Improve Error Handling

```typescript
// Add provider-specific error types
export type BedrockError = {
  code: BedrockErrorCode;
  message: string;
  statusCode?: number;
  requestId?: string;
  details?: UnknownRecord;
};

export type BedrockErrorCode =
  | "INVALID_CREDENTIALS"
  | "MODEL_NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "REGION_NOT_SUPPORTED"
  | "QUOTA_EXCEEDED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

// In provider implementation
private handleError(error: unknown): BedrockError {
  if (error instanceof Error) {
    // Type-safe error handling
    return {
      code: this.mapErrorCode(error),
      message: error.message,
      details: { originalError: error.stack }
    };
  }
  // Handle unknown errors
  return {
    code: "UNKNOWN_ERROR",
    message: "An unknown error occurred",
    details: { error: String(error) }
  };
}
```

#### 4.4 Improve Model Configuration

```typescript
// Add provider-specific model validation
private validateModel(modelName: string): modelName is BedrockModels {
  return Object.values(BedrockModels).includes(modelName as BedrockModels);
}

private getModelConfig(modelName: string): ModelConfig {
  if (!this.validateModel(modelName)) {
    throw new Error(`Unsupported Bedrock model: ${modelName}`);
  }

  return {
    name: modelName,
    maxTokens: this.getMaxTokensForModel(modelName),
    supportsStreaming: this.getStreamingSupportForModel(modelName),
    supportsTools: this.getToolsSupportForModel(modelName)
  };
}
```

### Step 5: Refactor SageMaker Module

**Directory**: `src/lib/providers/sagemaker/`

#### 5.1 Improve SageMaker Client Types

**File**: `src/lib/providers/sagemaker/client.ts`

```typescript
// Add specific SageMaker types
export type SageMakerClientConfig = {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  endpoint?: string;
  timeout?: number;
  retries?: number;
};

export type SageMakerInvokeRequest = {
  EndpointName: string;
  Body: string | Uint8Array;
  ContentType: string;
  Accept?: string;
  CustomAttributes?: string;
  TargetModel?: string;
  TargetVariant?: string;
  InferenceId?: string;
};

export type SageMakerInvokeResponse = {
  Body: Uint8Array;
  ContentType?: string;
  InvokedProductionVariant?: string;
  CustomAttributes?: string;
};
```

#### 5.2 Improve SageMaker Configuration

**File**: `src/lib/providers/sagemaker/config.ts`

```typescript
export type SageMakerEndpointConfig = {
  name: string;
  url: string;
  region: string;
  model: string;
  instanceType: string;
  status: EndpointStatus;
  capabilities: SageMakerCapability[];
};

export type EndpointStatus =
  | "InService"
  | "Creating"
  | "Updating"
  | "SystemUpdating"
  | "RollingBack"
  | "Deleting"
  | "Failed"
  | "OutOfService";

export type SageMakerCapability =
  | "real-time"
  | "batch"
  | "multi-model"
  | "async";
```

#### 5.3 Improve SageMaker Error Handling

**File**: `src/lib/providers/sagemaker/errors.ts`

```typescript
export type SageMakerError = {
  code: SageMakerErrorCode;
  message: string;
  statusCode?: number;
  requestId?: string;
  endpointName?: string;
  details?: UnknownRecord;
};

export type SageMakerErrorCode =
  | "MODEL_ERROR"
  | "VALIDATION_ERROR"
  | "ENDPOINT_NOT_FOUND"
  | "CREDENTIALS_ERROR"
  | "NETWORK_ERROR"
  | "THROTTLING_ERROR"
  | "QUOTA_EXCEEDED"
  | "UNKNOWN_ERROR";

export class SageMakerError extends Error {
  constructor(
    public code: SageMakerErrorCode,
    message: string,
    public statusCode?: number,
    public requestId?: string,
    public endpointName?: string,
    public details?: UnknownRecord,
  ) {
    super(message);
    this.name = "SageMakerError";
  }
}
```

### Step 6: Standardize Provider Patterns

**Apply these patterns to ALL provider files:**

#### 6.1 Configuration Validation

```typescript
private validateConfig(config: ProviderConfig): void {
  const required = this.getRequiredConfigFields();
  const missing = required.filter(field => !config[field]);

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required configuration fields: ${missing.join(", ")}`
    );
  }
}

private getRequiredConfigFields(): (keyof ProviderConfig)[] {
  return ["apiKey"]; // Override in each provider
}
```

#### 6.2 Health Checks

```typescript
async healthCheck(): Promise<ProviderHealthStatus> {
  try {
    await this.testConnection();
    return {
      status: "healthy",
      timestamp: Date.now(),
      latency: await this.measureLatency()
    };
  } catch (error) {
    return {
      status: "unhealthy",
      timestamp: Date.now(),
      error: this.handleError(error)
    };
  }
}
```

#### 6.3 Model Support

```typescript
getSupportedModels(): string[] {
  return Object.values(this.getModelEnum());
}

supportsModel(modelName: string): boolean {
  return this.getSupportedModels().includes(modelName);
}

getModelCapabilities(modelName: string): ModelCapability[] {
  if (!this.supportsModel(modelName)) {
    throw new Error(`Model ${modelName} not supported by provider`);
  }

  return this.getModelCapabilityMap()[modelName] || [];
}
```

### Step 7: Provider Factory Integration

**File**: `src/lib/core/factory.ts` (update to use new provider types)

```typescript
// Update factory to use typed provider creation
private static async createProviderInstance<T extends AIProvider>(
  providerKey: ProviderKey,
  config?: ProviderConfig,
  modelName?: string
): Promise<T> {
  const metadata = this.getProviderMetadata(providerKey);

  // Type-safe provider instantiation
  switch (providerKey) {
    case "bedrock":
      const { AmazonBedrockProvider } = await import("../providers/amazonBedrock");
      return new AmazonBedrockProvider(config as BedrockConfig, modelName) as T;

    case "openai":
      const { OpenAIProvider } = await import("../providers/openAI");
      return new OpenAIProvider(config as OpenAIConfig, modelName) as T;

    // ... handle all providers with proper typing

    default:
      throw new Error(`Unknown provider: ${providerKey}`);
  }
}
```

## Validation Checklist

### Compilation Checks

- [ ] All provider files compile without TypeScript errors
- [ ] No import/export errors in providers module
- [ ] Provider index properly exports all providers
- [ ] SageMaker submodule compiles correctly

### Type Safety Checks

- [ ] All provider constructors properly typed
- [ ] All public methods have explicit return types
- [ ] Configuration types are provider-specific
- [ ] Error handling is properly typed
- [ ] No `any` types in provider implementations

### Functionality Checks

- [ ] All providers can be instantiated
- [ ] All providers implement AIProvider interface correctly
- [ ] Error handling works for each provider
- [ ] Model validation works for each provider
- [ ] Health checks work for each provider

### Integration Checks

- [ ] Provider factory can create all providers
- [ ] CLI can use all providers
- [ ] Core module integrates with providers
- [ ] Configuration system works with provider configs

## Verification Commands

```bash
# TypeScript compilation
npx tsc --noEmit

# Build providers module specifically
npx tsc --noEmit src/lib/providers/*.ts

# Test provider instantiation
node -e "
const { AIProviderFactory } = require('./dist/lib/core/factory.js');
console.log('Testing provider creation...');
Promise.all([
  AIProviderFactory.createProvider('openai'),
  AIProviderFactory.createProvider('bedrock'),
  AIProviderFactory.createProvider('vertex')
]).then(() => console.log('✅ All providers created successfully'))
  .catch(err => console.error('❌ Provider creation failed:', err));
"

# Test provider exports
node -e "
const providers = require('./dist/lib/providers/index.js');
console.log('Available providers:', Object.keys(providers));
console.log('Provider registry:', providers.PROVIDERS);
"

# Run provider tests
pnpm test src/test/providers/
```

## Common Issues and Solutions

### Issue 1: Provider Configuration Conflicts

```typescript
// If provider configs conflict with base config
// Solution: Use intersection types
export type SpecificProviderConfig = BaseProviderConfig & {
  providerSpecificField: string;
};
```

### Issue 2: Dynamic Import Typing

```typescript
// If dynamic imports lose typing
// Solution: Use proper import assertions
const { ProviderClass } = (await import("./provider")) as {
  ProviderClass: new (...args: any[]) => AIProvider;
};
```

### Issue 3: Model Enum Conflicts

```typescript
// If model enums conflict between providers
// Solution: Use namespaced enums or const assertions
export const BedrockModels = {
  CLAUDE_3_SONNET: "anthropic.claude-3-sonnet-20240229-v1:0",
  // ...
} as const;

export type BedrockModels = (typeof BedrockModels)[keyof typeof BedrockModels];
```

## Rollback Plan

```bash
# If critical issues arise
git checkout release
git branch -D refactor/providers-module

# Or restore specific provider
git checkout HEAD~1 -- src/lib/providers/openAI.ts
```

## Testing Strategy

### Provider-Specific Tests

```bash
# Test each provider individually
pnpm test src/test/providers/bedrock.test.ts
pnpm test src/test/providers/openai.test.ts
pnpm test src/test/providers/vertex.test.ts
# ... for all providers
```

### Integration Tests

```bash
# Test provider factory
pnpm test src/test/factory/

# Test provider switching
pnpm test src/test/fallback/

# Test provider configurations
pnpm test src/test/config/
```

### Error Handling Tests

```bash
# Test error scenarios
pnpm test src/test/errors/

# Test network failures
pnpm test src/test/network/
```

## Success Criteria

- ✅ All 12+ providers properly typed with TypeScript
- ✅ Zero TypeScript compilation errors in providers module
- ✅ All provider constructors use specific config types
- ✅ All public methods have explicit return types
- ✅ Provider-specific error handling implemented
- ✅ Configuration validation for all providers
- ✅ Health check implementation for all providers
- ✅ Model support validation for all providers
- ✅ SageMaker submodule properly typed
- ✅ Provider factory integrates with typed providers
- ✅ All provider tests pass
- ✅ CLI can use all providers without type errors

## Next Steps

After completing this refactor:

1. **04-cli-module.md** - Refactor CLI module to use new provider types
2. **06-config-module.md** - Update configuration module with new types
3. Update any dependent modules to use new provider types
4. Update documentation with new type information

## Impact Assessment

**High Impact**:

- CLI module will need updates for provider commands
- Configuration module will need provider config updates
- Factory module integration already covered

**Medium Impact**:

- Test files will need type updates
- Utility modules may benefit from provider types

**Low Impact**:

- MCP module (minimal provider dependencies)
- Core analytics (already uses provider interfaces)

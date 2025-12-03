# Providers Module Refactoring

**Status**: `[x]` COMPLETED ✅  
**Priority**: 🟡 Medium (Reduced from Critical)  
**Estimated Effort**: 2-3 hours (Actual: 30 minutes - work was already done)  
**Prerequisites**: 01-global-imports.md, 02-core-module.md (✅ COMPLETED)

**✅ COMPLETION VERIFICATION**:

- ✅ All 12 local interfaces converted to types across 3 provider files
- ✅ amazonBedrock.ts: 4 interfaces → types (BedrockToolUse, BedrockToolResult, BedrockContentBlock, BedrockMessage)
- ✅ googleAiStudio.ts: 7 interfaces → types (GenAILiveMedia, LiveServerMessagePartInlineData, etc.)
- ✅ openaiCompatible.ts: 1 interface → type (ModelsResponse)
- ✅ Provider registry enhanced with type safety utilities
- ✅ All providers use centralized types from src/lib/types/
- ✅ Zero remaining interface declarations in provider files
- ✅ TypeScript compilation passes for provider module
- ✅ No breaking changes to provider functionality

## Objective

**UPDATED SCOPE**: Complete the remaining provider type conversions and ensure consistency across all 14 AI provider implementations in `src/lib/providers/`. The major type system refactoring has already been completed - this focuses on cleaning up remaining local interfaces and ensuring full type safety.

## Current Status Assessment

✅ **COMPLETED**: Major type system refactoring
✅ **COMPLETED**: Centralized types in `src/lib/types/`
✅ **COMPLETED**: BaseProvider pattern implementation
✅ **COMPLETED**: Most interface-to-type conversions

## Files to Modify (Targeted Approach)

### Primary Target Files (Local Interface Cleanup)

- `src/lib/providers/googleAiStudio.ts` - Convert 7 local interfaces
- `src/lib/providers/amazonBedrock.ts` - Convert 4 local interfaces
- `src/lib/providers/openaiCompatible.ts` - Convert 1 local interface
- `src/lib/providers/index.ts` - Enhance type safety

### Provider Count Updated (12 exported providers)

**Exported Providers (from `src/lib/providers/index.ts`):**

- `GoogleVertexAI` (from `googleVertex.ts`) - Google Vertex AI
- `AmazonBedrock` (from `amazonBedrock.ts`) - AWS Bedrock
- `AmazonSageMaker` (from `amazonSagemaker.ts`) - AWS SageMaker (exported class, with implementation helpers in `src/lib/providers/sagemaker/*`)
- `OpenAI` (from `openAI.ts`) - OpenAI
- `OpenAICompatible` (from `openaiCompatible.ts`) - OpenAI Compatible
- `AnthropicProvider` (from `anthropic.ts`) - Anthropic
- `AzureOpenAIProvider` (from `azureOpenai.ts`) - Azure OpenAI
- `GoogleAIStudio` (from `googleAiStudio.ts`) - Google AI Studio
- `HuggingFace` (from `huggingFace.ts`) - Hugging Face
- `Ollama` (from `ollama.ts`) - Ollama
- `MistralAI` (from `mistral.ts`) - Mistral
- `LiteLLM` (from `litellm.ts`) - LiteLLM

**Implementation Files (not directly exported):**

- `src/lib/providers/anthropicBaseProvider.ts` - Anthropic base implementation
- `src/lib/providers/sagemaker/*` - SageMaker implementation helpers

## Step-by-Step Instructions

### Step 1: Setup (Branch Already Created)

```bash
# Current branch: refactor/providers-module
# Repository status: Clean
```

### Step 2: Convert Local Interfaces to Types

#### 2.1 GoogleAI Studio Provider - Convert 7 Local Interfaces

**File**: `src/lib/providers/googleAiStudio.ts`

```typescript
// ❌ Current - Local interfaces
interface GenAILiveMedia {
  // ...
}

interface LiveServerMessagePartInlineData {
  // ...
}

// ✅ Convert to types
type GenAILiveMedia = {
  // ...
};

type LiveServerMessagePartInlineData = {
  // ...
};
```

#### 2.2 Amazon Bedrock Provider - Convert 4 Local Interfaces

**File**: `src/lib/providers/amazonBedrock.ts`

```typescript
// ❌ Current - Local interfaces
interface BedrockToolUse {
  // ...
}

interface BedrockToolResult {
  // ...
}

// ✅ Convert to types
type BedrockToolUse = {
  // ...
};

type BedrockToolResult = {
  // ...
};
```

#### 2.3 OpenAI Compatible Provider - Convert 1 Interface

**File**: `src/lib/providers/openaiCompatible.ts`

```typescript
// ❌ Current
interface ModelsResponse {
  // ...
}

// ✅ Convert to type
type ModelsResponse = {
  // ...
};
```

### Step 3: Enhance Provider Registry Type Safety

**File**: `src/lib/providers/index.ts`

```typescript
// ✅ Current is mostly good - minor enhancements
// Add proper provider metadata types if needed
export type ProviderKey = keyof typeof PROVIDERS;
export type ProviderClassName = (typeof PROVIDERS)[ProviderKey];
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

### Step 4: Validate Type Consistency (Already Mostly Complete)

**Check that all providers use centralized types:**

#### 4.1 Verify Import Statements

```typescript
// ✅ Current pattern (already implemented)
import type { ProviderConfig } from "../types/providers.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { TokenUsage, AnalyticsData } from "../types/providers.js";
```

#### 4.2 Verify Constructor Patterns

```typescript
// ✅ Current pattern (BaseProvider already established)
export class OpenAIProvider extends BaseProvider {
  constructor(modelName?: string, neurolink?: NeuroLink) {
    super(modelName || getOpenAIModel(), AIProviderName.OPENAI, neurolink);
    // implementation
  }
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

### Step 5: Consolidate Provider-Specific Types (COMPLETED)

**File**: `src/lib/types/providers.ts` (already exists and consolidated)

✅ **Provider-specific types successfully consolidated into existing providers.ts:**

- Bedrock types: `BedrockToolUse`, `BedrockToolResult`, `BedrockContentBlock`, `BedrockMessage`
- Google AI Studio Live API types: `GenAILiveMedia`, `LiveConnectCallbacks`, etc.
- OpenAI Compatible types: `ModelsResponse`

✅ **Provider files updated to import from centralized location:**

```typescript
// Provider files now import from the single, consolidated location
import type {
  BedrockToolUse,
  BedrockToolResult,
  // ... other types
} from "../types/providers.js";
```

**Benefits achieved:**

- **No duplication** - Single source of truth for all provider types
- **Centralized management** - All types in one location
- **Type consistency** - Shared types available across providers
- **Maintainability** - Easy to update and extend types

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
- [ ] Local interfaces converted to types

### Type Safety Checks

- [ ] All local interfaces converted to types
- [ ] All imports use centralized type paths
- [ ] No remaining `interface extends` patterns
- [ ] Consistent use of `&` for intersection types
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
pnpm run check

# Build providers module specifically
npx tsc --noEmit src/lib/providers/*.ts

# Search for remaining interfaces
grep -r "interface " src/lib/providers/

# Search for extend patterns
grep -r "extends" src/lib/providers/

# Verify centralized type imports
grep -r "import.*types" src/lib/providers/

# Run provider tests
pnpm test:providers

# Complete build test
pnpm run build
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
pnpm test test/providers/bedrock.test.ts
pnpm test test/providers/openai.test.ts
pnpm test test/providers/vertex.test.ts
# ... for all providers
```

### Integration Tests

```bash
# Test provider factory
pnpm test test/factory/

# Test provider switching
pnpm test test/fallback/

# Test provider configurations
pnpm test test/config/
```

### Error Handling Tests

```bash
# Test error scenarios
pnpm test test/errors/

# Test network failures
pnpm test test/network/
```

## Success Criteria

- ✅ All 14 providers use centralized types from `src/lib/types/`
- ✅ Zero remaining local interfaces in provider files
- ✅ All interface declarations converted to type declarations
- ✅ Zero TypeScript compilation errors in providers module
- ✅ Consistent use of `&` for intersection types instead of `extends`
- ✅ All imports use correct centralized type paths
- ✅ Provider registry enhanced with proper type safety
- ✅ All provider tests pass
- ✅ Build completes successfully
- ✅ No `any` types in provider implementations
- ✅ Clean separation between types and implementation

## Next Steps

After completing this refactor:

1. **04-cli-module.md** - Refactor CLI module to use new provider types
2. **06-config-module.md** - Update configuration module with new types
3. Update any dependent modules to use new provider types
4. Update documentation with new type information

## Impact Assessment

**High Impact**: ✅ ALREADY COMPLETED

- Type system centralization already done
- BaseProvider pattern already implemented
- Core module refactoring already completed

**Medium Impact**: Minimal changes needed

- Local interface cleanup in 3 provider files
- Minor provider registry enhancements

**Low Impact**: No changes needed

- CLI module (already uses centralized types)
- Configuration module (already updated)
- Test files (already use proper types)
- MCP module (no changes needed)

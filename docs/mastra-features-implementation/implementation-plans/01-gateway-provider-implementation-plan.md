# Gateway Provider System - Phased Implementation Plan

## Document Information

| Field             | Value                                               |
| ----------------- | --------------------------------------------------- |
| **Feature**       | Gateway Provider System (Mastra-style Model Router) |
| **Version**       | 1.0.0                                               |
| **Status**        | Draft                                               |
| **Author**        | NeuroLink Engineering                               |
| **Created**       | 2026-01-22                                          |
| **Last Updated**  | 2026-01-22                                          |
| **Reference Doc** | `01-gateway-provider-system.md`                     |

---

## Executive Summary

This implementation plan details the phased approach to add a Mastra-style Gateway Provider System to NeuroLink. The gateway system will provide unified access to 69+ AI providers through a single `"provider/model"` string format, dynamic model discovery via external registries (models.dev, OpenRouter), smart routing (direct API vs gateway), and automatic failover capabilities.

**Key Deliverables:**

- Unified model string format (`"anthropic/claude-3-5-sonnet"`)
- Dynamic model registry with auto-refresh
- Smart routing (direct provider SDK or gateway proxy)
- Automatic fallback chains with retry logic
- Full backward compatibility with existing NeuroLink patterns

**Total Estimated Effort:** 4-5 weeks (1 engineer)

---

## Table of Contents

1. [Prerequisites and Dependencies](#1-prerequisites-and-dependencies)
2. [Phase 1: Core Gateway Interface](#2-phase-1-core-gateway-interface)
3. [Phase 2: Provider Registry Integration](#3-phase-2-provider-registry-integration)
4. [Phase 3: Model Discovery System](#4-phase-3-model-discovery-system)
5. [Phase 4: Dynamic Provider Loading](#5-phase-4-dynamic-provider-loading)
6. [Phase 5: Testing and Documentation](#6-phase-5-testing-and-documentation)
7. [Estimated Effort Per Phase](#7-estimated-effort-per-phase)
8. [Risk Assessment](#8-risk-assessment)
9. [Rollback Strategy](#9-rollback-strategy)
10. [Success Criteria and Validation](#10-success-criteria-and-validation)

---

## 1. Prerequisites and Dependencies

### 1.1 Technical Prerequisites

#### Required Codebase Understanding

- [ ] Familiarity with `ProviderFactory` pattern (`src/lib/factories/providerFactory.ts`)
- [ ] Understanding of `ProviderRegistry` dynamic import pattern (`src/lib/factories/providerRegistry.ts`)
- [ ] Knowledge of `BaseProvider` abstract class (`src/lib/core/baseProvider.ts`)
- [ ] Understanding of NeuroLink SDK class (`src/lib/neurolink.ts`)
- [ ] Familiarity with existing type system (`src/lib/types/`)

#### Existing Components to Leverage

| Component          | Path                                    | Purpose                                     |
| ------------------ | --------------------------------------- | ------------------------------------------- |
| `ProviderFactory`  | `src/lib/factories/providerFactory.ts`  | Provider registration and instantiation     |
| `ProviderRegistry` | `src/lib/factories/providerRegistry.ts` | Dynamic provider registration               |
| `BaseProvider`     | `src/lib/core/baseProvider.ts`          | Abstract provider with common functionality |
| `ModelRegistry`    | `src/lib/models/modelRegistry.ts`       | Static model metadata and pricing           |
| `AIProviderName`   | `src/lib/constants/enums.ts`            | Provider name enumeration                   |
| `ModelInfo`        | `src/lib/types/modelTypes.ts`           | Model information type definitions          |

#### Required Dependencies (Already in Project)

```json
{
  "@ai-sdk/openai": "existing",
  "@ai-sdk/anthropic": "existing",
  "@ai-sdk/google": "existing",
  "@ai-sdk/mistral": "existing",
  "@openrouter/ai-sdk-provider": "existing",
  "zod": "existing"
}
```

#### New Dependencies to Add

```json
{
  "@types/node": "^20.0.0" // For fetch API types if not present
}
```

### 1.2 External Service Dependencies

| Service            | Purpose                       | Required Setup                        |
| ------------------ | ----------------------------- | ------------------------------------- |
| OpenRouter         | Gateway proxy for 300+ models | `OPENROUTER_API_KEY` env var          |
| models.dev         | Dynamic model registry        | No auth required (public API)         |
| LiteLLM (optional) | Self-hosted proxy             | `LITELLM_BASE_URL`, `LITELLM_API_KEY` |

### 1.3 Development Environment Setup

```bash
# Ensure all dependencies are installed
pnpm install

# Verify build passes
pnpm run build

# Verify tests pass
pnpm run test:run

# Ensure environment variables are configured
cp .env.example .env
# Add OPENROUTER_API_KEY to .env for gateway testing
```

### 1.4 Pre-Implementation Checklist

- [ ] Review existing provider implementations in `src/lib/providers/`
- [ ] Understand current model resolution logic
- [ ] Review OpenRouter API documentation
- [ ] Review models.dev API structure
- [ ] Set up test accounts for gateway services
- [ ] Identify models to use for integration testing

### 1.5 Existing NeuroLink Features to Leverage

NeuroLink already provides robust failover and resilience mechanisms that the Gateway implementation should integrate with:

| Component         | File Path                           | Purpose                                                |
| ----------------- | ----------------------------------- | ------------------------------------------------------ |
| MCPCircuitBreaker | `src/lib/mcp/mcpCircuitBreaker.ts`  | Circuit breaker pattern for external service calls     |
| RetryHandler      | `src/lib/mcp/httpRetryHandler.ts`   | Exponential backoff retry with configurable strategies |
| FallbackConfig    | `src/lib/types/externalMcp.ts`      | Configuration types for fallback chains                |
| BaseProvider      | `src/lib/providers/baseProvider.ts` | Abstract provider with error handling patterns         |

**Integration Notes:**

- The Gateway's `FallbackManager` should leverage patterns from `MCPCircuitBreaker` for provider health tracking
- Retry logic should follow the exponential backoff pattern in `RetryHandler`
- Provider-specific error handling should extend `BaseProvider.handleProviderError()`
- Circuit breaker state should be shared across gateway routing decisions

---

## 2. Phase 1: Core Gateway Interface

**Duration:** 3-4 days
**Goal:** Establish the foundational type system and gateway interface

### 2.1 Directory Structure Creation

```bash
# Create gateway module directory
mkdir -p src/lib/gateway
```

**Files to Create:**

```
src/lib/gateway/
├── index.ts                 # Public exports
├── types.ts                 # Gateway-specific type definitions
├── constants.ts             # Gateway constants and defaults
└── errors.ts                # Gateway-specific error classes
```

### 2.2 Task List

#### Task 1.1: Create Gateway Type Definitions

**File:** `src/lib/gateway/types.ts`

```typescript
// Key types to define:
// - GatewayModelInfo (extends existing ModelInfo)
// - GatewayProviderConfig
// - RoutingStrategy
// - FallbackConfig
// - RegistryConfig
// - RegistrySource
// - GatewayOptions
// - ModelSelector (dynamic model selection function)
// - ModelSelectorContext
// - GatewayCapabilities
```

**Acceptance Criteria:**

- [ ] All types are properly exported
- [ ] Types are compatible with existing NeuroLink types
- [ ] JSDoc comments on all public types
- [ ] Types pass TypeScript strict mode

#### Task 1.2: Create Gateway Constants

**File:** `src/lib/gateway/constants.ts`

```typescript
// Constants to define:
// - DEFAULT_REGISTRY_SOURCES
// - DIRECT_PROVIDER_CONFIGS (providers with direct SDK support)
// - GATEWAY_PROVIDER_CONFIGS (providers routed via OpenRouter)
// - DEFAULT_FALLBACK_CONFIG
// - CACHE_TTL_MS
// - REGISTRY_REFRESH_INTERVAL_MS
// - API_TIMEOUT_MS
```

**Acceptance Criteria:**

- [ ] Constants are organized by category
- [ ] Default values are sensible for production use
- [ ] Environment variable overrides where appropriate

#### Task 1.3: Create Gateway Error Classes

**File:** `src/lib/gateway/errors.ts`

```typescript
// Error classes to create:
// - GatewayError (base class)
// - RegistryFetchError
// - ModelNotFoundError
// - RoutingError
// - FallbackExhaustedError
// - ConfigurationError
```

**Acceptance Criteria:**

- [ ] Errors extend NeuroLink base error patterns
- [ ] Include provider/model context in error messages
- [ ] Support error serialization for logging

#### Task 1.4: Create Gateway Index Exports

**File:** `src/lib/gateway/index.ts`

```typescript
// Re-export all public gateway components
export * from "./types.js";
export * from "./constants.js";
export * from "./errors.js";
// Additional exports added in later phases
```

**Acceptance Criteria:**

- [ ] Clean public API surface
- [ ] No internal implementation details exposed
- [ ] Proper `.js` extensions for ESM compatibility

### 2.3 Files to Modify

| File                         | Modification                                       |
| ---------------------------- | -------------------------------------------------- |
| `src/lib/constants/enums.ts` | Add `GATEWAY = "gateway"` to `AIProviderName` enum |
| `src/lib/types/index.ts`     | Add gateway type exports                           |

### 2.4 Phase 1 Deliverables

- [ ] Complete type system for gateway functionality
- [ ] Gateway constants and configuration defaults
- [ ] Gateway-specific error hierarchy
- [ ] Updated `AIProviderName` enum
- [ ] All code passes `pnpm run check`

---

## 3. Phase 2: Provider Registry Integration

**Duration:** 4-5 days
**Goal:** Implement the model router and integrate with existing provider factory

### 3.1 Files to Create

```
src/lib/gateway/
├── modelRouter.ts           # Smart routing logic
├── providerMapper.ts        # Maps providers to SDK/gateway
└── modelStringParser.ts     # Parses "provider/model" format
```

### 3.2 Task List

#### Task 2.1: Create Model String Parser

**File:** `src/lib/gateway/modelStringParser.ts`

**Functionality:**

```typescript
// parseModelString("anthropic/claude-3-5-sonnet")
// Returns: { provider: "anthropic", modelName: "claude-3-5-sonnet" }

// inferProvider("gpt-4o")
// Returns: { provider: "openai", modelName: "gpt-4o" }
```

**Key Functions:**

- `parseModelString(modelString: string): ParsedModel`
- `inferProvider(modelName: string): ParsedModel`
- `normalizeProviderName(provider: string): string`
- `normalizeModelName(modelName: string): string`

**Model Inference Rules:**
| Pattern | Provider |
|---------|----------|
| `gpt-*`, `o1-*`, `o3-*`, `o4-*` | openai |
| `claude-*` | anthropic |
| `gemini-*` | google |
| `mistral-*`, `mixtral-*` | mistral |
| `llama-*` | meta-llama (via OpenRouter) |
| `deepseek-*` | deepseek (via OpenRouter) |

**Acceptance Criteria:**

- [ ] Correctly parses all standard model string formats
- [ ] Handles edge cases (nested slashes, special characters)
- [ ] Falls back gracefully for unknown patterns
- [ ] Unit tests for all parsing scenarios

#### Task 2.2: Create Provider Mapper

**File:** `src/lib/gateway/providerMapper.ts`

**Functionality:**

```typescript
// Maps providers to their routing strategy and SDK info

type ProviderMapping = {
  providerId: string;
  displayName: string;
  sdkPackage?: string; // "@ai-sdk/openai"
  authEnvVar: string; // "OPENAI_API_KEY"
  routingStrategy: RoutingStrategy;
  supportsDirectRouting: boolean;
  neuroLinkProviderName?: AIProviderName;
};
```

**Key Functions:**

- `getProviderMapping(providerId: string): ProviderMapping | undefined`
- `getRoutingStrategy(providerId: string): RoutingStrategy`
- `hasDirectSupport(providerId: string): boolean`
- `getAuthEnvVar(providerId: string): string | undefined`
- `isProviderConfigured(providerId: string): boolean`

**Provider Categories:**
| Category | Examples | Routing |
|----------|----------|---------|
| Direct SDK | OpenAI, Anthropic, Google, Mistral | Direct to provider API |
| OpenRouter Gateway | Groq, Together, Perplexity, DeepSeek | Via OpenRouter |
| LiteLLM Gateway | Custom, self-hosted | Via LiteLLM proxy |
| Existing NeuroLink | Bedrock, Azure, Vertex, Ollama | Via existing providers |

**Acceptance Criteria:**

- [ ] All 13 existing NeuroLink providers mapped
- [ ] Additional gateway-only providers mapped
- [ ] Environment variable detection for API keys
- [ ] Clear fallback rules

#### Task 2.3: Create Model Router

**File:** `src/lib/gateway/modelRouter.ts`

**Functionality:**

```typescript
export class ModelRouter {
  // Parse and route model strings
  parseModelString(modelString: string): ParsedModel;

  // Determine optimal routing strategy
  getRoutingStrategy(provider: string): RoutingStrategy;

  // Create model instance with smart routing
  async createModel(
    modelString: string,
    options?: GatewayOptions,
  ): Promise<LanguageModelV1>;

  // Route via direct provider SDK
  private async createDirectModel(
    provider: string,
    modelName: string,
  ): Promise<LanguageModelV1>;

  // Route via OpenRouter gateway
  private createOpenRouterModel(modelString: string): LanguageModelV1;

  // Route via LiteLLM proxy
  private createLiteLLMModel(modelString: string): LanguageModelV1;

  // Get model info from registry
  async getModelInfo(
    modelString: string,
  ): Promise<GatewayModelInfo | undefined>;

  // Check model capabilities
  async supportsCapability(
    modelString: string,
    capability: string,
  ): Promise<boolean>;
}
```

**Routing Decision Tree:**

```
1. Parse model string -> { provider, modelName }
2. Check if provider has direct SDK support in NeuroLink
3. If yes, check if API key is configured
4. If API key present, route directly
5. If no direct support or no API key, route via OpenRouter
6. If OpenRouter not configured, try LiteLLM
7. If all fail, throw ConfigurationError
```

**Acceptance Criteria:**

- [ ] Correct routing for all provider categories
- [ ] Graceful fallback when direct routing unavailable
- [ ] Proper error messages for missing configuration
- [ ] Logging of routing decisions

#### Task 2.4: Integrate with ProviderFactory

**File to Modify:** `src/lib/factories/providerRegistry.ts`

**Changes:**

```typescript
// Add gateway provider registration
ProviderFactory.registerProvider(
  AIProviderName.GATEWAY,
  async (modelName?, _providerName?, sdk?) => {
    const { GatewayProvider } = await import("../gateway/gatewayProvider.js");
    return new GatewayProvider(modelName || "openai/gpt-4o", sdk);
  },
  "openai/gpt-4o",
  ["gateway", "router", "universal", "mastra"],
);
```

**Acceptance Criteria:**

- [ ] Gateway provider registered with factory
- [ ] Aliases include "gateway", "router", "universal"
- [ ] Default model is sensible fallback
- [ ] Dynamic import maintains no circular dependencies

### 3.3 Phase 2 Deliverables

- [ ] Model string parser with full test coverage
- [ ] Provider mapper with all providers configured
- [ ] Model router with smart routing logic
- [ ] Gateway provider registered in factory
- [ ] All code passes `pnpm run check` and `pnpm run lint`

---

## 4. Phase 3: Model Discovery System

**Duration:** 4-5 days
**Goal:** Implement dynamic model registry fetching from external sources

### 4.1 Files to Create

```
src/lib/gateway/
├── registryFetcher.ts       # Fetches from external registries
├── registryCache.ts         # In-memory cache with TTL
├── registryParsers.ts       # Parses different registry formats
└── modelSearch.ts           # Search and filter models
```

### 4.2 Task List

#### Task 3.1: Create Registry Cache

**File:** `src/lib/gateway/registryCache.ts`

**Functionality:**

```typescript
export class RegistryCache {
  private cache: Map<string, CacheEntry<GatewayModelInfo[]>>;

  constructor(options?: CacheOptions);

  // Get cached models
  get(key: string): GatewayModelInfo[] | undefined;

  // Set models with TTL
  set(key: string, models: GatewayModelInfo[], ttlMs?: number): void;

  // Check if cache entry is valid
  has(key: string): boolean;

  // Invalidate specific key
  invalidate(key: string): void;

  // Clear all cache
  clear(): void;

  // Get cache statistics
  getStats(): CacheStats;
}

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttlMs: number;
};

type CacheOptions = {
  defaultTtlMs: number;
  maxEntries: number;
  cleanupIntervalMs: number;
};
```

**Acceptance Criteria:**

- [ ] TTL-based cache expiration
- [ ] Memory-efficient storage
- [ ] Thread-safe operations
- [ ] Configurable limits

#### Task 3.2: Create Registry Parsers

**File:** `src/lib/gateway/registryParsers.ts`

**Functionality:**

```typescript
// Parser for models.dev API response
export function parseModelsDevResponse(data: unknown): GatewayModelInfo[];

// Parser for OpenRouter API response
export function parseOpenRouterResponse(data: unknown): GatewayModelInfo[];

// Parser for custom registry format
export function parseCustomRegistry(
  data: unknown,
  schema: RegistrySchema,
): GatewayModelInfo[];

// Merge models from multiple sources (deduplication)
export function mergeModelSources(
  sources: GatewayModelInfo[][],
  priorityOrder: string[],
): GatewayModelInfo[];
```

**models.dev Response Structure:**

```typescript
type ModelsDevResponse = {
  models: Array<{
    id: string;
    provider: string;
    name: string;
    description?: string;
    context_length?: number;
    max_output_tokens?: number;
    pricing?: { input: number; output: number };
    capabilities?: Record<string, boolean>;
    parameters?: string[];
  }>;
};
```

**OpenRouter Response Structure:**

```typescript
type OpenRouterModelsResponse = {
  data: Array<{
    id: string; // "anthropic/claude-3-5-sonnet"
    name: string;
    description?: string;
    context_length?: number;
    pricing?: { prompt: string; completion: string };
    supported_parameters?: string[];
  }>;
};
```

**Acceptance Criteria:**

- [ ] Correct parsing for each registry format
- [ ] Proper type conversion (strings to numbers, etc.)
- [ ] Graceful handling of missing fields
- [ ] Consistent output format

#### Task 3.3: Create Registry Fetcher

**File:** `src/lib/gateway/registryFetcher.ts`

**Functionality:**

```typescript
export class RegistryFetcher {
  private cache: RegistryCache;
  private config: RegistryConfig;
  private fetchPromise: Promise<GatewayModelInfo[]> | null;

  constructor(config?: Partial<RegistryConfig>);

  // Get all models (cached or fresh)
  async getModels(): Promise<GatewayModelInfo[]>;

  // Get models for specific provider
  async getProviderModels(provider: string): Promise<GatewayModelInfo[]>;

  // Get specific model info
  async getModel(modelId: string): Promise<GatewayModelInfo | undefined>;

  // Search models
  async searchModels(query: string): Promise<GatewayModelInfo[]>;

  // Force refresh
  async refresh(): Promise<void>;

  // Private: Fetch from all sources
  private async fetchFromSources(): Promise<GatewayModelInfo[]>;

  // Private: Fetch from single source
  private async fetchFromSource(
    source: RegistrySource,
  ): Promise<GatewayModelInfo[]>;
}
```

**Fetch Strategy:**

1. Check cache for valid entry
2. If valid, return cached models
3. If invalid or missing, deduplicate concurrent fetches
4. Fetch from all configured sources in parallel
5. Parse responses using appropriate parsers
6. Merge and deduplicate models
7. Cache result
8. Return models

**Acceptance Criteria:**

- [ ] Caching with configurable TTL
- [ ] Deduplication of concurrent fetch requests
- [ ] Parallel fetching from multiple sources
- [ ] Timeout handling for slow sources
- [ ] Graceful degradation when sources fail
- [ ] Logging of fetch operations

#### Task 3.4: Create Model Search

**File:** `src/lib/gateway/modelSearch.ts`

**Functionality:**

```typescript
export class ModelSearch {
  constructor(private fetcher: RegistryFetcher);

  // Search by query string
  async search(query: string, options?: SearchOptions): Promise<ModelSearchResult[]>;

  // Filter by criteria
  async filter(filters: ModelSearchFilters): Promise<GatewayModelInfo[]>;

  // Find best match for use case
  async findBestMatch(useCase: string, constraints?: SearchConstraints): Promise<GatewayModelInfo | undefined>;

  // Get models by capability
  async getByCapability(capability: string): Promise<GatewayModelInfo[]>;

  // Compare models
  async compare(modelIds: string[]): Promise<ModelComparison>;
}

type SearchOptions = {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'name' | 'provider' | 'cost';
  sortOrder?: 'asc' | 'desc';
};
```

**Search Algorithm:**

1. Tokenize query string
2. Match against model id, name, description, aliases
3. Score matches by relevance
4. Apply filters
5. Sort by score/criteria
6. Return paginated results

**Acceptance Criteria:**

- [ ] Fuzzy matching for typos
- [ ] Relevance-based ranking
- [ ] Filter by capabilities, provider, cost
- [ ] Pagination support
- [ ] Performance < 100ms for 2000 models

### 4.3 Phase 3 Deliverables

- [ ] Registry cache with TTL and cleanup
- [ ] Parsers for models.dev and OpenRouter formats
- [ ] Registry fetcher with caching and refresh
- [ ] Model search with filtering and ranking
- [ ] Integration tests with mocked API responses

---

## 5. Phase 4: Dynamic Provider Loading

**Duration:** 5-6 days
**Goal:** Implement the GatewayProvider class and fallback system

### 5.1 Files to Create

```
src/lib/gateway/
├── gatewayProvider.ts       # Main gateway provider class
├── fallbackManager.ts       # Automatic failover handling
└── gatewayClient.ts         # OpenRouter/LiteLLM client wrapper
```

### 5.2 Task List

#### Task 4.1: Create Gateway Client

**File:** `src/lib/gateway/gatewayClient.ts`

**Functionality:**

```typescript
export class GatewayClient {
  private openRouterClient: ReturnType<typeof createOpenAI> | null;
  private litellmClient: ReturnType<typeof createOpenAI> | null;

  constructor();

  // Get OpenRouter client (lazy initialization)
  getOpenRouterClient(): ReturnType<typeof createOpenAI>;

  // Get LiteLLM client (lazy initialization)
  getLiteLLMClient(): ReturnType<typeof createOpenAI>;

  // Create model via OpenRouter
  createOpenRouterModel(modelString: string): LanguageModelV1;

  // Create model via LiteLLM
  createLiteLLMModel(modelString: string): LanguageModelV1;

  // Check if gateway is configured
  isOpenRouterConfigured(): boolean;
  isLiteLLMConfigured(): boolean;
}
```

**OpenRouter Configuration:**

```typescript
createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://neurolink.dev",
    "X-Title": process.env.OPENROUTER_APP_NAME || "NeuroLink",
  },
});
```

**Acceptance Criteria:**

- [ ] Lazy client initialization
- [ ] Proper header configuration
- [ ] Environment variable validation
- [ ] Clear error messages for missing config

#### Task 4.2: Create Fallback Manager

**File:** `src/lib/gateway/fallbackManager.ts`

**Functionality:**

```typescript
export class FallbackManager {
  private defaultConfig: FallbackConfig;

  constructor(config?: Partial<FallbackConfig>);

  // Execute with fallback chain
  async executeWithFallback<T>(
    primaryModel: string,
    operation: (model: LanguageModelV1) => Promise<T>,
    config?: FallbackConfig,
  ): Promise<FallbackResult<T>>;

  // Create model with automatic fallback
  async createModelWithFallback(
    primaryModel: string,
    fallbackModels: string[],
  ): Promise<LanguageModelV1>;

  // Check if error is retriable
  private isRetriableError(error: Error): boolean;

  // Execute with timeout
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout?: number,
  ): Promise<T>;

  // Delay between retries
  private delay(ms: number): Promise<void>;
}

type FallbackResult<T> = {
  result: T;
  modelUsed: string;
  attempts: FallbackAttempt[];
};

type FallbackAttempt = {
  model: string;
  attempt: number;
  error?: Error;
  duration: number;
};
```

**Retriable Errors:**
| Error Pattern | Retriable |
|---------------|-----------|
| Rate limit / 429 | Yes (with backoff) |
| Timeout | Yes |
| 502, 503 | Yes |
| Server overloaded | Yes |
| Invalid API key | No |
| Model not found | No |
| 400 Bad request | No |

**Acceptance Criteria:**

- [ ] Configurable retry count and delay
- [ ] Exponential backoff for rate limits
- [ ] Detailed attempt logging
- [ ] Clear error aggregation
- [ ] Timeout handling per attempt

#### Task 4.3: Create Gateway Provider

**File:** `src/lib/gateway/gatewayProvider.ts`

**Functionality:**

```typescript
export class GatewayProvider extends BaseProvider {
  private modelString: string;
  private modelSelector?: ModelSelector;
  private fallbackConfig?: FallbackConfig;
  private resolvedModel?: LanguageModelV1;
  private router: ModelRouter;
  private fallbackManager: FallbackManager;

  constructor(
    modelOrSelector: string | ModelSelector,
    sdk?: NeuroLink,
    options?: GatewayProviderOptions,
  );

  // BaseProvider abstract implementations
  protected getProviderName(): AIProviderName;
  protected getDefaultModel(): string;
  protected getAISDKModel(): Promise<LanguageModelV1>;
  protected executeStream(options: StreamOptions): Promise<StreamResult>;
  public handleProviderError(error: unknown): Error;

  // Gateway-specific methods
  async getModelInfo(): Promise<GatewayModelInfo | undefined>;
  async supportsCapability(capability: string): Promise<boolean>;
  async getAvailableModels(): Promise<string[]>;
  async searchModels(query: string): Promise<GatewayModelInfo[]>;

  // Factory methods
  withModel(modelString: string): GatewayProvider;
  withFallback(config: FallbackConfig): GatewayProvider;
}
```

**Key Implementation Details:**

1. **Dynamic Model Selection:**

```typescript
protected async getAISDKModel(): Promise<LanguageModelV1> {
  // Resolve dynamic model if using selector
  let modelToUse = this.modelString;

  if (this.modelSelector) {
    const availableModels = await this.router.getAvailableModels();
    modelToUse = this.modelSelector({
      availableModels,
      runtimeContext: this.neurolink?.getRuntimeContext?.()
    });
  }

  // Create with fallback if configured
  if (this.fallbackConfig) {
    return this.fallbackManager.createModelWithFallback(
      modelToUse,
      this.fallbackConfig.models
    );
  }

  return this.router.createModel(modelToUse);
}
```

2. **Error Handling:**

```typescript
public handleProviderError(error: unknown): Error {
  const err = error as Error;
  const message = err?.message || String(error);

  // Add gateway context
  const gatewayError = new GatewayError(
    `[Gateway: ${this.modelString}] ${message}`,
    { originalError: err, modelString: this.modelString }
  );

  return gatewayError;
}
```

**Acceptance Criteria:**

- [ ] Properly extends BaseProvider
- [ ] Implements all abstract methods
- [ ] Dynamic model selection works
- [ ] Fallback chains work
- [ ] Error handling includes context
- [ ] Compatible with existing NeuroLink patterns

#### Task 4.4: Update NeuroLink Class

**File to Modify:** `src/lib/neurolink.ts`

**Changes:**

````typescript
// Add to imports
import type { GatewayProvider } from "./gateway/gatewayProvider.js";
import type { FallbackConfig, ModelSelector } from "./gateway/types.js";

// Add to class
export class NeuroLink {
  // ... existing code ...

  /**
   * Create a gateway provider with unified model string
   *
   * @example
   * ```typescript
   * const result = await neurolink.gateway("anthropic/claude-3-5-sonnet")
   *   .generate({ prompt: "Hello" });
   * ```
   */
  gateway(
    model: string | ModelSelector,
    options?: { fallback?: FallbackConfig },
  ): GatewayProvider {
    // Dynamic import to avoid circular dependencies
    const { GatewayProvider } = require("./gateway/gatewayProvider.js");
    return new GatewayProvider(model, this, options);
  }

  /**
   * Quick generate with gateway routing
   * Shorthand for common use case
   */
  async gen(
    model: string,
    prompt: string,
    options?: GenerateOptions,
  ): Promise<GenerateResult> {
    return this.gateway(model).generate({ prompt, ...options });
  }
}
````

**Acceptance Criteria:**

- [ ] `gateway()` method available on NeuroLink instance
- [ ] `gen()` shorthand works correctly
- [ ] Dynamic import prevents circular dependencies
- [ ] TypeScript types are correct

### 5.3 Phase 4 Deliverables

- [ ] Gateway client for OpenRouter/LiteLLM
- [ ] Fallback manager with retry logic
- [ ] GatewayProvider extending BaseProvider
- [ ] NeuroLink integration with `gateway()` method
- [ ] End-to-end generation working via gateway

---

## 6. Phase 5: Testing and Documentation

**Duration:** 4-5 days
**Goal:** Comprehensive testing and documentation

### 6.1 Test Files to Create

```
test/gateway/
├── modelStringParser.test.ts
├── providerMapper.test.ts
├── modelRouter.test.ts
├── registryCache.test.ts
├── registryFetcher.test.ts
├── registryParsers.test.ts
├── fallbackManager.test.ts
├── gatewayProvider.test.ts
└── integration/
    ├── gateway-openrouter.test.ts
    ├── gateway-direct.test.ts
    └── gateway-fallback.test.ts
```

### 6.2 Task List

#### Task 5.1: Unit Tests for Core Components

**modelStringParser.test.ts:**

```typescript
describe("ModelStringParser", () => {
  describe("parseModelString", () => {
    test("parses provider/model format", () => {
      expect(parseModelString("anthropic/claude-3-5-sonnet")).toEqual({
        provider: "anthropic",
        modelName: "claude-3-5-sonnet",
      });
    });

    test("parses nested model names", () => {
      expect(parseModelString("meta-llama/llama-3.1-70b-instruct")).toEqual({
        provider: "meta-llama",
        modelName: "llama-3.1-70b-instruct",
      });
    });

    test("handles model-only strings", () => {
      expect(parseModelString("gpt-4o")).toEqual({
        provider: "openai",
        modelName: "gpt-4o",
      });
    });
  });

  describe("inferProvider", () => {
    test.each([
      ["gpt-4o", "openai"],
      ["o3-mini", "openai"],
      ["claude-3-5-sonnet", "anthropic"],
      ["gemini-2-flash", "google"],
      ["mistral-large", "mistral"],
    ])("infers %s as %s", (model, provider) => {
      expect(inferProvider(model).provider).toBe(provider);
    });
  });
});
```

**registryFetcher.test.ts:**

```typescript
describe('RegistryFetcher', () => {
  const mockModelsDevResponse = { models: [...] };
  const mockOpenRouterResponse = { data: [...] };

  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation(...);
  });

  test('fetches and caches models', async () => {
    const fetcher = new RegistryFetcher();
    const models = await fetcher.getModels();

    expect(models.length).toBeGreaterThan(0);
    expect(fetch).toHaveBeenCalledTimes(2); // Both sources

    // Second call should use cache
    await fetcher.getModels();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('deduplicates concurrent fetches', async () => {
    const fetcher = new RegistryFetcher();

    await Promise.all([
      fetcher.getModels(),
      fetcher.getModels(),
      fetcher.getModels(),
    ]);

    expect(fetch).toHaveBeenCalledTimes(2); // Only once per source
  });

  test('handles source failures gracefully', async () => {
    vi.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockOpenRouterResponse);

    const fetcher = new RegistryFetcher();
    const models = await fetcher.getModels();

    expect(models.length).toBeGreaterThan(0); // Still returns from working source
  });
});
```

**Acceptance Criteria:**

- [ ] 90%+ code coverage for gateway module
- [ ] All edge cases covered
- [ ] Mocked external dependencies
- [ ] Fast test execution (< 30s total)

#### Task 5.2: Integration Tests

**gateway-openrouter.test.ts:**

```typescript
describe("Gateway OpenRouter Integration", () => {
  // Skip if no API key
  const hasApiKey = !!process.env.OPENROUTER_API_KEY;

  test.skipIf(!hasApiKey)("routes to OpenRouter", async () => {
    const neurolink = new NeuroLink();
    const result = await neurolink
      .gateway("groq/llama-3.1-70b")
      .generate({ prompt: "Say hello" });

    expect(result.content).toBeTruthy();
    expect(result.provider).toContain("gateway");
  });

  test.skipIf(!hasApiKey)("handles fallback chain", async () => {
    const neurolink = new NeuroLink();
    const result = await neurolink
      .gateway("invalid/model", {
        fallback: {
          models: ["openai/gpt-4o-mini"],
          retries: 1,
        },
      })
      .generate({ prompt: "Say hello" });

    expect(result.content).toBeTruthy();
  });
});
```

**Acceptance Criteria:**

- [ ] Tests pass with valid API keys
- [ ] Tests skip gracefully without API keys
- [ ] Covers direct routing, gateway routing, fallback
- [ ] Tests actual API responses (not mocked)

#### Task 5.3: CLI Integration

**Files to Modify:**

- `src/cli/commands/generate.ts`
- `src/cli/factories/commandFactory.ts`

**Changes:**

```typescript
// In generate command
if (model && model.includes("/")) {
  // Use gateway routing for provider/model format
  const gatewayProvider = neurolink.gateway(model, {
    fallback: fallback ? { models: fallback, retries: 2 } : undefined,
  });

  const result = await gatewayProvider.generate({ prompt });
  console.log(result.content);
} else {
  // Use traditional provider routing
  // ... existing code ...
}
```

**CLI Usage:**

```bash
# Gateway format
neurolink generate "Hello" --model anthropic/claude-3-5-sonnet

# With fallbacks
neurolink generate "Hello" \
  --model openai/gpt-4o \
  --fallback anthropic/claude-3-5-sonnet \
  --fallback google/gemini-2-flash

# List available models
neurolink models list --filter vision --source gateway
```

**Acceptance Criteria:**

- [ ] CLI detects and uses gateway format
- [ ] Fallback flag works correctly
- [ ] Help text updated
- [ ] Error messages are user-friendly

#### Task 5.4: Documentation

**Files to Create:**

- `docs/features/gateway-provider.md`
- `docs/sdk/api-reference.md` (update)

**Documentation Structure:**

```markdown
# Gateway Provider System

## Overview

Access 69+ AI providers through a unified interface.

## Quick Start

- Basic usage
- Model string format
- Fallbacks

## API Reference

- `neurolink.gateway()`
- `neurolink.gen()`
- GatewayProvider class
- Configuration options

## Routing Strategies

- Direct routing
- OpenRouter gateway
- LiteLLM proxy

## Model Discovery

- Available models
- Searching models
- Model capabilities

## Error Handling

- Fallback chains
- Retry logic
- Error types

## Migration Guide

- From individual providers
- From Mastra

## Examples

- Basic generation
- Streaming
- With tools
- Dynamic model selection
```

**Acceptance Criteria:**

- [ ] Clear quick start guide
- [ ] Complete API documentation
- [ ] Migration guide from existing patterns
- [ ] Code examples for all features
- [ ] Troubleshooting section

### 6.3 Phase 5 Deliverables

- [ ] Complete unit test suite
- [ ] Integration tests with real APIs
- [ ] CLI integration working
- [ ] Comprehensive documentation
- [ ] Examples and migration guide

---

## 7. Estimated Effort Per Phase

| Phase                                      | Duration       | Complexity | Dependencies |
| ------------------------------------------ | -------------- | ---------- | ------------ |
| **Phase 1:** Core Gateway Interface        | 3-4 days       | Medium     | None         |
| **Phase 2:** Provider Registry Integration | 4-5 days       | High       | Phase 1      |
| **Phase 3:** Model Discovery System        | 4-5 days       | High       | Phase 2      |
| **Phase 4:** Dynamic Provider Loading      | 5-6 days       | Very High  | Phase 2, 3   |
| **Phase 5:** Testing and Documentation     | 4-5 days       | Medium     | Phase 4      |
| **Buffer/Contingency**                     | 2-3 days       | -          | -            |
| **Total**                                  | **22-28 days** |            |              |

### Effort Breakdown by Task Type

| Task Type              | Estimated Hours     |
| ---------------------- | ------------------- |
| Type definitions       | 8h                  |
| Core implementation    | 60h                 |
| Testing                | 24h                 |
| Documentation          | 12h                 |
| Code review/refinement | 16h                 |
| Integration/debugging  | 16h                 |
| **Total**              | **136h (~4 weeks)** |

### Resource Requirements

| Resource    | Requirement                               |
| ----------- | ----------------------------------------- |
| Engineers   | 1 senior developer                        |
| API Keys    | OpenRouter (required), LiteLLM (optional) |
| Test Budget | ~$50 for API testing                      |
| Review Time | 2h per phase from senior engineer         |

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk                           | Probability | Impact | Mitigation                                        |
| ------------------------------ | ----------- | ------ | ------------------------------------------------- |
| **Circular dependency issues** | Medium      | High   | Strict dynamic imports, careful module boundaries |
| **External API changes**       | Low         | Medium | Version pinning, fallback parsers                 |
| **Performance degradation**    | Medium      | Medium | Caching, lazy loading, benchmarking               |
| **Type system complexity**     | Medium      | Low    | Incremental type refinement, strict mode          |
| **OpenRouter rate limits**     | Low         | Medium | Rate limiting, request queuing                    |

### 8.2 Integration Risks

| Risk                            | Probability | Impact | Mitigation                                  |
| ------------------------------- | ----------- | ------ | ------------------------------------------- |
| **Breaking existing providers** | Low         | High   | No modifications to existing provider files |
| **CLI regression**              | Low         | Medium | Feature flag, comprehensive CLI tests       |
| **SDK backward compatibility**  | Low         | High   | Additive-only API, no breaking changes      |

### 8.3 Operational Risks

| Risk                       | Probability | Impact | Mitigation                                 |
| -------------------------- | ----------- | ------ | ------------------------------------------ |
| **Registry unavailable**   | Low         | Medium | Fallback to static registry, cached data   |
| **Gateway service outage** | Low         | High   | Direct routing fallback, multiple gateways |
| **Increased API costs**    | Medium      | Low    | Cost tracking, usage documentation         |

### 8.4 Risk Monitoring

**Health Checks:**

- Registry fetch success rate
- Gateway routing success rate
- Average routing latency
- Fallback trigger frequency

**Alerts:**

- Registry fetch failures > 3 consecutive
- Gateway error rate > 5%
- P95 latency > 500ms

---

## 9. Rollback Strategy

### 9.1 Feature Flag Approach

```typescript
// Environment variable control
const GATEWAY_ENABLED = process.env.NEUROLINK_GATEWAY_ENABLED !== 'false';

// In NeuroLink class
gateway(model: string | ModelSelector, options?: GatewayOptions): AIProvider {
  if (!GATEWAY_ENABLED) {
    throw new Error('Gateway provider is currently disabled. Use individual providers.');
  }
  // ... implementation
}
```

### 9.2 Rollback Levels

| Level                    | Trigger         | Action                                            |
| ------------------------ | --------------- | ------------------------------------------------- |
| **L1: Soft Disable**     | Minor issues    | Set `NEUROLINK_GATEWAY_ENABLED=false`             |
| **L2: Version Rollback** | Major bugs      | `pnpm install @juspay/neurolink@previous-version` |
| **L3: Code Revert**      | Critical issues | Git revert gateway commits                        |

### 9.3 Rollback Procedure

1. **Detect Issue**
   - Monitor error rates
   - User reports
   - Integration test failures

2. **Assess Impact**
   - Determine scope (gateway only or broader)
   - Check if existing providers affected

3. **Execute Rollback**

   ```bash
   # L1: Disable feature
   export NEUROLINK_GATEWAY_ENABLED=false

   # L2: Version rollback
   pnpm install @juspay/neurolink@8.36.0

   # L3: Code revert
   git revert <gateway-commits>
   pnpm run build
   pnpm publish
   ```

4. **Verify Recovery**
   - Run smoke tests
   - Check existing provider functionality
   - Monitor error rates

5. **Post-Mortem**
   - Document root cause
   - Create fix plan
   - Update test coverage

### 9.4 Data Preservation

**No data migration required** - Gateway is additive functionality:

- Existing provider configurations preserved
- Existing code continues to work
- No database schema changes
- No configuration file changes

---

## 10. Success Criteria and Validation

### 10.1 Functional Success Criteria

| Criteria                    | Measurement                     | Target |
| --------------------------- | ------------------------------- | ------ |
| **Model string parsing**    | Unit test pass rate             | 100%   |
| **Provider routing**        | Correct routing decisions       | 100%   |
| **Direct provider support** | All 13 providers work           | 13/13  |
| **Gateway routing**         | OpenRouter integration works    | Pass   |
| **Fallback chains**         | Automatic failover works        | Pass   |
| **Model discovery**         | Models fetchable and searchable | Pass   |
| **Backward compatibility**  | Existing tests still pass       | 100%   |

### 10.2 Performance Success Criteria

| Metric                       | Target  | Measurement Method      |
| ---------------------------- | ------- | ----------------------- |
| **Cold start latency**       | < 500ms | First gateway() call    |
| **Model resolution**         | < 50ms  | parseModelString()      |
| **Registry fetch**           | < 3s    | getModels() cold        |
| **Cached registry access**   | < 5ms   | getModels() warm        |
| **Direct routing overhead**  | < 10ms  | vs traditional provider |
| **Gateway routing overhead** | < 100ms | vs direct routing       |

### 10.3 Quality Success Criteria

| Metric                | Target    | Measurement                |
| --------------------- | --------- | -------------------------- |
| **Test coverage**     | > 90%     | `pnpm run test:coverage`   |
| **TypeScript strict** | No errors | `pnpm run check`           |
| **Lint clean**        | No errors | `pnpm run lint`            |
| **Documentation**     | Complete  | All public APIs documented |
| **Examples**          | Working   | All code examples run      |

### 10.4 Validation Checklist

#### Pre-Release Validation

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Performance benchmarks meet targets
- [ ] Documentation reviewed and complete
- [ ] CLI integration working
- [ ] Existing provider tests still pass
- [ ] Build succeeds on all platforms
- [ ] TypeScript types correct

#### Post-Release Validation

- [ ] npm package installable
- [ ] Quick start example works
- [ ] No error reports in first 24h
- [ ] Usage telemetry shows adoption
- [ ] No performance regressions

### 10.5 Acceptance Test Scenarios

**Scenario 1: Basic Gateway Usage**

```typescript
const neurolink = new NeuroLink();
const result = await neurolink
  .gateway("anthropic/claude-3-5-sonnet")
  .generate({ prompt: "Hello, world!" });
expect(result.content).toBeTruthy();
```

**Scenario 2: Fallback Chain**

```typescript
const result = await neurolink
  .gateway("invalid/model", {
    fallback: {
      models: ["anthropic/claude-3-5-sonnet", "openai/gpt-4o-mini"],
      retries: 2,
    },
  })
  .generate({ prompt: "Hello" });
expect(result.content).toBeTruthy();
```

**Scenario 3: Dynamic Model Selection**

```typescript
const provider = neurolink.gateway(({ context }) => {
  return context.premium ? "openai/gpt-4o" : "openai/gpt-4o-mini";
});
const result = await provider.generate({ prompt: "Hello" });
expect(result.content).toBeTruthy();
```

**Scenario 4: Model Discovery**

```typescript
const provider = neurolink.gateway("openai/gpt-4o");
const models = await provider.searchModels("claude");
expect(models.length).toBeGreaterThan(0);
expect(models[0].provider).toBe("anthropic");
```

**Scenario 5: Streaming**

```typescript
const result = await neurolink
  .gateway("anthropic/claude-3-5-sonnet")
  .stream({ input: { text: "Write a poem" } });

for await (const chunk of result.stream) {
  expect(chunk.content).toBeDefined();
}
```

**Scenario 6: CLI Integration**

```bash
# Should work
neurolink generate "Hello" --model anthropic/claude-3-5-sonnet

# Should show available models
neurolink models list --source gateway
```

---

## Appendix A: File Structure Summary

```
src/lib/gateway/
├── index.ts                 # Public exports
├── types.ts                 # Type definitions
├── constants.ts             # Constants and defaults
├── errors.ts                # Error classes
├── modelStringParser.ts     # Parse "provider/model" format
├── providerMapper.ts        # Map providers to routing
├── modelRouter.ts           # Smart routing logic
├── registryCache.ts         # In-memory cache
├── registryFetcher.ts       # Fetch from external sources
├── registryParsers.ts       # Parse registry formats
├── modelSearch.ts           # Search and filter models
├── gatewayClient.ts         # OpenRouter/LiteLLM clients
├── fallbackManager.ts       # Automatic failover
└── gatewayProvider.ts       # Main provider class

test/gateway/
├── modelStringParser.test.ts
├── providerMapper.test.ts
├── modelRouter.test.ts
├── registryCache.test.ts
├── registryFetcher.test.ts
├── registryParsers.test.ts
├── fallbackManager.test.ts
├── gatewayProvider.test.ts
└── integration/
    ├── gateway-openrouter.test.ts
    ├── gateway-direct.test.ts
    └── gateway-fallback.test.ts

docs/features/
└── gateway-provider.md      # Feature documentation
```

## Appendix B: Environment Variables

| Variable                       | Required    | Default               | Description             |
| ------------------------------ | ----------- | --------------------- | ----------------------- |
| `OPENROUTER_API_KEY`           | For gateway | -                     | OpenRouter API key      |
| `OPENROUTER_REFERER`           | No          | https://neurolink.dev | HTTP Referer header     |
| `OPENROUTER_APP_NAME`          | No          | NeuroLink             | X-Title header          |
| `LITELLM_BASE_URL`             | For LiteLLM | http://localhost:4000 | LiteLLM proxy URL       |
| `LITELLM_API_KEY`              | For LiteLLM | sk-anything           | LiteLLM API key         |
| `NEUROLINK_GATEWAY_ENABLED`    | No          | true                  | Feature flag            |
| `NEUROLINK_REGISTRY_CACHE_TTL` | No          | 3600000               | Registry cache TTL (ms) |

## Appendix C: API Reference Preview

```typescript
// NeuroLink SDK
class NeuroLink {
  // Gateway method
  gateway(
    model: string | ModelSelector,
    options?: { fallback?: FallbackConfig },
  ): GatewayProvider;

  // Shorthand generate
  gen(
    model: string,
    prompt: string,
    options?: GenerateOptions,
  ): Promise<GenerateResult>;
}

// GatewayProvider
class GatewayProvider extends BaseProvider {
  // Factory methods
  withModel(modelString: string): GatewayProvider;
  withFallback(config: FallbackConfig): GatewayProvider;

  // Model info
  getModelInfo(): Promise<GatewayModelInfo | undefined>;
  supportsCapability(capability: string): Promise<boolean>;
  getAvailableModels(): Promise<string[]>;
  searchModels(query: string): Promise<GatewayModelInfo[]>;
}

// Types
type ModelSelector = (context: ModelSelectorContext) => string;

type FallbackConfig = {
  models: string[];
  retries: number;
  retryDelayMs: number;
  timeout?: number;
};

type GatewayModelInfo = {
  id: string;
  provider: string;
  modelName: string;
  displayName: string;
  description?: string;
  contextLength?: number;
  maxOutputTokens?: number;
  pricing?: { inputPer1M: number; outputPer1M: number };
  capabilities: ModelCapabilities;
};
```

---

---

## 11. Lessons from NeuroLink History

This section incorporates patterns learned from analyzing NeuroLink's provider evolution over 8 months (June 2025 - January 2026).

### 11.1 Evolution Phases Applied to Gateway

NeuroLink's provider system evolved through four distinct phases. The gateway implementation should follow similar patterns:

| Phase       | Original Evolution                  | Gateway Application                                     |
| ----------- | ----------------------------------- | ------------------------------------------------------- |
| **Phase 1** | Initial foundation with 4 providers | Core gateway types, constants, errors (Phase 1 of plan) |
| **Phase 2** | Rapid expansion to 9 providers      | Router and mapper components (Phase 2 of plan)          |
| **Phase 3** | Factory pattern architecture        | Integration with existing ProviderFactory (Phase 2-3)   |
| **Phase 4** | BaseProvider consolidation          | GatewayProvider extending BaseProvider (Phase 4)        |

### 11.2 Proven Patterns to Apply

#### Pattern 1: Start with @ai-sdk, Migrate to Native When Needed

From the provider evolution analysis:

> "Initial development used `@ai-sdk/*` packages for rapid prototyping. Native SDK migrations happened when better control needed over authentication, provider-specific features required, or performance optimization needed."

**Application to Gateway:**

- Initial implementation should use `@openrouter/ai-sdk-provider` for OpenRouter integration
- Plan for potential native HTTP client if more control is needed later
- Keep provider adapter layer thin to enable future migrations

```typescript
// Initial: Use ai-sdk compatible provider
import { createOpenAI } from "@ai-sdk/openai";

const openRouterClient = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Future: Can migrate to native HTTP if needed
// const openRouterNative = new OpenRouterNativeClient({ ... });
```

#### Pattern 2: Dynamic Imports Are Critical

From commit `b13963a`:

> "CRITICAL: All providers use dynamic imports to prevent circular dependencies and enable lazy loading"

**Application to Gateway:**

```typescript
// CORRECT: Dynamic import in ProviderRegistry
ProviderFactory.registerProvider(
  AIProviderName.GATEWAY,
  async (modelName?, _providerName?, sdk?) => {
    const { GatewayProvider } = await import("../gateway/gatewayProvider.js");
    return new GatewayProvider(modelName || "openai/gpt-4o", sdk);
  },
  "openai/gpt-4o",
  ["gateway", "router", "universal"],
);

// WRONG: Static import would cause circular dependency
// import { GatewayProvider } from "../gateway/gatewayProvider.js"; // DON'T DO THIS
```

#### Pattern 3: BaseProvider Consolidation Pattern

From commit `a5da739`:

> "55-65% code reduction achieved by consolidating common logic. Individual providers only override model selection, SDK initialization, and provider-specific capabilities."

**GatewayProvider should follow this pattern:**

```typescript
export class GatewayProvider extends BaseProvider {
  // Only override what's necessary
  protected getProviderName(): AIProviderName {
    return AIProviderName.GATEWAY;
  }

  protected getDefaultModel(): string {
    return "openai/gpt-4o";
  }

  protected async getAISDKModel(): Promise<LanguageModelV1> {
    // Gateway-specific: route through router
    return this.router.createModel(this.modelString);
  }

  // Leverage all BaseProvider functionality:
  // - Tool integration
  // - Timeout handling
  // - Stream validation
  // - Text transformation
  // - Analytics collection
  // - Error handling
}
```

#### Pattern 4: Composition Over Inheritance for Modules

From the evolution analysis:

> "Modules like MessageBuilder, StreamHandler are independently testable"

**Apply composition for gateway components:**

```typescript
export class GatewayProvider extends BaseProvider {
  // Compose gateway-specific modules
  private router: ModelRouter;
  private registryFetcher: RegistryFetcher;
  private fallbackManager: FallbackManager;
  private gatewayClient: GatewayClient;

  constructor(modelString: string, sdk?: NeuroLink) {
    super(modelString, sdk);

    // Initialize composed modules
    this.router = new ModelRouter();
    this.registryFetcher = new RegistryFetcher();
    this.fallbackManager = new FallbackManager();
    this.gatewayClient = new GatewayClient();
  }
}
```

#### Pattern 5: Provider Aliases Improve Developer Experience

From the evolution:

> "Users can use `--provider gpt` instead of `--provider openai`"

**Gateway should support intuitive aliases:**

```typescript
ProviderFactory.registerProvider(
  AIProviderName.GATEWAY,
  factoryFn,
  "openai/gpt-4o",
  [
    "gateway", // Direct name
    "router", // Alternative name
    "universal", // Conceptual name
    "mastra", // Compatibility alias
    "unified", // Descriptive alias
  ],
);
```

### 11.3 Architectural Evolution Insights

**Key takeaway:** NeuroLink's architecture evolved from simple direct implementations to a sophisticated factory + registry + BaseProvider pattern. The gateway should:

1. **Fit into existing architecture** - Don't create parallel systems
2. **Leverage existing components** - Use ProviderFactory, ProviderRegistry, BaseProvider
3. **Follow established patterns** - Dynamic imports, composition, aliases
4. **Plan for future evolution** - Design for potential native SDK migrations

### 11.4 File Naming and Organization

From commit `656d094`:

> "Normalized from `googleAIStudio.ts` to `googleAiStudio.ts` - Consistent camelCase for multi-word files"

**Gateway files should follow established conventions:**

```
src/lib/gateway/
  gatewayProvider.ts     # camelCase (not gateway-provider.ts)
  modelRouter.ts         # camelCase
  modelStringParser.ts   # camelCase
  registryFetcher.ts     # camelCase
  fallbackManager.ts     # camelCase
```

---

## 12. Industry Best Practices

This section incorporates best practices from Mastra framework and Vercel AI SDK research.

### 12.1 From Mastra Framework

#### TypeScript-First Design

From Mastra research:

> "Mastra is built natively for TypeScript, while LangChain's JavaScript version often requires workarounds."

**Application:** Gateway should be fully typed with no `any` usage.

```typescript
// Strong typing for all gateway components
type ParsedModel = {
  provider: string;
  modelName: string;
  originalString: string;
};

type RoutingDecision = {
  strategy: RoutingStrategy;
  endpoint: EndpointConfig;
  reason: string;
};

// Avoid any
function parseModelString(input: string): ParsedModel; // Not: any
```

#### No Custom DSL - Plain TypeScript

From Mastra:

> "It's just TypeScript functions. No new DSL. No ceremony."

**Gateway API should use familiar patterns:**

```typescript
// Good: Familiar TypeScript patterns
const result = await neurolink
  .gateway("anthropic/claude-3-5-sonnet")
  .generate({ prompt: "Hello" });

// Good: Fluent API for configuration
const provider = neurolink
  .gateway("openai/gpt-4o")
  .withFallback(["anthropic/claude-3-5-sonnet"])
  .withTimeout(30000);

// Avoid: Custom DSL or unfamiliar syntax
// const result = gateway`anthropic/claude-3-5-sonnet | openai/gpt-4o`
```

#### Event-Driven Architecture

From Mastra:

> "Pub/sub pattern for loose coupling"

**Gateway should emit events for observability:**

```typescript
class GatewayProvider extends BaseProvider {
  async generate(options: GenerateOptions): Promise<GenerateResult> {
    this.emit("gateway:routing:start", { model: this.modelString });

    const routingDecision = await this.router.decide(this.modelString);
    this.emit("gateway:routing:decision", { decision: routingDecision });

    try {
      const result = await super.generate(options);
      this.emit("gateway:generate:success", { model: routingDecision.model });
      return result;
    } catch (error) {
      this.emit("gateway:generate:error", {
        error,
        model: routingDecision.model,
      });
      throw error;
    }
  }
}
```

#### Domain-Based Storage Architecture

From Mastra:

> "Different storage adapters for different concerns"

**Registry cache should be pluggable:**

```typescript
type RegistryCacheAdapter = {
  get(key: string): Promise<GatewayModelInfo[] | undefined>;
  set(key: string, models: GatewayModelInfo[], ttlMs: number): Promise<void>;
  invalidate(key: string): Promise<void>;
};

// Default: In-memory
class InMemoryCacheAdapter implements RegistryCacheAdapter {}

// Production: Redis (future)
class RedisCacheAdapter implements RegistryCacheAdapter {}

// Configuration
const fetcher = new RegistryFetcher({
  cache: process.env.REDIS_URL
    ? new RedisCacheAdapter(process.env.REDIS_URL)
    : new InMemoryCacheAdapter(),
});
```

### 12.2 From Vercel AI SDK

#### Streaming-First Design

From AI SDK research:

> "AI SDK uses Server-Sent Events (SSE) format with improved standardization, keep-alive, and reconnect capabilities"

**Gateway streaming should be first-class:**

```typescript
// Ensure gateway streaming works identically to direct providers
const result = await neurolink
  .gateway("openai/gpt-4o")
  .stream({ input: { text: "Hello" } });

for await (const chunk of result.stream) {
  // Progressive updates
}

// Support data stream protocol for frontend compatibility
return result.toDataStreamResponse();
```

#### Provider Registry Pattern

From AI SDK:

> "Centralized model management with string-based IDs"

**Gateway aligns with this pattern:**

```typescript
// AI SDK pattern
const model = registry.languageModel("openai:gpt-4o");

// Gateway pattern (similar)
const provider = neurolink.gateway("openai/gpt-4o");

// Both support string-based model references
```

#### Structured Output with Zod

From AI SDK:

> "Use describe() for better results" and "Prefer nullable() over optional()"

**Gateway should pass through structured output correctly:**

```typescript
import { z } from "zod";

const schema = z.object({
  title: z.string().describe("The document title"),
  summary: z.string().describe("A brief summary"),
  tags: z.array(z.string()).describe("Relevant tags"),
  rating: z
    .number()
    .nullable()
    .describe("Rating from 1-5, or null if not applicable"),
});

// Gateway should pass structured output to underlying provider
const result = await neurolink.gateway("openai/gpt-4o").generate({
  prompt: "Analyze this document",
  structuredOutput: { schema },
});
```

#### Tool Format Compatibility

From AI SDK:

> "inputSchema instead of parameters (v5+)"

**Gateway tool handling should use modern AI SDK format:**

```typescript
// Modern AI SDK tool format
const tool = {
  description: "Get weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name"),
  }),
  execute: async ({ location }) => {
    return await fetchWeather(location);
  },
};

// Gateway should pass tools through correctly
const result = await neurolink.gateway("openai/gpt-4o").generate({
  prompt: "What's the weather in Tokyo?",
  tools: { getWeather: tool },
});
```

### 12.3 Error Handling Best Practices

From both Mastra and AI SDK:

```typescript
// Retriable vs non-retriable errors
const RETRIABLE_ERRORS = [
  "rate_limit_exceeded",
  "timeout",
  "service_unavailable",
  "502",
  "503",
  "504",
];

const NON_RETRIABLE_ERRORS = [
  "invalid_api_key",
  "model_not_found",
  "invalid_request",
  "400",
  "401",
  "403",
];

class FallbackManager {
  private isRetriable(error: Error): boolean {
    const message = error.message.toLowerCase();
    return RETRIABLE_ERRORS.some((e) => message.includes(e));
  }
}
```

### 12.4 Observability Integration

From AI SDK telemetry patterns:

```typescript
// Gateway should integrate with existing telemetry
const result = await neurolink.gateway("openai/gpt-4o").generate({
  prompt: "Hello",
  telemetry: {
    enabled: true,
    functionId: "gateway-generate",
    metadata: {
      routingStrategy: "direct",
      originalModel: "openai/gpt-4o",
    },
  },
});
```

---

## 13. Updated Technical Approach

Based on research findings, this section provides refined technical guidance.

### 13.1 Revised Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NeuroLink SDK                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  neurolink.gateway("provider/model")                         │   │
│  │       │                                                      │   │
│  │       ▼                                                      │   │
│  │  ┌─────────────────┐                                         │   │
│  │  │ GatewayProvider │ (extends BaseProvider)                  │   │
│  │  │                 │                                         │   │
│  │  │  Composition:   │                                         │   │
│  │  │  - ModelRouter  │──────┐                                  │   │
│  │  │  - FallbackMgr  │      │                                  │   │
│  │  │  - GatewayClient│      │                                  │   │
│  │  │  - RegistryFetch│      │                                  │   │
│  │  └────────┬────────┘      │                                  │   │
│  │           │               │                                  │   │
│  │           ▼               ▼                                  │   │
│  │  ┌─────────────────┬─────────────────┬─────────────────┐    │   │
│  │  │ Direct Routing  │ OpenRouter Gate │ LiteLLM Proxy   │    │   │
│  │  │ (Existing       │ (300+ models)   │ (Self-hosted)   │    │   │
│  │  │  Providers)     │                 │                 │    │   │
│  │  └─────────────────┴─────────────────┴─────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 13.2 Key Technical Decisions

| Decision                 | Rationale                              | Research Basis                                            |
| ------------------------ | -------------------------------------- | --------------------------------------------------------- |
| **Extend BaseProvider**  | 55-65% code reuse, consistent behavior | NeuroLink History - BaseProvider consolidation            |
| **Dynamic imports only** | Prevent circular dependencies          | NeuroLink History - All providers use dynamic imports     |
| **Composition modules**  | Independent testing, flexibility       | NeuroLink History & Mastra - Composition over inheritance |
| **Event-driven routing** | Observability, loose coupling          | Mastra - Pub/sub pattern                                  |
| **AI SDK tool format**   | Future compatibility, modern patterns  | AI SDK Research - inputSchema format                      |
| **Pluggable cache**      | Production flexibility                 | Mastra - Domain-based storage                             |

### 13.3 Revised ModelRouter Implementation

```typescript
// src/lib/gateway/modelRouter.ts

import type { LanguageModelV1 } from "@ai-sdk/provider";
import type { NeuroLink } from "../neurolink.js";

export class ModelRouter {
  private neurolink?: NeuroLink;
  private gatewayClient: GatewayClient;
  private eventEmitter: EventEmitter;

  constructor(options?: ModelRouterOptions) {
    this.gatewayClient = new GatewayClient();
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Main routing method - determines how to create the model
   */
  async createModel(
    modelString: string,
    options?: RoutingOptions,
  ): Promise<LanguageModelV1> {
    const parsed = this.parseModelString(modelString);
    const decision = await this.makeRoutingDecision(parsed);

    this.eventEmitter.emit("routing:decision", {
      input: modelString,
      decision,
    });

    switch (decision.strategy) {
      case RoutingStrategy.DIRECT:
        return this.createDirectModel(parsed, decision);
      case RoutingStrategy.OPENROUTER:
        return this.gatewayClient.createOpenRouterModel(modelString);
      case RoutingStrategy.LITELLM:
        return this.gatewayClient.createLiteLLMModel(modelString);
      default:
        throw new RoutingError(
          `Unknown routing strategy: ${decision.strategy}`,
        );
    }
  }

  /**
   * Routing decision tree based on research findings
   */
  private async makeRoutingDecision(
    parsed: ParsedModel,
  ): Promise<RoutingDecision> {
    // 1. Check if provider has direct SDK support
    const hasDirectSupport = this.hasDirectProviderSupport(parsed.provider);

    // 2. Check if API key is configured
    const hasApiKey = this.isProviderConfigured(parsed.provider);

    // 3. Make decision
    if (hasDirectSupport && hasApiKey) {
      return {
        strategy: RoutingStrategy.DIRECT,
        provider: parsed.provider,
        reason: "Direct provider SDK available and configured",
      };
    }

    if (this.isOpenRouterConfigured()) {
      return {
        strategy: RoutingStrategy.OPENROUTER,
        provider: "openrouter",
        reason: "Routing via OpenRouter gateway",
      };
    }

    if (this.isLiteLLMConfigured()) {
      return {
        strategy: RoutingStrategy.LITELLM,
        provider: "litellm",
        reason: "Routing via LiteLLM proxy",
      };
    }

    throw new ConfigurationError(
      `No routing option available for ${parsed.provider}/${parsed.modelName}. ` +
        `Configure OPENROUTER_API_KEY or LITELLM_BASE_URL for gateway routing.`,
    );
  }

  /**
   * Create model via existing NeuroLink provider
   */
  private async createDirectModel(
    parsed: ParsedModel,
    decision: RoutingDecision,
  ): Promise<LanguageModelV1> {
    // Use ProviderFactory to get existing provider
    const { ProviderFactory } = await import("../factories/providerFactory.js");

    const provider = await ProviderFactory.createProvider(
      parsed.provider as AIProviderName,
      parsed.modelName,
      this.neurolink,
    );

    // Get the underlying AI SDK model
    return provider.getModel();
  }
}
```

### 13.4 Revised GatewayProvider Implementation

```typescript
// src/lib/gateway/gatewayProvider.ts

import { BaseProvider } from "../core/baseProvider.js";
import type { NeuroLink } from "../neurolink.js";
import type { AIProviderName } from "../constants/enums.js";

export class GatewayProvider extends BaseProvider {
  // Gateway-specific composed modules
  private router: ModelRouter;
  private fallbackManager: FallbackManager;
  private modelSelector?: ModelSelector;
  private fallbackConfig?: FallbackConfig;

  constructor(
    modelOrSelector: string | ModelSelector,
    sdk?: NeuroLink,
    options?: GatewayProviderOptions,
  ) {
    // Resolve initial model string
    const initialModel =
      typeof modelOrSelector === "string" ? modelOrSelector : "openai/gpt-4o"; // Default, will be resolved dynamically

    super(initialModel, sdk);

    // Store selector for dynamic resolution
    if (typeof modelOrSelector === "function") {
      this.modelSelector = modelOrSelector;
    }

    // Initialize composed modules (following NeuroLink patterns)
    this.router = new ModelRouter({ neurolink: sdk });
    this.fallbackManager = new FallbackManager(options?.fallback);
    this.fallbackConfig = options?.fallback;
  }

  // Required BaseProvider overrides
  protected getProviderName(): AIProviderName {
    // Dynamic import to avoid circular dependency
    const { AIProviderName } = require("../constants/enums.js");
    return AIProviderName.GATEWAY;
  }

  protected getDefaultModel(): string {
    return "openai/gpt-4o";
  }

  /**
   * Core routing logic - gets AI SDK model via router
   * This is where gateway magic happens
   */
  protected async getAISDKModel(): Promise<LanguageModelV1> {
    let modelToUse = this.modelName;

    // Dynamic model selection (Mastra pattern)
    if (this.modelSelector) {
      const context = await this.buildSelectorContext();
      modelToUse = this.modelSelector(context);
    }

    // Create with fallback if configured
    if (this.fallbackConfig) {
      return this.fallbackManager.createModelWithFallback(
        modelToUse,
        this.fallbackConfig.models,
        (model) => this.router.createModel(model),
      );
    }

    return this.router.createModel(modelToUse);
  }

  /**
   * Error handling with gateway context (NeuroLink pattern)
   */
  public handleProviderError(error: unknown): Error {
    const err = error as Error;
    const message = err?.message || String(error);

    // Create gateway-specific error with full context
    const { GatewayError } = require("./errors.js");
    return new GatewayError(`[Gateway: ${this.modelName}] ${message}`, {
      originalError: err,
      modelString: this.modelName,
      routingStrategy: this.router?.lastDecision?.strategy,
    });
  }

  // Factory methods for fluent API (Mastra pattern)
  withModel(modelString: string): GatewayProvider {
    return new GatewayProvider(modelString, this.neurolink, {
      fallback: this.fallbackConfig,
    });
  }

  withFallback(config: FallbackConfig): GatewayProvider {
    return new GatewayProvider(this.modelName, this.neurolink, {
      fallback: config,
    });
  }

  // Gateway-specific methods
  async getModelInfo(): Promise<GatewayModelInfo | undefined> {
    const { RegistryFetcher } = await import("./registryFetcher.js");
    const fetcher = new RegistryFetcher();
    return fetcher.getModel(this.modelName);
  }

  async searchModels(query: string): Promise<GatewayModelInfo[]> {
    const { ModelSearch, RegistryFetcher } = await import("./modelSearch.js");
    const search = new ModelSearch(new RegistryFetcher());
    return search.search(query);
  }
}
```

### 13.5 Revised NeuroLink Integration

````typescript
// Addition to src/lib/neurolink.ts

export class NeuroLink {
  // ... existing code ...

  /**
   * Create a gateway provider for unified model access
   *
   * @example
   * ```typescript
   * // Simple usage
   * const result = await neurolink.gateway("anthropic/claude-3-5-sonnet")
   *   .generate({ prompt: "Hello" });
   *
   * // With fallback
   * const result = await neurolink.gateway("openai/gpt-4o", {
   *   fallback: {
   *     models: ["anthropic/claude-3-5-sonnet"],
   *     retries: 2
   *   }
   * }).generate({ prompt: "Hello" });
   *
   * // Dynamic model selection
   * const result = await neurolink.gateway(({ context }) =>
   *   context.premium ? "openai/gpt-4o" : "openai/gpt-4o-mini"
   * ).generate({ prompt: "Hello" });
   * ```
   */
  gateway(
    model: string | ModelSelector,
    options?: { fallback?: FallbackConfig },
  ): GatewayProvider {
    // CRITICAL: Dynamic import to prevent circular dependencies
    // This follows the established NeuroLink pattern
    const { GatewayProvider } = require("./gateway/gatewayProvider.js");
    return new GatewayProvider(model, this, options);
  }

  /**
   * Quick generate with gateway routing - shorthand for common use case
   *
   * @example
   * ```typescript
   * const result = await neurolink.gen("openai/gpt-4o", "Hello, world!");
   * console.log(result.content);
   * ```
   */
  async gen(
    model: string,
    prompt: string,
    options?: GenerateOptions,
  ): Promise<GenerateResult> {
    return this.gateway(model).generate({ prompt, ...options });
  }
}
````

---

## 14. Risk Mitigations from Research

This section provides specific risk mitigations learned from analyzing NeuroLink history, Mastra, and AI SDK.

### 14.1 Circular Dependency Prevention

**Risk:** Gateway imports could create circular dependencies with existing providers.

**Mitigation from NeuroLink History:**

```typescript
// ALWAYS use dynamic imports in:
// 1. ProviderRegistry
// 2. NeuroLink.gateway() method
// 3. ModelRouter when accessing ProviderFactory
// 4. Any cross-module references

// Pattern: Late binding via dynamic import
async createDirectModel(parsed: ParsedModel): Promise<LanguageModelV1> {
  // Dynamic import breaks the dependency cycle
  const { ProviderFactory } = await import('../factories/providerFactory.js');
  return ProviderFactory.createProvider(parsed.provider, parsed.modelName);
}

// AVOID: Static imports that create cycles
// import { ProviderFactory } from '../factories/providerFactory.js'; // NO!
```

**Validation checklist:**

- [ ] No static imports of providers in gateway module
- [ ] ProviderRegistry uses async factory function
- [ ] NeuroLink.gateway() uses dynamic import
- [ ] All cross-module references are dynamic

### 14.2 Breaking Existing Providers

**Risk:** Gateway changes could break existing provider functionality.

**Mitigation from NeuroLink Evolution Pattern:**

1. **Additive-only API changes:**

```typescript
// Good: Add new method
class NeuroLink {
  // Existing methods unchanged
  async generate(options: GenerateOptions) {
    /* existing */
  }
  async stream(options: StreamOptions) {
    /* existing */
  }

  // New method added
  gateway(model: string): GatewayProvider {
    /* new */
  }
}

// Bad: Modify existing method signatures
// generate(options: GenerateOptions | GatewayOptions) // NO!
```

2. **No modifications to existing provider files:**

```bash
# Files that should NOT be modified:
src/lib/providers/openAI.ts        # NO CHANGES
src/lib/providers/anthropic.ts     # NO CHANGES
src/lib/providers/googleVertex.ts  # NO CHANGES
# etc.

# Only these files should be modified:
src/lib/factories/providerRegistry.ts  # Add gateway registration
src/lib/neurolink.ts                   # Add gateway() method
src/lib/types/index.ts                 # Add gateway type exports
```

3. **Test existing providers after gateway addition:**

```bash
# Run existing provider tests
pnpm run test:suites
pnpm run test:integration

# Verify no regression
```

### 14.3 Registry Availability

**Risk:** External registries (models.dev, OpenRouter) could be unavailable.

**Mitigation from AI SDK patterns:**

```typescript
class RegistryFetcher {
  private staticFallback: GatewayModelInfo[];
  private cache: RegistryCache;

  constructor() {
    // Load bundled static registry as fallback
    this.staticFallback = require("./data/static-registry.json");
  }

  async getModels(): Promise<GatewayModelInfo[]> {
    // Try cache first
    const cached = this.cache.get("models");
    if (cached) return cached;

    try {
      // Try external sources
      const models = await this.fetchFromSources();
      this.cache.set("models", models);
      return models;
    } catch (error) {
      console.warn("Registry fetch failed, using static fallback:", error);

      // Use cached data if available (even if expired)
      const staleCached = this.cache.getStale("models");
      if (staleCached) return staleCached;

      // Last resort: static fallback
      return this.staticFallback;
    }
  }
}
```

**Include static registry with common models:**

```json
// src/lib/gateway/data/static-registry.json
{
  "models": [
    { "id": "openai/gpt-4o", "provider": "openai", "modelName": "gpt-4o" },
    {
      "id": "openai/gpt-4o-mini",
      "provider": "openai",
      "modelName": "gpt-4o-mini"
    },
    {
      "id": "anthropic/claude-3-5-sonnet",
      "provider": "anthropic",
      "modelName": "claude-3-5-sonnet-20241022"
    }
    // ... 50+ common models
  ]
}
```

### 14.4 Gateway Service Outages

**Risk:** OpenRouter or LiteLLM could experience outages.

**Mitigation from Mastra fallback patterns:**

```typescript
class FallbackManager {
  async executeWithFallback<T>(
    primary: () => Promise<T>,
    fallbacks: Array<() => Promise<T>>,
    config: FallbackConfig,
  ): Promise<FallbackResult<T>> {
    const attempts: FallbackAttempt[] = [];
    const allOptions = [primary, ...fallbacks];

    for (let i = 0; i < allOptions.length; i++) {
      const option = allOptions[i];

      for (let retry = 0; retry < config.retries; retry++) {
        const startTime = Date.now();

        try {
          const result = await this.withTimeout(option(), config.timeout);

          return {
            result,
            attempts,
            modelUsed: i === 0 ? "primary" : `fallback-${i}`,
          };
        } catch (error) {
          const attempt: FallbackAttempt = {
            index: i,
            retry,
            error: error as Error,
            duration: Date.now() - startTime,
          };
          attempts.push(attempt);

          // Only retry if retriable
          if (!this.isRetriable(error as Error)) {
            break; // Move to next fallback
          }

          // Exponential backoff between retries
          if (retry < config.retries - 1) {
            await this.delay(Math.pow(2, retry) * config.retryDelayMs);
          }
        }
      }
    }

    throw new FallbackExhaustedError("All fallback options exhausted", {
      attempts,
    });
  }
}
```

### 14.5 Performance Degradation

**Risk:** Gateway routing could add latency.

**Mitigation from NeuroLink caching patterns:**

```typescript
// 1. Cache model string parsing (it's deterministic)
const parseCache = new Map<string, ParsedModel>();

function parseModelString(input: string): ParsedModel {
  if (parseCache.has(input)) {
    return parseCache.get(input)!;
  }
  const parsed = doParse(input);
  parseCache.set(input, parsed);
  return parsed;
}

// 2. Cache routing decisions (short TTL)
const routingCache = new Map<
  string,
  { decision: RoutingDecision; timestamp: number }
>();
const ROUTING_CACHE_TTL = 60000; // 1 minute

async function getRoutingDecision(
  modelString: string,
): Promise<RoutingDecision> {
  const cached = routingCache.get(modelString);
  if (cached && Date.now() - cached.timestamp < ROUTING_CACHE_TTL) {
    return cached.decision;
  }

  const decision = await computeRoutingDecision(modelString);
  routingCache.set(modelString, { decision, timestamp: Date.now() });
  return decision;
}

// 3. Lazy initialization of gateway clients
class GatewayClient {
  private _openRouterClient: ReturnType<typeof createOpenAI> | null = null;

  get openRouterClient() {
    if (!this._openRouterClient) {
      this._openRouterClient = createOpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });
    }
    return this._openRouterClient;
  }
}
```

**Performance targets (unchanged from original plan):**
| Metric | Target |
|--------|--------|
| Model string parsing | < 50ms |
| Routing decision (cached) | < 5ms |
| Routing decision (uncached) | < 100ms |
| Direct routing overhead | < 10ms |
| Gateway routing overhead | < 100ms |

### 14.6 Type System Complexity

**Risk:** Gateway types could conflict with or duplicate existing types.

**Mitigation from NeuroLink type organization:**

```typescript
// src/lib/gateway/types.ts

// 1. Extend existing types rather than duplicate
import type { ModelInfo } from "../types/modelTypes.js";
import type { GenerateOptions } from "../types/generateTypes.js";

export type GatewayModelInfo = ModelInfo & {
  // Gateway-specific extensions only
  routingStrategy?: RoutingStrategy;
  gatewaySource?: "openrouter" | "litellm" | "models.dev";
};

// 2. Use discriminated unions for clarity
export type RoutingStrategy =
  | { type: "direct"; provider: AIProviderName }
  | { type: "openrouter"; modelId: string }
  | { type: "litellm"; modelId: string };

// 3. Re-export from central location
// src/lib/types/index.ts
export * from "../gateway/types.js";
```

### 14.7 Risk Monitoring Checklist

**Pre-release checks:**

- [ ] Circular dependency test passes
- [ ] All existing provider tests pass
- [ ] Performance benchmarks within targets
- [ ] Static fallback registry included
- [ ] Fallback chains tested with simulated failures
- [ ] Type compatibility with existing types verified

**Post-release monitoring:**

- [ ] Gateway routing success rate > 99%
- [ ] Fallback trigger rate < 5%
- [ ] P95 routing latency < 100ms
- [ ] Registry fetch success rate > 95%
- [ ] No error reports related to existing providers

---

## Document History

| Version | Date       | Author                | Changes                                                                                                                                            |
| ------- | ---------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-01-22 | NeuroLink Engineering | Initial draft                                                                                                                                      |
| 1.1.0   | 2026-01-23 | NeuroLink Engineering | Added research-based sections: Lessons from NeuroLink History, Industry Best Practices, Updated Technical Approach, Risk Mitigations from Research |

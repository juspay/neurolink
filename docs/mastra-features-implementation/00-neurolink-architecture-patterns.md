# NeuroLink Architecture Patterns and Conventions

This document captures the core architectural patterns, conventions, and design decisions used throughout the NeuroLink codebase. All new feature implementations must follow these established patterns to maintain consistency and code quality.

## Table of Contents

1. [Overview](#overview)
2. [Core Design Patterns](#core-design-patterns)
3. [Factory and Registry Pattern](#factory-and-registry-pattern)
4. [Provider Abstraction Layer](#provider-abstraction-layer)
5. [Component Organization](#component-organization)
6. [Configuration Patterns](#configuration-patterns)
7. [Error Handling](#error-handling)
8. [Dependency Injection](#dependency-injection)
9. [Type System Conventions](#type-system-conventions)
10. [MCP Tool System](#mcp-tool-system)
11. [Middleware Architecture](#middleware-architecture)
12. [Existing NeuroLink Features](#existing-neurolink-features)
13. [Implementation Checklist](#implementation-checklist)

---

## Existing NeuroLink Features

NeuroLink already has robust implementations of several enterprise features that are commonly found in AI orchestration platforms. Before implementing new features, review these existing capabilities to avoid duplication and ensure consistency.

### Human-in-the-Loop (HITL)

**Location**: `/src/lib/hitl/`

NeuroLink has a full HITL implementation for requiring human approval before executing sensitive operations.

**Key Components**:

- `HITLManager` - Central manager for HITL workflows
- `HITLConfig` - Configuration for dangerous actions, timeouts, and approval flows
- Integration with `MCPToolRegistry` for tool-level confirmation

**Usage**:

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    dangerousActions: ["delete", "remove", "drop"],
    timeout: 30000,
  },
});
```

### Failover and Resilience

**Location**: `/src/lib/mcp/`, `/src/lib/utils/`

NeuroLink implements multiple resilience patterns for production reliability.

**Key Components**:

- `MCPCircuitBreaker` (`/src/lib/mcp/mcpCircuitBreaker.ts`) - Circuit breaker pattern for MCP server failures
- `RetryHandler` / `httpRetryHandler` (`/src/lib/mcp/httpRetryHandler.ts`) - Exponential backoff retry for transient failures
- `ProviderHealthChecker` - Health monitoring for AI providers
- `CircuitBreaker` utility (`/src/lib/utils/errorHandling.ts`) - Generic circuit breaker implementation

**Features**:

- Configurable failure thresholds
- Automatic circuit state transitions (closed -> open -> half-open)
- Exponential backoff with jitter
- Provider failover via `AIProviderFactory.createProviderWithFallback()`

### Memory and Conversation Management

**Location**: `/src/lib/memory/`

NeuroLink provides multiple memory backends for conversation persistence.

**Key Components**:

- `ConversationMemoryManager` - Central memory management with session handling
- `RedisMemory` - Redis-backed distributed memory for production
- `Mem0Integration` - Integration with Mem0 for advanced memory features (DEPRECATED: Mem0 integration is deprecated and will be removed in a future release)
- In-memory store for development and testing

**Features**:

- Session-based conversation tracking
- Configurable turn limits and session expiration
- Conversation summarization for long contexts
- Cross-session memory persistence

**Usage**:

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    maxSessions: 50,
    maxTurnsPerSession: 20,
    backend: "redis", // or "memory" (note: "mem0" is deprecated)
  },
});
```

### MCP (Model Context Protocol) System

**Location**: `/src/lib/mcp/`

NeuroLink has comprehensive MCP support with multiple transport protocols and enterprise features.

**Transport Protocols**:
| Transport | Use Case | Configuration |
|-----------|----------|---------------|
| `stdio` | Local MCP servers via command execution | `command`, `args`, `env` |
| `http` | Remote HTTP/Streamable HTTP servers | `url`, `headers`, HTTP options |
| `sse` | Server-Sent Events connections | `url`, `headers` |
| `websocket` | WebSocket connections | `url`, `headers` |

**Key Components**:

- `MCPToolRegistry` (`/src/lib/mcp/toolRegistry.ts`) - Central tool registry
- `MCPClientFactory` (`/src/lib/mcp/mcpClientFactory.ts`) - Client creation for all transports
- `ExternalServerManager` (`/src/lib/mcp/externalServerManager.ts`) - Server lifecycle management
- `httpRateLimiter` (`/src/lib/mcp/httpRateLimiter.ts`) - Rate limiting for HTTP transport
- `MCPCircuitBreaker` (`/src/lib/mcp/mcpCircuitBreaker.ts`) - Circuit breaker for server failures

**Enterprise Features**:

- OAuth authentication support
- Rate limiting with configurable limits
- Circuit breakers for fault tolerance
- Automatic retry with exponential backoff
- Session management via `Mcp-Session-Id` header
- Environment variable substitution in configurations

**Usage**:

```typescript
// stdio transport (local server)
await neurolink.addExternalMCPServer("github", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  transport: "stdio",
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
});

// HTTP transport (remote server) with resilience
await neurolink.addExternalMCPServer("api-server", {
  transport: "http",
  url: "https://api.example.com/mcp",
  headers: { Authorization: "Bearer TOKEN" },
  timeout: 15000,
  retries: 5,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
  },
});
```

---

## Overview

NeuroLink is an enterprise AI development platform providing unified access to 12+ AI providers through a single consistent API. The architecture is built around several key principles:

- **Factory Pattern with Dynamic Registration**: Providers are loaded lazily to avoid circular dependencies
- **Composition over Inheritance**: Complex functionality is built by composing smaller, focused modules
- **Type Safety**: Comprehensive TypeScript types across all modules
- **Graceful Degradation**: Systems continue working even when optional components fail
- **Event-Driven Architecture**: Loose coupling through EventEmitter patterns

### Key Architectural Decisions

1. **No Circular Dependencies**: All providers use dynamic imports in the registry
2. **Provider Consistency**: All providers implement the same core interface
3. **Backward Compatibility**: SDK changes maintain existing API contracts
4. **Environment Isolation**: CLI and SDK have separate concerns

---

## Core Design Patterns

### 1. Factory Pattern

The factory pattern is used extensively for creating provider instances, middleware, and MCP clients.

**Location**: `/src/lib/factories/providerFactory.ts`

```typescript
// src/lib/factories/providerFactory.ts

/**
 * True Factory Pattern implementation for AI Providers
 * Uses registration-based approach to eliminate switch statements
 * and enable dynamic provider registration
 */
export class ProviderFactory {
  private static readonly providers = new Map<string, ProviderRegistration>();
  private static initialized = false;

  /**
   * Register a provider with the factory
   */
  static registerProvider(
    name: AIProviderName | string,
    constructor: ProviderConstructor,
    defaultModel?: string,
    aliases: string[] = [],
  ): void {
    const registration: ProviderRegistration = {
      constructor,
      defaultModel,
      aliases,
    };

    // Register main name
    this.providers.set(name.toLowerCase(), registration);

    // Register aliases
    aliases.forEach((alias) => {
      this.providers.set(alias.toLowerCase(), registration);
    });
  }

  /**
   * Create a provider instance
   */
  static async createProvider(
    providerName: AIProviderName | string,
    modelName?: string,
    sdk?: UnknownRecord,
    region?: string,
  ): Promise<AIProvider> {
    const normalizedName = providerName.toLowerCase();
    const registration = this.providers.get(normalizedName);

    if (!registration) {
      throw new Error(
        `Unknown provider: ${providerName}. Available: ${this.getAvailableProviders().join(", ")}`,
      );
    }

    // Handle both sync and async factory functions
    const factoryResult = registration.constructor(
      model,
      providerName,
      sdk,
      region,
    );
    return factoryResult instanceof Promise
      ? await factoryResult
      : factoryResult;
  }
}
```

### 2. Registry Pattern

Registries provide centralized management and lookup for various system components.

**Provider Registry** (`/src/lib/factories/providerRegistry.ts`):

```typescript
// src/lib/factories/providerRegistry.ts

export class ProviderRegistry {
  private static registered = false;
  private static options: ProviderRegistryOptions = {
    enableManualMCP: false,
  };

  static async registerAllProviders(): Promise<void> {
    if (this.registered) return;

    // Register providers with dynamic import factory functions
    ProviderFactory.registerProvider(
      AIProviderName.GOOGLE_AI,
      async (modelName?, _providerName?, sdk?) => {
        const { GoogleAIStudioProvider } = await import(
          "../providers/googleAiStudio.js"
        );
        return new GoogleAIStudioProvider(
          modelName,
          sdk as NeuroLink | undefined,
        );
      },
      GoogleAIModels.GEMINI_2_5_FLASH,
      ["googleAiStudio", "google", "gemini", "google-ai"],
    );

    // ... more providers registered similarly
    this.registered = true;
  }
}
```

**Service Registry** (`/src/lib/core/serviceRegistry.ts`):

```typescript
// src/lib/core/serviceRegistry.ts

export class ServiceRegistry {
  private static services = new Map<string, ServiceRegistration<unknown>>();
  private static initializing = new Set<string>();

  /**
   * Register a service with optional singleton behavior
   */
  static register<T>(
    name: string,
    factory: ServiceFactory<T>,
    options: { singleton?: boolean } = {},
  ): void {
    this.services.set(name, {
      factory,
      singleton: options.singleton ?? true,
      instance: undefined,
    });
  }

  /**
   * Get a service instance with circular dependency detection
   */
  static async get<T>(name: string): Promise<T> {
    const registration = this.services.get(name);

    if (!registration) {
      throw new Error(`Service ${name} not registered`);
    }

    // Circular dependency detection
    if (this.initializing.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }

    // Return existing singleton
    if (registration.singleton && registration.instance !== undefined) {
      return registration.instance as T;
    }

    try {
      this.initializing.add(name);
      const instance = await registration.factory();
      if (registration.singleton) {
        registration.instance = instance;
      }
      return instance as T;
    } finally {
      this.initializing.delete(name);
    }
  }
}
```

### 3. Composition Pattern

Complex classes are built by composing smaller, focused modules following the Single Responsibility Principle.

**BaseProvider Composition** (`/src/lib/core/baseProvider.ts`):

```typescript
// src/lib/core/baseProvider.ts

export abstract class BaseProvider implements AIProvider {
  // Composition modules - Single Responsibility Principle
  private readonly messageBuilder: MessageBuilder;
  private readonly streamHandler: StreamHandler;
  private readonly generationHandler: GenerationHandler;
  protected readonly telemetryHandler: TelemetryHandler;
  private readonly utilities: Utilities;
  private readonly toolsManager: ToolsManager;

  constructor(
    modelName?: string,
    providerName?: AIProviderName,
    neurolink?: NeuroLink,
    middleware?: MiddlewareFactoryOptions,
  ) {
    this.modelName = modelName || this.getDefaultModel();
    this.providerName = providerName || this.getProviderName();

    // Initialize composition modules
    this.messageBuilder = new MessageBuilder(this.providerName, this.modelName);
    this.streamHandler = new StreamHandler(this.providerName, this.modelName);
    this.generationHandler = new GenerationHandler(
      this.providerName,
      this.modelName,
      () => this.supportsTools(),
      // ... callbacks
    );
    this.telemetryHandler = new TelemetryHandler(
      this.providerName,
      this.modelName,
      this.neurolink,
    );
    this.utilities = new Utilities(
      this.providerName,
      this.modelName,
      this.defaultTimeout,
      this.middlewareOptions,
    );
    this.toolsManager = new ToolsManager(
      this.providerName,
      this.directTools,
      this.neurolink,
      // ... schema helpers
    );
  }
}
```

---

## Factory and Registry Pattern

### Dynamic Provider Registration

**CRITICAL**: All providers MUST be registered using dynamic imports to break circular dependency chains.

```typescript
// CORRECT: Dynamic import with factory function
ProviderFactory.registerProvider(
  AIProviderName.OPENAI,
  async (modelName?, _providerName?, sdk?) => {
    const { OpenAIProvider } = await import("../providers/openAI.js");
    return new OpenAIProvider(modelName, sdk as NeuroLink | undefined);
  },
  OpenAIModels.GPT_4O_MINI,
  ["gpt", "chatgpt"],
);

// INCORRECT: Static import (causes circular dependencies)
import { OpenAIProvider } from "../providers/openAI.js"; // DON'T DO THIS
```

### Provider Aliases

Providers support aliases for user convenience:

```typescript
ProviderFactory.registerProvider(
  AIProviderName.ANTHROPIC,
  factoryFunction,
  AnthropicModels.CLAUDE_SONNET_4_0,
  ["claude", "anthropic"], // Aliases
);

// All these work:
await ProviderFactory.createProvider("anthropic", model);
await ProviderFactory.createProvider("claude", model);
await ProviderFactory.createProvider(AIProviderName.ANTHROPIC, model);
```

### AIProviderFactory Wrapper

The `AIProviderFactory` (`/src/lib/core/factory.ts`) provides higher-level provider creation:

```typescript
// src/lib/core/factory.ts

export class AIProviderFactory {
  /**
   * Create the best available provider automatically
   */
  static async createBestProvider(
    requestedProvider?: string,
    modelName?: string | null,
    enableMCP: boolean = true,
    sdk?: UnknownRecord,
  ): Promise<AIProvider> {
    const bestProvider = await getBestProvider(requestedProvider);
    return await this.createProvider(bestProvider, modelName, enableMCP, sdk);
  }

  /**
   * Create primary and fallback provider instances
   */
  static async createProviderWithFallback(
    primaryProvider: string,
    fallbackProvider: string,
    modelName?: string | null,
    enableMCP: boolean = true,
  ): Promise<ProviderPairResult<AIProvider>> {
    const primary = await this.createProvider(
      primaryProvider,
      modelName,
      enableMCP,
    );
    const fallback = await this.createProvider(
      fallbackProvider,
      modelName,
      enableMCP,
    );
    return { primary, fallback };
  }
}
```

---

## Provider Abstraction Layer

### AIProvider Interface

All providers implement the `AIProvider` interface:

```typescript
// src/lib/types/providers.ts

export type AIProvider = {
  // Core identification
  getProviderName(): AIProviderName;
  getDefaultModel(): string;

  // AI SDK model access
  getAISDKModel(): LanguageModelV1;

  // Generation methods
  generate(
    options: TextGenerationOptions,
    analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult>;

  stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult>;

  // Capabilities
  supportsTools(): boolean;
  isAvailable(): Promise<boolean>;

  // Error handling
  handleProviderError(error: unknown): Error;
};
```

### BaseProvider Abstract Class

The `BaseProvider` class provides common functionality:

```typescript
// src/lib/core/baseProvider.ts

export abstract class BaseProvider implements AIProvider {
  protected readonly modelName: string;
  protected readonly providerName: AIProviderName;
  protected readonly defaultTimeout: number = 30000;

  // Abstract methods providers must implement
  abstract getProviderName(): AIProviderName;
  abstract getDefaultModel(): string;
  abstract getAISDKModel(): LanguageModelV1;
  abstract handleProviderError(error: unknown): Error;

  // Protected method providers can override
  protected abstract executeStream(
    options: StreamOptions,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult>;

  // Common functionality provided
  supportsTools(): boolean {
    return true; // Default, can be overridden
  }

  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    const options = this.normalizeStreamOptions(optionsOrPrompt);

    try {
      return await this.executeStream(options, analysisSchema);
    } catch (error) {
      // Fallback to fake streaming with tools
      if (!options.disableTools && this.supportsTools()) {
        return await this.executeFakeStreaming(options, analysisSchema);
      }
      throw this.handleProviderError(error);
    }
  }
}
```

### Provider Implementation Pattern

**Example**: Anthropic Provider (`/src/lib/providers/anthropic.ts`):

```typescript
// src/lib/providers/anthropic.ts

export class AnthropicProvider extends BaseProvider {
  private model: LanguageModelV1;

  constructor(modelName?: string, sdk?: unknown) {
    super(
      modelName,
      "anthropic" as AIProviderName,
      sdk as NeuroLink | undefined,
    );

    const apiKey = getAnthropicApiKey();
    const anthropic = createAnthropic({
      apiKey: apiKey,
      fetch: createProxyFetch(), // Enterprise proxy support
    });

    this.model = anthropic(this.modelName || getDefaultAnthropicModel());
  }

  public getProviderName(): AIProviderName {
    return "anthropic" as AIProviderName;
  }

  public getDefaultModel(): string {
    return getDefaultAnthropicModel();
  }

  public getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  public handleProviderError(error: unknown): Error {
    // Provider-specific error classification
    if (error instanceof TimeoutError) {
      throw new NetworkError(`Request timed out`, this.providerName);
    }

    const message = (error as any)?.message || "Unknown error";

    if (message.includes("API_KEY_INVALID")) {
      throw new AuthenticationError("Invalid API key", this.providerName);
    }

    if (message.includes("rate limit")) {
      throw new RateLimitError("Rate limit exceeded", this.providerName);
    }

    throw new ProviderError(`Anthropic error: ${message}`, this.providerName);
  }

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools ? await this.getAllTools() : {};
      const messages = await this.buildMessagesForStream(options);
      const model = await this.getAISDKModelWithMiddleware(options);

      const result = await streamText({
        model,
        messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        tools,
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        toolChoice: shouldUseTools ? "auto" : "none",
        abortSignal: timeoutController?.controller.signal,
      });

      timeoutController?.cleanup();

      return {
        stream: this.createTextStream(result),
        provider: this.providerName,
        model: this.modelName,
        toolCalls: [],
        toolResults: [],
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      getAnthropicApiKey();
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## Component Organization

### Directory Structure

```
src/
├── lib/                        # Core SDK implementation
│   ├── neurolink.ts           # Main SDK class
│   ├── providers/             # AI provider implementations
│   │   ├── anthropic.ts
│   │   ├── openAI.ts
│   │   ├── googleAiStudio.ts
│   │   ├── googleVertex.ts
│   │   ├── amazonBedrock.ts
│   │   └── ...
│   ├── factories/             # Factory pattern implementations
│   │   ├── providerFactory.ts
│   │   └── providerRegistry.ts
│   ├── core/                  # Core infrastructure
│   │   ├── baseProvider.ts
│   │   ├── factory.ts
│   │   ├── serviceRegistry.ts
│   │   └── modules/           # Composition modules
│   │       ├── MessageBuilder.ts
│   │       ├── StreamHandler.ts
│   │       ├── GenerationHandler.ts
│   │       └── ToolsManager.ts
│   ├── types/                 # TypeScript type definitions
│   │   ├── index.ts          # Main exports
│   │   ├── providers.ts
│   │   ├── generateTypes.ts
│   │   ├── streamTypes.ts
│   │   ├── mcpTypes.ts
│   │   └── errors.ts
│   ├── mcp/                   # MCP tool system
│   │   ├── toolRegistry.ts
│   │   ├── externalServerManager.ts
│   │   └── mcpClientFactory.ts
│   ├── middleware/            # Middleware system
│   │   ├── factory.ts
│   │   ├── registry.ts
│   │   └── builtin/
│   ├── utils/                 # Shared utilities
│   │   ├── errorHandling.ts
│   │   ├── transformationUtils.ts
│   │   └── logger.ts
│   ├── config/               # Configuration management
│   └── constants/            # Enums and constants
│       └── enums.ts
├── cli/                      # CLI implementation
└── test/                     # Test suites
```

### Module Organization Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **Explicit Exports**: Use `index.ts` files for clean API boundaries
3. **Type Colocation**: Types are organized by domain in `/types/`
4. **Dynamic Imports**: Providers and heavy modules use dynamic imports

---

## Configuration Patterns

### Environment Variable Configuration

Providers read configuration from environment variables with fallbacks:

```typescript
// src/lib/utils/providerConfig.ts

const getAnthropicApiKey = (): string => {
  return validateApiKey(createAnthropicConfig());
};

const getDefaultAnthropicModel = (): string => {
  return getProviderModel("ANTHROPIC_MODEL", AnthropicModels.CLAUDE_3_5_SONNET);
};

// Helper function pattern
export function getProviderModel(envVar: string, defaultModel: string): string {
  return process.env[envVar] || defaultModel;
}
```

### NeuroLink Constructor Configuration

The main SDK class accepts a configuration object:

```typescript
// src/lib/types/configTypes.ts

export type NeurolinkConstructorConfig = {
  conversationMemory?: Partial<ConversationMemoryConfig>;
  enableOrchestration?: boolean;
  hitl?: HITLConfig;
  toolRegistry?: MCPToolRegistry;
  observability?: ObservabilityConfig;
};

// Usage
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    maxSessions: 50,
    maxTurnsPerSession: 20,
  },
  hitl: {
    enabled: true,
    dangerousActions: ["delete", "remove"],
    timeout: 30000,
  },
  enableOrchestration: true,
});
```

### Config Manager with Backup/Restore

The `NeuroLinkConfigManager` provides persistent configuration with safety mechanisms:

```typescript
// src/lib/config/configManager.ts

export class NeuroLinkConfigManager {
  /**
   * Update configuration with automatic backup
   */
  async updateConfig(
    updates: Partial<NeuroLinkConfig>,
    options: ConfigUpdateOptions = {},
  ): Promise<void> {
    const { createBackup = true, validate = true, merge = true } = options;

    // Always create backup before updating
    if (createBackup) {
      await this.createBackup(reason);
    }

    const existing = await this.loadConfig();
    this.config = merge
      ? { ...existing, ...updates, lastUpdated: Date.now() }
      : ({ ...updates, lastUpdated: Date.now() } as NeuroLinkConfig);

    if (validate) {
      const validation = await this.validateConfig(this.config);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }
    }

    try {
      await this.persistConfig(this.config);
    } catch (error) {
      // Auto-restore on failure
      if (createBackup) {
        await this.restoreLatestBackup();
      }
      throw error;
    }
  }
}
```

---

## Error Handling

### Error Hierarchy

NeuroLink uses a typed error hierarchy:

```typescript
// src/lib/types/errors.ts

/**
 * Base error class for all NeuroLink errors
 */
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Provider-specific errors
 */
export class ProviderError extends BaseError {
  constructor(
    message: string,
    public provider?: string,
  ) {
    super(provider ? `[${provider}] ${message}` : message);
  }
}

export class AuthenticationError extends ProviderError {}
export class AuthorizationError extends ProviderError {}
export class NetworkError extends ProviderError {}
export class RateLimitError extends ProviderError {}
export class InvalidModelError extends ProviderError {}
```

### Enhanced Error Class

The `NeuroLinkError` class provides structured error information:

```typescript
// src/lib/utils/errorHandling.ts

export class NeuroLinkError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly retriable: boolean;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly toolName?: string;
  public readonly serverId?: string;

  constructor(options: {
    code: string;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    retriable: boolean;
    context?: Record<string, unknown>;
    originalError?: Error;
    toolName?: string;
    serverId?: string;
  }) {
    super(options.message);
    this.code = options.code;
    this.category = options.category;
    this.severity = options.severity;
    this.retriable = options.retriable;
    this.context = options.context || {};
    this.timestamp = new Date();
    // ... etc
  }

  toJSON(): StructuredError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      retriable: this.retriable,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}
```

### Error Factory

Use the `ErrorFactory` for creating typed errors:

```typescript
// src/lib/utils/errorHandling.ts

export class ErrorFactory {
  static toolNotFound(
    toolName: string,
    availableTools?: string[],
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_NOT_FOUND,
      message: `Tool '${toolName}' not found`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: { toolName, availableTools },
      toolName,
    });
  }

  static toolExecutionFailed(
    toolName: string,
    originalError: Error,
    serverId?: string,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_EXECUTION_FAILED,
      message: `Tool '${toolName}' execution failed: ${originalError.message}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      originalError,
      toolName,
      serverId,
    });
  }

  static toolTimeout(toolName: string, timeoutMs: number): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_TIMEOUT,
      message: `Tool '${toolName}' timed out after ${timeoutMs}ms`,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: { timeoutMs },
      toolName,
    });
  }
}
```

### Error Handling Utilities

```typescript
// src/lib/utils/errorHandling.ts

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError || new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Retry mechanism for retriable operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts: number;
    delayMs: number;
    isRetriable?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error) => void;
  },
): Promise<T> {
  const { maxAttempts, delayMs, isRetriable = () => true, onRetry } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts || !isRetriable(lastError)) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error("Retry operation failed");
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 60000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = "open";
    }
  }
}
```

---

## Dependency Injection

### Constructor Injection

Components receive dependencies through constructors:

```typescript
// Example: BaseProvider receives NeuroLink instance
export abstract class BaseProvider implements AIProvider {
  protected neurolink?: NeuroLink;

  constructor(
    modelName?: string,
    providerName?: AIProviderName,
    neurolink?: NeuroLink, // Injected dependency
    middleware?: MiddlewareFactoryOptions,
  ) {
    this.neurolink = neurolink;
    // ...
  }
}
```

### Service Registry Pattern

The ServiceRegistry provides lazy-loaded dependency injection:

```typescript
// Registering services
ServiceRegistry.register("toolRegistry", () => new MCPToolRegistry());
ServiceRegistry.register("configManager", () => new NeuroLinkConfigManager());

// Getting services
const toolRegistry = await ServiceRegistry.get<MCPToolRegistry>("toolRegistry");
```

### Optional Dependencies

Optional dependencies use undefined checks and graceful degradation:

```typescript
export class NeuroLink {
  private hitlManager?: HITLManager;

  constructor(config?: NeurolinkConstructorConfig) {
    // Optional HITL initialization
    if (config?.hitl?.enabled) {
      this.hitlManager = new HITLManager(config.hitl);
      this.toolRegistry.setHITLManager(this.hitlManager);
    }
  }

  async executeTool(toolName: string, params: unknown): Promise<unknown> {
    // Graceful handling when HITL not configured
    if (this.hitlManager?.isEnabled()) {
      await this.hitlManager.requestConfirmation(toolName, params);
    }
    // Continue with execution...
  }
}
```

---

## Type System Conventions

### Type File Organization

Types are organized by domain in `/src/lib/types/`:

| File               | Purpose                    |
| ------------------ | -------------------------- |
| `index.ts`         | Main type exports          |
| `providers.ts`     | Provider-related types     |
| `generateTypes.ts` | Generation operation types |
| `streamTypes.ts`   | Streaming operation types  |
| `mcpTypes.ts`      | MCP integration types      |
| `tools.ts`         | Tool definition types      |
| `errors.ts`        | Error types                |
| `common.ts`        | Shared common types        |

### Common Type Patterns

```typescript
// src/lib/types/common.ts

/**
 * Generic record with unknown values
 */
export type UnknownRecord = Record<string, unknown>;

/**
 * JSON-compatible value types
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

/**
 * Error information with optional details
 */
export type ErrorInfo = {
  message: string;
  code?: string;
  stack?: string;
  context?: Record<string, unknown>;
};
```

### Type Alias Patterns

```typescript
// src/lib/types/typeAliases.ts

/**
 * Zod schema with unknown type
 */
export type ZodUnknownSchema = z.ZodType<unknown>;

/**
 * Validation schema union type
 */
export type ValidationSchema = ZodUnknownSchema | JSONSchema7;

/**
 * Standard record type
 */
export type StandardRecord = Record<string, unknown>;
```

### Enum Patterns

```typescript
// src/lib/constants/enums.ts

/**
 * Supported AI Provider Names
 */
export enum AIProviderName {
  BEDROCK = "bedrock",
  OPENAI = "openai",
  OPENAI_COMPATIBLE = "openai-compatible",
  VERTEX = "vertex",
  ANTHROPIC = "anthropic",
  AZURE = "azure",
  GOOGLE_AI = "google-ai",
  HUGGINGFACE = "huggingface",
  OLLAMA = "ollama",
  MISTRAL = "mistral",
  LITELLM = "litellm",
  SAGEMAKER = "sagemaker",
  AUTO = "auto",
}

/**
 * Error categories
 */
export enum ErrorCategory {
  VALIDATION = "validation",
  EXECUTION = "execution",
  TIMEOUT = "timeout",
  NETWORK = "network",
  RESOURCE = "resource",
}
```

---

## MCP Tool System

### MCPToolRegistry

The central registry for tool management:

```typescript
// src/lib/mcp/toolRegistry.ts

export class MCPToolRegistry extends MCPRegistry {
  private tools: Map<string, ToolInfo> = new Map();
  private toolImplementations: Map<string, ToolImplementation> = new Map();
  private hitlManager?: HITLManager;

  constructor() {
    super();
    if (!shouldDisableBuiltinTools()) {
      this.registerDirectTools();
    }
  }

  /**
   * Register a server with its tools
   */
  async registerServer(serverInfo: MCPServerInfo): Promise<void> {
    const serverId = serverInfo.id;

    for (const tool of serverInfo.tools) {
      const toolId = serverId.startsWith("custom-tool-")
        ? tool.name
        : `${serverId}.${tool.name}`;

      this.tools.set(toolId, {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        serverId,
        category: detectCategory({ serverId }),
      });

      this.toolImplementations.set(toolId, {
        execute:
          tool.execute ||
          (() => {
            throw new Error("No execute function");
          }),
        description: tool.description,
        inputSchema: tool.inputSchema,
      });
    }
  }

  /**
   * Execute a tool with HITL support
   */
  async executeTool(
    toolName: string,
    params: unknown,
    context?: ExecutionContext,
  ): Promise<ToolResult> {
    const implementation = this.toolImplementations.get(toolName);

    if (!implementation) {
      throw ErrorFactory.toolNotFound(toolName);
    }

    // HITL confirmation if enabled
    if (this.hitlManager?.isEnabled()) {
      await this.hitlManager.requestConfirmation(toolName, params);
    }

    return await implementation.execute(params, context);
  }
}
```

### External Server Manager

Manages lifecycle of external MCP servers:

```typescript
// src/lib/mcp/externalServerManager.ts

export class ExternalServerManager extends EventEmitter {
  private servers: Map<string, RuntimeMCPServerInfo> = new Map();
  private config: Required<ExternalMCPManagerConfig>;

  constructor(config: ExternalMCPManagerConfig = {}) {
    super();
    this.config = {
      maxServers: config.maxServers ?? 10,
      defaultTimeout: config.defaultTimeout ?? 10000,
      defaultHealthCheckInterval: config.defaultHealthCheckInterval ?? 30000,
      enableAutoRestart: config.enableAutoRestart ?? true,
      maxRestartAttempts: config.maxRestartAttempts ?? 3,
      // ...
    };
  }

  /**
   * Add an external MCP server
   */
  async addServer(
    serverId: string,
    config: ExternalMCPServerConfig,
  ): Promise<ExternalMCPOperationResult> {
    // Validate config
    if (!isValidExternalMCPServerConfig(config)) {
      return { success: false, error: "Invalid configuration" };
    }

    // Environment variable substitution
    const processedConfig = substituteEnvVariables(config);

    // Create and connect to server
    const client = await MCPClientFactory.create(processedConfig);

    // Discover and register tools
    const tools = await this.toolDiscovery.discoverTools(client);

    this.servers.set(serverId, {
      id: serverId,
      config: processedConfig,
      client,
      tools,
      status: "connected",
    });

    return { success: true, tools };
  }
}
```

---

## Middleware Architecture

### Middleware Factory

The MiddlewareFactory creates and applies middleware chains:

```typescript
// src/lib/middleware/factory.ts

export class MiddlewareFactory {
  public registry: MiddlewareRegistry;
  public presets = new Map<string, MiddlewarePreset>();

  constructor(options: MiddlewareFactoryOptions = {}) {
    this.registry = new MiddlewareRegistry();
    this.initialize(options);
  }

  private initialize(options: MiddlewareFactoryOptions): void {
    // Register built-in middleware
    const builtInMiddlewareCreators = {
      analytics: createAnalyticsMiddleware,
      guardrails: createGuardrailsMiddleware,
      autoEvaluation: createAutoEvaluationMiddleware,
    };

    // Register presets
    this.registerPreset({
      name: "default",
      description: "Default preset with analytics enabled.",
      config: { analytics: { enabled: true } },
    });

    this.registerPreset({
      name: "security",
      description: "Focuses on security with guardrails.",
      config: { guardrails: { enabled: true } },
    });
  }

  /**
   * Apply middleware to a language model
   */
  public applyMiddleware(
    model: LanguageModelV1,
    context: MiddlewareContext,
    options: MiddlewareFactoryOptions = {},
  ): LanguageModelV1 {
    const middlewareChain = this.registry.buildChain(context, middlewareConfig);

    if (middlewareChain.length === 0) {
      return model;
    }

    return wrapLanguageModel({
      model,
      middleware: middlewareChain,
    });
  }
}
```

### Creating Custom Middleware

```typescript
// Example: Custom logging middleware
import type { NeuroLinkMiddleware } from "../types/middlewareTypes.js";

export function createLoggingMiddleware(
  config?: Record<string, unknown>,
): NeuroLinkMiddleware {
  return {
    metadata: {
      id: "custom-logging",
      name: "Custom Logging Middleware",
      description: "Logs all requests and responses",
      version: "1.0.0",
    },

    transformParams: async ({ params }) => {
      console.log("Request params:", params);
      return params;
    },

    wrapGenerate: async ({ doGenerate, params }) => {
      const start = Date.now();
      const result = await doGenerate();
      console.log(`Generation took ${Date.now() - start}ms`);
      return result;
    },
  };
}
```

---

## Implementation Checklist

When implementing new features, ensure compliance with these patterns:

### Provider Implementation

- [ ] Extend `BaseProvider` abstract class
- [ ] Implement all abstract methods (`getProviderName`, `getDefaultModel`, `getAISDKModel`, `handleProviderError`, `executeStream`)
- [ ] Use dynamic import registration in `ProviderRegistry`
- [ ] Provide meaningful aliases
- [ ] Handle all error types with typed errors
- [ ] Support enterprise proxy via `createProxyFetch()`
- [ ] Add appropriate timeout handling

### Type Definitions

- [ ] Create domain-specific types in appropriate file under `/src/lib/types/`
- [ ] Export types through `index.ts`
- [ ] Use existing type aliases (`UnknownRecord`, `JsonValue`, etc.)
- [ ] Document complex types with JSDoc
- [ ] Avoid circular type dependencies

### Error Handling

- [ ] Use `ErrorFactory` for common errors
- [ ] Extend appropriate error class (`ProviderError`, `BaseError`)
- [ ] Include `retriable` flag for operation retry decisions
- [ ] Provide meaningful error context
- [ ] Use `withTimeout` and `withRetry` utilities

### Configuration

- [ ] Support environment variable configuration
- [ ] Provide sensible defaults
- [ ] Validate configuration on initialization
- [ ] Document configuration options

### Testing

- [ ] Add unit tests for new functionality
- [ ] Add integration tests for provider interactions
- [ ] Test error scenarios
- [ ] Test with and without optional dependencies

### Documentation

- [ ] Add JSDoc comments for public APIs
- [ ] Update CLAUDE.md if adding new patterns
- [ ] Add usage examples

---

## References

- **Main SDK Class**: `/src/lib/neurolink.ts`
- **Provider Factory**: `/src/lib/factories/providerFactory.ts`
- **Provider Registry**: `/src/lib/factories/providerRegistry.ts`
- **Base Provider**: `/src/lib/core/baseProvider.ts`
- **Error Handling**: `/src/lib/utils/errorHandling.ts`
- **Type Definitions**: `/src/lib/types/index.ts`
- **MCP Tool Registry**: `/src/lib/mcp/toolRegistry.ts`
- **Middleware Factory**: `/src/lib/middleware/factory.ts`
- **Configuration Manager**: `/src/lib/config/configManager.ts`

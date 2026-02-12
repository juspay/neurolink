# Middleware System Architecture

## Overview

NeuroLink's middleware system provides a powerful and flexible way to intercept, modify, and enhance AI requests and responses. Middleware enables you to implement cross-cutting concerns like authentication, logging, analytics, content filtering, and auto-evaluation without modifying your core application logic.

**Why Middleware Matters:**

- **Request Interception**: Modify requests before they reach the AI provider
- **Response Processing**: Transform, filter, or validate AI responses
- **Cross-Cutting Concerns**: Implement authentication, logging, rate limiting, and caching in a centralized way
- **Composability**: Chain multiple middleware components together
- **Separation of Concerns**: Keep business logic separate from infrastructure concerns

**Key Benefits:**

- Production-ready middleware for common use cases (analytics, guardrails, auto-evaluation)
- Factory pattern for easy middleware management
- Priority-based execution ordering
- Provider-specific conditional execution
- Built on top of Vercel AI SDK's middleware system

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Request Flow                              │
└─────────────────────────────────────────────────────────────────┘

  Client Request
       │
       ├─────────────────────────────────────────────┐
       │                                             │
       v                                             │
┌──────────────────────┐                            │
│  MiddlewareFactory   │                            │
│  - Registry          │                            │
│  - Configuration     │                            │
└──────────────────────┘                            │
       │                                             │
       v                                             │
┌─────────────────────────────────────────┐         │
│    Pre-Request Middleware Chain          │         │
│  (Ordered by Priority - High to Low)    │         │
├─────────────────────────────────────────┤         │
│  1. transformParams (Guardrails)        │         │
│     - Precall evaluation                │         │
│     - Input validation                  │         │
│     - Request transformation            │         │
└─────────────────────────────────────────┘         │
       │                                             │
       v                                             │
┌─────────────────────────────────────────┐         │
│         Provider Execution               │         │
│    (OpenAI, Anthropic, Vertex, etc.)    │         │
└─────────────────────────────────────────┘         │
       │                                             │
       v                                             │
┌─────────────────────────────────────────┐         │
│   Post-Response Middleware Chain         │         │
│  (Ordered by Priority - High to Low)    │         │
├─────────────────────────────────────────┤         │
│  2. wrapGenerate/wrapStream             │         │
│     - Analytics (Priority: 100)         │         │
│     - Guardrails (Priority: 90)         │         │
│     - Auto-Evaluation (Priority: 90)    │         │
└─────────────────────────────────────────┘         │
       │                                             │
       v                                             │
  Client Response                                    │
                                                     │
┌─────────────────────────────────────────┐         │
│          Error Handling Flow             │         │
│    (If error occurs at any stage)       │◄────────┘
├─────────────────────────────────────────┤
│  - Error Middleware Chain               │
│  - Error logging                        │
│  - Fallback handling                    │
│  - Retry logic (if configured)          │
└─────────────────────────────────────────┘
       │
       v
  Error Response
```

## Request Lifecycle

The middleware system processes requests through four distinct phases:

### Phase 1: Pre-Request (transformParams)

Middleware in this phase runs **before** the AI provider call, allowing you to:

- **Validate input**: Check request parameters for validity
- **Authenticate/Authorize**: Verify user permissions
- **Transform requests**: Modify or enrich request parameters
- **Apply guardrails**: Block requests with unsafe content using precall evaluation
- **Rate limiting**: Enforce request quotas

**Example Use Cases:**

- Precall guardrails evaluation (blocking unsafe prompts)
- Request parameter validation
- Adding authentication context
- Modifying prompts based on user preferences

```typescript
transformParams: async ({ params }) => {
  // Pre-request logic here
  console.log("Request received:", params);

  // Can modify params before they reach the provider
  return {
    ...params,
    temperature: Math.min(params.temperature || 0.7, 1.0),
  };
};
```

### Phase 2: Provider Execution

The actual AI provider call happens between middleware phases:

- Request sent to configured provider (OpenAI, Anthropic, Vertex, etc.)
- Provider processes the request
- Response received from provider

This phase is **not** middleware - it's the core AI operation that middleware wraps around.

### Phase 3: Post-Response (wrapGenerate/wrapStream)

Middleware in this phase runs **after** the AI provider responds, allowing you to:

- **Collect analytics**: Track token usage, response times, costs
- **Filter content**: Apply guardrails to block/redact unsafe responses
- **Evaluate quality**: Auto-evaluate response quality and trigger retries
- **Transform responses**: Modify or enrich the response
- **Cache results**: Store responses for future use

**Example Use Cases:**

- Analytics and metrics collection
- Content filtering and safety checks
- Response quality evaluation
- Response caching
- Logging and auditing

```typescript
wrapGenerate: async ({ doGenerate, params }) => {
  const startTime = Date.now();

  // Execute the provider call
  const result = await doGenerate();

  // Post-response logic here
  const responseTime = Date.now() - startTime;
  console.log(`Response in ${responseTime}ms`);

  return result;
};
```

### Phase 4: Error Handling

If an error occurs at any stage, error handling middleware can:

- **Log errors**: Record error details for debugging
- **Transform errors**: Convert provider errors to user-friendly messages
- **Implement fallbacks**: Retry with different providers
- **Alert monitoring**: Send alerts to monitoring systems

**Example Use Cases:**

- Error logging and tracking
- Provider fallback on failure
- Retry logic with exponential backoff
- User-friendly error messages

## Middleware Chain

### Execution Order

Middleware executes in **priority order**, where higher priority values run first:

```
Priority 100: Analytics (runs first)
Priority 90:  Guardrails
Priority 90:  Auto-Evaluation (runs last among same priority)
```

**Important Notes:**

- `transformParams` runs before `wrapGenerate`/`wrapStream`
- Within the same priority, registration order determines execution
- Middleware can be conditionally enabled based on provider, model, or custom logic

### Chain Configuration

Configure which middleware to enable and their order:

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";

const factory = new MiddlewareFactory({
  // Use a preset for common configurations
  preset: "all", // Enables analytics + guardrails

  // Or explicitly enable specific middleware
  enabledMiddleware: ["analytics", "guardrails"],

  // Or configure each middleware individually
  middlewareConfig: {
    analytics: {
      enabled: true,
      config: { collectTokenUsage: true },
    },
    guardrails: {
      enabled: true,
      config: {
        badWords: ["prohibited", "blocked"],
        precallEvaluation: { enabled: true },
      },
    },
  },
});
```

### Available Presets

| Preset     | Middleware Enabled     | Use Case               |
| ---------- | ---------------------- | ---------------------- |
| `default`  | Analytics only         | Basic usage tracking   |
| `all`      | Analytics + Guardrails | Production with safety |
| `security` | Guardrails only        | Security-focused       |
| Custom     | Your choice            | Define your own        |

## Factory Pattern

### MiddlewareFactory Class

The `MiddlewareFactory` is the central component for managing middleware:

```typescript
class MiddlewareFactory {
  // Public registry for middleware management
  public registry: MiddlewareRegistry;

  // Available presets
  public presets: Map<string, MiddlewarePreset>;

  // Constructor
  constructor(options?: MiddlewareFactoryOptions);

  // Register custom middleware
  register(
    middleware: NeuroLinkMiddleware,
    options?: RegistrationOptions,
  ): void;

  // Register a preset
  registerPreset(preset: MiddlewarePreset, replace?: boolean): void;

  // Apply middleware to a language model
  applyMiddleware(
    model: LanguageModelV1,
    context: MiddlewareContext,
    options?: MiddlewareFactoryOptions,
  ): LanguageModelV1;

  // Create middleware context
  createContext(
    provider: string,
    model: string,
    options?: Record<string, unknown>,
    session?: { sessionId?: string; userId?: string },
  ): MiddlewareContext;

  // Validate middleware configuration
  validateConfig(config: Record<string, MiddlewareConfig>): ValidationResult;

  // Get available presets
  getAvailablePresets(): PresetInfo[];

  // Get middleware chain statistics
  getChainStats(
    context: MiddlewareContext,
    config: Record<string, MiddlewareConfig>,
  ): MiddlewareChainStats;
}
```

### Creating Middleware Instances

**Basic Usage:**

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";

// Create factory with default preset (analytics enabled)
const factory = new MiddlewareFactory();

// Create context
const context = factory.createContext("openai", "gpt-4", { temperature: 0.7 });

// Apply middleware to a model
const wrappedModel = factory.applyMiddleware(baseModel, context);
```

**Advanced Configuration:**

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";
import { createAnalyticsMiddleware } from "@juspay/neurolink";

// Create factory with custom configuration
const factory = new MiddlewareFactory({
  preset: "all",
  middlewareConfig: {
    analytics: {
      enabled: true,
      config: {
        collectTokenUsage: true,
        collectTiming: true,
      },
    },
    guardrails: {
      enabled: true,
      config: {
        badWords: ["unsafe", "prohibited"],
        precallEvaluation: {
          enabled: true,
          provider: "openai",
          model: "gpt-4",
        },
      },
      conditions: {
        providers: ["openai", "anthropic"], // Only apply to specific providers
      },
    },
  },
});

// Or register custom middleware after instantiation
const customMiddleware = createMyCustomMiddleware();
factory.register(customMiddleware);
```

## Registry System

### Registering Middleware

The `MiddlewareRegistry` manages all registered middleware:

```typescript
class MiddlewareRegistry {
  // Register a middleware
  register(
    middleware: NeuroLinkMiddleware,
    options?: MiddlewareRegistrationOptions,
  ): void;

  // Unregister a middleware
  unregister(middlewareId: string): boolean;

  // Get a registered middleware
  get(middlewareId: string): NeuroLinkMiddleware | undefined;

  // List all registered middleware
  list(): NeuroLinkMiddleware[];

  // Get middleware IDs sorted by priority
  getSortedIds(): string[];

  // Build middleware chain based on configuration
  buildChain(
    context: MiddlewareContext,
    config?: Record<string, MiddlewareConfig>,
  ): LanguageModelV1Middleware[];

  // Get execution statistics
  getExecutionStats(middlewareId: string): MiddlewareExecutionResult[];

  // Get aggregated statistics for all middleware
  getAggregatedStats(): Record<string, MiddlewareStats>;

  // Clear execution statistics
  clearStats(middlewareId?: string): void;

  // Check if middleware is registered
  has(middlewareId: string): boolean;

  // Get number of registered middleware
  size(): number;

  // Clear all registered middleware
  clear(): void;
}
```

**Registration Example:**

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";

const factory = new MiddlewareFactory();

// Register middleware with options
factory.register(myCustomMiddleware, {
  replace: false, // Error if already exists
  defaultEnabled: true, // Enable by default
  globalConfig: {
    // Global configuration
    logLevel: "debug",
  },
});
```

### Discovering Middleware

**List all registered middleware:**

```typescript
const allMiddleware = factory.registry.list();
console.log(
  "Registered middleware:",
  allMiddleware.map((m) => m.metadata.id),
);
```

**Get specific middleware:**

```typescript
const analytics = factory.registry.get("analytics");
if (analytics) {
  console.log("Analytics middleware found:", analytics.metadata.name);
}
```

**Check if middleware is registered:**

```typescript
if (factory.registry.has("guardrails")) {
  console.log("Guardrails middleware is available");
}
```

### Middleware Metadata

Every middleware must provide metadata:

```typescript
type NeuroLinkMiddlewareMetadata = {
  // Unique identifier
  id: string;

  // Human-readable name
  name: string;

  // Description of what this middleware does
  description?: string;

  // Execution priority (higher runs first)
  priority?: number;

  // Whether this middleware is enabled by default
  defaultEnabled?: boolean;
};
```

**Example:**

```typescript
const metadata: NeuroLinkMiddlewareMetadata = {
  id: "my-custom-middleware",
  name: "My Custom Middleware",
  description: "Logs all requests and responses",
  priority: 50, // Run after analytics (100) but before auto-eval (90)
  defaultEnabled: false, // Require explicit enabling
};
```

## TypeScript Interfaces

### NeuroLinkMiddleware

The core middleware interface that combines AI SDK middleware with metadata:

```typescript
import type { LanguageModelV1Middleware } from "ai";

type NeuroLinkMiddleware = LanguageModelV1Middleware & {
  // Metadata about this middleware
  metadata: NeuroLinkMiddlewareMetadata;
};
```

### LanguageModelV1Middleware (from AI SDK)

The underlying middleware interface from Vercel AI SDK:

```typescript
type LanguageModelV1Middleware = {
  // Transform request parameters before provider call
  transformParams?: (options: {
    params: LanguageModelV1CallOptions;
  }) => PromiseLike<LanguageModelV1CallOptions>;

  // Wrap generate() calls
  wrapGenerate?: (options: {
    doGenerate: () => PromiseLike<LanguageModelV1CallResult>;
    params: LanguageModelV1CallOptions;
  }) => PromiseLike<LanguageModelV1CallResult>;

  // Wrap stream() calls
  wrapStream?: (options: {
    doStream: () => PromiseLike<LanguageModelV1StreamResult>;
    params: LanguageModelV1CallOptions;
  }) => PromiseLike<LanguageModelV1StreamResult>;
};
```

### MiddlewareContext

Context information passed to middleware:

```typescript
type MiddlewareContext = {
  // Provider name (e.g., "openai", "anthropic")
  provider: string;

  // Model name (e.g., "gpt-4", "claude-3-5-sonnet")
  model: string;

  // Additional options
  options: Record<string, unknown>;

  // Session information
  session?: {
    sessionId?: string;
    userId?: string;
  };

  // Request metadata
  metadata: {
    timestamp: number;
    requestId: string;
  };
};
```

### MiddlewareConfig

Configuration for individual middleware:

```typescript
type MiddlewareConfig = {
  // Whether this middleware is enabled
  enabled: boolean;

  // Middleware-specific configuration
  config?: Record<string, unknown>;

  // Conditions for when this middleware should run
  conditions?: {
    // Only run for specific providers
    providers?: string[];

    // Only run for specific models
    models?: string[];

    // Only run when options match
    options?: Record<string, unknown>;

    // Custom condition function
    custom?: (context: MiddlewareContext) => boolean;
  };
};
```

### MiddlewareFactoryOptions

Options for creating and configuring the factory:

```typescript
type MiddlewareFactoryOptions = {
  // Preset to use (e.g., "default", "all", "security")
  preset?: string;

  // Custom middleware to register
  middleware?: NeuroLinkMiddleware[];

  // Configuration for each middleware
  middlewareConfig?: Record<string, MiddlewareConfig>;

  // List of middleware IDs to enable
  enabledMiddleware?: string[];

  // List of middleware IDs to disable
  disabledMiddleware?: string[];
};
```

### MiddlewareChainStats

Statistics about middleware execution:

```typescript
type MiddlewareChainStats = {
  // Total middleware in chain
  totalMiddleware: number;

  // Number of middleware actually applied
  appliedMiddleware: number;

  // Total execution time across all middleware
  totalExecutionTime: number;

  // Per-middleware execution results
  results: Record<string, MiddlewareExecutionResult>;
};

type MiddlewareExecutionResult = {
  // Whether middleware was applied
  applied: boolean;

  // Execution time in milliseconds
  executionTime: number;

  // Error if execution failed
  error?: Error;
};
```

## Conditional Execution

Middleware can be configured to run only under specific conditions:

### Provider-Specific Middleware

```typescript
factory.applyMiddleware(model, context, {
  middlewareConfig: {
    guardrails: {
      enabled: true,
      conditions: {
        providers: ["openai", "anthropic"], // Only for these providers
      },
    },
  },
});
```

### Model-Specific Middleware

```typescript
factory.applyMiddleware(model, context, {
  middlewareConfig: {
    analytics: {
      enabled: true,
      conditions: {
        models: ["gpt-4", "claude-3-5-sonnet"], // Only for these models
      },
    },
  },
});
```

### Custom Conditions

```typescript
factory.applyMiddleware(model, context, {
  middlewareConfig: {
    myMiddleware: {
      enabled: true,
      conditions: {
        custom: (context) => {
          // Only run during business hours
          const hour = new Date().getHours();
          return hour >= 9 && hour <= 17;
        },
      },
    },
  },
});
```

## Performance Monitoring

### Execution Statistics

Track middleware performance:

```typescript
// Get stats for specific middleware
const analyticsStats = factory.registry.getExecutionStats("analytics");
console.log("Analytics executions:", analyticsStats);

// Get aggregated stats for all middleware
const allStats = factory.registry.getAggregatedStats();
console.log("All middleware stats:", allStats);
```

**Output Example:**

```typescript
{
  analytics: {
    totalExecutions: 1000,
    successfulExecutions: 998,
    failedExecutions: 2,
    averageExecutionTime: 2.5, // milliseconds
    lastExecutionTime: 2.3
  },
  guardrails: {
    totalExecutions: 1000,
    successfulExecutions: 950,
    failedExecutions: 50,
    averageExecutionTime: 15.2,
    lastExecutionTime: 14.8
  }
}
```

### Clear Statistics

```typescript
// Clear stats for specific middleware
factory.registry.clearStats("analytics");

// Clear all stats
factory.registry.clearStats();
```

## Best Practices

### 1. Order Middleware by Priority

```typescript
// Security first (highest priority)
// Analytics for all requests
// Evaluation last (lowest priority)

const securityMiddleware = {
  metadata: { id: "security", priority: 100 },
};

const analyticsMiddleware = {
  metadata: { id: "analytics", priority: 90 },
};

const evaluationMiddleware = {
  metadata: { id: "evaluation", priority: 80 },
};
```

### 2. Handle Errors Gracefully

```typescript
wrapGenerate: async ({ doGenerate }) => {
  try {
    const result = await doGenerate();
    return result;
  } catch (error) {
    // Log error but don't break the chain
    console.error("Middleware error:", error);
    throw error; // Re-throw to maintain error flow
  }
};
```

### 3. Use Conditional Execution

```typescript
// Only apply expensive middleware for production
middlewareConfig: {
  expensiveMiddleware: {
    enabled: true,
    conditions: {
      custom: (context) => process.env.NODE_ENV === "production"
    }
  }
}
```

### 4. Keep Middleware Focused

Each middleware should have a single responsibility:

- ✅ Good: Analytics middleware only collects metrics
- ❌ Bad: Analytics middleware that also filters content and logs errors

### 5. Test Middleware Independently

```typescript
import { createAnalyticsMiddleware } from "@juspay/neurolink";

// Test middleware in isolation
const middleware = createAnalyticsMiddleware();
const mockDoGenerate = async () => ({ text: "test" });
const result = await middleware.wrapGenerate({
  doGenerate: mockDoGenerate,
  params: { prompt: "test" },
});
```

## See Also

- [Built-in Middleware Reference](builtin-middleware.md) - Documentation for analytics, guardrails, and auto-evaluation
- [Custom Middleware Guide](../custom-middleware-guide.md) - Step-by-step guide to creating custom middleware
- [HITL Integration](../features/enterprise-hitl.md) - Integrating middleware with Human-in-the-Loop workflows
- [Provider Comparison](../reference/provider-comparison.md) - Which providers support which middleware features

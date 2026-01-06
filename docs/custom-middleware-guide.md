# Custom Middleware Development Guide

This document provides a comprehensive guide to developing and implementing custom middleware in the NeuroLink platform. Middleware offers a powerful way to enhance, modify, or extend the behavior of language models without changing their core implementation.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Middleware Interface](#middleware-interface)
- [Complete Examples](#complete-examples)
  - [Example 1: Request Logging Middleware](#example-1-request-logging-middleware)
  - [Example 2: Rate Limiting Middleware](#example-2-rate-limiting-middleware)
  - [Example 3: Cost Tracking Middleware](#example-3-cost-tracking-middleware)
  - [Example 4: Response Caching Middleware](#example-4-response-caching-middleware)
- [Registration Methods](#registration-methods)
- [Best Practices](#best-practices)
- [Testing Middleware](#testing-middleware)
- [Troubleshooting](#troubleshooting)

## Overview

Middleware in NeuroLink allows you to intercept and modify the flow of data between your application and the language models. With the `MiddlewareFactory`, creating and registering custom middleware is simple and intuitive.

**What You Can Do with Middleware:**

- Intercept requests before they reach the AI provider
- Modify or validate request parameters
- Transform AI responses
- Implement cross-cutting concerns (logging, rate limiting, caching, etc.)
- Add analytics and monitoring
- Enforce security policies

## Quick Start

**5-Minute Quickstart:**

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";
import type { NeuroLinkMiddleware } from "@juspay/neurolink";

// 1. Create your middleware
const myMiddleware: NeuroLinkMiddleware = {
  metadata: {
    id: "my-middleware",
    name: "My Custom Middleware",
    priority: 100,
  },
  wrapGenerate: async ({ doGenerate, params }) => {
    console.log("Before request");
    const result = await doGenerate();
    console.log("After response");
    return result;
  },
};

// 2. Register with factory
const factory = new MiddlewareFactory({
  middleware: [myMiddleware],
});

// 3. Enable and use
const context = factory.createContext("openai", "gpt-4");
const wrappedModel = factory.applyMiddleware(baseModel, context, {
  enabledMiddleware: ["my-middleware"],
});

// 4. Use the wrapped model
const result = await wrappedModel.generate({ prompt: "Hello!" });
```

## Middleware Interface

Every custom middleware implements the `NeuroLinkMiddleware` interface:

```typescript
type NeuroLinkMiddleware = {
  // Required: Metadata about your middleware
  metadata: {
    id: string; // Unique identifier
    name: string; // Human-readable name
    description?: string; // What this middleware does
    priority?: number; // Execution order (higher = earlier)
    defaultEnabled?: boolean; // Enable by default?
  };

  // Optional: Transform request parameters before provider call
  transformParams?: (options: {
    params: LanguageModelV1CallOptions;
  }) => PromiseLike<LanguageModelV1CallOptions>;

  // Optional: Wrap generate() calls (non-streaming)
  wrapGenerate?: (options: {
    doGenerate: () => PromiseLike<LanguageModelV1CallResult>;
    params: LanguageModelV1CallOptions;
  }) => PromiseLike<LanguageModelV1CallResult>;

  // Optional: Wrap stream() calls (streaming)
  wrapStream?: (options: {
    doStream: () => PromiseLike<LanguageModelV1StreamResult>;
    params: LanguageModelV1CallOptions;
  }) => PromiseLike<LanguageModelV1StreamResult>;
};
```

**Method Execution Order:**

1. `transformParams` - Runs before provider call
2. Provider execution
3. `wrapGenerate` or `wrapStream` - Runs after provider call

## Complete Examples

### Example 1: Request Logging Middleware

**Purpose**: Log all AI requests and responses with timing information.

**Full Implementation:**

```typescript
import type { NeuroLinkMiddleware } from "@juspay/neurolink";

export const createLoggingMiddleware = (): NeuroLinkMiddleware => ({
  metadata: {
    id: "request-logger",
    name: "Request Logging Middleware",
    description: "Logs all AI requests and responses with timing",
    priority: 150, // High priority to log everything
    defaultEnabled: true,
  },

  wrapGenerate: async ({ doGenerate, params }) => {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[${new Date().toISOString()}] ${requestId} - Request started`);
    console.log(`  Prompt: ${params.prompt?.slice(0, 100)}...`);

    try {
      const result = await doGenerate();
      const duration = Date.now() - startTime;

      console.log(
        `[${new Date().toISOString()}] ${requestId} - Response received`,
      );
      console.log(`  Duration: ${duration}ms`);
      console.log(
        `  Tokens: ${result.usage.promptTokens} in, ${result.usage.completionTokens} out`,
      );
      console.log(`  Text: ${result.text?.slice(0, 100)}...`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[${new Date().toISOString()}] ${requestId} - Request failed`,
      );
      console.error(`  Duration: ${duration}ms`);
      console.error(
        `  Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  },

  wrapStream: async ({ doStream, params }) => {
    const startTime = Date.now();
    const requestId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[${new Date().toISOString()}] ${requestId} - Stream started`);
    console.log(`  Prompt: ${params.prompt?.slice(0, 100)}...`);

    try {
      const result = await doStream();

      // Log when stream completes
      const originalStream = result.stream;
      const loggingStream = new ReadableStream({
        async start(controller) {
          const reader = originalStream.getReader();
          let chunkCount = 0;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                const duration = Date.now() - startTime;
                console.log(
                  `[${new Date().toISOString()}] ${requestId} - Stream completed`,
                );
                console.log(`  Duration: ${duration}ms`);
                console.log(`  Chunks: ${chunkCount}`);
                controller.close();
                break;
              }

              chunkCount++;
              controller.enqueue(value);
            }
          } catch (error) {
            console.error(
              `[${new Date().toISOString()}] ${requestId} - Stream error`,
            );
            console.error(
              `  Error: ${error instanceof Error ? error.message : String(error)}`,
            );
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        },
      });

      return {
        ...result,
        stream: loggingStream,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[${new Date().toISOString()}] ${requestId} - Stream failed to start`,
      );
      console.error(`  Duration: ${duration}ms`);
      console.error(
        `  Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  },
});
```

**Usage:**

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";
import { createLoggingMiddleware } from "./logging-middleware";

const factory = new MiddlewareFactory({
  middleware: [createLoggingMiddleware()],
});

const context = factory.createContext("openai", "gpt-4");
const wrappedModel = factory.applyMiddleware(baseModel, context, {
  enabledMiddleware: ["request-logger"],
});

// Logs will appear for all requests
const result = await wrappedModel.generate({
  prompt: "Explain quantum computing",
});
```

**Example Output:**

```
[2026-01-01T00:00:00.000Z] req-1735689600000-abc123 - Request started
  Prompt: Explain quantum computing...
[2026-01-01T00:00:01.234Z] req-1735689600000-abc123 - Response received
  Duration: 1234ms
  Tokens: 12 in, 256 out
  Text: Quantum computing is a revolutionary technology that...
```

---

### Example 2: Rate Limiting Middleware

**Purpose**: Enforce rate limits per user or API key to prevent abuse.

**Full Implementation:**

```typescript
import type { NeuroLinkMiddleware } from "@juspay/neurolink";

type RateLimitConfig = {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  keyExtractor?: (params: any) => string; // Extract user/key from params
};

export const createRateLimitMiddleware = (
  config: RateLimitConfig = {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
  },
): NeuroLinkMiddleware => {
  // Store request timestamps per user
  const requestTimestamps = new Map<string, number[]>();

  const checkRateLimit = (key: string): void => {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get existing timestamps for this key
    const timestamps = requestTimestamps.get(key) || [];

    // Filter to only recent requests within the time window
    const recentRequests = timestamps.filter((t) => t > windowStart);

    // Check if rate limit exceeded
    if (recentRequests.length >= config.maxRequests) {
      const oldestRequest = recentRequests[0];
      const resetTime = oldestRequest + config.windowMs;
      const waitTime = Math.ceil((resetTime - now) / 1000);

      throw new Error(
        `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000}s. ` +
          `Try again in ${waitTime} seconds.`,
      );
    }

    // Add current request timestamp
    recentRequests.push(now);
    requestTimestamps.set(key, recentRequests);

    // Clean up old entries (older than window)
    if (recentRequests.length > config.maxRequests * 2) {
      requestTimestamps.set(key, recentRequests.slice(-config.maxRequests));
    }
  };

  const extractKey = (params: any): string => {
    if (config.keyExtractor) {
      return config.keyExtractor(params);
    }

    // Default: use headers or a global key
    return (
      params.headers?.["x-api-key"] ||
      params.headers?.["x-user-id"] ||
      "default"
    );
  };

  return {
    metadata: {
      id: "rate-limiter",
      name: "Rate Limiting Middleware",
      description: `Limits to ${config.maxRequests} requests per ${config.windowMs / 1000}s`,
      priority: 200, // Very high priority to block early
      defaultEnabled: false,
    },

    transformParams: async ({ params }) => {
      const key = extractKey(params);
      checkRateLimit(key);
      return params;
    },
  };
};
```

**Usage:**

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";
import { createRateLimitMiddleware } from "./rate-limit-middleware";

// Create rate limiter: 100 requests per minute
const rateLimiter = createRateLimitMiddleware({
  maxRequests: 100,
  windowMs: 60000,
  keyExtractor: (params) => {
    // Extract user ID from custom metadata
    return params.metadata?.userId || "anonymous";
  },
});

const factory = new MiddlewareFactory({
  middleware: [rateLimiter],
});

const context = factory.createContext("openai", "gpt-4", {
  metadata: { userId: "user-123" },
});

const wrappedModel = factory.applyMiddleware(baseModel, context, {
  enabledMiddleware: ["rate-limiter"],
});

// Will throw error if rate limit exceeded
try {
  const result = await wrappedModel.generate({
    prompt: "Hello",
  });
} catch (error) {
  if (error.message.includes("Rate limit exceeded")) {
    console.error("Too many requests!");
  }
}
```

**Advanced Usage with Per-User Limits:**

```typescript
// Create different limits for different user tiers
const createTieredRateLimiter = () => {
  const limits = {
    free: { maxRequests: 10, windowMs: 60000 },
    pro: { maxRequests: 100, windowMs: 60000 },
    enterprise: { maxRequests: 1000, windowMs: 60000 },
  };

  return createRateLimitMiddleware({
    ...limits.free, // Default to free tier
    keyExtractor: (params) => {
      const userId = params.metadata?.userId || "anonymous";
      const tier = params.metadata?.userTier || "free";
      return `${tier}:${userId}`;
    },
  });
};
```

---

### Example 3: Cost Tracking Middleware

**Purpose**: Track API costs based on token usage and model pricing.

**Full Implementation:**

```typescript
import type { NeuroLinkMiddleware } from "@juspay/neurolink";

type ModelPricing = {
  inputTokenPrice: number; // Price per 1K input tokens
  outputTokenPrice: number; // Price per 1K output tokens
};

type CostTrackingConfig = {
  pricing: Record<string, ModelPricing>; // Pricing per model
  onCostUpdate?: (cost: CostUpdate) => void; // Callback for cost updates
};

type CostUpdate = {
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  timestamp: string;
};

export const createCostTrackingMiddleware = (
  config: CostTrackingConfig,
): NeuroLinkMiddleware => {
  // Store costs per user
  const userCosts = new Map<string, number>();

  const calculateCost = (
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): { inputCost: number; outputCost: number; totalCost: number } => {
    const pricing = config.pricing[model] || {
      inputTokenPrice: 0,
      outputTokenPrice: 0,
    };

    const inputCost = (inputTokens / 1000) * pricing.inputTokenPrice;
    const outputCost = (outputTokens / 1000) * pricing.outputTokenPrice;
    const totalCost = inputCost + outputCost;

    return { inputCost, outputCost, totalCost };
  };

  return {
    metadata: {
      id: "cost-tracker",
      name: "Cost Tracking Middleware",
      description: "Tracks API costs based on token usage",
      priority: 50, // Medium priority
      defaultEnabled: false,
    },

    wrapGenerate: async ({ doGenerate, params }) => {
      const result = await doGenerate();

      // Extract user ID from params or use default
      const userId = (params as any).metadata?.userId || "anonymous";
      const model = (params as any).model || "unknown";

      // Calculate cost
      const inputTokens = result.usage.promptTokens;
      const outputTokens = result.usage.completionTokens;
      const { inputCost, outputCost, totalCost } = calculateCost(
        model,
        inputTokens,
        outputTokens,
      );

      // Update user's total cost
      const currentCost = userCosts.get(userId) || 0;
      userCosts.set(userId, currentCost + totalCost);

      // Create cost update
      const costUpdate: CostUpdate = {
        userId,
        model,
        inputTokens,
        outputTokens,
        inputCost,
        outputCost,
        totalCost,
        timestamp: new Date().toISOString(),
      };

      // Call callback if provided
      if (config.onCostUpdate) {
        config.onCostUpdate(costUpdate);
      }

      // Add cost data to result metadata
      const updatedResult = {
        ...result,
        experimental_providerMetadata: {
          ...result.experimental_providerMetadata,
          neurolink: {
            ...(result.experimental_providerMetadata as any)?.neurolink,
            cost: {
              ...costUpdate,
              userTotalCost: userCosts.get(userId),
            },
          },
        },
      };

      return updatedResult;
    },
  };
};

// Helper: Get user's total cost
export const getUserCost = (
  userId: string,
  costs: Map<string, number>,
): number => {
  return costs.get(userId) || 0;
};
```

**Usage:**

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";
import { createCostTrackingMiddleware } from "./cost-tracking-middleware";

// Define pricing for different models
const pricing = {
  "gpt-4": {
    inputTokenPrice: 0.03, // $0.03 per 1K input tokens
    outputTokenPrice: 0.06, // $0.06 per 1K output tokens
  },
  "gpt-3.5-turbo": {
    inputTokenPrice: 0.0015,
    outputTokenPrice: 0.002,
  },
  "claude-3-5-sonnet": {
    inputTokenPrice: 0.003,
    outputTokenPrice: 0.015,
  },
};

const costTracker = createCostTrackingMiddleware({
  pricing,
  onCostUpdate: (costUpdate) => {
    console.log(`[Cost] User ${costUpdate.userId}:`);
    console.log(`  Model: ${costUpdate.model}`);
    console.log(
      `  Tokens: ${costUpdate.inputTokens} in, ${costUpdate.outputTokens} out`,
    );
    console.log(`  Cost: $${costUpdate.totalCost.toFixed(4)}`);
    console.log(`  Total: $${costUpdate.userTotalCost?.toFixed(4)}`);
  },
});

const factory = new MiddlewareFactory({
  middleware: [costTracker],
});

const context = factory.createContext("openai", "gpt-4", {
  metadata: { userId: "user-123" },
});

const wrappedModel = factory.applyMiddleware(baseModel, context, {
  enabledMiddleware: ["cost-tracker"],
});

const result = await wrappedModel.generate({
  prompt: "Explain machine learning",
  model: "gpt-4",
  metadata: { userId: "user-123" },
});

// Access cost data
const cost = result.experimental_providerMetadata?.neurolink?.cost;
console.log(`This request cost: $${cost.totalCost.toFixed(4)}`);
console.log(`User total cost: $${cost.userTotalCost.toFixed(4)}`);
```

**Advanced: Budget Enforcement:**

```typescript
const createBudgetEnforcingCostTracker = (maxCostPerUser: number) => {
  const userCosts = new Map<string, number>();

  return createCostTrackingMiddleware({
    pricing,
    onCostUpdate: (costUpdate) => {
      const currentCost = userCosts.get(costUpdate.userId) || 0;
      const newCost = currentCost + costUpdate.totalCost;

      if (newCost > maxCostPerUser) {
        throw new Error(
          `Budget exceeded for user ${costUpdate.userId}. ` +
            `Max: $${maxCostPerUser}, Current: $${newCost.toFixed(4)}`,
        );
      }

      userCosts.set(costUpdate.userId, newCost);
    },
  });
};
```

---

### Example 4: Response Caching Middleware

**Purpose**: Cache AI responses to reduce costs and improve performance for repeated queries.

**Full Implementation:**

```typescript
import type { NeuroLinkMiddleware } from "@juspay/neurolink";
import { createHash } from "crypto";

type CacheConfig = {
  ttl: number; // Time-to-live in milliseconds
  maxSize: number; // Maximum number of cached entries
};

type CacheEntry = {
  result: any;
  timestamp: number;
  hits: number;
};

export const createCachingMiddleware = (
  config: CacheConfig = {
    ttl: 3600000, // 1 hour
    maxSize: 1000,
  },
): NeuroLinkMiddleware => {
  const cache = new Map<string, CacheEntry>();

  const generateCacheKey = (params: any): string => {
    // Create a hash of the prompt and relevant parameters
    const keyData = {
      prompt: params.prompt,
      model: params.model,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    };

    const hash = createHash("sha256");
    hash.update(JSON.stringify(keyData));
    return hash.digest("hex");
  };

  const getCachedResult = (key: string): any | null => {
    const entry = cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if cache entry is still valid
    if (age > config.ttl) {
      cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;

    return entry.result;
  };

  const setCachedResult = (key: string, result: any): void => {
    // Enforce max cache size (LRU-style)
    if (cache.size >= config.maxSize) {
      // Remove oldest entry
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 0,
    });
  };

  return {
    metadata: {
      id: "response-cache",
      name: "Response Caching Middleware",
      description: `Caches responses for ${config.ttl / 1000}s`,
      priority: 75, // Medium-high priority
      defaultEnabled: false,
    },

    wrapGenerate: async ({ doGenerate, params }) => {
      const cacheKey = generateCacheKey(params);

      // Check cache first
      const cachedResult = getCachedResult(cacheKey);
      if (cachedResult) {
        console.log(`[Cache] HIT - Returning cached result`);

        // Add cache metadata to result
        return {
          ...cachedResult,
          experimental_providerMetadata: {
            ...cachedResult.experimental_providerMetadata,
            neurolink: {
              ...(cachedResult.experimental_providerMetadata as any)?.neurolink,
              cache: {
                hit: true,
                key: cacheKey,
              },
            },
          },
        };
      }

      console.log(`[Cache] MISS - Fetching from provider`);

      // Cache miss - fetch from provider
      const result = await doGenerate();

      // Cache the result
      setCachedResult(cacheKey, result);

      // Add cache metadata
      return {
        ...result,
        experimental_providerMetadata: {
          ...result.experimental_providerMetadata,
          neurolink: {
            ...(result.experimental_providerMetadata as any)?.neurolink,
            cache: {
              hit: false,
              key: cacheKey,
            },
          },
        },
      };
    },
  };
};

// Helper: Clear cache
export const clearCache = (cache: Map<string, CacheEntry>): void => {
  cache.clear();
};

// Helper: Get cache stats
export const getCacheStats = (cache: Map<string, CacheEntry>) => {
  let totalHits = 0;
  let totalEntries = cache.size;

  for (const entry of cache.values()) {
    totalHits += entry.hits;
  }

  return {
    size: totalEntries,
    totalHits,
    averageHitsPerEntry: totalEntries > 0 ? totalHits / totalEntries : 0,
  };
};
```

**Usage:**

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";
import { createCachingMiddleware } from "./caching-middleware";

const cachingMiddleware = createCachingMiddleware({
  ttl: 1800000, // 30 minutes
  maxSize: 500, // Cache up to 500 responses
});

const factory = new MiddlewareFactory({
  middleware: [cachingMiddleware],
});

const context = factory.createContext("openai", "gpt-4");
const wrappedModel = factory.applyMiddleware(baseModel, context, {
  enabledMiddleware: ["response-cache"],
});

// First request - cache miss
const result1 = await wrappedModel.generate({
  prompt: "What is TypeScript?",
});
console.log(result1.experimental_providerMetadata?.neurolink?.cache);
// Output: { hit: false, key: "abc123..." }

// Second request with same prompt - cache hit
const result2 = await wrappedModel.generate({
  prompt: "What is TypeScript?",
});
console.log(result2.experimental_providerMetadata?.neurolink?.cache);
// Output: { hit: true, key: "abc123..." }
```

**Advanced: Redis-Backed Cache:**

```typescript
import Redis from "ioredis";

const createRedisCachingMiddleware = (redisClient: Redis) => {
  return {
    metadata: {
      id: "redis-cache",
      name: "Redis Caching Middleware",
    },

    wrapGenerate: async ({ doGenerate, params }) => {
      const cacheKey = generateCacheKey(params);

      // Check Redis cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from provider
      const result = await doGenerate();

      // Store in Redis with TTL
      await redisClient.setex(cacheKey, 3600, JSON.stringify(result));

      return result;
    },
  };
};
```

## Registration Methods

### Method 1: Register on Instantiation (Recommended)

Pass middleware array to constructor:

```typescript
const factory = new MiddlewareFactory({
  preset: "default",
  middleware: [myMiddleware1, myMiddleware2],
});
```

### Method 2: Register After Instantiation

Use the `register()` method:

```typescript
const factory = new MiddlewareFactory();

factory.register(myMiddleware, {
  replace: false, // Error if already exists
  defaultEnabled: true, // Enable by default
});
```

### Enabling Middleware

Registered middleware must be explicitly enabled:

```typescript
const wrappedModel = factory.applyMiddleware(baseModel, context, {
  enabledMiddleware: ["my-middleware", "another-middleware"],
});
```

Or use `middlewareConfig` for granular control:

```typescript
const wrappedModel = factory.applyMiddleware(baseModel, context, {
  middlewareConfig: {
    "my-middleware": {
      enabled: true,
      config: {
        /* custom config */
      },
    },
  },
});
```

## Best Practices

### 1. Keep Middleware Focused

Each middleware should have a **single responsibility**:

```typescript
// ✅ Good: Focused middleware
const loggingMiddleware = createLoggingMiddleware();
const rateLimitMiddleware = createRateLimitMiddleware();
const cachingMiddleware = createCachingMiddleware();

// ❌ Bad: Middleware doing too much
const megaMiddleware = {
  wrapGenerate: async ({ doGenerate }) => {
    // Logging + rate limiting + caching + analytics...
    // Too many responsibilities!
  },
};
```

### 2. Use Appropriate Priorities

Set priority based on when middleware should run:

```typescript
const priorities = {
  security: 200, // Run first (authentication, rate limiting)
  validation: 150, // Run early (request validation)
  analytics: 100, // Run for all requests
  caching: 75, // Run before transformation
  transformation: 50, // Run last
};
```

### 3. Handle Errors Gracefully

Always handle errors and decide whether to propagate or swallow them:

```typescript
wrapGenerate: async ({ doGenerate }) => {
  try {
    const result = await doGenerate();
    // Process result
    return result;
  } catch (error) {
    // Log error
    console.error("Middleware error:", error);

    // Decide: re-throw or return fallback
    throw error; // Re-throw to maintain error flow
  }
};
```

### 4. Make Middleware Configurable

Accept configuration for flexibility:

```typescript
export const createMyMiddleware = (config: MyConfig = defaultConfig) => {
  return {
    metadata: {
      id: "my-middleware",
      // ...
    },
    wrapGenerate: async ({ doGenerate }) => {
      // Use config
      if (config.enabled) {
        // ...
      }
    },
  };
};
```

### 5. Add Observability

Include logging and metrics:

```typescript
wrapGenerate: async ({ doGenerate, params }) => {
  const startTime = Date.now();

  try {
    const result = await doGenerate();
    const duration = Date.now() - startTime;

    // Log success
    console.log(`Middleware executed in ${duration}ms`);

    return result;
  } catch (error) {
    // Log failure
    console.error(`Middleware failed:`, error);
    throw error;
  }
};
```

### 6. Use TypeScript Types

Leverage TypeScript for type safety:

```typescript
import type {
  NeuroLinkMiddleware,
  LanguageModelV1CallOptions,
  LanguageModelV1CallResult,
} from "@juspay/neurolink";

export const createTypedMiddleware = (): NeuroLinkMiddleware => ({
  metadata: {
    id: "typed-middleware",
    name: "Typed Middleware",
  },
  wrapGenerate: async ({
    doGenerate,
    params,
  }: {
    doGenerate: () => Promise<LanguageModelV1CallResult>;
    params: LanguageModelV1CallOptions;
  }) => {
    // Type-safe implementation
    return doGenerate();
  },
});
```

### 7. Test Middleware Independently

Write unit tests for middleware:

```typescript
describe("LoggingMiddleware", () => {
  it("should log requests and responses", async () => {
    const middleware = createLoggingMiddleware();
    const mockDoGenerate = jest.fn().mockResolvedValue({
      text: "Hello",
      usage: { promptTokens: 10, completionTokens: 20 },
    });

    const result = await middleware.wrapGenerate!({
      doGenerate: mockDoGenerate,
      params: { prompt: "Test" },
    });

    expect(mockDoGenerate).toHaveBeenCalled();
    expect(result.text).toBe("Hello");
  });
});
```

## Testing Middleware

### Unit Testing

Test middleware in isolation:

```typescript
import { createLoggingMiddleware } from "./logging-middleware";

describe("LoggingMiddleware", () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should log request and response", async () => {
    const middleware = createLoggingMiddleware();

    const mockResult = {
      text: "Hello, world!",
      usage: { promptTokens: 5, completionTokens: 10 },
    };

    const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);

    const result = await middleware.wrapGenerate!({
      doGenerate: mockDoGenerate,
      params: { prompt: "Hello" },
    });

    expect(result).toEqual(mockResult);
    expect(consoleLogSpy).toHaveBeenCalled();
    expect(
      consoleLogSpy.mock.calls.some((call) =>
        call[0].includes("Request started"),
      ),
    ).toBe(true);
  });

  it("should log errors", async () => {
    const middleware = createLoggingMiddleware();
    const error = new Error("Test error");
    const mockDoGenerate = jest.fn().mockRejectedValue(error);

    await expect(
      middleware.wrapGenerate!({
        doGenerate: mockDoGenerate,
        params: { prompt: "Hello" },
      }),
    ).rejects.toThrow("Test error");

    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
```

### Integration Testing

Test middleware with actual models:

```typescript
import { MiddlewareFactory } from "@juspay/neurolink";
import { openai } from "@ai-sdk/openai";
import { createCachingMiddleware } from "./caching-middleware";

describe("CachingMiddleware Integration", () => {
  it("should cache responses", async () => {
    const cachingMiddleware = createCachingMiddleware({
      ttl: 60000,
      maxSize: 100,
    });

    const factory = new MiddlewareFactory({
      middleware: [cachingMiddleware],
    });

    const baseModel = openai("gpt-3.5-turbo");
    const context = factory.createContext("openai", "gpt-3.5-turbo");
    const wrappedModel = factory.applyMiddleware(baseModel, context, {
      enabledMiddleware: ["response-cache"],
    });

    // First request
    const result1 = await wrappedModel.generate({
      prompt: "What is 2+2?",
    });
    expect(result1.experimental_providerMetadata?.neurolink?.cache.hit).toBe(
      false,
    );

    // Second request (should be cached)
    const result2 = await wrappedModel.generate({
      prompt: "What is 2+2?",
    });
    expect(result2.experimental_providerMetadata?.neurolink?.cache.hit).toBe(
      true,
    );
  });
});
```

### Testing Best Practices

1. **Mock provider calls**: Use jest.fn() to mock doGenerate/doStream
2. **Test error cases**: Ensure middleware handles errors correctly
3. **Verify side effects**: Check that logging, caching, etc. work as expected
4. **Test configuration**: Verify middleware behaves correctly with different configs
5. **Integration tests**: Test middleware with real models occasionally

## Troubleshooting

### Middleware Not Running

**Problem**: Middleware is registered but not executing.

**Solutions**:

1. Verify middleware is enabled:

   ```typescript
   const wrappedModel = factory.applyMiddleware(baseModel, context, {
     enabledMiddleware: ["my-middleware"], // Include your middleware ID
   });
   ```

2. Check middleware ID matches:

   ```typescript
   metadata: {
     id: "my-middleware", // Must match enabledMiddleware
   }
   ```

3. Verify registration:

   ```typescript
   console.log(factory.registry.has("my-middleware")); // Should be true
   ```

### Wrong Execution Order

**Problem**: Middleware runs in unexpected order.

**Solution**: Set appropriate priorities:

```typescript
metadata: {
  id: "my-middleware",
  priority: 150, // Higher number = runs first
}
```

### Middleware Breaking Requests

**Problem**: Middleware causes errors or blocks requests.

**Solutions**:

1. Check error handling:

   ```typescript
   wrapGenerate: async ({ doGenerate }) => {
     try {
       return await doGenerate();
     } catch (error) {
       console.error("Error:", error);
       throw error; // Don't swallow errors
     }
   };
   ```

2. Verify transformParams returns params:

   ```typescript
   transformParams: async ({ params }) => {
     // Always return params!
     return params;
   };
   ```

3. Test middleware in isolation

### Performance Issues

**Problem**: Middleware adds significant latency.

**Solutions**:

1. Use async operations wisely:

   ```typescript
   // ❌ Bad: Blocking operation
   wrapGenerate: async ({ doGenerate }) => {
     await expensiveOperation(); // Blocks request
     return doGenerate();
   };

   // ✅ Good: Non-blocking
   wrapGenerate: async ({ doGenerate }) => {
     expensiveOperation(); // Don't await
     return doGenerate();
   };
   ```

2. Use conditional execution:

   ```typescript
   conditions: {
     custom: (context) => context.options.enableExpensive === true;
   }
   ```

3. Profile middleware execution:

   ```typescript
   const stats = factory.registry.getAggregatedStats();
   console.log(stats); // See average execution times
   ```

---

## See Also

- [Middleware Architecture](advanced/middleware-architecture.md) - Deep dive into middleware system design
- [Built-in Middleware](advanced/builtin-middleware.md) - Analytics, Guardrails, Auto-Evaluation reference
- [HITL Integration](features/enterprise-hitl.md) - Combine middleware with Human-in-the-Loop workflows
- [Provider Comparison](reference/provider-comparison.md) - Which providers work best with middleware

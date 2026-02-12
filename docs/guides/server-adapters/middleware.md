---
title: Middleware Reference
sidebar_label: "Middleware"
description: Complete reference for all built-in middleware components in NeuroLink server adapters
sidebar_position: 6
keywords: middleware, timing, request-id, error-handling, security, logging, compression, rate-limit, cache, validation, auth, abort-signal, deprecation
---

# Middleware Reference

NeuroLink server adapters provide a comprehensive set of middleware components for common server operations. All middleware follows a consistent pattern and can be composed together for your specific use case.

---

## Middleware Overview

| Middleware                            | Purpose                                   | Order |
| ------------------------------------- | ----------------------------------------- | ----- |
| `createTimingMiddleware()`            | Measures request duration                 | 0     |
| `createRequestIdMiddleware()`         | Generates/propagates request IDs          | 0     |
| `createErrorHandlingMiddleware()`     | Centralized error catching and formatting | 1     |
| `createSecurityHeadersMiddleware()`   | Adds security headers                     | 2     |
| `createLoggingMiddleware()`           | Request/response logging                  | 3     |
| `createRateLimitMiddleware()`         | Rate limiting                             | 5     |
| `createAbortSignalMiddleware()`       | Client disconnection detection            | 5     |
| `createCompressionMiddleware()`       | Response compression signaling            | 5     |
| `createAuthMiddleware()`              | Authentication                            | 10    |
| `createRequestValidationMiddleware()` | Request body/query/params validation      | 15    |
| `createCacheMiddleware()`             | Response caching                          | 20    |
| `createMCPBodyAttachmentMiddleware()` | MCP SDK body compatibility                | 10    |
| `createDeprecationMiddleware()`       | RFC 8594 deprecation headers              | 100   |

The `order` value determines execution sequence - lower numbers run first.

---

## Timing Middleware

Measures request duration and adds timing headers to responses.

### Usage

```typescript
import { createTimingMiddleware } from "@juspay/neurolink";

server.registerMiddleware(createTimingMiddleware());
```

### Headers Set

| Header            | Description                                              | Example           |
| ----------------- | -------------------------------------------------------- | ----------------- |
| `X-Response-Time` | Total request processing time in milliseconds            | `45.23ms`         |
| `Server-Timing`   | Standard Server-Timing header for performance monitoring | `total;dur=45.23` |

### When to Use

- Always recommended for production servers
- Essential for performance monitoring and debugging
- Works with browser Developer Tools and APM systems

---

## Request ID Middleware

Ensures every request has a unique identifier for tracing and debugging.

### Configuration

```typescript
type RequestIdOptions = {
  /** Header name to check for existing ID (default: "x-request-id") */
  headerName?: string;
  /** Prefix for generated IDs (default: "req") */
  prefix?: string;
  /** Custom ID generator function */
  generator?: () => string;
};
```

### Usage

```typescript
import { createRequestIdMiddleware } from "@juspay/neurolink";

// Basic usage
server.registerMiddleware(createRequestIdMiddleware());

// With custom options
server.registerMiddleware(
  createRequestIdMiddleware({
    headerName: "x-correlation-id",
    prefix: "neuro",
    generator: () => `neuro-${crypto.randomUUID()}`,
  }),
);
```

### Headers

| Header         | Direction | Description                                     |
| -------------- | --------- | ----------------------------------------------- |
| `X-Request-ID` | Request   | Propagates existing ID from client (if present) |
| `X-Request-ID` | Response  | Returns request ID for client-side correlation  |

### When to Use

- Always recommended for production servers
- Essential for distributed tracing
- Enables log correlation across services
- Helps with debugging and support tickets

---

## Error Handling Middleware

Catches errors and formats them consistently across all routes.

### Configuration

```typescript
type ErrorHandlingOptions = {
  /** Include stack trace in error response (default: false) */
  includeStack?: boolean;
  /** Custom error handler function */
  onError?: (error: Error, ctx: ServerContext) => unknown;
  /** Log errors to console (default: true) */
  logErrors?: boolean;
};
```

### Usage

```typescript
import { createErrorHandlingMiddleware } from "@juspay/neurolink";

// Basic usage
server.registerMiddleware(createErrorHandlingMiddleware());

// Development mode with stack traces
server.registerMiddleware(
  createErrorHandlingMiddleware({
    includeStack: process.env.NODE_ENV === "development",
    logErrors: true,
  }),
);

// With custom error handler
server.registerMiddleware(
  createErrorHandlingMiddleware({
    onError: (error, ctx) => ({
      error: {
        code: "CUSTOM_ERROR",
        message: error.message,
        requestId: ctx.requestId,
      },
    }),
  }),
);
```

### Error Response Format

```json
{
  "error": {
    "code": "HTTP_500",
    "message": "Internal server error",
    "stack": "Error: Something went wrong\n    at ..." // Only if includeStack: true
  },
  "metadata": {
    "requestId": "req-1706745600000-abc123",
    "timestamp": "2024-02-01T12:00:00.000Z"
  }
}
```

### When to Use

- Always recommended for production servers
- Provides consistent error responses
- Prevents leaking sensitive information in production
- Enable stack traces only in development

---

## Security Headers Middleware

Adds common security headers to protect against various web vulnerabilities.

### Configuration

```typescript
type SecurityHeadersOptions = {
  /** Content Security Policy directive */
  contentSecurityPolicy?: string;
  /** X-Frame-Options (default: "DENY") */
  frameOptions?: "DENY" | "SAMEORIGIN" | false;
  /** X-Content-Type-Options (default: "nosniff") */
  contentTypeOptions?: "nosniff" | false;
  /** HSTS max-age in seconds (default: 31536000 = 1 year) */
  hstsMaxAge?: number | false;
  /** Referrer-Policy (default: "strict-origin-when-cross-origin") */
  referrerPolicy?: string | false;
  /** Additional custom headers */
  customHeaders?: Record<string, string>;
};
```

### Usage

```typescript
import { createSecurityHeadersMiddleware } from "@juspay/neurolink";

// Basic usage with defaults
server.registerMiddleware(createSecurityHeadersMiddleware());

// With custom configuration
server.registerMiddleware(
  createSecurityHeadersMiddleware({
    contentSecurityPolicy:
      "default-src 'self'; script-src 'self' 'unsafe-inline'",
    frameOptions: "SAMEORIGIN",
    hstsMaxAge: 63072000, // 2 years
    customHeaders: {
      "X-Custom-Header": "value",
    },
  }),
);
```

### Headers Set

| Header                      | Default Value                         | Description                   |
| --------------------------- | ------------------------------------- | ----------------------------- |
| `X-Frame-Options`           | `DENY`                                | Prevents clickjacking         |
| `X-Content-Type-Options`    | `nosniff`                             | Prevents MIME sniffing        |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS                |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`     | Controls referrer information |
| `X-XSS-Protection`          | `1; mode=block`                       | Legacy XSS protection         |
| `Content-Security-Policy`   | Not set by default                    | Content security policy       |

### When to Use

- Always recommended for production servers
- Required for security compliance (OWASP, PCI-DSS)
- Configure CSP based on your application needs
- Disable HSTS initially if not ready for HTTPS-only

---

## Logging Middleware

Logs request and response information with configurable detail levels.

### Configuration

```typescript
type LoggingOptions = {
  /** Log request body (default: false) */
  logBody?: boolean;
  /** Log response body (default: false) */
  logResponse?: boolean;
  /** Custom logger instance */
  logger?: {
    info: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };
  /** Paths to skip logging (default: ["/health", "/ready", "/metrics"]) */
  skipPaths?: string[];
};
```

### Usage

```typescript
import { createLoggingMiddleware } from "@juspay/neurolink";

// Basic usage
server.registerMiddleware(createLoggingMiddleware());

// Development mode with body logging
server.registerMiddleware(
  createLoggingMiddleware({
    logBody: process.env.NODE_ENV === "development",
    logResponse: process.env.NODE_ENV === "development",
    skipPaths: ["/api/health", "/api/ready"],
  }),
);

// With custom logger (e.g., Winston, Pino)
import pino from "pino";
const logger = pino();

server.registerMiddleware(
  createLoggingMiddleware({
    logger: {
      info: (msg, data) => logger.info(data, msg),
      error: (msg, data) => logger.error(data, msg),
    },
  }),
);
```

### Log Output

**Request Log:**

```
[Request] POST /api/agent/execute { requestId: "req-123", method: "POST", path: "/api/agent/execute" }
```

**Response Log:**

```
[Response] POST /api/agent/execute { requestId: "req-123", duration: "45ms", status: 200 }
```

**Error Log:**

```
[Error] POST /api/agent/execute { requestId: "req-123", duration: "12ms", error: "Invalid input", status: 400 }
```

### When to Use

- Always recommended for production servers
- Disable body logging in production for performance and privacy
- Use structured logging (JSON) for log aggregation systems
- Skip health check endpoints to reduce noise

---

## Compression Middleware

Signals compression preferences to adapters for response compression.

### Configuration

```typescript
type CompressionOptions = {
  /** Minimum response size to compress in bytes (default: 1024) */
  threshold?: number;
  /** Content types to compress */
  contentTypes?: string[];
};
```

### Usage

```typescript
import { createCompressionMiddleware } from "@juspay/neurolink";

// Basic usage
server.registerMiddleware(createCompressionMiddleware());

// With custom configuration
server.registerMiddleware(
  createCompressionMiddleware({
    threshold: 2048, // Only compress responses > 2KB
    contentTypes: ["text/", "application/json", "application/xml"],
  }),
);
```

### How It Works

This middleware stores compression preferences in the request context metadata. The actual compression is handled by the underlying framework (Hono, Express, etc.) or a reverse proxy.

### When to Use

- Recommended for responses larger than 1KB
- Works best with text-based content (JSON, HTML, XML)
- Consider disabling for already-compressed content (images, videos)
- Often handled at reverse proxy level (nginx, CloudFlare)

---

## Abort Signal Middleware

Provides client disconnection handling for long-running requests using AbortController.

### Configuration

```typescript
type AbortSignalMiddlewareOptions = {
  /** Callback when abort is triggered */
  onAbort?: (ctx: ServerContext) => void;
  /** Request timeout in milliseconds */
  timeout?: number;
};
```

### Usage

```typescript
import { createAbortSignalMiddleware } from "@juspay/neurolink";

// Basic usage
server.registerMiddleware(createAbortSignalMiddleware());

// With timeout and abort callback
server.registerMiddleware(
  createAbortSignalMiddleware({
    timeout: 30000, // 30 seconds
    onAbort: (ctx) => {
      console.log(`Request ${ctx.requestId} was aborted`);
    },
  }),
);
```

### Using the Abort Signal in Route Handlers

```typescript
server.registerRoute({
  method: "POST",
  path: "/api/long-running",
  handler: async (ctx) => {
    const signal = ctx.abortSignal;

    // Pass signal to cancellable operations
    const result = await longRunningOperation({ signal });

    // Check if aborted before continuing
    if (signal?.aborted) {
      throw new Error("Request was cancelled");
    }

    return result;
  },
});
```

### Express-Specific Middleware

For Express applications, use the specialized Express middleware:

```typescript
import { createExpressAbortMiddleware } from "@juspay/neurolink";

app.use(
  createExpressAbortMiddleware({
    onAbort: () => console.log("Client disconnected"),
  }),
);

app.get("/api/stream", (req, res) => {
  const signal = res.locals.abortSignal;
  // Use signal for cancellation
});
```

### When to Use

- Long-running operations (AI generation, file processing)
- Streaming endpoints where client might disconnect
- Operations that should be cancelled on timeout
- Preventing resource waste on abandoned requests

---

## MCP Body Attachment Middleware

Bridges the gap between Fastify's body parsing and the MCP SDK's body access pattern.

### Usage

```typescript
import { createMCPBodyAttachmentMiddleware } from "@juspay/neurolink";

// General middleware for any adapter
server.registerMiddleware(createMCPBodyAttachmentMiddleware());
```

### Fastify-Specific Hook

For optimal Fastify integration, use the dedicated preHandler hook:

```typescript
import { fastifyMCPBodyHook } from "@juspay/neurolink";

fastify.addHook("preHandler", fastifyMCPBodyHook);
```

### How It Works

The MCP SDK reads the request body from `request.raw.body`, but Fastify parses the body separately into `request.body`. This middleware attaches the parsed body to `request.raw.body` for MCP SDK compatibility.

### When to Use

- Required when using MCP routes with Fastify
- Not needed for Hono, Express, or Koa adapters
- Applied automatically by the Fastify adapter

---

## Deprecation Middleware

Adds RFC 8594 compliant deprecation headers to responses for deprecated routes.

### Configuration

```typescript
type DeprecationConfig = {
  /** Array of route definitions to check for deprecation */
  routes: RouteDefinition[];
  /** Custom header name for deprecation notice (default: "X-Deprecation-Notice") */
  noticeHeader?: string;
  /** Include Link header for alternative routes (default: true) */
  includeLink?: boolean;
};

type RouteDeprecation = {
  enabled: boolean;
  since?: string; // Version when deprecated
  removeIn?: string; // Version when removed
  alternative?: string; // Replacement endpoint
  message?: string; // Custom message
};
```

### Usage

```typescript
import { createDeprecationMiddleware } from "@juspay/neurolink";

const routes = [
  {
    method: "GET",
    path: "/api/v1/users",
    handler: handleUsers,
    deprecated: {
      enabled: true,
      since: "2.0.0",
      removeIn: "3.0.0",
      alternative: "/api/v2/users",
      message: "Use /api/v2/users for improved performance",
    },
  },
];

server.registerMiddleware(createDeprecationMiddleware({ routes }));
```

### Headers Set

| Header                 | Description                                       | Example                                      |
| ---------------------- | ------------------------------------------------- | -------------------------------------------- |
| `Deprecation`          | RFC 8594 deprecation indicator                    | `true`                                       |
| `Sunset`               | When the endpoint will be removed (HTTP-date)     | `Sun, 01 Jun 2025 00:00:00 GMT`              |
| `Link`                 | Alternative endpoint with rel="successor-version" | `</api/v2/users>; rel="successor-version"`   |
| `X-Deprecation-Notice` | Human-readable deprecation message                | `Use /api/v2/users for improved performance` |

### When to Use

- API versioning migrations
- Feature deprecation announcements
- Gradual API evolution
- Compliance with RFC 8594

---

## Rate Limit Middleware

Provides configurable rate limiting with multiple algorithms.

### Configuration

```typescript
type RateLimitMiddlewareConfig = {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom error message */
  message?: string;
  /** Skip rate limiting for certain paths */
  skipPaths?: string[];
  /** Custom key generator (default: IP address) */
  keyGenerator?: (ctx: ServerContext) => string;
  /** Custom response handler for rate limit exceeded */
  onRateLimitExceeded?: (ctx: ServerContext, retryAfter: number) => unknown;
  /** Custom rate limit store (default: in-memory) */
  store?: RateLimitStore;
};
```

### Usage

```typescript
import {
  createRateLimitMiddleware,
  createSlidingWindowRateLimitMiddleware,
  InMemoryRateLimitStore,
} from "@juspay/neurolink";

// Fixed window rate limiting
server.registerMiddleware(
  createRateLimitMiddleware({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    skipPaths: ["/api/health"],
  }),
);

// Sliding window rate limiting (more accurate)
server.registerMiddleware(
  createSlidingWindowRateLimitMiddleware({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000,
    subWindows: 10, // Number of sub-windows for smoothing
  }),
);

// Rate limit by user ID instead of IP
server.registerMiddleware(
  createRateLimitMiddleware({
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyGenerator: (ctx) =>
      ctx.user?.id || ctx.headers["x-forwarded-for"] || "unknown",
  }),
);
```

### Headers Set

| Header                  | Description                            | Example      |
| ----------------------- | -------------------------------------- | ------------ |
| `X-RateLimit-Limit`     | Maximum requests allowed per window    | `100`        |
| `X-RateLimit-Remaining` | Requests remaining in current window   | `95`         |
| `X-RateLimit-Reset`     | Unix timestamp when the window resets  | `1706746200` |
| `Retry-After`           | Seconds to wait (only on 429 response) | `300`        |

### Custom Rate Limit Store (Redis)

```typescript
import Redis from "ioredis";
import type { RateLimitStore, RateLimitEntry } from "@juspay/neurolink";

class RedisRateLimitStore implements RateLimitStore {
  constructor(private redis: Redis) {}

  async get(key: string): Promise<RateLimitEntry | undefined> {
    const data = await this.redis.get(`ratelimit:${key}`);
    return data ? JSON.parse(data) : undefined;
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    const ttl = Math.ceil((entry.resetAt - Date.now()) / 1000);
    await this.redis.setex(`ratelimit:${key}`, ttl, JSON.stringify(entry));
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const resetAt = now + windowMs;
    const count = await this.redis.incr(`ratelimit:${key}`);

    if (count === 1) {
      await this.redis.pexpire(`ratelimit:${key}`, windowMs);
    }

    return { count, resetAt };
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`ratelimit:${key}`);
  }
}

const redisStore = new RedisRateLimitStore(new Redis());
server.registerMiddleware(
  createRateLimitMiddleware({
    maxRequests: 100,
    windowMs: 60000,
    store: redisStore,
  }),
);
```

### When to Use

- API abuse prevention
- Fair usage enforcement
- Cost control for expensive operations
- Protection against DDoS attacks

---

## Authentication Middleware

Provides flexible authentication support with multiple strategies.

### Configuration

```typescript
type AuthConfig = {
  /** Authentication type */
  type: "bearer" | "api-key" | "basic" | "custom";
  /** Token validation function */
  validate: (token: string, ctx: ServerContext) => Promise<AuthResult | null>;
  /** Header name for token */
  headerName?: string;
  /** Skip authentication for certain paths */
  skipPaths?: string[];
  /** Custom error message */
  errorMessage?: string;
  /** Token extractor for custom auth schemes */
  extractToken?: (ctx: ServerContext) => string | null;
  /** Skip auth for dev playground requests (default: true) */
  skipDevPlayground?: boolean;
};

type AuthResult = {
  id: string;
  email?: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
};
```

### Usage

```typescript
import {
  createAuthMiddleware,
  createBearerAuthMiddleware,
  createApiKeyAuthMiddleware,
  createRoleMiddleware,
  ApiKeyStore,
} from "@juspay/neurolink";

// Bearer token authentication
server.registerMiddleware(
  createAuthMiddleware({
    type: "bearer",
    validate: async (token) => {
      const user = await verifyJWT(token);
      return user
        ? { id: user.id, email: user.email, roles: user.roles }
        : null;
    },
    skipPaths: ["/api/health", "/api/ready"],
  }),
);

// API key authentication
const apiKeyStore = new ApiKeyStore();
apiKeyStore.addKey("sk_live_abc123", { id: "user_1", roles: ["admin"] });

server.registerMiddleware(
  createApiKeyAuthMiddleware(apiKeyStore, {
    headerName: "x-api-key",
    skipPaths: ["/api/health"],
  }),
);

// Role-based access control (after authentication)
server.registerMiddleware(
  createRoleMiddleware({
    requiredRoles: ["admin"],
    requireAll: false, // Any role matches
    errorMessage: "Admin access required",
  }),
);
```

### Headers Read

| Header          | Auth Type     | Description                          |
| --------------- | ------------- | ------------------------------------ |
| `Authorization` | bearer, basic | `Bearer <token>` or `Basic <base64>` |
| `X-API-Key`     | api-key       | Raw API key value                    |

### Dev Playground Support

In non-production environments, requests with `X-NeuroLink-Dev-Playground: true` header bypass authentication and receive a default developer user context.

### When to Use

- Protecting API endpoints
- User identification and authorization
- Rate limiting by user
- Audit logging

---

## Request Validation Middleware

Provides schema-based request validation for body, query, params, and headers.

### Configuration

```typescript
type ValidationConfig = {
  /** Schema for validating request body */
  bodySchema?: ValidationSchema;
  /** Schema for validating query parameters */
  querySchema?: ValidationSchema;
  /** Schema for validating path parameters */
  paramsSchema?: ValidationSchema;
  /** Schema for validating headers */
  headersSchema?: ValidationSchema;
  /** Custom validation function */
  customValidator?: (ctx: ServerContext) => Promise<void>;
  /** Skip validation for certain paths */
  skipPaths?: string[];
  /** Custom error formatter */
  errorFormatter?: (errors: ValidationError[]) => unknown;
};

type ValidationSchema = {
  required?: string[];
  properties?: Record<string, PropertySchema>;
  additionalProperties?: boolean;
};

type PropertySchema = {
  type: "string" | "number" | "boolean" | "object" | "array";
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  enum?: unknown[];
  default?: unknown;
  validate?: (value: unknown) => boolean | string;
};
```

### Usage

```typescript
import {
  createRequestValidationMiddleware,
  createBodyValidationMiddleware,
  createQueryValidationMiddleware,
  CommonSchemas,
} from "@juspay/neurolink";

// Full validation
server.registerMiddleware(
  createRequestValidationMiddleware({
    bodySchema: {
      required: ["input"],
      properties: {
        input: { type: "string", minLength: 1, maxLength: 10000 },
        temperature: { type: "number", minimum: 0, maximum: 2 },
        provider: { type: "string", enum: ["openai", "anthropic", "google"] },
      },
    },
    querySchema: {
      properties: {
        stream: { type: "boolean" },
      },
    },
  }),
);

// Body-only validation (convenience function)
server.registerMiddleware(
  createBodyValidationMiddleware({
    required: ["name", "email"],
    properties: {
      name: { type: "string", minLength: 1 },
      email: { type: "string", pattern: "^[^@]+@[^@]+\\.[^@]+$" },
    },
  }),
);

// Custom validation
server.registerMiddleware(
  createRequestValidationMiddleware({
    customValidator: async (ctx) => {
      if (ctx.body?.startDate > ctx.body?.endDate) {
        throw new ValidationError([
          {
            field: "dateRange",
            message: "startDate must be before endDate",
          },
        ]);
      }
    },
  }),
);
```

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "body.input", "message": "input is required" },
      { "field": "body.temperature", "message": "Value must be at most 2" }
    ]
  }
}
```

### Common Schemas

Pre-built schemas for common validation patterns:

```typescript
import { CommonSchemas } from "@juspay/neurolink";

// Use pagination schema
server.registerMiddleware(
  createQueryValidationMiddleware(CommonSchemas.pagination),
);
```

| Schema       | Fields                        |
| ------------ | ----------------------------- |
| `uuid`       | UUID string format            |
| `email`      | Email string format           |
| `pagination` | `page`, `limit`, `offset`     |
| `sorting`    | `sortBy`, `sortOrder`         |
| `idParam`    | Required `id` parameter       |
| `dateRange`  | `startDate`, `endDate`        |
| `search`     | `q` (query), `fields` (array) |

### When to Use

- Input sanitization and security
- API contract enforcement
- Early error detection
- Documentation generation (with OpenAPI)

---

## Cache Middleware

Provides response caching with LRU eviction and configurable TTL.

### Configuration

```typescript
type CacheConfig = {
  /** Default TTL in milliseconds */
  ttlMs: number;
  /** Maximum cache size (default: 1000 entries) */
  maxSize?: number;
  /** Custom key generator */
  keyGenerator?: (ctx: ServerContext) => string;
  /** Methods to cache (default: ["GET"]) */
  methods?: string[];
  /** Paths to cache */
  paths?: string[];
  /** Paths to exclude from caching */
  excludePaths?: string[];
  /** Custom cache store */
  store?: CacheStore;
  /** Include query params in cache key (default: true) */
  includeQuery?: boolean;
  /** Custom TTL per path pattern */
  ttlByPath?: Record<string, number>;
};
```

### Usage

```typescript
import {
  createCacheMiddleware,
  InMemoryCacheStore,
  ResponseCacheStore,
} from "@juspay/neurolink";

// Basic caching
server.registerMiddleware(
  createCacheMiddleware({
    ttlMs: 60 * 1000, // 1 minute
    methods: ["GET"],
    excludePaths: ["/api/health", "/api/agent/stream"],
  }),
);

// With custom TTL per path
server.registerMiddleware(
  createCacheMiddleware({
    ttlMs: 60 * 1000,
    ttlByPath: {
      "/api/providers": 300 * 1000, // 5 minutes
      "/api/models": 600 * 1000, // 10 minutes
    },
  }),
);

// Using ResponseCacheStore for synchronous access
const cacheStore = new ResponseCacheStore(1000, 60000);
cacheStore.set("GET:/api/data", { status: 200, data: [] });
const cached = cacheStore.get("GET:/api/data");
```

### Headers Set

| Header          | Value        | Description                         |
| --------------- | ------------ | ----------------------------------- |
| `X-Cache`       | `HIT`        | Response served from cache          |
| `X-Cache`       | `MISS`       | Response freshly generated          |
| `X-Cache-Age`   | `45`         | Seconds since cached (only on HIT)  |
| `Cache-Control` | `max-age=60` | Browser caching directive (on MISS) |

### When to Use

- Expensive operations (database queries, AI generation)
- Frequently requested static data
- Rate limit budget optimization
- Reducing latency for repeated requests

---

## Composing Middleware

Middleware are executed in order based on their `order` property. Here's a recommended production setup:

```typescript
import {
  createTimingMiddleware,
  createRequestIdMiddleware,
  createErrorHandlingMiddleware,
  createSecurityHeadersMiddleware,
  createLoggingMiddleware,
  createRateLimitMiddleware,
  createAuthMiddleware,
  createRequestValidationMiddleware,
  createCacheMiddleware,
} from "@juspay/neurolink";

// Register middleware in recommended order
const middlewares = [
  createTimingMiddleware(),
  createRequestIdMiddleware(),
  createErrorHandlingMiddleware({ includeStack: isDev }),
  createSecurityHeadersMiddleware(),
  createLoggingMiddleware({ skipPaths: ["/api/health"] }),
  createRateLimitMiddleware({
    maxRequests: 100,
    windowMs: 60000,
    skipPaths: ["/api/health"],
  }),
  createAuthMiddleware({
    type: "bearer",
    validate: verifyToken,
    skipPaths: ["/api/health", "/api/docs"],
  }),
  createCacheMiddleware({
    ttlMs: 60000,
    methods: ["GET"],
    excludePaths: ["/api/agent"],
  }),
];

for (const middleware of middlewares) {
  server.registerMiddleware(middleware);
}
```

---

## Next Steps

- **[Configuration Reference](../../reference/server-configuration.md)** - Full server configuration options
- **[Security Best Practices](./security.md)** - Authentication and authorization patterns
- **[Deployment Guide](./deployment.md)** - Production deployment strategies
- **[Express Adapter](./express.md)** - Express-specific middleware integration
- **[Fastify Adapter](./fastify.md)** - Fastify-specific hooks and plugins

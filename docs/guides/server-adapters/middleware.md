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
| `createSessionMiddleware()`           | Sets `ctx.session`, scoped to the user    | 12    |
| `createRequestValidationMiddleware()` | Request body/query/params validation      | 15    |
| `createCacheMiddleware()`             | Response caching                          | 20    |
| `createMCPBodyAttachmentMiddleware()` | MCP SDK body compatibility                | 10    |
| `createDeprecationMiddleware()`       | RFC 8594 deprecation headers              | 100   |

The `order` value is informational: the server runs middleware in the order you register it, not by this number. Register the middleware with the lower number first, so that authentication runs before anything that reads the user.

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
      // A shared identity (one API key for many callers) is not a person. Read
      // x-forwarded-for only behind a trusted proxy that sets or overwrites
      // it; otherwise the client chooses its own bucket by sending any value.
      ctx.user && !ctx.user.shared
        ? ctx.user.id
        : ctx.headers["x-forwarded-for"] || "unknown",
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
import { createClient, type RedisClientType } from "redis";
import type { RateLimitStore, RateLimitEntry } from "@juspay/neurolink";

class RedisRateLimitStore implements RateLimitStore {
  constructor(private redis: RedisClientType) {}

  async get(key: string): Promise<RateLimitEntry | undefined> {
    const data = await this.redis.get(`ratelimit:${key}`);
    return data ? JSON.parse(data) : undefined;
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    const ttl = Math.ceil((entry.resetAt - Date.now()) / 1000);
    await this.redis.set(`ratelimit:${key}`, JSON.stringify(entry), {
      EX: ttl,
    });
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const resetAt = now + windowMs;
    const count = await this.redis.incr(`ratelimit:${key}`);

    if (count === 1) {
      await this.redis.pExpire(`ratelimit:${key}`, windowMs);
    }

    return { count, resetAt };
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`ratelimit:${key}`);
  }
}

const redisClient = createClient();
await redisClient.connect();
const redisStore = new RedisRateLimitStore(redisClient);
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
  /** Honour the dev playground header when NODE_ENV is "development" (default: true) */
  skipDevPlayground?: boolean;
};

type AuthResult = {
  id: string;
  email?: string;
  roles?: string[];
  /** true when this identity stands for every holder of one credential (a shared API key), not one person. */
  shared?: boolean;
  metadata?: Record<string, unknown>;
};
```

The authenticated user is set on `ctx.user`. On the built-in adapters (Hono,
Express, Fastify and Koa) it reaches later middleware and the route handler on
every request only when the server is created with `carryMiddlewareState: true`.
By default Express, Fastify and Koa, and Hono when the client sent no
`X-Request-ID` of its own, hand each middleware step and the handler a fresh
context, so a role guard registered after authentication refuses everyone there;
only Hono with a client `X-Request-ID` shares the context. The option does not
apply to a context you build yourself: a custom adapter, or a route handler you
call directly, can supply a context that already has `ctx.user` set. See
[Carrying middleware state](./security.md#carrying-middleware-state-to-guards-and-handlers-carrymiddlewarestate)
in the security guide. Whether the agent routes treat `ctx.user` as the caller is
a separate choice: see `perUserAuth` in the
[security guide](./security.md#who-the-agent-routes-treat-as-the-user-peruserauth).

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

// Role-based access control (after authentication). It reads ctx.user, so the
// server needs carryMiddlewareState: true (see the note above), or the guard
// refuses everyone on Express, Fastify and Koa, and on Hono without a client
// X-Request-ID.
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

Requests with an `X-NeuroLink-Dev-Playground: true` (or `X-NeuroLink-Playground: true`) header bypass authentication and receive a default developer user context (`id: "playground"`, `roles: ["developer"]`), but only when **`NODE_ENV` is exactly `development`**. The variable is read on every request.

With `NODE_ENV` unset, `production`, `test`, `staging` or any other value, the header is ignored and the request must carry a valid credential. The bypass is therefore off by default in a deployment that never sets `NODE_ENV`. Pass `skipDevPlayground: false` to refuse the header even in development.

### When to Use

- Protecting API endpoints
- User identification and authorization
- Rate limiting by user
- Audit logging

---

## Session Middleware

Sets `ctx.session` from a header (or an opt-in cookie) and scopes it to the authenticated user. Register it after authentication, on a server that carries middleware state.

### The server must carry middleware state

The middleware sets `ctx.session` on the context of its own step, and it prefixes the id with the user that authentication put on the context of an earlier step. Both only work if the server carries middleware state, which is **off by default** (`carryMiddlewareState`, see [Carrying middleware state](./security.md#carrying-middleware-state-to-guards-and-handlers-carrymiddlewarestate)). With it off, Express, Fastify and Koa build a fresh context for every middleware step and for the handler, so the session middleware sees no `ctx.user` and the `ctx.session` it sets is gone before the handler runs; Hono shares one context only for a request whose client sent its own `X-Request-ID`. Apart from that Hono case, a server without the carry therefore gets no sessions from this middleware, and nothing warns about it.

There are two ways to turn the carry on:

- `registerAllRoutes(server, "/api", { perUserAuth: true })` turns it on for the server, which is what the usage example below relies on.
- `createServer(neurolink, { framework, config: { carryMiddlewareState: true } })` turns it on directly. Use it when your own routes read `ctx.session`, or when you register the routes yourself instead of with `registerAllRoutes`.

### How it relates to `perUserAuth`

Whether the agent routes (`/agent/execute`, `/agent/stream`) trust the request body's `sessionId` depends on `perUserAuth` (see the [security guide](./security.md)):

| `perUserAuth`                                      | Session the agent routes use                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `true`                                             | Only `ctx.session`, and only for an authenticated request; a body `sessionId` is ignored. `registerAllRoutes` turns the carry on for this mode. This middleware is how a signed-in client keeps a conversation, and without it there is no memory                                                                                                                                                        |
| `true`, anonymous                                  | None. A request with no `ctx.user` (optional authentication) gets no conversation even when it sends `X-Session-Id`, so anonymous callers never share one                                                                                                                                                                                                                                                |
| `false` (default)                                  | The body's `sessionId`. `ctx.session` is ignored, so this middleware has no effect on the agent routes on Express, Fastify and Koa, or on Hono when the client sent no `X-Request-ID`, whether `carryMiddlewareState` is off (the handler never receives the session) or on (it receives it and the agent routes still do not read it)                                                                   |
| `false`, Hono with the caller's own `X-Request-ID` | The handler gets the middleware's context, as it did before `carryMiddlewareState` existed and with it on or off, and so does a custom adapter or a handler called directly. An authenticated user's session is `ctx.session` alone (the body's `sessionId` is ignored). An anonymous caller's is `ctx.session`, else the body's, so anonymous callers that send the same id share one bare conversation |

### Configuration

```typescript
type ServerSessionConfig = {
  headerName?: string; // default "X-Session-Id"
  cookieName?: string; // read when the header is absent or empty; off by default
  skipPaths?: string[];
};
```

### Usage

```typescript
import {
  NeuroLink,
  createAuthMiddleware,
  createServer,
  createSessionMiddleware,
  registerAllRoutes,
} from "@juspay/neurolink";

// The agent routes keep a conversation only when conversation memory is on.
const neurolink = new NeuroLink({ conversationMemory: { enabled: true } });
const server = await createServer(neurolink, { framework: "hono" });

server.registerMiddleware(createAuthMiddleware({ type: "bearer", validate }));
server.registerMiddleware(createSessionMiddleware());
// perUserAuth also turns on carryMiddlewareState for this server.
registerAllRoutes(server, "/api", { perUserAuth: true });
```

A client sends `X-Session-Id: chat-1`; the agent routes then keep that conversation, separately for each signed-in user. Without `conversationMemory` enabled on the `NeuroLink` instance nothing is remembered, whatever the session id.

Register the session middleware **after** authentication. The server runs middleware in registration order, and the `order: 12` of this middleware is informational. Registered before authentication, it sees no user and sets the bare, unprefixed id; nothing warns about it. The same holds on a server that does not carry middleware state: there the middleware sees no user whatever the order, and the handler gets no session at all.

### Behaviour

| Request                                                              | `ctx.session.id`                                                              |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Authenticated, header `chat-1`                                       | `<userId>:chat-1`, so two users who send `chat-1` get different conversations |
| Not authenticated, header `chat-1`                                   | `chat-1` (the agent routes ignore it under `perUserAuth: true`)               |
| No header, or an empty one (and no cookie configured)                | not set; no session                                                           |
| No header or an empty one, `cookieName` set, cookie holds a valid id | the cookie's id, prefixed like a header's                                     |
| `cookieName` set, cookie holds an invalid id                         | the cookie is ignored, as if absent; no session                               |
| Header that is not a valid id                                        | `400`                                                                         |

A valid id is 1 to 128 characters: the first is a letter or digit, the rest are letters, digits, `.`, `_` or `-`. An id that starts with `.`, `_` or `-`, or contains `:`, is not valid.

### What the user prefix does and does not isolate

The prefix keeps the conversations the **agent routes** hold apart: the in-memory conversation manager keys sessions by id alone, so without it one user could read and extend another's conversation by guessing its id. Ids contain no `:`, so a crafted id cannot imitate another user's prefix.

It is not an access check on the **memory routes**. They look a session up by the id in the URL: on the in-memory manager by that id alone, on Redis by it together with the `userId` query parameter. Whether a server limits them to a session's owner depends on how that server configures and protects those routes, not on this middleware, so a caller who can reach them and knows a prefixed id such as `bob:chat-1` reads that session unless the server prevents it. Memory routes report the prefixed id; treat it as opaque.

The prefix also depends on `ctx.user` naming one person. When every client shares one credential (one API key), they share one `ctx.user` and so one prefix, and the prefix does not tell them apart.

Under `perUserAuth: true` an anonymous request (optional authentication) is given no session by the agent routes at all, because with a bare id every anonymous caller that sent the same `X-Session-Id` would share one conversation. If anonymous callers need a conversation, keep `perUserAuth` off, where they choose it with a body `sessionId` (this middleware's id is ignored there except on Hono with the caller's own `X-Request-ID`, see the table above), or have them sign in.

### Browser clients and CORS

A page on another origin can send the header only if the server's CORS allowed headers list it. The default list is `Content-Type`, `Authorization`, `X-Request-ID` and `X-Session-Id`, so the default header works once the page's origin is in `cors.origins`.

A custom `headerName` is not in that list. Add it to `cors.headers`, and note that a list you pass replaces the default rather than extending it, so keep the others your clients send:

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    cors: {
      origins: ["https://app.example.com"],
      headers: ["Content-Type", "Authorization", "X-Request-ID", "X-Chat-Id"],
    },
  },
});
server.registerMiddleware(createSessionMiddleware({ headerName: "X-Chat-Id" }));
```

A cookie read through `cookieName` is sent by the browser only when the page asks for credentials, which also needs `cors.credentials: true` and an explicit origin in `cors.origins` rather than `*`.

### Header and cookie

The header wins when both are present. A header that is present but empty counts as absent, so the cookie can still supply the id. A header holding an invalid id is a `400`, because the client chose to send it. A cookie holding an invalid id is ignored instead: a browser sends cookies on its own, so a stale or foreign cookie that happens to share the name must not turn every route into a `400`. `cookieName` is off by default for the same reason: a cookie is sent without the client choosing to, so enabling it is the operator's decision.

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

Middleware run in the order they are registered (the `order` property is informational and nothing sorts by it). Here's a recommended production setup:

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

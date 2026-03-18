# Server Adapters API Reference

Complete reference for `@juspay/neurolink/server` -- the HTTP server layer for NeuroLink.

```typescript
import {
  createServer,
  createAllRoutes,
  HonoServerAdapter,
  // ... ~120 exports
} from "@juspay/neurolink/server";
```

---

## Table of Contents

- [Factory and Base Class](#factory-and-base-class)
- [Framework Adapters](#framework-adapters)
- [Middleware](#middleware)
  - [Authentication](#authentication-middleware)
  - [Rate Limiting](#rate-limiting-middleware)
  - [Validation](#validation-middleware)
  - [Caching](#caching-middleware)
  - [Common Middleware](#common-middleware)
  - [Abort Signal](#abort-signal-middleware)
  - [Deprecation](#deprecation-middleware)
  - [Stream Redaction](#stream-redaction)
  - [MCP Body Attachment](#mcp-body-attachment-middleware)
- [Route Groups](#route-groups)
- [OpenAPI Generation](#openapi-generation)
- [Streaming Utilities](#streaming-utilities)
- [WebSocket](#websocket)
- [Validation Utilities (Zod)](#validation-utilities-zod)
- [Error Classes](#error-classes)
- [Type Exports](#type-exports)
- [Constants](#constants)

---

## Factory and Base Class

### `createServer(neurolink, options?)`

Convenience function that creates a server adapter from a NeuroLink instance.

```typescript
function createServer(
  neurolink: NeuroLink,
  options?: {
    framework?: ServerFramework; // default: "hono"
    config?: ServerAdapterConfig;
  },
): Promise<BaseServerAdapter>;
```

### `ServerAdapterFactory`

Static factory class for creating adapters. Supports dynamic imports so unused frameworks are never bundled.

| Method                    | Signature                                                              | Description                       |
| ------------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| `create`                  | `(options: ServerAdapterFactoryOptions) => Promise<BaseServerAdapter>` | Create adapter by framework name  |
| `createHono`              | `(neurolink, config?) => Promise<BaseServerAdapter>`                   | Shortcut for Hono                 |
| `createExpress`           | `(neurolink, config?) => Promise<BaseServerAdapter>`                   | Shortcut for Express              |
| `createFastify`           | `(neurolink, config?) => Promise<BaseServerAdapter>`                   | Shortcut for Fastify              |
| `createKoa`               | `(neurolink, config?) => Promise<BaseServerAdapter>`                   | Shortcut for Koa                  |
| `registerAdapter`         | `(framework, adapterClass) => void`                                    | Register a custom adapter class   |
| `isSupported`             | `(framework: string) => boolean`                                       | Check if a framework is supported |
| `getSupportedFrameworks`  | `() => Array<{framework, status, description}>`                        | List all supported frameworks     |
| `getRecommendedFramework` | `() => ServerFramework`                                                | Returns `"hono"`                  |

### `BaseServerAdapter`

Abstract base class that all framework adapters extend. Extends `EventEmitter`.

| Method                     | Signature                                    | Description                                   |
| -------------------------- | -------------------------------------------- | --------------------------------------------- |
| `initialize`               | `() => Promise<void>`                        | Initialize routes, middleware, framework      |
| `start`                    | `() => Promise<void>`                        | Start listening (abstract)                    |
| `stop`                     | `() => Promise<void>`                        | Stop server with graceful shutdown (abstract) |
| `registerRoute`            | `(route: RouteDefinition) => void`           | Register a single route                       |
| `registerRouteGroup`       | `(group: RouteGroup) => void`                | Register a route group with prefix            |
| `registerMiddleware`       | `(middleware: MiddlewareDefinition) => void` | Register middleware                           |
| `getStatus`                | `() => ServerStatus`                         | Get running status, uptime, route count       |
| `listRoutes`               | `() => RouteDefinition[]`                    | List all registered routes                    |
| `getConfig`                | `() => RequiredServerAdapterConfig`          | Get resolved configuration                    |
| `getLifecycleState`        | `() => ServerLifecycleState`                 | Get current lifecycle state                   |
| `getActiveConnectionCount` | `() => number`                               | Number of active connections                  |
| `getFrameworkInstance`     | `() => unknown`                              | Get underlying framework instance (abstract)  |

#### `ServerAdapterConfig`

All fields are optional; defaults are applied by the base class.

| Field                  | Type               | Default                  | Description                       |
| ---------------------- | ------------------ | ------------------------ | --------------------------------- |
| `port`                 | `number`           | `3000`                   | Server port                       |
| `host`                 | `string`           | `"0.0.0.0"`              | Server host                       |
| `basePath`             | `string`           | `"/api"`                 | Base path for all routes          |
| `cors`                 | `CORSConfig`       | enabled, origins `["*"]` | CORS settings                     |
| `rateLimit`            | `RateLimitConfig`  | enabled, 100 req/15 min  | Rate limiting                     |
| `bodyParser`           | `BodyParserConfig` | enabled, 10 MB limit     | Body parsing                      |
| `logging`              | `LoggingConfig`    | enabled, level `"info"`  | Request logging                   |
| `timeout`              | `number`           | `30000`                  | Request timeout (ms)              |
| `enableMetrics`        | `boolean`          | `true`                   | Expose `/api/metrics`             |
| `enableSwagger`        | `boolean`          | `false`                  | Enable OpenAPI docs               |
| `disableBuiltInHealth` | `boolean`          | `false`                  | Skip built-in `/health`, `/ready` |
| `redaction`            | `RedactionConfig`  | disabled                 | Stream redaction settings         |
| `shutdown`             | `ShutdownConfig`   | 30s shutdown, 15s drain  | Graceful shutdown behavior        |

#### `ShutdownConfig`

| Field                       | Type      | Default | Description                   |
| --------------------------- | --------- | ------- | ----------------------------- |
| `gracefulShutdownTimeoutMs` | `number`  | `30000` | Max time for entire shutdown  |
| `drainTimeoutMs`            | `number`  | `15000` | Max time to drain connections |
| `forceClose`                | `boolean` | `true`  | Force-close after timeout     |

#### Server Lifecycle States

`"uninitialized"` | `"initializing"` | `"initialized"` | `"starting"` | `"running"` | `"draining"` | `"stopping"` | `"stopped"` | `"error"`

#### Events (`ServerAdapterEvents`)

| Event         | Payload                                          |
| ------------- | ------------------------------------------------ |
| `initialized` | `{ config, routeCount, middlewareCount }`        |
| `started`     | `{ port, host, timestamp }`                      |
| `stopped`     | `{ uptime, timestamp }`                          |
| `request`     | `{ requestId, method, path, timestamp }`         |
| `response`    | `{ requestId, statusCode, duration, timestamp }` |
| `error`       | `{ requestId?, error, timestamp }`               |

---

## Framework Adapters

All adapters extend `BaseServerAdapter` and share the same public API. They differ in which underlying HTTP framework they wrap.

| Class                  | Framework | Multi-runtime            | Notes                                                   |
| ---------------------- | --------- | ------------------------ | ------------------------------------------------------- |
| `HonoServerAdapter`    | Hono      | Node.js, Bun, Deno, Edge | Recommended. Auto-detects runtime.                      |
| `ExpressServerAdapter` | Express   | Node.js                  | Dynamic-imports `express`, `cors`, `express-rate-limit` |
| `FastifyServerAdapter` | Fastify   | Node.js                  | Dynamic-imports `fastify`                               |
| `KoaServerAdapter`     | Koa       | Node.js                  | Dynamic-imports `koa`, `@koa/router`, `@koa/cors`       |

```typescript
import { HonoServerAdapter } from "@juspay/neurolink/server";

const adapter = new HonoServerAdapter(neurolink, { port: 8080 });
await adapter.initialize();
await adapter.start();
```

---

## Middleware

All middleware factory functions return `MiddlewareDefinition` objects. Register them with `adapter.registerMiddleware(mw)`.

```typescript
type MiddlewareDefinition = {
  name: string;
  order?: number; // lower = earlier (default varies)
  handler: MiddlewareHandler;
  paths?: string[]; // apply to these paths (default: all)
  excludePaths?: string[]; // skip these paths
};

type MiddlewareHandler = (
  ctx: ServerContext,
  next: () => Promise<unknown>,
) => Promise<unknown>;
```

### Authentication Middleware

#### `createAuthMiddleware(config)`

General-purpose authentication middleware supporting bearer, API key, basic, and custom strategies.

```typescript
function createAuthMiddleware(config: AuthConfig): MiddlewareDefinition;

type AuthConfig = {
  type: "bearer" | "api-key" | "basic" | "custom";
  validate: (token: string, ctx: ServerContext) => Promise<AuthResult | null>;
  headerName?: string; // default varies by type
  skipPaths?: string[];
  errorMessage?: string; // default: "Authentication required"
  extractToken?: (ctx: ServerContext) => string | null; // for "custom" type
  skipDevPlayground?: boolean; // default: true (skips auth for dev playground headers)
};

type AuthResult = {
  id: string;
  email?: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
};
```

#### `createBearerAuthMiddleware(validate, options?)`

Simplified bearer token authentication.

```typescript
function createBearerAuthMiddleware(
  validate: TokenValidator,
  options?: BearerAuthOptions,
): MiddlewareDefinition;

type TokenValidator = (
  token: string,
) => Promise<AuthenticatedUser | null> | AuthenticatedUser | null;

type BearerAuthOptions = {
  required?: boolean; // default: true
  headerName?: string; // default: "authorization"
  skipPaths?: string[];
};
```

#### `createApiKeyAuthMiddleware(store, options?)`

API key authentication using an `ApiKeyStore`.

```typescript
function createApiKeyAuthMiddleware(
  store: ApiKeyStore,
  options?: ApiKeyAuthOptions,
): MiddlewareDefinition;

type ApiKeyAuthOptions = {
  headerName?: string; // default: "x-api-key"
  skipPaths?: string[];
};
```

#### `ApiKeyStore`

In-memory API key store.

| Method      | Signature                                           | Description           |
| ----------- | --------------------------------------------------- | --------------------- |
| `addKey`    | `(apiKey: string, user: AuthenticatedUser) => void` | Register a key        |
| `validate`  | `(apiKey: string) => AuthenticatedUser \| null`     | Validate a key        |
| `removeKey` | `(apiKey: string) => boolean`                       | Remove a key          |
| `clear`     | `() => void`                                        | Remove all keys       |
| `size`      | `number` (getter)                                   | Number of stored keys |

#### `createRoleMiddleware(config)` / `createRoleAuthMiddleware(requiredRoles, options?)`

Role-based access control. Place after authentication middleware.

```typescript
function createRoleMiddleware(config: {
  requiredRoles: string[];
  requireAll?: boolean; // default: false (any role matches)
  errorMessage?: string;
}): MiddlewareDefinition;

// Simplified version
function createRoleAuthMiddleware(
  requiredRoles: string[],
  options?: { requireAll?: boolean },
): MiddlewareDefinition;
```

#### `createPermissionAuthMiddleware(requiredPermissions, options?)`

Permission-based access control.

```typescript
function createPermissionAuthMiddleware(
  requiredPermissions: string[],
  options?: { requireAll?: boolean },
): MiddlewareDefinition;
```

---

### Rate Limiting Middleware

#### `createRateLimitMiddleware(config)`

Fixed-window rate limiter with configurable store.

```typescript
function createRateLimitMiddleware(
  config: RateLimitMiddlewareConfig,
): MiddlewareDefinition;

type RateLimitMiddlewareConfig = {
  maxRequests: number;
  windowMs: number;
  message?: string;
  skipPaths?: string[];
  keyGenerator?: (ctx: ServerContext) => string; // default: IP address
  onRateLimitExceeded?: (ctx: ServerContext, retryAfter: number) => unknown;
  store?: RateLimitStore; // default: InMemoryRateLimitStore
};
```

Sets response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` on 429.

#### `createSlidingWindowRateLimitMiddleware(config)`

Sliding-window variant for smoother rate limiting.

```typescript
function createSlidingWindowRateLimitMiddleware(
  config: RateLimitMiddlewareConfig & { subWindows?: number },
): MiddlewareDefinition;
```

#### `createFixedWindowRateLimitMiddleware(config, store?)`

Fixed-window rate limiter with store as a separate parameter.

```typescript
function createFixedWindowRateLimitMiddleware(
  config: FixedWindowRateLimitConfig,
  store?: RateLimitStore,
): MiddlewareDefinition;
```

#### `InMemoryRateLimitStore`

Default in-memory rate limit store implementing `RateLimitStore`.

```typescript
type RateLimitStore = {
  get(key: string): Promise<RateLimitEntry | undefined>;
  set(key: string, entry: RateLimitEntry): Promise<void>;
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;
  reset(key: string): Promise<void>;
};
```

Also exported as `MemoryRateLimitStore` (alias).

---

### Validation Middleware

#### `createRequestValidationMiddleware(config)`

Schema-based request validation for body, query, params, and headers.

```typescript
function createRequestValidationMiddleware(
  config: ValidationConfig,
): MiddlewareDefinition;

type ValidationConfig = {
  bodySchema?: ValidationSchema;
  querySchema?: ValidationSchema;
  paramsSchema?: ValidationSchema;
  headersSchema?: ValidationSchema;
  customValidator?: (ctx: ServerContext) => Promise<void>;
  skipPaths?: string[];
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

Also exported as `createValidationMiddleware` (alias).

#### `createBodyValidationMiddleware(schema)` / `createQueryValidationMiddleware(schema)`

Convenience wrappers for body-only or query-only validation.

#### `createFieldValidator(fieldName, rules)`

Returns a `(value: unknown) => void` function that throws `ValidationError` on failure.

#### `CommonSchemas`

Pre-built `ValidationSchema` objects: `uuid`, `email`, `pagination`, `sorting`, `idParam`, `dateRange`, `search`.

#### `ValidationError` (middleware)

Re-exported from `errors.ts`. Contains an `errors` array of `{ field, message, value? }`.

---

### Caching Middleware

#### `createCacheMiddleware(config)`

Response caching with LRU eviction and per-path TTL support.

```typescript
function createCacheMiddleware(config: CacheConfig): MiddlewareDefinition;

type CacheConfig = {
  ttlMs: number;
  maxSize?: number; // default: 1000
  keyGenerator?: (ctx: ServerContext) => string;
  methods?: string[]; // default: ["GET"]
  paths?: string[];
  excludePaths?: string[];
  store?: CacheStore; // default: InMemoryCacheStore
  includeQuery?: boolean; // default: true
  ttlByPath?: Record<string, number>;
};
```

Sets response headers: `X-Cache` (`HIT` / `MISS`), `X-Cache-Age`, `Cache-Control`.

#### `createCacheInvalidator(store)`

Returns `{ invalidate(pattern), clear() }` for programmatic cache invalidation.

#### `InMemoryCacheStore`

LRU cache store implementing `CacheStore`.

```typescript
type CacheStore = {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
};

type CacheEntry = {
  data: unknown;
  createdAt: number;
  ttlMs: number;
  headers?: Record<string, string>;
};
```

#### `LRUCache<K, V>`

Generic synchronous LRU cache. Methods: `get`, `set`, `has`, `delete`, `clear`, `size`.

#### `ResponseCacheStore<T>`

Synchronous response cache with TTL. Methods: `get`, `set`, `has`, `invalidate`, `invalidateByPattern`, `clear`, `size`.

---

### Common Middleware

| Factory                                     | Order | Description                                                          |
| ------------------------------------------- | ----- | -------------------------------------------------------------------- |
| `createTimingMiddleware()`                  | 0     | Adds `X-Response-Time` and `Server-Timing` headers                   |
| `createRequestIdMiddleware(options?)`       | 0     | Ensures every request has an `X-Request-ID` header                   |
| `createErrorHandlingMiddleware(options?)`   | 1     | Catches errors and formats consistent error responses                |
| `createSecurityHeadersMiddleware(options?)` | 2     | Adds `X-Frame-Options`, `X-Content-Type-Options`, HSTS, CSP, etc.    |
| `createLoggingMiddleware(options?)`         | 3     | Logs request/response information; skips health endpoints by default |
| `createCompressionMiddleware(options?)`     | 5     | Signals compression preference to adapters                           |

#### `createRequestIdMiddleware` options

```typescript
{
  headerName?: string;     // default: "x-request-id"
  prefix?: string;         // default: "req"
  generator?: () => string;
}
```

#### `createErrorHandlingMiddleware` options

```typescript
{
  includeStack?: boolean;  // default: false
  onError?: (error: Error, ctx: ServerContext) => unknown;
  logErrors?: boolean;     // default: true
}
```

#### `createSecurityHeadersMiddleware` options

```typescript
{
  contentSecurityPolicy?: string;
  frameOptions?: "DENY" | "SAMEORIGIN" | false;       // default: "DENY"
  contentTypeOptions?: "nosniff" | false;               // default: "nosniff"
  hstsMaxAge?: number | false;                          // default: 31536000
  referrerPolicy?: string | false;                      // default: "strict-origin-when-cross-origin"
  customHeaders?: Record<string, string>;
}
```

#### `createLoggingMiddleware` options

```typescript
{
  logBody?: boolean;       // default: false
  logResponse?: boolean;   // default: false
  logger?: { info, error };
  skipPaths?: string[];    // default: ["/health", "/ready", "/metrics"]
}
```

#### `createCompressionMiddleware` options

```typescript
{
  threshold?: number;      // default: 1024 bytes
  contentTypes?: string[]; // default: text/*, application/json, etc.
}
```

---

### Abort Signal Middleware

#### `createAbortSignalMiddleware(options?)`

Attaches an `AbortController` to `ctx.abortSignal` and `ctx.abortController` for handling client disconnections and request timeouts.

```typescript
function createAbortSignalMiddleware(
  options?: AbortSignalMiddlewareOptions,
): MiddlewareDefinition;

type AbortSignalMiddlewareOptions = {
  onAbort?: (ctx: ServerContext) => void;
  timeout?: number; // request timeout in ms
};
```

#### `createExpressAbortMiddleware(options?)`

Express-specific middleware that sets `res.locals.abortSignal` and `res.locals.abortController`.

```typescript
function createExpressAbortMiddleware(
  options?: AbortSignalMiddlewareOptions,
): (req, res, next) => void;
```

---

### Deprecation Middleware

#### `createDeprecationMiddleware(config)`

Adds RFC 8594 deprecation headers (`Deprecation`, `Sunset`, `Link`, `X-Deprecation-Notice`) to responses for routes marked as deprecated.

```typescript
function createDeprecationMiddleware(
  config: DeprecationConfig,
): MiddlewareDefinition;

type DeprecationConfig = {
  routes: RouteDefinition[];
  noticeHeader?: string; // default: "X-Deprecation-Notice"
  includeLink?: boolean; // default: true
};
```

---

### Stream Redaction

Redaction is **disabled by default** (opt-in security feature).

#### `redactStreamChunk(chunk, config?)`

Redact sensitive fields from a `DataStreamEvent` chunk. Returns the chunk unchanged when `config.enabled` is falsy.

```typescript
function redactStreamChunk(
  chunk: DataStreamEvent,
  config?: RedactionConfig,
): DataStreamEvent;
```

#### `createStreamRedactor(config?)`

Returns a reusable transform function `<T>(chunk: T) => T`. No-op when redaction is disabled.

```typescript
function createStreamRedactor(config?: RedactionConfig): <T>(chunk: T) => T;
```

#### `RedactionConfig`

```typescript
type RedactionConfig = {
  enabled?: boolean; // default: false
  additionalFields?: string[];
  preserveFields?: string[];
  redactToolArgs?: boolean; // default: true (when enabled)
  redactToolResults?: boolean; // default: true (when enabled)
  placeholder?: string; // default: "[REDACTED]"
};
```

Default redacted fields: `request`, `args`, `result`, `apiKey`, `token`, `authorization`, `credentials`, `password`, `secret`.

---

### MCP Body Attachment Middleware

#### `createMCPBodyAttachmentMiddleware()`

Bridges Fastify's body parsing with MCP SDK expectations by attaching `request.body` to `request.raw.body`.

```typescript
function createMCPBodyAttachmentMiddleware(): MiddlewareDefinition;
```

#### `fastifyMCPBodyHook(request)`

Lower-level Fastify `preHandler` hook for the same purpose.

```typescript
function fastifyMCPBodyHook(request: {
  raw: { body?: unknown };
  body?: unknown;
}): Promise<void>;
```

---

## Route Groups

Route group factories return `RouteGroup` objects. Register them with `adapter.registerRouteGroup(group)`.

### `createAllRoutes(basePath?, options?)`

Creates all standard route groups in one call.

```typescript
function createAllRoutes(
  basePath?: string, // default: "/api"
  options?: CreateRoutesOptions,
): RouteGroup[];

type CreateRoutesOptions = {
  enableSwagger?: boolean;
  getRoutes?: () => RouteDefinition[];
};
```

### `registerAllRoutes(adapter, basePath?, options?)`

Registers all route groups with an adapter. If the adapter has `listRoutes()`, auto-binds it for OpenAPI spec generation.

```typescript
function registerAllRoutes(
  adapter: { registerRouteGroup; listRoutes? },
  basePath?: string,
  options?: CreateRoutesOptions,
): void;
```

### Individual Route Factories

| Factory                                      | Prefix    | Endpoints                                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createAgentRoutes(basePath?)`               | `/agent`  | `POST /agent/execute` -- Execute agent<br />`POST /agent/stream` -- Stream agent response (SSE)<br />`GET /agent/providers` -- List available providers<br />`POST /agent/embed` -- Generate single embedding<br />`POST /agent/embed-many` -- Generate batch embeddings                    |
| `createToolRoutes(basePath?)`                | `/tools`  | `GET /tools` -- List all tools<br />`GET /tools/search` -- Search tools by query<br />`GET /tools/:name` -- Get tool details<br />`POST /tools/:name/execute` -- Execute tool<br />`POST /tools/execute` -- Execute tool (body-based)                                                       |
| `createMCPRoutes(basePath?)`                 | `/mcp`    | `GET /mcp/servers` -- List MCP servers<br />`GET /mcp/servers/:name` -- Get server status<br />`GET /mcp/servers/:name/tools` -- List server tools<br />`POST /mcp/servers/:name/tools/:toolName/execute` -- Execute server tool                                                            |
| `createMemoryRoutes(basePath?)`              | `/memory` | `GET /memory/sessions` -- List sessions<br />`GET /memory/sessions/:id` -- Get session details<br />`GET /memory/sessions/:id/messages` -- Get session messages<br />`DELETE /memory/sessions/:id` -- Delete session<br />`POST /memory/sessions/:sessionId/clear` -- Clear session history |
| `createHealthRoutes(basePath?)`              | `/health` | `GET /health` -- Basic health check<br />`GET /health/live` -- Liveness probe<br />`GET /health/ready` -- Readiness probe<br />`GET /health/detailed` -- Detailed health with service status                                                                                                |
| `createOpenApiRoutes(basePath?, getRoutes?)` | `/docs`   | `GET /docs/openapi.json` -- OpenAPI spec (JSON)<br />`GET /docs/openapi.yaml` -- OpenAPI spec (YAML)                                                                                                                                                                                        |

All route factories accept a `basePath` parameter (default: `"/api"`).

---

## OpenAPI Generation

### `OpenAPIGenerator`

Class that generates OpenAPI 3.1 specifications from route definitions.

```typescript
class OpenAPIGenerator {
  constructor(config?: OpenAPIGeneratorConfig);
  addRoutes(routes: RouteDefinition[]): void;
  addRoute(route: RouteDefinition): void;
  generate(): OpenAPISpec;
  toJSON(pretty?: boolean): string;
  toYAML(): string;
}
```

#### `OpenAPIGeneratorConfig`

```typescript
type OpenAPIGeneratorConfig = {
  info?: { title?; version?; description? };
  servers?: Array<{ url; description? }>;
  includeSecurity?: boolean; // default: true
  basePath?: string; // default: "/api"
  additionalTags?: Array<{ name; description }>;
  customSchemas?: Record<string, JsonObject>;
  routes?: RouteDefinition[];
};
```

#### `OpenAPISpec`

```typescript
type OpenAPISpec = {
  openapi: "3.1.0";
  info: JsonObject;
  servers: JsonObject[];
  tags: JsonObject[];
  paths: Record<string, JsonObject>;
  components: {
    schemas: Record<string, JsonObject>;
    securitySchemes?: Record<string, JsonObject>;
    parameters?: Record<string, JsonObject>;
  };
  security?: JsonObject[];
};
```

### Factory Functions

| Function                    | Signature                                | Description                         |
| --------------------------- | ---------------------------------------- | ----------------------------------- |
| `createOpenAPIGenerator`    | `(config?) => OpenAPIGenerator`          | Create generator with defaults      |
| `generateOpenAPISpec`       | `(routes, config?) => OpenAPISpec`       | One-shot spec from routes           |
| `generateOpenAPIFromConfig` | `(serverConfig, routes?) => OpenAPISpec` | Generate from `ServerAdapterConfig` |

### Pre-built Schemas

All schemas are plain JSON Schema objects exported from `./openapi/schemas.ts`:

| Schema                                | Description                                  |
| ------------------------------------- | -------------------------------------------- |
| `ErrorResponseSchema`                 | Standard error response                      |
| `TokenUsageSchema`                    | Token usage breakdown                        |
| `AgentInputSchema`                    | Agent input (string or multimodal object)    |
| `AgentExecuteRequestSchema` (OpenAPI) | Agent execute request body                   |
| `AgentExecuteResponseSchema`          | Agent execute response                       |
| `ToolCallSchema`                      | Tool call object                             |
| `ProviderInfoSchema`                  | Provider information                         |
| `ToolParameterSchema`                 | Tool parameter definition                    |
| `ToolDefinitionSchema`                | Full tool definition                         |
| `ToolListResponseSchema`              | Tool list response                           |
| `ToolExecuteRequestSchema` (OpenAPI)  | Tool execute request body                    |
| `ToolExecuteResponseSchema`           | Tool execute response                        |
| `MCPServerToolSchema`                 | MCP server tool                              |
| `MCPServerStatusSchema`               | MCP server status                            |
| `MCPServersListResponseSchema`        | MCP servers list                             |
| `ConversationMessageSchema`           | Conversation message                         |
| `SessionSchema`                       | Session object                               |
| `SessionsListResponseSchema`          | Sessions list                                |
| `HealthResponseSchema`                | Health check response                        |
| `ReadyResponseSchema`                 | Readiness check response                     |
| `MetricsResponseSchema`               | Metrics response                             |
| `OpenAPISchemas`                      | Registry object containing all schemas above |

### Templates

| Export                                              | Description                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `createSuccessResponse(schemaRef)`                  | Build a 200 response object                                                                             |
| `createOpenAPIErrorResponse(code, description)`     | Build an error response object                                                                          |
| `createStreamingResponse(description)`              | Build a streaming (SSE) response                                                                        |
| `StandardErrorResponses`                            | Map of 400/401/403/404/429/500 responses                                                                |
| `createPathParameter(name, description?)`           | Build a path parameter                                                                                  |
| `createQueryParameter(name, schema, description?)`  | Build a query parameter                                                                                 |
| `createHeaderParameter(name, schema, description?)` | Build a header parameter                                                                                |
| `CommonParameters`                                  | Pre-built parameters: `sessionId`, `serverName`, `toolName`, `limitQuery`, `offsetQuery`, `searchQuery` |
| `createGetOperation(...)`                           | Build a GET operation                                                                                   |
| `createPostOperation(...)`                          | Build a POST operation                                                                                  |
| `createStreamingPostOperation(...)`                 | Build a streaming POST operation                                                                        |
| `createDeleteOperation(...)`                        | Build a DELETE operation                                                                                |
| `BearerSecurityScheme`                              | Bearer token security scheme object                                                                     |
| `ApiKeySecurityScheme`                              | API key security scheme object                                                                          |
| `BasicSecurityScheme`                               | HTTP basic security scheme object                                                                       |
| `StandardTags`                                      | Default tag definitions (agent, tools, mcp, memory, health, streaming)                                  |
| `createOpenAPIServer(url, description)`             | Build a server object                                                                                   |
| `DefaultServers`                                    | Default server list                                                                                     |
| `createApiInfo(title, version, description)`        | Build an info object                                                                                    |
| `NeuroLinkApiInfo`                                  | Default NeuroLink API info object                                                                       |

---

## Streaming Utilities

### Event Types

```typescript
type DataStreamEventType =
  | "text-start"
  | "text-delta"
  | "text-end"
  | "tool-call"
  | "tool-result"
  | "data"
  | "error"
  | "finish";

type DataStreamEvent = {
  type: DataStreamEventType;
  id?: string;
  timestamp: number;
  data: unknown;
};
```

Specialized event types: `TextStartEvent`, `TextDeltaEvent`, `TextEndEvent`, `ToolCallEvent`, `ToolResultEvent`, `DataEvent`, `ErrorEvent`, `FinishEvent`.

### `createDataStreamWriter(config)`

Creates a `DataStreamWriter` that writes events in SSE or NDJSON format.

```typescript
function createDataStreamWriter(
  config: DataStreamWriterConfig,
): DataStreamWriter;

type DataStreamWriterConfig = {
  write: (chunk: string) => void | Promise<void>;
  close?: () => void | Promise<void>;
  format?: "sse" | "ndjson"; // default: "sse"
  includeTimestamps?: boolean; // default: true
};
```

#### `DataStreamWriter` interface

| Method            | Signature                                              |
| ----------------- | ------------------------------------------------------ |
| `writeTextStart`  | `(id: string) => Promise<void>`                        |
| `writeTextDelta`  | `(id: string, delta: string) => Promise<void>`         |
| `writeTextEnd`    | `(id: string) => Promise<void>`                        |
| `writeToolCall`   | `(toolCall: { id, name, arguments }) => Promise<void>` |
| `writeToolResult` | `(toolResult: { id, name, result }) => Promise<void>`  |
| `writeData`       | `(data: unknown) => Promise<void>`                     |
| `writeError`      | `(error: { message, code? }) => Promise<void>`         |
| `close`           | `() => Promise<void>`                                  |

### `DataStreamResponse`

High-level class that creates a `ReadableStream<Uint8Array>` with a `DataStreamWriter` interface.

```typescript
class DataStreamResponse {
  constructor(config?: DataStreamResponseConfig);
  readonly stream: ReadableStream<Uint8Array>;
  readonly headers: Record<string, string>;
  getWriter(): DataStreamWriter;
  writeTextStart(id: string): Promise<void>;
  writeTextDelta(id: string, delta: string): Promise<void>;
  writeTextEnd(id: string): Promise<void>;
  writeToolCall(toolCall): Promise<void>;
  writeToolResult(toolResult): Promise<void>;
  writeData(data: unknown): Promise<void>;
  writeError(error: { message; code? }): Promise<void>;
  finish(options?: { reason?; usage? }): Promise<void>;
  close(): void;
  isClosed(): boolean;
}

type DataStreamResponseConfig = {
  contentType?: "text/event-stream" | "application/x-ndjson";
  headers?: Record<string, string>;
  keepAliveInterval?: number;
  includeTimestamps?: boolean;
};
```

#### `createDataStreamResponse(config?)`

Factory function for `DataStreamResponse`.

### Helper Functions

| Function                        | Signature                                         | Description                                        |
| ------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| `pipeAsyncIterableToDataStream` | `(iterable, response, options?) => Promise<void>` | Pipe an async iterable into a `DataStreamResponse` |
| `createSSEHeaders`              | `(additionalHeaders?) => Record<string, string>`  | Standard SSE headers                               |
| `createNDJSONHeaders`           | `(additionalHeaders?) => Record<string, string>`  | Standard NDJSON headers                            |
| `formatSSEEvent`                | `(options: SSEEventOptions) => string`            | Format a single SSE message                        |

#### `SSEEventOptions`

```typescript
type SSEEventOptions = {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
};
```

### `BaseDataStreamWriter`

Abstract base class providing `isClosed()`, `onClose(handler)`, and `close()`.

### `WebStreamWriter`

Concrete class extending `BaseDataStreamWriter`. Writes SSE events to a `ReadableStream<Uint8Array>`.

| Property/Method               | Type                         | Description              |
| ----------------------------- | ---------------------------- | ------------------------ |
| `stream`                      | `ReadableStream<Uint8Array>` | The readable stream      |
| `writeData(data)`             | `void`                       | Write a data event       |
| `writeError(message)`         | `void`                       | Write an error event     |
| `writeDone()`                 | `void`                       | Write a done event       |
| `writeEvent(eventType, data)` | `void`                       | Write a custom event     |
| `close()`                     | `void`                       | Close the stream         |
| `isClosed()`                  | `boolean`                    | Check if closed          |
| `onClose(handler)`            | `void`                       | Register a close handler |

---

## WebSocket

### `WebSocketConnectionManager`

Manages WebSocket connections, ping/pong, and handler dispatch.

```typescript
class WebSocketConnectionManager {
  constructor(config?: WebSocketConfig);
  registerHandler(path: string, handler: WebSocketHandler): void;
  getHandler(path: string): WebSocketHandler | undefined;
  handleConnection(socket, path, user?): Promise<WebSocketConnection>;
  handleMessage(connectionId, data, isBinary): Promise<void>;
  handleClose(connectionId, code, reason): Promise<void>;
  handleError(connectionId, error): Promise<void>;
  getConnection(connectionId): WebSocketConnection | undefined;
  getAllConnections(): WebSocketConnection[];
  getConnectionsByUser(userId): WebSocketConnection[];
  getConnectionsByPath(path): WebSocketConnection[];
  send(connectionId, data): void;
  broadcast(data, filter?): void;
  close(connectionId, code?, reason?): Promise<void>;
  closeAll(code?, reason?): Promise<void>;
  getConnectionCount(): number;
}
```

#### `WebSocketConfig`

```typescript
type WebSocketConfig = {
  path?: string; // default: "/ws"
  maxConnections?: number; // default: 1000
  pingInterval?: number; // default: 30000
  pongTimeout?: number; // default: 10000
  maxMessageSize?: number; // default: 1 MB
  auth?: AuthConfig;
};
```

### `WebSocketMessageRouter`

Routes JSON messages by `type` field to registered handlers.

```typescript
class WebSocketMessageRouter {
  route(type: string, handler: (conn, payload) => Promise<unknown>): void;
  handle(connection, message: WebSocketMessage): Promise<unknown>;
  getRoutes(): string[];
}
```

### `createAgentWebSocketHandler(neurolink)`

Creates a `WebSocketHandler` with pre-registered routes for `generate`, `stream`, and `tool_call` messages.

```typescript
function createAgentWebSocketHandler(neurolink: unknown): WebSocketHandler;
```

---

## Validation Utilities (Zod)

Zod schemas and helpers exported from `./utils/validation.ts`. Used internally by route handlers.

### Zod Schemas

| Schema                      | Validates                                  |
| --------------------------- | ------------------------------------------ |
| `AgentExecuteRequestSchema` | Agent execute request body                 |
| `ToolExecuteRequestSchema`  | Tool execute request body                  |
| `ToolArgumentsSchema`       | Tool arguments (`Record<string, unknown>`) |
| `SessionIdParamSchema`      | `{ sessionId: string }`                    |
| `ServerNameParamSchema`     | `{ name: string }`                         |
| `ToolNameParamSchema`       | `{ name: string }`                         |
| `ToolSearchQuerySchema`     | `{ q?, source?, limit? }`                  |

### Validation Functions

| Function              | Signature                                                              | Description                         |
| --------------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| `validateRequest`     | `<T>(schema: ZodSchema<T>, data, requestId?) => ValidationResult<T>`   | Validate request body               |
| `validateQuery`       | `<T>(schema: ZodSchema<T>, query, requestId?) => ValidationResult<T>`  | Validate query params               |
| `validateParams`      | `<T>(schema: ZodSchema<T>, params, requestId?) => ValidationResult<T>` | Validate path params                |
| `createErrorResponse` | `(code, message, details?, requestId?, httpStatus?) => ErrorResponse`  | Build a standardized error response |

```typescript
type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorResponse };

type ErrorResponse = {
  error: { code: string; message: string; details?: unknown };
  metadata?: { timestamp: string; requestId?: string };
  httpStatus?: number;
};
```

---

## Error Classes

All error classes extend `ServerAdapterError`, which extends `Error`. Every error carries `code`, `category`, `severity`, `retryable`, and optional context fields (`retryAfterMs`, `requestId`, `path`, `method`, `details`, `cause`).

`ServerAdapterError` provides:

- `toJSON()` -- serializes to `{ error: { code, message, category, requestId, details, retryAfter } }`
- `getHttpStatus()` -- maps error code to HTTP status

### Error Class Table

| Class                        | HTTP Status | Category         | Retryable | Description                                    |
| ---------------------------- | ----------- | ---------------- | --------- | ---------------------------------------------- |
| `ServerAdapterError`         | varies      | `EXECUTION`      | no        | Base error class                               |
| `ConfigurationError`         | 400         | `CONFIG`         | no        | Invalid server configuration                   |
| `MissingDependencyError`     | 500         | `CONFIG`         | no        | Missing framework dependency (e.g., `express`) |
| `RouteConflictError`         | 500         | `CONFIG`         | no        | Duplicate route registration                   |
| `RouteNotFoundError`         | 404         | `VALIDATION`     | no        | Route not found                                |
| `ServerValidationError`      | 400         | `VALIDATION`     | no        | Request validation failed; carries `errors[]`  |
| `AuthenticationError`        | 401         | `AUTHENTICATION` | no        | Authentication required                        |
| `InvalidAuthenticationError` | 401         | `AUTHENTICATION` | no        | Invalid credentials                            |
| `AuthorizationError`         | 403         | `AUTHORIZATION`  | no        | Insufficient permissions                       |
| `ServerRateLimitError`       | 429         | `RATE_LIMIT`     | yes       | Rate limit exceeded                            |
| `HandlerError`               | 500         | `EXECUTION`      | no        | Route handler threw                            |
| `TimeoutError`               | 408         | `EXECUTION`      | yes       | Operation timed out                            |
| `StreamingError`             | 500         | `STREAMING`      | no        | Stream processing error                        |
| `StreamAbortedError`         | 499         | `STREAMING`      | no        | Client disconnected                            |
| `WebSocketError`             | 500         | `WEBSOCKET`      | yes       | WebSocket error                                |
| `WebSocketConnectionError`   | 500         | `WEBSOCKET`      | yes       | WebSocket connection failed                    |
| `ServerStartError`           | 500         | `CONFIG`         | yes       | Server failed to start                         |
| `ServerStopError`            | 500         | `EXECUTION`      | no        | Server failed to stop                          |
| `AlreadyRunningError`        | 500         | `CONFIG`         | no        | Server already running                         |
| `NotRunningError`            | 500         | `CONFIG`         | no        | Server not running                             |

Note: `ShutdownTimeoutError`, `DrainTimeoutError`, and `InvalidLifecycleStateError` are used internally by the shutdown lifecycle and are not re-exported from the public index.

### `wrapError(error, requestId?, path?, method?)`

Wraps any error as a `ServerAdapterError`. Returns the error as-is if it is already a `ServerAdapterError`; otherwise wraps it in a `HandlerError`.

```typescript
function wrapError(
  error: unknown,
  requestId?: string,
  path?: string,
  method?: string,
): ServerAdapterError;
```

### `ErrorRecoveryStrategies`

A `Record<ErrorCategoryType, { strategy, maxRetries, baseDelayMs }>` mapping each error category to a recommended recovery strategy (`"retry"`, `"exponentialBackoff"`, `"circuitBreak"`, or `"fail"`).

---

## Type Exports

These are `type`-only exports (no runtime value).

### Configuration Types

| Type                          | Description                                |
| ----------------------------- | ------------------------------------------ |
| `ServerAdapterConfig`         | Server configuration (all optional)        |
| `RequiredServerAdapterConfig` | Same, with defaults applied (all required) |
| `CORSConfig`                  | CORS settings                              |
| `RateLimitConfig`             | Rate limit settings                        |
| `BodyParserConfig`            | Body parser settings                       |
| `LoggingConfig`               | Logging settings                           |
| `StreamingConfig`             | Streaming response configuration           |
| `RedactionConfig`             | Stream redaction settings                  |
| `ShutdownConfig`              | Graceful shutdown settings                 |

### Request/Response Types

| Type                      | Description                                           |
| ------------------------- | ----------------------------------------------------- |
| `ServerContext`           | Request context passed to all handlers and middleware |
| `ServerResponse<T>`       | Generic server response envelope                      |
| `AgentExecuteRequest`     | Agent execute request body                            |
| `AgentExecuteResponse`    | Agent execute response                                |
| `ToolExecuteRequest`      | Tool execute request body                             |
| `ToolExecuteResponse`     | Tool execute response                                 |
| `MCPServerStatusResponse` | MCP server status                                     |
| `HealthResponse`          | Health check response                                 |
| `ReadyResponse`           | Readiness check response                              |
| `ErrorResponse`           | Standardized error response                           |
| `ValidationResult<T>`     | Success/failure discriminated union                   |

### Route and Middleware Types

| Type                   | Description                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `HttpMethod`           | `"GET" \| "POST" \| "PUT" \| "DELETE" \| "PATCH" \| "OPTIONS"`                      |
| `RouteDefinition`      | Full route definition                                                               |
| `RouteGroup`           | Group of routes with prefix and optional middleware                                 |
| `RouteHandler<T>`      | `(ctx: ServerContext) => Promise<T \| ServerResponse<T> \| AsyncIterable<unknown>>` |
| `MiddlewareDefinition` | Middleware definition with name, order, handler, paths                              |
| `MiddlewareHandler`    | `(ctx, next) => Promise<unknown>`                                                   |
| `CreateRoutesOptions`  | Options for `createAllRoutes`                                                       |

### Factory Types

| Type                          | Description                                 |
| ----------------------------- | ------------------------------------------- |
| `ServerFramework`             | `"hono" \| "express" \| "fastify" \| "koa"` |
| `ServerAdapterFactoryOptions` | `{ framework, neurolink, config? }`         |
| `ServerStatus`                | Server status snapshot                      |

### Streaming Types

| Type                                                 | Description                       |
| ---------------------------------------------------- | --------------------------------- |
| `DataStreamWriter`                                   | Writer interface for data streams |
| `DataStreamEventType`                                | Event type union                  |
| `DataStreamEvent`                                    | Base event                        |
| `TextStartEvent` / `TextDeltaEvent` / `TextEndEvent` | Text streaming events             |
| `ToolCallEvent` / `ToolResultEvent`                  | Tool events                       |
| `DataEvent` / `ErrorEvent` / `FinishEvent`           | Utility events                    |
| `DataStreamWriterConfig`                             | Writer factory config             |
| `DataStreamResponseConfig`                           | Response factory config           |
| `SSEEventOptions`                                    | SSE formatting options            |
| `SSEWriteOptions`                                    | SSE write options                 |

### WebSocket Types

| Type                   | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| `WebSocketConfig`      | WebSocket server settings                                             |
| `WebSocketConnection`  | Connection object                                                     |
| `WebSocketHandler`     | Event handler interface (`onOpen`, `onMessage`, `onClose`, `onError`) |
| `WebSocketMessage`     | Message object                                                        |
| `WebSocketMessageType` | `"text" \| "binary" \| "ping" \| "pong" \| "close"`                   |
| `WebSocketAuthConfig`  | Auth config for WebSocket (same shape as `AuthConfig` from types)     |
| `AuthenticatedUser`    | User object with id, email, name, roles, permissions, metadata        |
| `AuthStrategy`         | `"bearer" \| "apiKey" \| "basic" \| "custom" \| "none"`               |

### Error Types

| Type                         | Description                           |
| ---------------------------- | ------------------------------------- |
| `ErrorCategoryType`          | Error category union                  |
| `ErrorSeverityType`          | Error severity union                  |
| `ServerAdapterErrorCodeType` | Error code union                      |
| `ServerAdapterErrorContext`  | Context object for error construction |

---

## Constants

### `ErrorCategory`

```typescript
const ErrorCategory = {
  CONFIG,
  VALIDATION,
  EXECUTION,
  EXTERNAL,
  RATE_LIMIT,
  AUTHENTICATION,
  AUTHORIZATION,
  STREAMING,
  WEBSOCKET,
} as const;
```

### `ErrorSeverity`

```typescript
const ErrorSeverity = {
  LOW,
  MEDIUM,
  HIGH,
  CRITICAL,
} as const;
```

### `ServerAdapterErrorCode`

```typescript
const ServerAdapterErrorCode = {
  INVALID_CONFIG,
  MISSING_DEPENDENCY,
  FRAMEWORK_INIT_FAILED,
  ROUTE_NOT_FOUND,
  ROUTE_CONFLICT,
  INVALID_ROUTE,
  HANDLER_ERROR,
  TIMEOUT,
  MIDDLEWARE_ERROR,
  RATE_LIMIT_EXCEEDED,
  AUTH_REQUIRED,
  AUTH_INVALID,
  FORBIDDEN,
  STREAM_ERROR,
  STREAM_ABORTED,
  WEBSOCKET_ERROR,
  WEBSOCKET_CONNECTION_FAILED,
  VALIDATION_ERROR,
  SCHEMA_ERROR,
  START_FAILED,
  STOP_FAILED,
  ALREADY_RUNNING,
  NOT_RUNNING,
} as const;
```

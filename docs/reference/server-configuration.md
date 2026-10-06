---
title: "Server Configuration Reference [new]"
description: "Complete configuration reference for NeuroLink Server Adapters including CORS, rate limiting, body parsing, logging, and middleware options."
---

# Server Adapter Configuration Reference

This document provides a comprehensive reference for all configuration options available in NeuroLink Server Adapters.

## Configuration via CLI

In addition to programmatic configuration, NeuroLink provides CLI commands to view and manage server settings.

### Viewing Configuration

```bash
# Show all configuration
neurolink server config

# Output as JSON
neurolink server config --format json

# Get specific value
neurolink server config --get defaultPort
neurolink server config --get cors.enabled
neurolink server config --get rateLimit.maxRequests
```

### Modifying Configuration

```bash
# Set configuration values
neurolink server config --set defaultPort=8080
neurolink server config --set defaultFramework=express
neurolink server config --set cors.enabled=true
neurolink server config --set rateLimit.maxRequests=200

# Reset to defaults
neurolink server config --reset
```

### Configuration File Location

CLI configuration is stored at:

- **Config file:** `~/.neurolink/server-config.json`
- **Server state:** `~/.neurolink/server-state.json`

### CLI vs Programmatic Configuration

| Aspect      | CLI Config                    | Programmatic Config              |
| ----------- | ----------------------------- | -------------------------------- |
| Persistence | File-based, survives restarts | In-memory, per-instance          |
| Scope       | Global defaults               | Per-server instance              |
| Use Case    | Development, quick changes    | Production, fine-grained control |

### Running `neurolink serve` as a Service

`neurolink serve` resolves each setting from, in order: its command-line flag, the
`--config` JSON file, then the built-in default. The listen port additionally
reads the `PORT` environment variable after the config file, which is what
container platforms set:

| Setting   | Order                                                 |
| --------- | ----------------------------------------------------- |
| Port      | `--port` → config `port` → `$PORT` → `3000`           |
| Host      | `--host` → config `host` → `0.0.0.0`                  |
| Framework | `--framework` → config `framework` → `hono`           |
| Base path | `--basePath` → config `basePath` → `/api`             |
| CORS      | `--cors` → config `cors.enabled` → enabled            |
| Rate      | `--rate-limit` → config `rateLimit.maxRequests` → 100 |

**API key.** Set `NEUROLINK_SERVER_API_KEY` to one key, or several separated by
commas for rotation, and every route except `<basePath>/health*` requires one,
sent as `Authorization: Bearer <key>` or `X-API-Key: <key>`. Rejected requests get
`401`. Without the variable the server is unauthenticated — keep it on a private
network — and the startup banner says so. `neurolink server start` reads the
same variable.

```bash
NEUROLINK_SERVER_API_KEY=change-me PORT=8080 neurolink serve
curl -H "Authorization: Bearer change-me" http://localhost:8080/api/agent/providers
```

**Container image.** The repository's `Dockerfile` builds an image that runs
`neurolink serve` as a non-root user, configured by environment only:

```bash
docker build --target production -t neurolink .
docker run -p 3000:3000 \
  -e NEUROLINK_SERVER_API_KEY=change-me \
  -e OPENAI_API_KEY=sk-... \
  neurolink
```

Use `GET /api/health/live` for the liveness probe and `GET /api/health/ready` for
readiness; both stay open when an API key is set. `SIGTERM` drains and exits `0`.

The CLI configuration provides default values that can be overridden programmatically:

```typescript
// CLI defaults are used when not specified
const server = await createServer(neurolink, {
  framework: "hono", // Overrides CLI default
  // port uses CLI default if not specified
});
```

## ServerAdapterConfig

The main configuration object for server adapters.

```typescript
type ServerAdapterConfig = {
  port?: number;
  host?: string;
  basePath?: string;
  cors?: CORSConfig;
  rateLimit?: RateLimitConfig;
  bodyParser?: BodyParserConfig;
  logging?: LoggingConfig;
  shutdown?: ShutdownConfig;
  redaction?: RedactionConfig;
  timeout?: number;
  enableMetrics?: boolean;
  enableSwagger?: boolean;
  disableBuiltInHealth?: boolean;
};
```

### Core Options

| Option                 | Type      | Default     | Description                                      |
| ---------------------- | --------- | ----------- | ------------------------------------------------ |
| `port`                 | `number`  | `3000`      | Server port to listen on                         |
| `host`                 | `string`  | `"0.0.0.0"` | Server host/interface to bind                    |
| `basePath`             | `string`  | `"/api"`    | Base path prefix for all routes                  |
| `timeout`              | `number`  | `30000`     | Request timeout in milliseconds                  |
| `enableMetrics`        | `boolean` | `true`      | Enable metrics endpoint                          |
| `enableSwagger`        | `boolean` | `false`     | Enable OpenAPI/Swagger documentation (see below) |
| `disableBuiltInHealth` | `boolean` | `false`     | Disable built-in health routes                   |

### OpenAPI/Swagger Documentation (`enableSwagger`)

When `enableSwagger` is set to `true`, the server exposes interactive API documentation endpoints:

| Endpoint                      | Description                              |
| ----------------------------- | ---------------------------------------- |
| `GET {basePath}/openapi.json` | OpenAPI 3.1 specification in JSON format |
| `GET {basePath}/openapi.yaml` | OpenAPI 3.1 specification in YAML format |
| `GET {basePath}/docs`         | Interactive Swagger UI documentation     |

**Example URLs (with default basePath `/api`):**

- `http://localhost:3000/api/openapi.json`
- `http://localhost:3000/api/openapi.yaml`
- `http://localhost:3000/api/docs`

The Swagger UI provides an interactive interface where you can:

- Browse all available API endpoints
- View request/response schemas
- Test API calls directly from the browser
- Download the OpenAPI specification

> **Security Consideration:** In production environments, consider disabling `enableSwagger` to prevent exposing internal API structure. Alternatively, protect the documentation endpoints with authentication middleware.

### Example: Basic Configuration

```typescript
import { createServer } from "@juspay/neurolink";

const server = await createServer(neurolink, {
  config: {
    port: 8080,
    host: "127.0.0.1",
    basePath: "/v1/api",
    timeout: 60000,
    enableSwagger: true,
  },
});
```

## CORS Configuration

```typescript
type CORSConfig = {
  enabled?: boolean;
  origins?: string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
  maxAge?: number;
};
```

| Option        | Type       | Default                                                | Description                        |
| ------------- | ---------- | ------------------------------------------------------ | ---------------------------------- |
| `enabled`     | `boolean`  | `true`                                                 | Enable CORS support                |
| `origins`     | `string[]` | `[]`                                                   | Allowed origins (`["*"]` = any)    |
| `methods`     | `string[]` | `["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]` | Allowed HTTP methods               |
| `headers`     | `string[]` | `["Content-Type", "Authorization"]`                    | Allowed headers                    |
| `credentials` | `boolean`  | `false`                                                | Allow credentials                  |
| `maxAge`      | `number`   | `86400`                                                | Preflight cache max age in seconds |

> **Security note:** With no `origins` listed, no web page can call the server cross-origin. List the origins you serve pages from, or set `["*"]` explicitly to allow any domain (then also set an API key). `neurolink serve --cors-origin https://myapp.com` does the same from the command line.

### Example: Restrictive CORS

```typescript
const server = await createServer(neurolink, {
  config: {
    cors: {
      enabled: true,
      origins: ["https://myapp.com", "https://staging.myapp.com"],
      methods: ["GET", "POST"],
      headers: ["Content-Type", "Authorization", "X-Request-ID"],
      credentials: true,
      maxAge: 3600,
    },
  },
});
```

## Rate Limit Configuration

```typescript
type RateLimitConfig = {
  enabled?: boolean;
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  skipPaths?: string[];
  keyGenerator?: (ctx: ServerContext) => string;
};
```

| Option         | Type       | Default                  | Description                                |
| -------------- | ---------- | ------------------------ | ------------------------------------------ |
| `enabled`      | `boolean`  | `true`                   | Enable rate limiting                       |
| `windowMs`     | `number`   | `900000` (15 min)        | Time window in milliseconds                |
| `maxRequests`  | `number`   | `100`                    | Maximum requests per window                |
| `message`      | `string`   | `"Too many requests..."` | Error message when limit exceeded          |
| `skipPaths`    | `string[]` | `[]`                     | Paths to exclude from rate limiting        |
| `keyGenerator` | `function` | IP-based                 | Custom function to generate rate limit key |

### Example: Custom Rate Limiting

```typescript
const server = await createServer(neurolink, {
  config: {
    rateLimit: {
      enabled: true,
      windowMs: 60000, // 1 minute
      maxRequests: 30,
      skipPaths: ["/api/health", "/api/ready", "/api/version"],
      keyGenerator: (ctx) => {
        // Rate limit by API key instead of IP
        return (
          ctx.headers["x-api-key"] ||
          ctx.headers["x-forwarded-for"] ||
          "unknown"
        );
      },
    },
  },
});
```

## Body Parser Configuration

```typescript
type BodyParserConfig = {
  enabled?: boolean;
  maxSize?: string;
  jsonLimit?: string;
  urlEncoded?: boolean;
};
```

| Option       | Type      | Default  | Description                     |
| ------------ | --------- | -------- | ------------------------------- |
| `enabled`    | `boolean` | `true`   | Enable body parsing             |
| `maxSize`    | `string`  | `"10mb"` | Maximum body size               |
| `jsonLimit`  | `string`  | `"10mb"` | JSON body size limit            |
| `urlEncoded` | `boolean` | `true`   | Enable URL-encoded body parsing |

### Example: Large Payload Support

```typescript
const server = await createServer(neurolink, {
  config: {
    bodyParser: {
      enabled: true,
      maxSize: "50mb",
      jsonLimit: "50mb",
      urlEncoded: true,
    },
  },
});
```

## Logging Configuration

```typescript
type LoggingConfig = {
  enabled?: boolean;
  level?: "debug" | "info" | "warn" | "error";
  includeBody?: boolean;
  includeResponse?: boolean;
};
```

| Option            | Type      | Default  | Description                   |
| ----------------- | --------- | -------- | ----------------------------- |
| `enabled`         | `boolean` | `true`   | Enable request logging        |
| `level`           | `string`  | `"info"` | Log level                     |
| `includeBody`     | `boolean` | `false`  | Include request body in logs  |
| `includeResponse` | `boolean` | `false`  | Include response body in logs |

### Example: Debug Logging

```typescript
const server = await createServer(neurolink, {
  config: {
    logging: {
      enabled: true,
      level: "debug",
      includeBody: true,
      includeResponse: true,
    },
  },
});
```

## Shutdown Configuration

```typescript
type ShutdownConfig = {
  gracefulShutdownTimeoutMs?: number;
  drainTimeoutMs?: number;
  forceClose?: boolean;
};
```

| Option                      | Type      | Default | Description                                         |
| --------------------------- | --------- | ------- | --------------------------------------------------- |
| `gracefulShutdownTimeoutMs` | `number`  | `30000` | Maximum time to wait for graceful shutdown (30 sec) |
| `drainTimeoutMs`            | `number`  | `15000` | Time to drain existing connections (15 sec)         |
| `forceClose`                | `boolean` | `true`  | Force close connections after timeout               |

### Example: Custom Shutdown Timeouts

```typescript
const server = await createServer(neurolink, {
  config: {
    shutdown: {
      gracefulShutdownTimeoutMs: 60000, // 60 seconds for long-running requests
      drainTimeoutMs: 30000, // 30 seconds to drain connections
      forceClose: true, // Force close after timeout
    },
  },
});
```

## Redaction Configuration

The redaction system provides automatic sanitization of sensitive data in logs and responses. This feature is **opt-in** and must be explicitly enabled.

```typescript
type RedactionConfig = {
  enabled?: boolean;
  additionalFields?: string[];
  preserveFields?: string[];
  redactToolArgs?: boolean;
  redactToolResults?: boolean;
  placeholder?: string;
};
```

| Option              | Type       | Default        | Description                          |
| ------------------- | ---------- | -------------- | ------------------------------------ |
| `enabled`           | `boolean`  | `false`        | Enable redaction (opt-in)            |
| `additionalFields`  | `string[]` | `[]`           | Extra field names to redact          |
| `preserveFields`    | `string[]` | `[]`           | Fields to exclude from redaction     |
| `redactToolArgs`    | `boolean`  | `true`         | Redact tool arguments (when enabled) |
| `redactToolResults` | `boolean`  | `true`         | Redact tool results (when enabled)   |
| `placeholder`       | `string`   | `"[REDACTED]"` | Replacement text for redacted values |

### Default Redacted Fields

When redaction is enabled, the following fields are redacted by default:

- `apiKey`
- `token`
- `authorization`
- `credentials`
- `password`
- `secret`
- `request`
- `args`
- `result`

### Example: Custom Redaction

```typescript
const server = await createServer(neurolink, {
  config: {
    redaction: {
      enabled: true,
      additionalFields: ["ssn", "creditCard", "bankAccount"],
      preserveFields: ["request"], // Allow 'request' field to pass through
      redactToolArgs: true,
      redactToolResults: false, // Keep tool results visible
      placeholder: "***",
    },
  },
});
```

### Example: Minimal Redaction

```typescript
const server = await createServer(neurolink, {
  config: {
    redaction: {
      enabled: true,
      // Uses all defaults - redacts apiKey, token, password, etc.
    },
  },
});
```

## Middleware Configuration

### Authentication Middleware

```typescript
import { createAuthMiddleware } from "@juspay/neurolink";

const authMiddleware = createAuthMiddleware({
  type: "bearer", // 'bearer' | 'api-key' | 'basic' | 'custom'
  validate: async (token, ctx) => {
    // Return user info or null
    const user = await verifyJWT(token);
    return user ? { id: user.id, email: user.email, roles: user.roles } : null;
  },
  headerName: "Authorization", // Optional: custom header name
  skipPaths: ["/api/health", "/api/ready"],
  errorMessage: "Invalid authentication token",
});

server.registerMiddleware(authMiddleware);
```

#### Auth Types

| Type      | Header Format                   | Description                 |
| --------- | ------------------------------- | --------------------------- |
| `bearer`  | `Authorization: Bearer <token>` | JWT/OAuth token             |
| `api-key` | `X-API-Key: <key>`              | API key authentication      |
| `basic`   | `Authorization: Basic <base64>` | HTTP Basic auth             |
| `custom`  | Custom                          | Use `extractToken` function |

### Rate Limit Middleware

```typescript
import {
  createRateLimitMiddleware,
  createSlidingWindowRateLimitMiddleware,
} from "@juspay/neurolink";

// Fixed window rate limiter
const rateLimiter = createRateLimitMiddleware({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000,
  skipPaths: ["/api/health"],
});

// Sliding window rate limiter (more accurate)
const slidingRateLimiter = createSlidingWindowRateLimitMiddleware({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000,
  subWindows: 10, // Number of sub-windows for smoothing
});

server.registerMiddleware(rateLimiter);
```

### Cache Middleware

```typescript
import { createCacheMiddleware, InMemoryCacheStore } from "@juspay/neurolink";

const cacheMiddleware = createCacheMiddleware({
  ttlMs: 60 * 1000, // 1 minute cache
  maxSize: 1000, // Max cached entries
  methods: ["GET"], // Only cache GET requests
  excludePaths: ["/api/agent/execute", "/api/agent/stream"],
  includeQuery: true, // Include query params in cache key
  ttlByPath: {
    "/api/tools": 5 * 60 * 1000, // 5 minutes for tools
    "/api/version": 60 * 60 * 1000, // 1 hour for version
  },
});

server.registerMiddleware(cacheMiddleware);
```

### Cache Response Headers

The cache middleware adds these headers to responses:

| Header          | Description                   | Example         |
| --------------- | ----------------------------- | --------------- |
| `X-Cache`       | Cache status                  | `HIT` or `MISS` |
| `X-Cache-Age`   | Seconds since cached (on HIT) | `45`            |
| `Cache-Control` | Caching directive (on MISS)   | `max-age=300`   |

### Validation Middleware

```typescript
import {
  createRequestValidationMiddleware,
  createFieldValidator,
} from "@juspay/neurolink";

// JSON Schema validation
const validationMiddleware = createRequestValidationMiddleware({
  body: {
    type: "object",
    properties: {
      input: { type: "string", minLength: 1 },
      provider: { type: "string" },
    },
    required: ["input"],
  },
});

// Field-level validation
const fieldValidator = createFieldValidator({
  required: ["name", "email"],
  types: { name: "string", email: "string", age: "number" },
  validators: {
    email: (value) => typeof value === "string" && value.includes("@"),
    age: (value) => typeof value === "number" && value >= 0,
  },
});

server.registerMiddleware(validationMiddleware);
```

### Role-Based Access Control

```typescript
import { createRoleMiddleware } from "@juspay/neurolink";

// Require any of the specified roles
const adminMiddleware = createRoleMiddleware({
  requiredRoles: ["admin", "superuser"],
  requireAll: false, // Any role matches
  errorMessage: "Admin access required",
});

// Require all specified roles
const superAdminMiddleware = createRoleMiddleware({
  requiredRoles: ["admin", "superuser"],
  requireAll: true, // All roles required
});
```

## Framework-Specific Options

### Hono

```typescript
import { ServerAdapterFactory } from "@juspay/neurolink";

const server = await ServerAdapterFactory.createHono(neurolink, {
  port: 3000,
  // Hono uses @hono/node-server under the hood
});
```

For more details, see the [Hono Guide](../guides/server-adapters/hono.md).

### Express

```typescript
const server = await ServerAdapterFactory.createExpress(neurolink, {
  port: 3000,
  // Express-specific middleware can be added via getFrameworkInstance()
});

const app = server.getFrameworkInstance();
app.use(customExpressMiddleware);
```

For more details, see the [Express Guide](../guides/server-adapters/express.md).

### Fastify

```typescript
const server = await ServerAdapterFactory.createFastify(neurolink, {
  port: 3000,
  // Fastify plugins can be registered on the instance
});

const fastify = server.getFrameworkInstance();
await fastify.register(customFastifyPlugin);
```

For more details, see the [Fastify Guide](../guides/server-adapters/fastify.md).

### Koa

```typescript
const server = await ServerAdapterFactory.createKoa(neurolink, {
  port: 3000,
  // Koa middleware can be added via getFrameworkInstance()
});

const app = server.getFrameworkInstance();
app.use(customKoaMiddleware);
```

For more details, see the [Koa Guide](../guides/server-adapters/koa.md).

## Complete Configuration Example

```typescript
import {
  createServer,
  createAuthMiddleware,
  createRateLimitMiddleware,
  createCacheMiddleware,
} from "@juspay/neurolink";
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  defaultProvider: "openai",
});

const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: 8080,
    host: "0.0.0.0",
    basePath: "/v1",
    timeout: 120000,
    enableSwagger: true,
    cors: {
      enabled: true,
      origins: ["https://app.example.com"],
      credentials: true,
    },
    rateLimit: {
      enabled: true,
      maxRequests: 1000,
      windowMs: 3600000,
    },
    bodyParser: {
      maxSize: "25mb",
    },
    logging: {
      level: "info",
    },
  },
});

// Add custom middleware
server.registerMiddleware(
  createAuthMiddleware({
    type: "bearer",
    validate: async (token) => verifyToken(token),
    skipPaths: ["/v1/health", "/v1/ready"],
  }),
);

server.registerMiddleware(
  createCacheMiddleware({
    ttlMs: 300000,
    methods: ["GET"],
  }),
);

// Start server
await server.start();
console.log(`Server running on http://localhost:8080`);
```

## Environment Variables

The server adapters respect these environment variables:

| Variable              | Description                           | Default       |
| --------------------- | ------------------------------------- | ------------- |
| `PORT`                | Server port                           | `3000`        |
| `HOST`                | Server host                           | `0.0.0.0`     |
| `NODE_ENV`            | Environment mode                      | `development` |
| `npm_package_version` | Package version (for health endpoint) | `unknown`     |

## Configuration Validation

Invalid configuration will throw errors at initialization:

```typescript
// This will throw: "Invalid port number"
const server = await createServer(neurolink, {
  config: { port: -1 },
});

// This will throw: "Invalid rate limit configuration"
const server = await createServer(neurolink, {
  config: { rateLimit: { maxRequests: -100 } },
});
```

Always validate your configuration in development before deploying to production.

## API Endpoints

The server adapters expose the following endpoints (all prefixed with `basePath`, default `/api`):

### Health Endpoints

| Method | Endpoint   | Description         |
| ------ | ---------- | ------------------- |
| GET    | `/health`  | Basic health check  |
| GET    | `/ready`   | Readiness probe     |
| GET    | `/live`    | Liveness probe      |
| GET    | `/version` | Version information |

### Agent Endpoints

| Method | Endpoint         | Description              |
| ------ | ---------------- | ------------------------ |
| POST   | `/agent/execute` | Execute agent with input |
| POST   | `/agent/stream`  | Stream agent response    |

### Tool Endpoints

| Method | Endpoint       | Description             |
| ------ | -------------- | ----------------------- |
| GET    | `/tools`       | List available tools    |
| POST   | `/tools/:name` | Execute a specific tool |
| GET    | `/tools/:name` | Get tool metadata       |

### MCP Endpoints

| Method | Endpoint       | Description                |
| ------ | -------------- | -------------------------- |
| GET    | `/mcp/servers` | List MCP servers           |
| POST   | `/mcp/execute` | Execute MCP tool           |
| GET    | `/mcp/health`  | MCP subsystem health check |

### Memory Endpoints

| Method | Endpoint               | Description                   |
| ------ | ---------------------- | ----------------------------- |
| GET    | `/memory/sessions`     | List memory sessions          |
| GET    | `/memory/sessions/:id` | Get session details           |
| DELETE | `/memory/sessions/:id` | Delete a session              |
| DELETE | `/memory/sessions`     | Clear all sessions            |
| GET    | `/memory/health`       | Memory subsystem health check |

### OpenAPI Endpoints (when `enableSwagger: true`)

| Method | Endpoint        | Description             |
| ------ | --------------- | ----------------------- |
| GET    | `/openapi.json` | OpenAPI 3.1 spec (JSON) |
| GET    | `/openapi.yaml` | OpenAPI 3.1 spec (YAML) |
| GET    | `/docs`         | Swagger UI              |

## Lifecycle Management

Server adapters implement a comprehensive lifecycle management system that enables graceful startup, connection tracking, and orderly shutdown. Understanding the lifecycle is essential for production deployments.

### Lifecycle States

The server adapter progresses through 9 distinct lifecycle states:

| State           | Description                                          |
| --------------- | ---------------------------------------------------- |
| `uninitialized` | Initial state before `initialize()` is called        |
| `initializing`  | Framework and routes are being set up                |
| `initialized`   | Setup complete, ready to start                       |
| `starting`      | Server is binding to port and preparing to listen    |
| `running`       | Server is actively accepting and processing requests |
| `draining`      | No new connections accepted, existing ones finishing |
| `stopping`      | Server is closing after connections drained          |
| `stopped`       | Server has completely shut down                      |
| `error`         | An error occurred during any state transition        |

### State Transition Diagram

```
                    ┌─────────────────┐
                    │  uninitialized  │◄──────────────────────────────────┐
                    └────────┬────────┘                                   │
                             │ initialize()                               │
                             ▼                                            │
                    ┌─────────────────┐                                   │
                    │  initializing   │                                   │
                    └────────┬────────┘                                   │
                             │ success                                    │
                             ▼                                            │
                    ┌─────────────────┐                                   │
                    │  initialized    │◄──────────────────────────────────┤
                    └────────┬────────┘                                   │
                             │ start()                                    │
                             ▼                                            │
                    ┌─────────────────┐                                   │
                    │    starting     │                                   │
                    └────────┬────────┘                                   │
                             │ bound to port                              │
                             ▼                                            │
                    ┌─────────────────┐                                   │
                    │    running      │                                   │
                    └────────┬────────┘                                   │
                             │ stop()                                     │
                             ▼                                            │
                    ┌─────────────────┐                                   │
                    │    draining     │──── drain timeout ────┐           │
                    └────────┬────────┘                       │           │
                             │ connections drained            │           │
                             ▼                                ▼           │
                    ┌─────────────────┐              forceClose()         │
                    │    stopping     │◄──────────────────────┘           │
                    └────────┬────────┘                                   │
                             │ server closed                              │
                             ▼                                            │
                    ┌─────────────────┐                                   │
                    │    stopped      │───────────────────────────────────┘
                    └─────────────────┘              (can restart)

Any state ─────────► ┌─────────────────┐
     (on error)      │     error       │
                     └─────────────────┘
```

### Valid State Transitions

| Current State   | Valid Next States                 | Trigger                     |
| --------------- | --------------------------------- | --------------------------- |
| `uninitialized` | `initializing`                    | `initialize()` called       |
| `initializing`  | `initialized`, `error`            | Setup completes or fails    |
| `initialized`   | `starting`                        | `start()` called            |
| `starting`      | `running`, `error`                | Port bound or bind fails    |
| `running`       | `draining`                        | `stop()` called             |
| `draining`      | `stopping`                        | Connections drained/timeout |
| `stopping`      | `stopped`, `error`                | Server closes               |
| `stopped`       | `initializing`                    | `initialize()` for restart  |
| `error`         | (terminal, requires new instance) | N/A                         |

### InvalidLifecycleStateError

Attempting an operation in an invalid state throws `InvalidLifecycleStateError`:

```typescript
import { InvalidLifecycleStateError } from "@juspay/neurolink";

try {
  await server.start(); // Called when already running
} catch (error) {
  if (error instanceof InvalidLifecycleStateError) {
    console.log(`Operation: ${error.operation}`);
    console.log(`Current state: ${error.currentState}`);
    console.log(`Expected states: ${error.expectedStates.join(", ")}`);
  }
}
// Output:
// Operation: start
// Current state: running
// Expected states: initialized, stopped
```

### Querying Lifecycle State

```typescript
// Get current lifecycle state
const state = server.getLifecycleState();
console.log(`Server state: ${state}`);

// Get full server status including lifecycle
const status = server.getStatus();
console.log({
  running: status.running,
  lifecycleState: status.lifecycleState,
  activeConnections: status.activeConnections,
  uptime: status.uptime,
});
```

## Connection Tracking

Server adapters track active connections to enable graceful shutdown. This is essential for ensuring in-flight requests complete before the server stops.

### TrackedConnection Type

```typescript
type TrackedConnection = {
  /** Unique connection identifier */
  id: string;

  /** Timestamp when connection was created */
  createdAt: number;

  /** Underlying socket or connection object */
  socket?: unknown;

  /** Request ID if associated with a request */
  requestId?: string;

  /** Whether the connection is currently processing a request */
  isActive?: boolean;
};
```

### Connection Tracking Methods

Framework adapters use these methods internally to track connections:

```typescript
// Track a new connection (called by adapter implementations)
protected trackConnection(
  id: string,
  socket?: unknown,
  requestId?: string
): void;

// Untrack a connection when completed
protected untrackConnection(id: string): void;

// Get count of active connections (public API)
public getActiveConnectionCount(): number;
```

### Monitoring Active Connections

```typescript
// Check active connections before shutdown
const activeCount = server.getActiveConnectionCount();
console.log(`Active connections: ${activeCount}`);

// Include in health check responses
app.get("/health", (req, res) => {
  const status = server.getStatus();
  res.json({
    status: "ok",
    connections: status.activeConnections,
    lifecycleState: status.lifecycleState,
  });
});
```

## Graceful Shutdown

Graceful shutdown ensures all in-flight requests complete before the server stops, preventing data loss and providing a better user experience.

### Shutdown Process

When `stop()` is called, the server follows this sequence:

1. **Stop Accepting Connections**
   - Server stops accepting new connections
   - New requests receive connection refused
   - State transitions to `draining`

2. **Drain Existing Connections**
   - Wait for in-flight requests to complete
   - Monitor `activeConnections` count
   - Timeout after `drainTimeoutMs`

3. **Handle Drain Timeout**
   - If connections remain after `drainTimeoutMs`:
     - If `forceClose: true`, forcibly close all connections
     - If `forceClose: false`, throw `DrainTimeoutError`

4. **Close Server**
   - Close the underlying server
   - State transitions to `stopping`, then `stopped`
   - Overall timeout enforced by `gracefulShutdownTimeoutMs`

### Shutdown Configuration Options

| Option                      | Type      | Default | Description                                                           |
| --------------------------- | --------- | ------- | --------------------------------------------------------------------- |
| `gracefulShutdownTimeoutMs` | `number`  | `30000` | Maximum total shutdown duration                                       |
| `drainTimeoutMs`            | `number`  | `15000` | Maximum time to wait for connections to complete                      |
| `forceClose`                | `boolean` | `true`  | If `true`, forcibly closes connections after `drainTimeoutMs` expires |

### Shutdown Example

```typescript
import { createServer } from "@juspay/neurolink";
import { ShutdownTimeoutError, DrainTimeoutError } from "@juspay/neurolink";

const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: 3000,
    shutdown: {
      gracefulShutdownTimeoutMs: 30000,
      drainTimeoutMs: 15000,
      forceClose: true,
    },
  },
});

await server.initialize();
await server.start();

// Handle shutdown signals
async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, starting graceful shutdown...`);
  console.log(`Active connections: ${server.getActiveConnectionCount()}`);

  try {
    await server.stop();
    console.log("Server stopped gracefully");
    process.exit(0);
  } catch (error) {
    if (error instanceof ShutdownTimeoutError) {
      console.error(
        `Shutdown timed out with ${error.remainingConnections} connections`,
      );
    } else if (error instanceof DrainTimeoutError) {
      console.error(
        `Drain timed out with ${error.remainingConnections} connections`,
      );
    } else {
      console.error("Shutdown error:", error);
    }
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

### Kubernetes Graceful Shutdown

For Kubernetes deployments, configure appropriate timeouts:

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: 3000,
    shutdown: {
      // Should be less than Kubernetes terminationGracePeriodSeconds
      gracefulShutdownTimeoutMs: 25000,
      drainTimeoutMs: 20000,
      forceClose: true,
    },
  },
});
```

In your Kubernetes deployment:

```yaml
spec:
  terminationGracePeriodSeconds: 30 # Must be > gracefulShutdownTimeoutMs
  containers:
    - name: api
      lifecycle:
        preStop:
          exec:
            command: ["/bin/sh", "-c", "sleep 5"] # Allow load balancer to drain
```

### Shutdown Errors

| Error                        | Description                                              | Handling                                        |
| ---------------------------- | -------------------------------------------------------- | ----------------------------------------------- |
| `ShutdownTimeoutError`       | Overall shutdown exceeded `gracefulShutdownTimeoutMs`    | Force close was attempted if `forceClose: true` |
| `DrainTimeoutError`          | Drain exceeded `drainTimeoutMs` with `forceClose: false` | Connections remain open                         |
| `InvalidLifecycleStateError` | Called `stop()` when not in `running` state              | Server was not running                          |

## Server Events

Server adapters emit events at key lifecycle points. Subscribe to these events for monitoring, logging, and custom behaviors.

### Available Events

```typescript
type ServerAdapterEvents = {
  /** Emitted when server initialization completes */
  initialized: {
    config: ServerAdapterConfig;
    routeCount: number;
    middlewareCount: number;
  };

  /** Emitted when server starts listening */
  started: {
    port: number;
    host: string;
    timestamp: Date;
  };

  /** Emitted when server stops */
  stopped: {
    uptime: number;
    timestamp: Date;
  };

  /** Emitted for each incoming request */
  request: {
    requestId: string;
    method: string;
    path: string;
    timestamp: Date;
  };

  /** Emitted for each outgoing response */
  response: {
    requestId: string;
    statusCode: number;
    duration: number;
    timestamp: Date;
  };

  /** Emitted when an error occurs */
  error: {
    requestId?: string;
    error: Error;
    timestamp: Date;
  };
};
```

### Subscribing to Events

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: { port: 3000 },
});

// Lifecycle events
server.on("initialized", (event) => {
  console.log(`Server initialized with ${event.routeCount} routes`);
});

server.on("started", (event) => {
  console.log(`Server started on ${event.host}:${event.port}`);
});

server.on("stopped", (event) => {
  console.log(`Server stopped after ${event.uptime}ms uptime`);
});

// Request/response events for monitoring
server.on("request", (event) => {
  console.log(`[${event.requestId}] ${event.method} ${event.path}`);
});

server.on("response", (event) => {
  console.log(
    `[${event.requestId}] ${event.statusCode} in ${event.duration}ms`,
  );
});

// Error tracking
server.on("error", (event) => {
  console.error(`[${event.requestId ?? "unknown"}] Error:`, event.error);
});

await server.initialize();
await server.start();
```

### Event-Based Metrics Collection

```typescript
import { createServer } from "@juspay/neurolink";

const metrics = {
  requests: 0,
  responses: 0,
  errors: 0,
  totalDuration: 0,
};

const server = await createServer(neurolink, {
  framework: "hono",
  config: { port: 3000 },
});

server.on("request", () => {
  metrics.requests++;
});

server.on("response", (event) => {
  metrics.responses++;
  metrics.totalDuration += event.duration;
});

server.on("error", () => {
  metrics.errors++;
});

// Expose metrics endpoint
server.registerRoute({
  method: "GET",
  path: "/metrics/custom",
  handler: async () => ({
    requests: metrics.requests,
    responses: metrics.responses,
    errors: metrics.errors,
    avgDuration:
      metrics.responses > 0 ? metrics.totalDuration / metrics.responses : 0,
    activeConnections: server.getActiveConnectionCount(),
    lifecycleState: server.getLifecycleState(),
  }),
  description: "Custom application metrics",
  tags: ["monitoring"],
});
```

## OpenAPI Customization

NeuroLink includes a powerful OpenAPI 3.1 specification generator that creates comprehensive API documentation from your server routes. This section covers how to customize the generated OpenAPI specification.

### OpenAPIGenerator Class

The `OpenAPIGenerator` class is the core component for generating OpenAPI specifications.

```typescript
import { OpenAPIGenerator } from "@juspay/neurolink";

const generator = new OpenAPIGenerator({
  // Customize API info
  info: {
    title: "My Custom API",
    version: "2.0.0",
    description: "Custom API description",
  },
  // Server configuration
  servers: [
    { url: "https://api.example.com", description: "Production" },
    { url: "https://staging-api.example.com", description: "Staging" },
  ],
  // Base path for all routes
  basePath: "/v2",
  // Include security schemes in the spec
  includeSecurity: true,
  // Add custom tags
  additionalTags: [
    { name: "custom", description: "Custom endpoints" },
    { name: "analytics", description: "Analytics and reporting" },
  ],
  // Add custom schemas
  customSchemas: {
    CustomRequest: {
      type: "object",
      properties: {
        customField: { type: "string" },
      },
    },
  },
  // Pass routes to document
  routes: myRouteDefinitions,
});

// Generate the specification
const spec = generator.generate();

// Export as JSON or YAML
const jsonSpec = generator.toJSON(true); // pretty-printed
const yamlSpec = generator.toYAML();
```

#### Constructor Options

| Option            | Type      | Default | Description                                     |
| ----------------- | --------- | ------- | ----------------------------------------------- |
| `info`            | `object`  | -       | Override API info (title, version, description) |
| `servers`         | `array`   | -       | Custom server URLs                              |
| `basePath`        | `string`  | `/api`  | Base path for all routes                        |
| `includeSecurity` | `boolean` | `true`  | Include security schemes                        |
| `additionalTags`  | `array`   | `[]`    | Extra API tags                                  |
| `customSchemas`   | `object`  | `{}`    | Custom JSON schemas to add                      |
| `routes`          | `array`   | `[]`    | Route definitions to document                   |

#### Generator Methods

```typescript
// Add routes after initialization
generator.addRoutes(routeArray);
generator.addRoute(singleRoute);

// Generate the OpenAPI spec
const spec = generator.generate();

// Export formats
const json = generator.toJSON(true); // pretty-printed JSON
const yaml = generator.toYAML(); // YAML format
```

### Built-in Schemas

NeuroLink provides pre-defined JSON schemas for common API types.

#### Error and Response Schemas

```typescript
import { ErrorResponseSchema, TokenUsageSchema } from "@juspay/neurolink";

// ErrorResponseSchema
// - error.code (string): Error code identifier
// - error.message (string): Human-readable error message
// - error.details (object): Additional error details
// - metadata.timestamp (date-time): Error timestamp
// - metadata.requestId (string): Request identifier

// TokenUsageSchema
// - input (integer): Input/prompt tokens
// - output (integer): Output/completion tokens
// - total (integer): Total tokens used
// - cacheCreationTokens (integer): Tokens for cache creation
// - cacheReadTokens (integer): Tokens read from cache
// - reasoning (integer): Tokens used for reasoning
// - cacheSavingsPercent (number): Cache savings percentage
```

#### Agent Schemas

```typescript
import {
  AgentExecuteRequestSchema,
  AgentExecuteResponseSchema,
  AgentInputSchema,
  ProviderInfoSchema,
} from "@juspay/neurolink";

// AgentExecuteRequestSchema
// - input (string | object): Agent input
// - provider (string): AI provider to use
// - model (string): Specific model
// - systemPrompt (string): System prompt
// - temperature (number): Sampling temperature (0-2)
// - maxTokens (integer): Maximum tokens to generate
// - tools (string[]): Tool names to enable
// - stream (boolean): Enable streaming
// - sessionId (string): Session ID for memory
// - userId (string): User ID for context

// AgentExecuteResponseSchema
// - content (string): Generated text content
// - provider (string): Provider used
// - model (string): Model used
// - usage (TokenUsage): Token usage
// - toolCalls (array): Tool calls made
// - finishReason (string): Completion reason
```

#### Tool Schemas

```typescript
import {
  ToolDefinitionSchema,
  ToolExecuteRequestSchema,
  ToolExecuteResponseSchema,
  ToolListResponseSchema,
  ToolParameterSchema,
} from "@juspay/neurolink";

// ToolDefinitionSchema
// - name (string): Tool name
// - description (string): Tool description
// - source (string): Tool source (builtin, external, custom)
// - parameters (object): Tool parameters schema

// ToolExecuteRequestSchema
// - name (string): Tool name to execute
// - arguments (object): Tool arguments
// - sessionId (string): Session context
// - userId (string): User context

// ToolExecuteResponseSchema
// - success (boolean): Execution success
// - data: Result data
// - error (string): Error message if failed
// - duration (number): Execution duration in ms
```

#### MCP Server Schemas

```typescript
import {
  MCPServerStatusSchema,
  MCPServersListResponseSchema,
  MCPServerToolSchema,
} from "@juspay/neurolink";

// MCPServerStatusSchema
// - serverId (string): Server ID
// - name (string): Server name
// - status (string): connected | disconnected | error | connecting
// - toolCount (integer): Number of available tools
// - lastHealthCheck (date-time): Last health check timestamp
// - error (string): Error message if in error state
```

#### Health Schemas

```typescript
import {
  HealthResponseSchema,
  ReadyResponseSchema,
  MetricsResponseSchema,
} from "@juspay/neurolink";

// HealthResponseSchema
// - status (string): ok | degraded | unhealthy
// - timestamp (date-time): Check timestamp
// - uptime (integer): Server uptime in ms
// - version (string): Server version

// ReadyResponseSchema
// - ready (boolean): Overall readiness
// - timestamp (date-time): Check timestamp
// - services.neurolink (boolean): SDK status
// - services.tools (boolean): Tool registry status
// - services.externalServers (boolean): MCP servers status
```

### Template Functions

The OpenAPI module provides template functions for creating operations and parameters.

#### Operation Templates

```typescript
import {
  createGetOperation,
  createPostOperation,
  createStreamingPostOperation,
  createDeleteOperation,
} from "@juspay/neurolink";

// GET operation
const getOp = createGetOperation(
  "List users", // summary
  "Get all users in the system", // description
  ["users"], // tags
  "UserListResponse", // response schema reference
  [limitParam, offsetParam], // optional parameters
);

// POST operation
const postOp = createPostOperation(
  "Create user", // summary
  "Create a new user", // description
  ["users"], // tags
  "CreateUserRequest", // request schema reference
  "UserResponse", // response schema reference
  [authHeader], // optional parameters
);

// Streaming POST operation
const streamOp = createStreamingPostOperation(
  "Stream data", // summary
  "Stream data via SSE", // description
  ["streaming"], // tags
  "StreamRequest", // request schema reference
);

// DELETE operation
const deleteOp = createDeleteOperation(
  "Delete user", // summary
  "Delete a user by ID", // description
  ["users"], // tags
  [userIdParam], // parameters
);
```

#### Parameter Templates

```typescript
import {
  createPathParameter,
  createQueryParameter,
  createHeaderParameter,
  CommonParameters,
} from "@juspay/neurolink";

// Path parameter
const userIdParam = createPathParameter(
  "userId", // name
  "User ID", // description
  { type: "string", format: "uuid" }, // schema (optional)
);

// Query parameter
const searchParam = createQueryParameter(
  "q", // name
  "Search query", // description
  { type: "string" }, // schema (optional)
  false, // required (optional, default: false)
);

// Header parameter
const apiKeyHeader = createHeaderParameter(
  "X-API-Key", // name
  "API key for authentication", // description
  true, // required (optional, default: false)
);

// Pre-defined common parameters
const { sessionId, serverName, toolName } = CommonParameters;
const { limitQuery, offsetQuery, searchQuery } = CommonParameters;
const { requestIdHeader, authorizationHeader } = CommonParameters;
```

### Security Schemes

NeuroLink provides pre-defined security schemes for common authentication methods.

```typescript
import {
  BearerSecurityScheme,
  ApiKeySecurityScheme,
  BasicSecurityScheme,
} from "@juspay/neurolink";

// Bearer token (JWT)
// {
//   type: "http",
//   scheme: "bearer",
//   bearerFormat: "JWT",
//   description: "JWT Bearer token authentication"
// }

// API Key (header)
// {
//   type: "apiKey",
//   in: "header",
//   name: "X-API-Key",
//   description: "API key authentication via header"
// }

// Basic auth
// {
//   type: "http",
//   scheme: "basic",
//   description: "HTTP Basic authentication"
// }
```

#### Using Security Schemes

```typescript
const generator = new OpenAPIGenerator({
  includeSecurity: true, // Enables security schemes
});

const spec = generator.generate();
// spec.components.securitySchemes = {
//   bearerAuth: BearerSecurityScheme,
//   apiKeyAuth: ApiKeySecurityScheme
// }
// spec.security = [{ bearerAuth: [] }, { apiKeyAuth: [] }]
```

### Custom Schema Registration

Add custom schemas to extend the built-in types.

```typescript
const generator = new OpenAPIGenerator({
  customSchemas: {
    // Simple custom schema
    MyCustomType: {
      type: "object",
      required: ["id", "name"],
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string", minLength: 1 },
        metadata: { type: "object", additionalProperties: true },
      },
    },

    // Extended schema referencing built-in types
    ExtendedAgentResponse: {
      allOf: [
        { $ref: "#/components/schemas/AgentExecuteResponse" },
        {
          type: "object",
          properties: {
            customField: { type: "string" },
            analytics: { $ref: "#/components/schemas/AnalyticsData" },
          },
        },
      ],
    },

    // Enum schema
    Priority: {
      type: "string",
      enum: ["low", "medium", "high", "critical"],
      description: "Priority level",
    },
  },
});
```

### Complete Customization Example

```typescript
import {
  OpenAPIGenerator,
  createGetOperation,
  createPostOperation,
  createPathParameter,
  createQueryParameter,
  BearerSecurityScheme,
} from "@juspay/neurolink";

// Create generator with full customization
const generator = new OpenAPIGenerator({
  info: {
    title: "Enterprise AI API",
    version: "3.0.0",
    description: `
Enterprise AI API provides secure access to AI capabilities.

## Features
- Multi-model AI generation
- Real-time streaming
- Tool execution
- Conversation memory

## Rate Limits
- Standard: 1000 req/hour
- Enterprise: Unlimited
    `.trim(),
  },

  servers: [
    { url: "https://api.enterprise.com/v3", description: "Production" },
    { url: "https://api.staging.enterprise.com/v3", description: "Staging" },
    { url: "http://localhost:3000/v3", description: "Local Development" },
  ],

  basePath: "/v3",
  includeSecurity: true,

  additionalTags: [
    { name: "analytics", description: "Usage analytics and reporting" },
    { name: "admin", description: "Administrative operations" },
    { name: "webhooks", description: "Webhook management" },
  ],

  customSchemas: {
    // Custom request types
    WebhookConfig: {
      type: "object",
      required: ["url", "events"],
      properties: {
        url: { type: "string", format: "uri" },
        events: {
          type: "array",
          items: { type: "string", enum: ["execute", "error", "complete"] },
        },
        secret: { type: "string", description: "HMAC secret for validation" },
      },
    },

    // Custom response types
    AnalyticsReport: {
      type: "object",
      properties: {
        period: { type: "string" },
        totalRequests: { type: "integer" },
        averageLatency: { type: "number" },
        tokenUsage: { $ref: "#/components/schemas/TokenUsage" },
        topModels: {
          type: "array",
          items: {
            type: "object",
            properties: {
              model: { type: "string" },
              count: { type: "integer" },
            },
          },
        },
      },
    },
  },
});

// Add custom routes
generator.addRoute({
  method: "GET",
  path: "/v3/analytics",
  description: "Get usage analytics for the specified period",
  tags: ["analytics"],
  responseSchema: { $ref: "#/components/schemas/AnalyticsReport" },
  auth: true,
});

generator.addRoute({
  method: "POST",
  path: "/v3/webhooks",
  description: "Register a new webhook endpoint",
  tags: ["webhooks"],
  requestSchema: { $ref: "#/components/schemas/WebhookConfig" },
  responseSchema: {
    type: "object",
    properties: {
      id: { type: "string" },
      status: { type: "string" },
    },
  },
  auth: true,
});

// Generate the specification
const spec = generator.generate();

// Export to file
import { writeFileSync } from "fs";
writeFileSync("openapi.json", generator.toJSON(true));
writeFileSync("openapi.yaml", generator.toYAML());
```

### Factory Functions

For quick OpenAPI generation without instantiating the class:

```typescript
import {
  createOpenAPIGenerator,
  generateOpenAPISpec,
  generateOpenAPIFromConfig,
} from "@juspay/neurolink";

// Create generator with config
const generator = createOpenAPIGenerator({
  basePath: "/api",
  includeSecurity: true,
});

// Generate spec directly from routes
const spec = generateOpenAPISpec(routes, {
  info: { title: "My API", version: "1.0.0" },
});

// Generate from server adapter configuration
const spec = generateOpenAPIFromConfig(serverConfig, routes);
// Automatically uses host/port from serverConfig
```

### All Available Schemas

The `OpenAPISchemas` registry provides access to all built-in schemas:

```typescript
import { OpenAPISchemas } from "@juspay/neurolink";

// Common
OpenAPISchemas.ErrorResponse;
OpenAPISchemas.TokenUsage;

// Agent
OpenAPISchemas.AgentInput;
OpenAPISchemas.AgentExecuteRequest;
OpenAPISchemas.AgentExecuteResponse;
OpenAPISchemas.ToolCall;
OpenAPISchemas.ProviderInfo;

// Tools
OpenAPISchemas.ToolParameter;
OpenAPISchemas.ToolDefinition;
OpenAPISchemas.ToolListResponse;
OpenAPISchemas.ToolExecuteRequest;
OpenAPISchemas.ToolExecuteResponse;

// MCP
OpenAPISchemas.MCPServerTool;
OpenAPISchemas.MCPServerStatus;
OpenAPISchemas.MCPServersListResponse;

// Memory
OpenAPISchemas.ConversationMessage;
OpenAPISchemas.Session;
OpenAPISchemas.SessionsListResponse;

// Health
OpenAPISchemas.HealthResponse;
OpenAPISchemas.ReadyResponse;
OpenAPISchemas.MetricsResponse;
```

## Related Documentation

- [Server Adapters Overview](../guides/server-adapters/index.md) - Introduction to server adapters
- [Security Guide](../guides/server-adapters/security.md) - Security best practices
- [Deployment Guide](../guides/server-adapters/deployment.md) - Deployment strategies and configurations

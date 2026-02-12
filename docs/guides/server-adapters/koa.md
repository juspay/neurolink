---
title: Koa Adapter
sidebar_label: "Koa Adapter"
description: Build clean, middleware-driven AI APIs with Koa and NeuroLink
sidebar_position: 5
keywords: koa, server adapter, middleware, async/await, nodejs, rest api
---

# Koa Adapter

**Modern middleware composition for NeuroLink APIs**

Koa is a minimalist web framework designed by the team behind Express. It leverages async/await for cleaner middleware composition, making it ideal for building elegant, maintainable AI APIs.

---

## Why Koa?

| Feature                | Benefit                                            |
| ---------------------- | -------------------------------------------------- |
| **Async/Await Native** | Clean middleware composition without callback hell |
| **Minimalist Core**    | Only what you need, add features via middleware    |
| **Context Object**     | Encapsulates request/response in a single object   |
| **Modern JavaScript**  | Built for ES2017+ with async functions             |
| **Lightweight**        | Smaller footprint than Express                     |
| **Error Handling**     | Elegant try/catch error handling in middleware     |

Koa is ideal for developers who prefer explicit control over their middleware stack and modern JavaScript patterns.

---

## CLI Usage

Start a Koa server via CLI:

```bash
# Foreground mode
neurolink serve --framework koa --port 3000

# Background mode
neurolink server start --framework koa --port 3000

# Check routes
neurolink server routes
```

---

## Quick Start

### Installation

Koa requires peer dependencies that are not bundled with NeuroLink:

```bash
# Install NeuroLink and Koa dependencies
npm install @juspay/neurolink koa @koa/router @koa/cors koa-bodyparser
```

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  defaultProvider: "openai",
});

const server = await createServer(neurolink, {
  framework: "koa",
  config: {
    port: 3000,
    basePath: "/api",
  },
});

await server.initialize();
await server.start();

console.log("Koa server running on http://localhost:3000");
```

### Test the Server

```bash
# Health check
curl http://localhost:3000/api/health

# Execute agent
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello, world!"}'
```

---

## Accessing the Underlying Koa App

For advanced customization, you can access the underlying Koa instance and router:

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";
import cors from "@koa/cors";
import logger from "koa-logger";

const neurolink = new NeuroLink();

const server = await createServer(neurolink, {
  framework: "koa",
  config: { port: 3000 },
});

// Get the underlying Koa app
const app = server.getFrameworkInstance();

// Add Koa middleware directly
app.use(logger());
app.use(
  cors({
    origin: (ctx) => {
      const origin = ctx.request.headers.origin;
      return origin?.endsWith(".myapp.com") ? origin : "";
    },
    credentials: true,
  }),
);

// Add custom routes directly on the Koa app
app.use(async (ctx, next) => {
  if (ctx.path === "/custom") {
    ctx.body = { message: "Custom Koa route" };
    return;
  }
  await next();
});

await server.initialize();
await server.start();
```

### Accessing the Router

The server adapter uses `@koa/router` internally. For route-specific customization:

```typescript
const server = await createServer(neurolink, { framework: "koa" });
const app = server.getFrameworkInstance();

// Add routes before initialization
app.use(async (ctx, next) => {
  // Custom middleware for specific paths
  if (ctx.path.startsWith("/v2/")) {
    ctx.state.apiVersion = "v2";
  }
  await next();
});

await server.initialize();
await server.start();
```

---

## Configuration Options

### Full Configuration Example

```typescript
const server = await createServer(neurolink, {
  framework: "koa",
  config: {
    // Server settings
    port: 3000,
    host: "0.0.0.0",
    basePath: "/api",
    timeout: 30000, // 30 seconds

    // CORS
    cors: {
      enabled: true,
      origins: ["https://myapp.com", "https://staging.myapp.com"],
      methods: ["GET", "POST", "PUT", "DELETE"],
      headers: ["Content-Type", "Authorization", "X-Request-ID"],
      credentials: true,
      maxAge: 86400, // 24 hours
    },

    // Rate limiting
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000, // 1 minute
      skipPaths: ["/api/health", "/api/ready"],
    },
    // Note: Rate-limited responses (HTTP 429) include a `Retry-After` header indicating seconds to wait.

    // Body parsing
    bodyParser: {
      enabled: true,
      maxSize: "10mb",
      jsonLimit: "10mb",
    },

    // Logging
    logging: {
      enabled: true,
      level: "info",
      includeBody: false,
      includeResponse: false,
    },

    // Documentation
    enableSwagger: true,
    enableMetrics: true,
  },
});
```

---

## Middleware Integration

### Using NeuroLink Middleware

```typescript
import {
  createServer,
  createAuthMiddleware,
  createRateLimitMiddleware,
  createCacheMiddleware,
  createRequestIdMiddleware,
  createTimingMiddleware,
} from "@juspay/neurolink";

const server = await createServer(neurolink, {
  framework: "koa",
  config: { port: 3000 },
});

// Add request ID to all requests
server.registerMiddleware(createRequestIdMiddleware());

// Add timing headers
server.registerMiddleware(createTimingMiddleware());

// Add authentication
server.registerMiddleware(
  createAuthMiddleware({
    type: "bearer",
    validate: async (token) => {
      const decoded = await verifyJWT(token);
      return decoded ? { id: decoded.sub, roles: decoded.roles } : null;
    },
    skipPaths: ["/api/health", "/api/ready", "/api/version"],
  }),
);

// Add rate limiting
server.registerMiddleware(
  createRateLimitMiddleware({
    maxRequests: 100,
    windowMs: 60000,
    keyGenerator: (ctx) =>
      ctx.headers["x-api-key"] || ctx.headers["x-forwarded-for"] || "unknown",
  }),
);

// Add response caching
server.registerMiddleware(
  createCacheMiddleware({
    ttlMs: 300000, // 5 minutes
    methods: ["GET"],
    excludePaths: ["/api/agent/execute", "/api/agent/stream"],
  }),
);

// Note: Cached responses include `X-Cache: HIT` header. Fresh responses include `X-Cache: MISS`.

await server.initialize();
await server.start();
```

### Using Koa Native Middleware

Koa has a rich ecosystem of middleware. You can use them directly:

```typescript
import compress from "koa-compress";
import helmet from "koa-helmet";
import session from "koa-session";
import ratelimit from "koa-ratelimit";

const server = await createServer(neurolink, { framework: "koa" });
const app = server.getFrameworkInstance();

// Security headers
app.use(helmet());

// Compression
app.use(
  compress({
    threshold: 2048,
    gzip: { flush: require("zlib").constants.Z_SYNC_FLUSH },
    deflate: { flush: require("zlib").constants.Z_SYNC_FLUSH },
  }),
);

// Session management
app.keys = ["your-session-secret"];
app.use(
  session(
    {
      key: "neurolink:sess",
      maxAge: 86400000,
      httpOnly: true,
      signed: true,
    },
    app,
  ),
);

// External rate limiting with Redis
const Redis = require("ioredis");
const redis = new Redis();

app.use(
  ratelimit({
    driver: "redis",
    db: redis,
    duration: 60000,
    max: 100,
    id: (ctx) => ctx.ip,
  }),
);

await server.initialize();
await server.start();
```

---

## Koa Context Patterns

### Accessing Koa Context in Custom Middleware

```typescript
const server = await createServer(neurolink, { framework: "koa" });
const app = server.getFrameworkInstance();

// Koa middleware has access to ctx (context)
app.use(async (ctx, next) => {
  // ctx.request - Koa Request object
  // ctx.response - Koa Response object
  // ctx.state - Recommended namespace for passing data through middleware
  // ctx.app - Application instance reference
  // ctx.cookies - Cookie handling

  ctx.state.startTime = Date.now();

  await next();

  const duration = Date.now() - ctx.state.startTime;
  ctx.set("X-Response-Time", `${duration}ms`);
});
```

### Error Handling with Koa

```typescript
const app = server.getFrameworkInstance();

// Error handling middleware (should be early in the chain)
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    const status = err.status || err.statusCode || 500;
    const message = err.expose ? err.message : "Internal Server Error";

    ctx.status = status;
    ctx.body = {
      error: {
        code: `HTTP_${status}`,
        message,
        requestId: ctx.state.requestId,
      },
    };

    // Emit error event for logging
    ctx.app.emit("error", err, ctx);
  }
});

// Listen for errors
app.on("error", (err, ctx) => {
  console.error("Server error:", {
    error: err.message,
    path: ctx?.path,
    method: ctx?.method,
  });
});
```

---

## Streaming Responses

Koa handles streaming naturally through its response handling:

```typescript
// The /api/agent/stream endpoint is automatically configured
// It uses Server-Sent Events (SSE) for streaming

// Client-side usage:
const response = await fetch("/api/agent/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ input: "Write a story" }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  const lines = text.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = JSON.parse(line.slice(6));
      console.log(data);
    }
  }
}
```

### Custom Streaming Route

```typescript
const app = server.getFrameworkInstance();

app.use(async (ctx, next) => {
  if (ctx.path === "/api/custom-stream" && ctx.method === "POST") {
    ctx.set("Content-Type", "text/event-stream");
    ctx.set("Cache-Control", "no-cache");
    ctx.set("Connection", "keep-alive");
    ctx.set("X-Accel-Buffering", "no");

    ctx.status = 200;

    // Manual streaming
    for await (const chunk of neurolink.generateStream({
      prompt: ctx.request.body.prompt,
    })) {
      ctx.res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    ctx.res.write("data: [DONE]\n\n");
    ctx.res.end();
    return;
  }

  await next();
});
```

---

## Testing

### Unit Testing with Supertest

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

describe("Koa API Server", () => {
  let server;
  let app;

  beforeAll(async () => {
    const neurolink = new NeuroLink({ defaultProvider: "openai" });
    server = await createServer(neurolink, { framework: "koa" });
    await server.initialize();
    app = server.getFrameworkInstance().callback();
  });

  afterAll(async () => {
    await server.stop();
  });

  it("should return health status", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });

  it("should execute agent request", async () => {
    const res = await request(app)
      .post("/api/agent/execute")
      .send({ input: "Hello" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});
```

---

## Production Checklist

- [ ] Configure environment variables securely
- [ ] Set appropriate CORS origins (not `*`)
- [ ] Enable rate limiting with reasonable limits
- [ ] Add authentication middleware
- [ ] Configure request timeouts
- [ ] Set body size limits
- [ ] Enable compression middleware
- [ ] Add security headers (koa-helmet)
- [ ] Configure logging with appropriate level
- [ ] Set up health check monitoring
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Use process manager (PM2) for production

---

## Related Documentation

- **[Server Adapters Overview](./index.md)** - Getting started with server adapters
- **[Hono Adapter](./hono.md)** - Recommended framework for most use cases
- **[Express Adapter](./express.md)** - Compare with Express adapter
- **[Security Best Practices](./security.md)** - Authentication patterns
- **[Deployment Guide](./deployment.md)** - Production deployment strategies

---

## Additional Resources

- **[Koa Documentation](https://koajs.com/)** - Official Koa documentation
- **[Koa Wiki](https://github.com/koajs/koa/wiki)** - Community resources and middleware list
- **[@koa/router](https://github.com/koajs/router)** - Router middleware documentation

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).

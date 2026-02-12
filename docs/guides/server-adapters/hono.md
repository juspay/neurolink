---
title: Hono Adapter
sidebar_label: "Hono Adapter"
description: Build lightweight, multi-runtime AI APIs with Hono and NeuroLink
sidebar_position: 2
keywords: hono, server adapter, edge runtime, serverless, cloudflare workers, deno, bun
---

# Hono Adapter

**The recommended framework for NeuroLink server adapters**

Hono is a lightweight, ultrafast web framework designed for the edge. It runs on virtually any JavaScript runtime including Node.js, Deno, Bun, Cloudflare Workers, and more.

---

## Why Hono?

| Feature                 | Benefit                                                                   |
| ----------------------- | ------------------------------------------------------------------------- |
| **Multi-runtime**       | Deploy to Node.js, Deno, Bun, Cloudflare Workers, Vercel Edge, AWS Lambda |
| **Ultrafast**           | Minimal overhead, optimized router with RegExpRouter                      |
| **TypeScript-first**    | Full type safety out of the box                                           |
| **Tiny footprint**      | ~14KB minified, no dependencies                                           |
| **Built-in middleware** | CORS, compression, ETag, secure headers included                          |
| **Web Standards**       | Uses Fetch API, Request/Response objects                                  |

Hono is the default and recommended framework for NeuroLink server adapters.

---

## CLI Usage

Start a Hono server via CLI:

```bash
# Foreground mode
neurolink serve --framework hono --port 3000

# Background mode
neurolink server start --framework hono --port 3000

# Check routes
neurolink server routes
```

---

## Quick Start

### Installation

Hono is included with NeuroLink - no additional installation required.

```bash
# NeuroLink includes Hono as a dependency
npm install @juspay/neurolink
```

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  defaultProvider: "openai",
});

const server = await createServer(neurolink, {
  framework: "hono", // This is the default
  config: {
    port: 3000,
    basePath: "/api",
  },
});

await server.initialize();
await server.start();

console.log("Server running on http://localhost:3000");
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

## Accessing the Hono App

For advanced customization, you can access the underlying Hono instance:

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const neurolink = new NeuroLink();

const server = await createServer(neurolink, {
  framework: "hono",
  config: { port: 3000 },
});

// Get the underlying Hono app
const app = server.getFrameworkInstance();

// Add Hono middleware
app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: ["https://myapp.com"],
    credentials: true,
  }),
);

// Add custom routes directly on Hono
app.get("/custom", (c) => c.json({ message: "Custom route" }));

// Add route groups
app.route("/v2", v2Routes);

await server.initialize();
await server.start();
```

---

## Configuration Options

### Full Configuration Example

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
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
  framework: "hono",
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
    keyGenerator: (ctx) => ctx.headers["x-api-key"] || ctx.ip,
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

### Using Hono Built-in Middleware

```typescript
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import { etag } from "hono/etag";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";

const server = await createServer(neurolink, { framework: "hono" });
const app = server.getFrameworkInstance();

// Security headers
app.use("*", secureHeaders());

// Compression
app.use("*", compress());

// ETag for caching
app.use("*", etag());

// Request timing
app.use("*", timing());

// CORS with full configuration
app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      // Dynamic origin checking
      return origin.endsWith(".myapp.com") ? origin : null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["X-Request-Id", "X-Response-Time"],
    maxAge: 86400,
    credentials: true,
  }),
);

await server.initialize();
await server.start();
```

---

## Streaming Responses

Hono has excellent streaming support, which NeuroLink leverages for real-time AI responses:

```typescript
// The /api/agent/stream endpoint is automatically set up
// It uses Server-Sent Events (SSE) for streaming

// Client-side usage:
// Note: EventSource only supports GET requests in browsers.
// Use query parameters for simple inputs:
const eventSource = new EventSource(
  `/api/agent/stream?input=${encodeURIComponent("Write a story")}`,
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "text-delta") {
    console.log(data.content);
  }
};

// For POST requests with SSE, use fetch with a readable stream:
async function streamWithPost() {
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

    const chunk = decoder.decode(value);
    // Parse SSE format: "data: {...}\n\n"
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (data.type === "text-delta") {
          console.log(data.content);
        }
      }
    }
  }
}
```

### Custom Streaming Route

```typescript
const app = server.getFrameworkInstance();

app.get("/api/custom-stream", async (c) => {
  return c.streamText(async (stream) => {
    for await (const chunk of neurolink.generateStream({
      prompt: "Tell me a joke",
    })) {
      await stream.write(chunk.content);
    }
  });
});
```

---

## Error Handling

### Custom Error Handler

```typescript
import { HTTPException } from "hono/http-exception";

const app = server.getFrameworkInstance();

app.onError((err, c) => {
  console.error("Error:", err);

  if (err instanceof HTTPException) {
    return c.json({ error: err.message, status: err.status }, err.status);
  }

  // AI provider errors
  if (err.message.includes("rate limit")) {
    return c.json({ error: "Rate limit exceeded", retryAfter: 60 }, 429);
  }

  // Default error response
  return c.json(
    {
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500,
  );
});

app.notFound((c) => {
  return c.json({ error: "Not found", path: c.req.path }, 404);
});
```

---

## Performance Tips

### 1. Use the RegExpRouter (Default)

Hono uses RegExpRouter by default, which is the fastest router. No configuration needed.

### 2. Enable Compression

```typescript
import { compress } from "hono/compress";

app.use("*", compress());
```

### 3. Use ETag for Caching

```typescript
import { etag } from "hono/etag";

app.use("/api/tools/*", etag());
```

### 4. Minimize Middleware Chain

Only use middleware where needed:

```typescript
// Instead of applying to all routes
app.use("*", expensiveMiddleware);

// Apply only where needed
app.use("/api/agent/*", expensiveMiddleware);
```

### 5. Use Streaming for Long Responses

Always use the streaming endpoint for AI generation to avoid timeouts:

```typescript
// Prefer streaming for long responses
fetch("/api/agent/stream", {
  method: "POST",
  body: JSON.stringify({ input: "Write a long essay" }),
});
```

---

## Edge Runtime Deployment

### Cloudflare Workers

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  defaultProvider: "openai",
});

const server = await createServer(neurolink, {
  framework: "hono",
  config: { basePath: "/api" },
});

await server.initialize();

export default {
  fetch: server.getFrameworkInstance().fetch,
};
```

### Vercel Edge Functions

```typescript
// api/[[...route]].ts
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const server = await createServer(neurolink, { framework: "hono" });
await server.initialize();

export const config = { runtime: "edge" };
export default server.getFrameworkInstance().fetch;
```

### Deno Deploy

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const server = await createServer(neurolink, { framework: "hono" });
await server.initialize();

Deno.serve(server.getFrameworkInstance().fetch);
```

---

## Testing

### Unit Testing with Hono Test Client

```typescript
import { describe, it, expect } from "vitest";
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

describe("API Server", () => {
  it("should return health status", async () => {
    const neurolink = new NeuroLink({ defaultProvider: "openai" });
    const server = await createServer(neurolink, { framework: "hono" });
    await server.initialize();

    const app = server.getFrameworkInstance();
    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ok");
  });

  it("should execute agent request", async () => {
    const neurolink = new NeuroLink({ defaultProvider: "openai" });
    const server = await createServer(neurolink, { framework: "hono" });
    await server.initialize();

    const app = server.getFrameworkInstance();
    const res = await app.request("/api/agent/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: "Hello" }),
    });

    expect(res.status).toBe(200);
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
- [ ] Enable compression
- [ ] Add security headers
- [ ] Configure logging with appropriate level
- [ ] Set up health check monitoring
- [ ] Configure error tracking (Sentry, etc.)

---

## Related Documentation

- **[Server Adapters Overview](./index.md)** - Getting started with server adapters
- **[Configuration Reference](../../reference/server-configuration.md)** - Full configuration options
- **[Express Adapter](./express.md)** - Compare with Express adapter
- **[Security Best Practices](./security.md)** - Authentication patterns
- **[Streaming Guide](./streaming.md)** - Real-time streaming with SSE and NDJSON

---

## Additional Resources

- **[Hono Documentation](https://hono.dev/)** - Official Hono documentation
- **[Hono Middleware](https://hono.dev/docs/middleware/builtin/)** - Built-in middleware
- **[Hono Examples](https://hono.dev/docs/getting-started/examples)** - Example applications

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).

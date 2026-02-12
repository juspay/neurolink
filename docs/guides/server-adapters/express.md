---
title: Express Adapter
sidebar_label: "Express Adapter"
description: Build AI APIs with Express and NeuroLink using the most popular Node.js web framework
sidebar_position: 3
keywords: express, server adapter, node.js, middleware, rest api
---

# Express Adapter

**The most popular Node.js web framework**

Express is a minimal and flexible Node.js web framework that provides a robust set of features for building web applications and APIs. It has the largest ecosystem of middleware and is widely used in production.

---

## Why Express?

| Feature               | Benefit                                         |
| --------------------- | ----------------------------------------------- |
| **Mature ecosystem**  | Thousands of middleware packages available      |
| **Well-documented**   | Extensive documentation and community resources |
| **Familiar API**      | Most Node.js developers already know Express    |
| **Flexible**          | Unopinionated, adapt to any architecture        |
| **Production-proven** | Powers millions of applications worldwide       |
| **Easy migration**    | Integrate NeuroLink into existing Express apps  |

Express is ideal when you have an existing Express application or prefer its familiar middleware patterns.

---

## CLI Usage

Start an Express server via CLI:

```bash
# Foreground mode
neurolink serve --framework express --port 3000

# Background mode
neurolink server start --framework express --port 3000

# Check routes
neurolink server routes
```

---

## Quick Start

### Installation

Express must be installed separately alongside NeuroLink:

```bash
npm install @juspay/neurolink express
```

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  defaultProvider: "openai",
});

const server = await createServer(neurolink, {
  framework: "express",
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

## Accessing the Express App

For advanced customization, you can access the underlying Express application:

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";
import helmet from "helmet";
import morgan from "morgan";

const neurolink = new NeuroLink();

const server = await createServer(neurolink, {
  framework: "express",
  config: { port: 3000 },
});

// Get the underlying Express app
const app = server.getFrameworkInstance();

// Add Express middleware
app.use(helmet());
app.use(morgan("combined"));

// Add custom routes directly on Express
app.get("/custom", (req, res) => {
  res.json({ message: "Custom route" });
});

// Add route groups with Express Router
import { Router } from "express";
const v2Router = Router();
v2Router.get("/status", (req, res) => res.json({ version: 2 }));
app.use("/v2", v2Router);

await server.initialize();
await server.start();
```

---

## Configuration Options

### Full Configuration Example

```typescript
const server = await createServer(neurolink, {
  framework: "express",
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
  framework: "express",
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

### Using Express-Native Middleware

```typescript
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cors from "cors";

const server = await createServer(neurolink, { framework: "express" });
const app = server.getFrameworkInstance();

// Security headers
app.use(helmet());

// Logging
app.use(morgan("combined"));

// Compression
app.use(compression());

// Custom CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Dynamic origin checking
      if (!origin || origin.endsWith(".myapp.com")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Request-Id", "X-Response-Time"],
    maxAge: 86400,
    credentials: true,
  }),
);

await server.initialize();
await server.start();
```

---

## Streaming Responses

Express supports streaming through Server-Sent Events (SSE):

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

app.post("/api/custom-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  for await (const chunk of neurolink.generateStream({
    prompt: req.body.input,
  })) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  res.write("event: done\ndata: \n\n");
  res.end();
});
```

---

## Abort Signal Handling

The abort signal middleware allows detecting when clients disconnect during long-running requests. NeuroLink provides both a universal middleware and an Express-specific implementation.

### Using Abort Signal Middleware

```typescript
import {
  createAbortSignalMiddleware,
  createExpressAbortMiddleware,
} from "@juspay/neurolink";

// Option 1: Universal middleware (works with ServerContext)
const abortMiddleware = createAbortSignalMiddleware({
  onAbort: (ctx) => {
    console.log(`Request ${ctx.requestId} was aborted by client`);
  },
  timeout: 30000, // Optional request timeout
});

// Option 2: Express-specific middleware (lower-level)
app.use(createExpressAbortMiddleware());

// Access in route handler
app.get("/long-operation", async (req, res) => {
  const { abortSignal } = res.locals;

  // Check if aborted
  if (abortSignal?.aborted) {
    return res.status(499).json({ error: "Request cancelled" });
  }

  // Use with fetch or other AbortSignal-aware APIs
  const response = await fetch(url, { signal: abortSignal });
});
```

### Use Cases

The abort signal middleware is useful for:

- **Long-running AI generation** - Cancel generation when client disconnects
- **Streaming responses** - Stop producing chunks when client leaves
- **Database queries** - Cancel queries that support abort signals
- **External API calls** - Pass signal to fetch/axios for cancellation

### Native Express Approach

For simpler cases, you can use Express's native socket events:

```typescript
const app = server.getFrameworkInstance();

app.post("/api/long-running", async (req, res) => {
  // Check if client disconnected
  req.on("close", () => {
    console.log("Client disconnected, cleaning up...");
    // Cleanup resources
  });

  // Your long-running operation
  const result = await neurolink.generate({
    prompt: req.body.input,
  });

  res.json(result);
});
```

For streaming requests, the adapter automatically detects client disconnection and stops the stream to avoid unnecessary processing.

---

## Error Handling

### Custom Error Handler

```typescript
const app = server.getFrameworkInstance();

// Custom error handling middleware (must be defined last)
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // AI provider errors
  if (err.message.includes("rate limit")) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      retryAfter: 60,
    });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      details: err.details,
    });
  }

  // Default error response
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
  });
});
```

---

## Integrating with Existing Express Apps

If you already have an Express application, you can integrate NeuroLink routes:

```typescript
import express from "express";
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

// Your existing Express app
const existingApp = express();
existingApp.use(express.json());

// Add your existing routes
existingApp.get("/", (req, res) => {
  res.json({ message: "Welcome to my API" });
});

// Create NeuroLink server
// Note: basePath: "/" since Express mount path handles the prefix
const neurolink = new NeuroLink({ defaultProvider: "openai" });
const nlServer = await createServer(neurolink, {
  framework: "express",
  config: { basePath: "/" },
});

await nlServer.initialize();

// Mount NeuroLink routes on your existing app
const nlApp = nlServer.getFrameworkInstance();
existingApp.use("/ai", nlApp);

// Start your existing app
existingApp.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("AI endpoints available at /ai/*");
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

describe("API Server", () => {
  let server;
  let app;

  beforeAll(async () => {
    const neurolink = new NeuroLink({ defaultProvider: "openai" });
    server = await createServer(neurolink, { framework: "express" });
    await server.initialize();
    app = server.getFrameworkInstance();
  });

  afterAll(async () => {
    await server.stop();
  });

  it("should return health status", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("should execute agent request", async () => {
    const res = await request(app)
      .post("/api/agent/execute")
      .set("Content-Type", "application/json")
      .send({ input: "Hello" });

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
- [ ] Enable compression (gzip/brotli)
- [ ] Add security headers (helmet)
- [ ] Configure logging with appropriate level
- [ ] Set up health check monitoring
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Use a process manager (PM2, systemd)

---

## Related Documentation

- **[Server Adapters Overview](./index.md)** - Getting started with server adapters
- **[Configuration Reference](../../reference/server-configuration.md)** - Full configuration options
- **[Hono Adapter](./hono.md)** - Compare with Hono adapter
- **[Fastify Adapter](./fastify.md)** - Compare with Fastify adapter
- **[Security Best Practices](./security.md)** - Authentication patterns

---

## Additional Resources

- **[Express Documentation](https://expressjs.com/)** - Official Express documentation
- **[Express Middleware](https://expressjs.com/en/resources/middleware.html)** - Popular middleware packages
- **[Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)** - Security guidelines

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).

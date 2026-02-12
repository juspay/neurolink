---
title: Fastify Adapter
sidebar_label: "Fastify Adapter"
description: Build high-performance AI APIs with Fastify and NeuroLink featuring schema validation and TypeScript support
sidebar_position: 4
keywords: fastify, server adapter, high performance, schema validation, typescript
---

# Fastify Adapter

**High-performance web framework with built-in schema validation**

Fastify is a fast and low overhead web framework for Node.js. It provides excellent TypeScript support, built-in schema validation, and a powerful plugin system.

---

## Why Fastify?

| Feature               | Benefit                                                  |
| --------------------- | -------------------------------------------------------- |
| **High performance**  | One of the fastest Node.js web frameworks                |
| **Schema validation** | Built-in JSON Schema validation with fast-json-stringify |
| **TypeScript-first**  | Excellent TypeScript support and type inference          |
| **Plugin system**     | Powerful encapsulated plugin architecture                |
| **Low overhead**      | Minimal memory footprint and fast serialization          |
| **Production-ready**  | Built-in logging with Pino, decorators, hooks            |

Fastify is ideal when you need maximum performance and strong type safety.

---

## CLI Usage

Start a Fastify server via CLI:

```bash
# Foreground mode
neurolink serve --framework fastify --port 3000

# Background mode
neurolink server start --framework fastify --port 3000

# Check routes
neurolink server routes
```

---

## Quick Start

### Installation

Fastify is included with NeuroLink - no additional installation required.

```bash
# NeuroLink includes Fastify as a dependency
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
  framework: "fastify",
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

## Accessing the Fastify Instance

For advanced customization, you can access the underlying Fastify instance:

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const server = await createServer(neurolink, {
  framework: "fastify",
  config: { port: 3000 },
});

// Get the underlying Fastify instance
const fastify = server.getFrameworkInstance();

// Add custom routes directly on Fastify
fastify.get("/custom", async (request, reply) => {
  return { message: "Custom route" };
});

// Add decorators
fastify.decorate("neurolink", neurolink);

// Add hooks
fastify.addHook("onRequest", async (request, reply) => {
  request.startTime = Date.now();
});

await server.initialize();
await server.start();
```

---

## Plugin Registration

Fastify's plugin system allows you to encapsulate functionality:

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";
import fastifyHelmet from "@fastify/helmet";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

const neurolink = new NeuroLink();

const server = await createServer(neurolink, {
  framework: "fastify",
  config: { port: 3000 },
});

const fastify = server.getFrameworkInstance();

// Register security headers plugin
await fastify.register(fastifyHelmet);

// Register Swagger documentation
await fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: "NeuroLink AI API",
      description: "AI-powered API endpoints",
      version: "1.0.0",
    },
  },
});

await fastify.register(fastifySwaggerUi, {
  routePrefix: "/docs",
});

// Register custom plugin
await fastify.register(async function customPlugin(instance) {
  instance.get("/plugin-route", async () => {
    return { source: "plugin" };
  });
});

await server.initialize();
await server.start();
```

---

## Configuration Options

### Full Configuration Example

```typescript
const server = await createServer(neurolink, {
  framework: "fastify",
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

    // Logging (Fastify uses Pino)
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
  framework: "fastify",
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

### Using Fastify Hooks

```typescript
const fastify = server.getFrameworkInstance();

// onRequest hook - runs first
fastify.addHook("onRequest", async (request, reply) => {
  console.log(`Request: ${request.method} ${request.url}`);
});

// preValidation hook - runs before validation
fastify.addHook("preValidation", async (request, reply) => {
  // Custom validation logic
});

// preHandler hook - runs before route handler
fastify.addHook("preHandler", async (request, reply) => {
  // Authentication, authorization, etc.
});

// onSend hook - runs before response is sent
fastify.addHook("onSend", async (request, reply, payload) => {
  // Modify response
  return payload;
});

// onResponse hook - runs after response is sent
fastify.addHook("onResponse", async (request, reply) => {
  console.log(`Response time: ${reply.elapsedTime}ms`);
});
```

---

## MCP Body Attachment

When using MCP (Model Context Protocol) tools with Fastify, the request body is automatically attached to the context. The Fastify adapter handles this seamlessly:

```typescript
const server = await createServer(neurolink, {
  framework: "fastify",
  config: { port: 3000 },
});

// MCP tools receive the request body automatically
// No additional configuration needed

// The body is accessible in your route handlers
const fastify = server.getFrameworkInstance();

fastify.post("/api/custom-mcp", async (request, reply) => {
  const { input, tools } = request.body;

  // Execute with specific MCP tools
  const result = await neurolink.generate({
    prompt: input,
    tools: tools,
  });

  return result;
});
```

For large payloads, ensure your body limit configuration is appropriate:

```typescript
const server = await createServer(neurolink, {
  framework: "fastify",
  config: {
    bodyParser: {
      maxSize: "50mb", // Increase for large MCP payloads
    },
  },
});
```

---

## Streaming Responses

Fastify supports streaming through Server-Sent Events (SSE):

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
const fastify = server.getFrameworkInstance();

fastify.post("/api/custom-stream", async (request, reply) => {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  for await (const chunk of neurolink.generateStream({
    prompt: request.body.input,
  })) {
    reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  reply.raw.write("event: done\ndata: \n\n");
  reply.raw.end();
});
```

---

## Performance Tips

### 1. Use Schema Validation

Fastify's schema validation is highly optimized. Define schemas for better performance and automatic documentation:

```typescript
const fastify = server.getFrameworkInstance();

// Define schemas
const executeSchema = {
  body: {
    type: "object",
    required: ["input"],
    properties: {
      input: { type: "string", minLength: 1, maxLength: 10000 },
      provider: { type: "string", enum: ["openai", "anthropic", "google"] },
      options: {
        type: "object",
        properties: {
          temperature: { type: "number", minimum: 0, maximum: 2 },
          maxTokens: { type: "integer", minimum: 1, maximum: 100000 },
        },
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "object" },
        metadata: {
          type: "object",
          properties: {
            requestId: { type: "string" },
            timestamp: { type: "string" },
            duration: { type: "number" },
          },
        },
      },
    },
  },
};

// Route with schema validation
fastify.post("/api/validated-execute", {
  schema: executeSchema,
  handler: async (request, reply) => {
    const result = await neurolink.generate({
      prompt: request.body.input,
      provider: request.body.provider,
      ...request.body.options,
    });
    return { data: result };
  },
});
```

### 2. Use fastify-compress for Response Compression

```typescript
import fastifyCompress from "@fastify/compress";

const fastify = server.getFrameworkInstance();
await fastify.register(fastifyCompress, {
  encodings: ["gzip", "deflate"],
});
```

### 3. Configure Logging Appropriately

```typescript
// In production, use structured logging with Pino
const server = await createServer(neurolink, {
  framework: "fastify",
  config: {
    logging: {
      enabled: true,
      level: process.env.NODE_ENV === "production" ? "warn" : "info",
    },
  },
});
```

### 4. Use Connection Pooling

When accessing databases or external services, use connection pooling:

```typescript
const fastify = server.getFrameworkInstance();

// Decorate with a connection pool
fastify.decorate(
  "db",
  createPool({
    max: 20,
    idleTimeoutMillis: 30000,
  }),
);

// Clean up on close
fastify.addHook("onClose", async (instance) => {
  await instance.db.end();
});
```

### 5. Disable Logging in Benchmarks

For maximum performance in benchmarks, disable logging:

```typescript
const server = await createServer(neurolink, {
  framework: "fastify",
  config: {
    logging: { enabled: false },
  },
});
```

---

## Error Handling

### Custom Error Handler

```typescript
const fastify = server.getFrameworkInstance();

// Set custom error handler
fastify.setErrorHandler((error, request, reply) => {
  console.error("Error:", error);

  // AI provider errors
  if (error.message.includes("rate limit")) {
    return reply.status(429).send({
      error: "Rate limit exceeded",
      retryAfter: 60,
    });
  }

  // Validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: "Validation failed",
      details: error.validation,
    });
  }

  // Default error response
  reply.status(500).send({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// Custom 404 handler
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error: "Not found",
    path: request.url,
  });
});
```

---

## Testing

### Unit Testing with Fastify's inject

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

describe("API Server", () => {
  let server;
  let fastify;

  beforeAll(async () => {
    const neurolink = new NeuroLink({ defaultProvider: "openai" });
    server = await createServer(neurolink, { framework: "fastify" });
    await server.initialize();
    fastify = server.getFrameworkInstance();
  });

  afterAll(async () => {
    await server.stop();
  });

  it("should return health status", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.status).toBe("ok");
  });

  it("should execute agent request", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/api/agent/execute",
      headers: { "Content-Type": "application/json" },
      payload: { input: "Hello" },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.data).toBeDefined();
  });

  it("should validate request body", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/api/agent/execute",
      headers: { "Content-Type": "application/json" },
      payload: {}, // Missing required 'input' field
    });

    expect(response.statusCode).toBe(400);
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
- [ ] Enable compression (@fastify/compress)
- [ ] Add security headers (@fastify/helmet)
- [ ] Configure logging with appropriate level
- [ ] Set up health check monitoring
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Use schema validation for all routes
- [ ] Enable JSON schema compilation caching

---

## Related Documentation

- **[Server Adapters Overview](./index.md)** - Getting started with server adapters
- **[Configuration Reference](../../reference/server-configuration.md)** - Full configuration options
- **[Hono Adapter](./hono.md)** - Compare with Hono adapter
- **[Express Adapter](./express.md)** - Compare with Express adapter
- **[Security Best Practices](./security.md)** - Authentication patterns

---

## Additional Resources

- **[Fastify Documentation](https://fastify.dev/)** - Official Fastify documentation
- **[Fastify Plugins](https://fastify.dev/ecosystem/)** - Official and community plugins
- **[Fastify Performance](https://fastify.dev/docs/latest/Guides/Benchmarking/)** - Performance tuning

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).

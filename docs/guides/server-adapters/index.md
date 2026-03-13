---
title: Server Adapters
sidebar_label: "Server Adapters"
description: Expose your NeuroLink AI agents as HTTP APIs with built-in support for Hono, Express, Fastify, and Koa
sidebar_position: 1
keywords: server adapters, http api, rest api, hono, express, fastify, koa, web server
---

# Server Adapters

Server adapters allow you to expose your NeuroLink AI agents as HTTP APIs using popular web frameworks. With minimal configuration, you get a production-ready API server with built-in health checks, streaming support, rate limiting, and more.

---

## Quick Start

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

// Initialize NeuroLink
const neurolink = new NeuroLink({
  defaultProvider: "openai",
});

// Create and start server
const server = await createServer(neurolink, {
  framework: "hono", // or "express", "fastify", "koa"
  config: {
    port: 3000,
    basePath: "/api",
  },
});

await server.initialize();
await server.start();

console.log("Server running on http://localhost:3000");
```

Test your server:

```bash
# Health check
curl http://localhost:3000/api/health

# Execute an agent request
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"input": "Explain AI in one sentence"}'

# Stream a response
curl -X POST http://localhost:3000/api/agent/stream \
  -H "Content-Type: application/json" \
  -d '{"input": "Write a haiku about coding"}'
```

---

## CLI Commands

NeuroLink provides CLI commands for managing server adapters without writing code.

### Starting a Server

```bash
# Foreground mode (development)
npx @juspay/neurolink serve --port 3000 --framework hono

# Background mode (production)
npx @juspay/neurolink server start --port 3000
npx @juspay/neurolink server status
npx @juspay/neurolink server stop
```

### Viewing Routes

Inspect registered API endpoints:

```bash
# List all routes
npx @juspay/neurolink server routes

# Filter by group or method
npx @juspay/neurolink server routes --group agent
npx @juspay/neurolink server routes --method POST --format json
```

### Managing Configuration

```bash
# View configuration
npx @juspay/neurolink server config

# Modify settings
npx @juspay/neurolink server config --set defaultPort=8080
npx @juspay/neurolink server config --get cors.enabled
```

### Generating OpenAPI Spec

```bash
npx @juspay/neurolink server openapi -o openapi.json
```

For complete CLI reference, see the [CLI Commands Reference](../../cli/commands.md#server-subcommand).

---

## Supported Frameworks

| Framework                       | Status      | Description                                                                                                 |
| ------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| **[Hono](./hono.md)**           | Recommended | Lightweight, multi-runtime framework with excellent performance. Ideal for serverless and edge deployments. |
| **[Express](./express.md)**     | Supported   | The most popular Node.js web framework. Great ecosystem and middleware compatibility.                       |
| **[Fastify](./fastify.md)**     | Supported   | High-performance framework with built-in schema validation. Excellent for TypeScript projects.              |
| **[Koa](./koa.md)**             | Supported   | Modern, minimalist framework from the Express team. Clean middleware composition.                           |
| **[WebSocket](./websocket.md)** | Supported   | Real-time bidirectional communication with built-in connection management and authentication.               |

### Framework Selection Guide

| Use Case                          | Recommended Framework |
| --------------------------------- | --------------------- |
| Serverless / Edge deployments     | Hono                  |
| Existing Express application      | Express               |
| Maximum type safety & performance | Fastify               |
| Minimal overhead, modern patterns | Koa                   |
| Real-time bidirectional comms     | WebSocket             |
| General purpose API server        | Hono (default)        |

---

## Available Endpoints

All server adapters expose the same REST API endpoints:

### Health & Status

| Endpoint               | Method | Description                           |
| ---------------------- | ------ | ------------------------------------- |
| `/api/health`          | GET    | Basic health check                    |
| `/api/health/ready`    | GET    | Readiness probe (checks dependencies) |
| `/api/health/live`     | GET    | Kubernetes liveness probe             |
| `/api/health/startup`  | GET    | Kubernetes startup probe              |
| `/api/health/detailed` | GET    | Detailed system health information    |
| `/api/version`         | GET    | Server version information            |

### Agent Operations

| Endpoint                | Method | Description                                  |
| ----------------------- | ------ | -------------------------------------------- |
| `/api/agent/execute`    | POST   | Execute agent and return full response       |
| `/api/agent/stream`     | POST   | Stream agent response via SSE                |
| `/api/agent/providers`  | GET    | List available AI providers                  |
| `/api/agent/embed`      | POST   | Generate embedding for a single text         |
| `/api/agent/embed-many` | POST   | Generate embeddings for multiple texts batch |

### Tool Operations

| Endpoint                   | Method | Description                          |
| -------------------------- | ------ | ------------------------------------ |
| `/api/tools`               | GET    | List all available tools             |
| `/api/tools/:name`         | GET    | Get tool details by name             |
| `/api/tools/:name/execute` | POST   | Execute a specific tool              |
| `/api/tools/execute`       | POST   | Execute tool by name in request body |
| `/api/tools/search`        | GET    | Search tools by query                |

### MCP Server Operations

| Endpoint                                         | Method | Description                         |
| ------------------------------------------------ | ------ | ----------------------------------- |
| `/api/mcp/servers`                               | GET    | List connected MCP servers          |
| `/api/mcp/servers/:name`                         | GET    | Get MCP server status and tools     |
| `/api/mcp/servers/:name/tools`                   | GET    | List tools from specific MCP server |
| `/api/mcp/servers/:name/reconnect`               | POST   | Reconnect to MCP server             |
| `/api/mcp/servers/:name`                         | DELETE | Remove MCP server                   |
| `/api/mcp/servers/:name/tools/:toolName/execute` | POST   | Execute tool from specific server   |
| `/api/mcp/health`                                | GET    | Health check for all MCP servers    |

**MCP Health Response Format:**

```json
{
  "healthy": true,
  "status": "all_healthy",
  "servers": [
    { "name": "github", "healthy": true },
    { "name": "postgres", "healthy": true }
  ],
  "timestamp": "2026-02-02T12:00:00.000Z"
}
```

Status values: `no_servers`, `all_healthy`, `degraded`, `unhealthy`

### Memory & Sessions

| Endpoint                                   | Method | Description                |
| ------------------------------------------ | ------ | -------------------------- |
| `/api/memory/sessions`                     | GET    | List conversation sessions |
| `/api/memory/sessions`                     | DELETE | Clear ALL sessions         |
| `/api/memory/sessions/:sessionId`          | GET    | Get session by ID          |
| `/api/memory/sessions/:sessionId`          | DELETE | Delete specific session    |
| `/api/memory/sessions/:sessionId/messages` | GET    | Get messages for session   |
| `/api/memory/stats`                        | GET    | Memory statistics          |
| `/api/memory/health`                       | GET    | Memory system health check |

**Memory Health Response Format:**

```json
{
  "available": true,
  "type": "ConversationMemoryManager",
  "timestamp": "2026-02-02T12:00:00.000Z"
}
```

**Clear All Sessions Response Format:**

```json
{
  "success": true,
  "message": "All sessions cleared successfully",
  "metadata": {
    "timestamp": "2026-02-02T12:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### OpenAPI / Documentation

| Endpoint            | Method | Description                  |
| ------------------- | ------ | ---------------------------- |
| `/api/openapi.json` | GET    | OpenAPI specification (JSON) |
| `/api/openapi.yaml` | GET    | OpenAPI specification (YAML) |
| `/api/docs`         | GET    | Swagger UI documentation     |

### Enabling API Documentation

The OpenAPI/Swagger endpoints above are only available when `enableSwagger: true` is set in configuration:

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    enableSwagger: true, // Enable OpenAPI endpoints
  },
});
```

> **Security Note:** Consider disabling `enableSwagger` in production environments to avoid exposing internal API structure to unauthorized users.

---

## Configuration

### Basic Configuration

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: 3000,
    host: "0.0.0.0",
    basePath: "/api",
    timeout: 30000,
    enableSwagger: true,
  },
});
```

### With CORS and Rate Limiting

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: 3000,
    cors: {
      enabled: true,
      origins: ["https://myapp.com"],
      credentials: true,
    },
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000, // 1 minute
    },
  },
});
```

### With Authentication

```typescript
import { createServer, createAuthMiddleware } from "@juspay/neurolink";

const server = await createServer(neurolink, {
  framework: "hono",
  config: { port: 3000 },
});

// Add authentication middleware
server.registerMiddleware(
  createAuthMiddleware({
    type: "bearer",
    validate: async (token) => {
      const user = await verifyJWT(token);
      return user ? { id: user.id, roles: user.roles } : null;
    },
    skipPaths: ["/api/health", "/api/ready"],
  }),
);

await server.initialize();
await server.start();
```

For complete configuration options, see the [Configuration Reference](../../reference/server-configuration.md).

---

## Adding Custom Routes

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: { port: 3000 },
});

// Add custom route
server.registerRoute({
  method: "GET",
  path: "/api/custom",
  handler: async (ctx) => {
    return { message: "Custom endpoint", timestamp: Date.now() };
  },
  description: "Custom endpoint example",
  tags: ["custom"],
});

await server.initialize();
await server.start();
```

---

## Accessing the Framework Instance

For advanced customization, you can access the underlying framework instance:

```typescript
const server = await createServer(neurolink, { framework: "hono" });

// Get the underlying Hono app
const app = server.getFrameworkInstance();

// Add framework-specific middleware or routes
app.use("/custom/*", customMiddleware);

await server.initialize();
await server.start();
```

This works for all supported frameworks:

- Hono: Returns `Hono` instance
- Express: Returns `Express.Application` instance
- Fastify: Returns `FastifyInstance`
- Koa: Returns `Koa` instance

---

## Request/Response Examples

### Execute Agent

**Request:**

```json
POST /api/agent/execute
Content-Type: application/json

{
  "input": "What is the capital of France?",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "options": {
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

**Response:**

```json
{
  "content": "The capital of France is Paris.",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "usage": {
    "inputTokens": 12,
    "outputTokens": 8,
    "totalTokens": 20
  }
}
```

### Stream Agent Response

**Request:**

```bash
curl -X POST http://localhost:3000/api/agent/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"input": "Write a story"}'
```

**Response (SSE):**

```
data: {"type":"text-start","timestamp":1706745600000}

data: {"type":"text-delta","content":"Once","timestamp":1706745600001}

data: {"type":"text-delta","content":" upon","timestamp":1706745600002}

data: {"type":"text-delta","content":" a time...","timestamp":1706745600003}

data: {"type":"text-end","timestamp":1706745600100}

data: {"type":"finish","usage":{"inputTokens":5,"outputTokens":50,"totalTokens":55}}
```

### Generate Embedding

**Request:**

```json
POST /api/agent/embed
Content-Type: application/json

{
  "text": "What is the meaning of life?",
  "provider": "openai",
  "model": "text-embedding-3-small"
}
```

**Response:**

```json
{
  "embedding": [0.123, -0.456, 0.789, ...],
  "provider": "openai",
  "model": "text-embedding-3-small",
  "dimension": 1536
}
```

### Generate Batch Embeddings

**Request:**

```json
POST /api/agent/embed-many
Content-Type: application/json

{
  "texts": ["First document", "Second document"],
  "provider": "googleAiStudio",
  "model": "gemini-embedding-001"
}
```

**Response:**

```json
{
  "embeddings": [[0.123, -0.456, ...], [0.789, -0.012, ...]],
  "provider": "googleAiStudio",
  "model": "gemini-embedding-001",
  "count": 2,
  "dimension": 768
}
```

---

## Production Deployment

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.js"]
```

### Docker Compose

```yaml
version: "3.8"

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Production Checklist

- [ ] Environment variables configured securely
- [ ] CORS configured for allowed origins
- [ ] Rate limiting enabled
- [ ] Authentication middleware added
- [ ] HTTPS/TLS configured (via reverse proxy)
- [ ] Health check endpoints exposed
- [ ] Logging configured appropriately
- [ ] Error handling middleware in place
- [ ] Request timeout configured
- [ ] Body size limits set

---

## Next Steps

- **[Hono Adapter Guide](./hono.md)** - Recommended framework for most use cases
- **[Express Adapter Guide](./express.md)** - For existing Express applications
- **[Fastify Adapter Guide](./fastify.md)** - For maximum performance and type safety
- **[Koa Adapter Guide](./koa.md)** - For modern, minimalist applications
- **[WebSocket Guide](./websocket.md)** - Real-time bidirectional communication
- **[Middleware Reference](./middleware.md)** - Complete middleware documentation
- **[Streaming Guide](./streaming.md)** - Real-time streaming with SSE and NDJSON
- **[Error Handling](./errors.md)** - Comprehensive error handling guide
- **[Configuration Reference](../../reference/server-configuration.md)** - Full configuration options
- **[OpenAPI Customization](../../reference/server-configuration.md#openapi-customization)** - Customize API documentation
- **[Security Best Practices](./security.md)** - Authentication and authorization patterns
- **[Deployment Guide](./deployment.md)** - Production deployment strategies

---

## Related Documentation

- **[API Reference](../../sdk/api-reference.md)** - NeuroLink SDK documentation
- **[MCP Integration](../../mcp-integration.md)** - Model Context Protocol tools
- **[Streaming Guide](./streaming.md)** - Real-time streaming with SSE and NDJSON
- **[Enterprise Monitoring](../../features/observability.md)** - Observability setup

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).

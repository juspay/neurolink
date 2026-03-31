---
title: Fastify Integration Guide
description: Build high-performance AI-powered REST APIs with Fastify, schema validation, and plugins
keywords: fastify, nodejs, rest api, backend, schema validation, plugins, high-performance
---

# Fastify Integration Guide

**Build high-performance AI APIs with Fastify and NeuroLink**

---

## Overview

Fastify is a high-performance Node.js web framework focused on providing the best developer experience with minimal overhead. This guide shows how to integrate NeuroLink with Fastify to create blazing-fast, production-ready AI endpoints with type-safe schema validation, plugin architecture, and built-in logging.

### Key Features

- **🚀 High Performance**: Up to 2x faster than Express with minimal overhead
- **📋 Schema Validation**: Built-in TypeBox/JSON Schema validation
- **🔌 Plugin Architecture**: Encapsulated, reusable components
- **🔒 Authentication**: JWT with @fastify/jwt, API key decorators
- **⚡ Rate Limiting**: @fastify/rate-limit with Redis support
- **📊 Built-in Logging**: Pino logger out of the box
- **🔄 Streaming**: Native SSE and WebSocket via @fastify/websocket

### What You'll Build

- Type-safe AI API with Fastify and TypeBox
- Plugin-based authentication system
- Rate-limited endpoints with Redis
- Response caching with hooks
- Streaming chat endpoints (SSE and WebSocket)
- Production monitoring with Pino and Prometheus

---

## Quick Start

### 1. Initialize Project

```bash
mkdir my-ai-api
cd my-ai-api
npm init -y
npm install fastify @juspay/neurolink dotenv
npm install @fastify/type-provider-typebox @sinclair/typebox
npm install -D @types/node typescript ts-node
```

### 2. Setup TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### 3. Create Basic Server

```typescript
// src/index.ts
import Fastify from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type, Static } from "@sinclair/typebox";
import { NeuroLink } from "@juspay/neurolink";
import dotenv from "dotenv";

dotenv.config();

// Initialize Fastify with TypeBox type provider
const app = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

// Initialize NeuroLink
const ai = new NeuroLink({
  providers: [
    {
      name: "openai",
      config: { apiKey: process.env.OPENAI_API_KEY },
    },
    {
      name: "anthropic",
      config: { apiKey: process.env.ANTHROPIC_API_KEY },
    },
  ],
});

// Request schema with TypeBox
const GenerateSchema = {
  body: Type.Object({
    prompt: Type.String({ minLength: 1, maxLength: 10000 }),
    provider: Type.Optional(Type.String()),
    model: Type.Optional(Type.String()),
  }),
};

type GenerateBody = Static<typeof GenerateSchema.body>;

// Basic endpoint with schema validation
app.post<{ Body: GenerateBody }>(
  "/api/generate",
  { schema: GenerateSchema },
  async (request, reply) => {
    const { prompt, provider = "openai", model = "gpt-4o-mini" } = request.body;

    const result = await ai.generate({
      input: { text: prompt },
      provider,
      model,
    });

    return {
      content: result.content,
      usage: result.usage,
      cost: result.cost,
    };
  },
);

// Start server
const start = async () => {
  try {
    const PORT = parseInt(process.env.PORT || "3000", 10);
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`AI API server running on http://localhost:${PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
```

### 4. Environment Variables

```bash
# .env
PORT=3000
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
```

### 5. Run Server

```bash
npx ts-node src/index.ts
```

### 6. Test API

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain AI in one sentence"}'
```

---

## Authentication

### API Key Authentication with Decorators

```typescript
// src/plugins/api-key-auth.ts
import fp from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    apiKeyAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function apiKeyAuthPlugin(fastify: FastifyInstance) {
  fastify.decorate(
    "apiKeyAuth",
    async function (request: FastifyRequest, reply: FastifyReply) {
      const apiKey = request.headers["x-api-key"] as string;

      if (!apiKey) {
        reply.code(401).send({ error: "API key is required" });
        return;
      }

      if (apiKey !== process.env.API_SECRET) {
        reply.code(401).send({ error: "Invalid API key" });
        return;
      }
    },
  );
}

export default fp(apiKeyAuthPlugin, { name: "api-key-auth" });
```

```typescript
// src/index.ts
import apiKeyAuthPlugin from "./plugins/api-key-auth";

await app.register(apiKeyAuthPlugin);

// Protected endpoint
app.post(
  "/api/generate",
  { preHandler: [app.apiKeyAuth], schema: GenerateSchema },
  async (request, reply) => {
    // ... AI generation
  },
);
```

### JWT Authentication with @fastify/jwt

```bash
npm install @fastify/jwt
```

```typescript
// src/plugins/jwt-auth.ts
import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string; username: string };
    user: { userId: string; username: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

async function jwtAuthPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "supersecret",
    sign: { expiresIn: "24h" },
  });

  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (error) {
        reply.code(401).send({ error: "Invalid or expired token" });
      }
    },
  );
}

export default fp(jwtAuthPlugin, { name: "jwt-auth" });
```

```typescript
// Login endpoint
app.post("/api/auth/login", async (request, reply) => {
  const { username, password } = request.body as any;

  if (username === "admin" && password === "password") {
    const token = app.jwt.sign({ userId: "123", username });
    return { token, expiresIn: "24h" };
  }

  reply.code(401).send({ error: "Invalid credentials" });
});

// Protected endpoint
app.post(
  "/api/generate",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user;
    // ... AI generation
  },
);
```

---

## Rate Limiting

### @fastify/rate-limit Plugin

```bash
npm install @fastify/rate-limit
```

```typescript
// src/plugins/rate-limit.ts
import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { FastifyInstance } from "fastify";

async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: (request, context) => ({
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${Math.round(context.ttl / 1000)} seconds.`,
      statusCode: 429,
    }),
    keyGenerator: (request) =>
      (request.headers["x-api-key"] as string) ||
      request.user?.userId ||
      request.ip,
  });
}

export default fp(rateLimitPlugin, { name: "rate-limit" });
```

```typescript
// Route-specific rate limit
app.post(
  "/api/analyze",
  {
    config: {
      rateLimit: { max: 10, timeWindow: "1 minute" },
    },
  },
  async (request, reply) => {
    // Expensive AI operation
  },
);
```

### Redis-Based Custom Rate Limiting

```bash
npm install @fastify/rate-limit redis
```

```typescript
// src/plugins/redis-rate-limit.ts
import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { createClient } from "redis";
import { FastifyInstance } from "fastify";

async function redisRateLimitPlugin(fastify: FastifyInstance) {
  const redis = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  await redis.connect();

  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
    redis: redis,
    nameSpace: "rate-limit:",
    skipOnError: true,
  });

  fastify.addHook("onClose", async () => {
    await redis.quit();
  });
}

export default fp(redisRateLimitPlugin, { name: "redis-rate-limit" });
```

---

## Response Caching

### Redis Caching with Hooks

```bash
npm install redis
```

```typescript
// src/plugins/cache.ts
import fp from "fastify-plugin";
import { createClient, type RedisClientType } from "redis";
import { createHash } from "crypto";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    cache: RedisClientType;
    cacheResponse: (ttl: number) => {
      onRequest: (
        request: FastifyRequest,
        reply: FastifyReply,
      ) => Promise<void>;
      onSend: (
        request: FastifyRequest,
        reply: FastifyReply,
        payload: string,
      ) => Promise<string>;
    };
  }
  interface FastifyRequest {
    cacheKey?: string;
  }
}

async function cachePlugin(fastify: FastifyInstance) {
  const redis = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  await redis.connect();

  fastify.decorate("cache", redis);

  fastify.decorate("cacheResponse", (ttl: number = 3600) => ({
    onRequest: async (request: FastifyRequest, reply: FastifyReply) => {
      const keyData = { url: request.url, body: request.body };
      request.cacheKey = `ai:${createHash("sha256")
        .update(JSON.stringify(keyData))
        .digest("hex")}`;

      const cached = await redis.get(request.cacheKey);
      if (cached) {
        reply.header("X-Cache", "HIT");
        reply.send(JSON.parse(cached));
      }
    },

    onSend: async (
      request: FastifyRequest,
      reply: FastifyReply,
      payload: string,
    ) => {
      if (request.cacheKey && reply.statusCode === 200) {
        await redis.setEx(request.cacheKey, ttl, payload);
      }
      return payload;
    },
  }));

  fastify.addHook("onClose", async () => {
    await redis.quit();
  });
}

export default fp(cachePlugin, { name: "cache" });
```

```typescript
// Cached endpoint
const cacheHooks = app.cacheResponse(3600);

app.post(
  "/api/generate",
  {
    onRequest: cacheHooks.onRequest,
    onSend: cacheHooks.onSend,
  },
  async (request, reply) => {
    const result = await ai.generate({
      input: { text: request.body.prompt },
    });
    return { content: result.content, usage: result.usage };
  },
);
```

---

## Streaming Responses

### Server-Sent Events (SSE) with reply.raw

```typescript
// src/routes/stream.ts
import { FastifyInstance } from "fastify";
import { Type, Static } from "@sinclair/typebox";

const StreamSchema = {
  body: Type.Object({
    prompt: Type.String({ minLength: 1 }),
    provider: Type.Optional(Type.String()),
  }),
};

type StreamBody = Static<typeof StreamSchema.body>;

export default async function streamRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: StreamBody }>(
    "/stream",
    { schema: StreamSchema },
    async (request, reply) => {
      const { prompt, provider = "openai" } = request.body;

      // Set SSE headers using reply.raw
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      try {
        for await (const chunk of fastify.ai.stream({
          input: { text: prompt },
          provider,
        })) {
          reply.raw.write(
            `data: ${JSON.stringify({ content: chunk.content })}\n\n`,
          );
        }

        reply.raw.write("data: [DONE]\n\n");
        reply.raw.end();
      } catch (error: any) {
        reply.raw.write(
          `data: ${JSON.stringify({ error: error.message })}\n\n`,
        );
        reply.raw.end();
      }
    },
  );
}
```

### WebSocket with @fastify/websocket

```bash
npm install @fastify/websocket
```

```typescript
// src/routes/websocket.ts
import { FastifyInstance } from "fastify";

export default async function websocketRoutes(fastify: FastifyInstance) {
  fastify.get("/ws", { websocket: true }, (socket, request) => {
    request.log.info("WebSocket client connected");

    socket.on("message", async (rawData: Buffer) => {
      try {
        const { prompt, provider = "openai" } = JSON.parse(rawData.toString());

        socket.send(JSON.stringify({ type: "start" }));

        for await (const chunk of fastify.ai.stream({
          input: { text: prompt },
          provider,
        })) {
          socket.send(
            JSON.stringify({ type: "chunk", content: chunk.content }),
          );
        }

        socket.send(JSON.stringify({ type: "done" }));
      } catch (error: any) {
        socket.send(JSON.stringify({ type: "error", error: error.message }));
      }
    });

    socket.on("close", () => {
      request.log.info("WebSocket client disconnected");
    });
  });
}
```

```typescript
// src/index.ts
import websocket from "@fastify/websocket";
import websocketRoutes from "./routes/websocket";

await app.register(websocket);
await app.register(websocketRoutes);
```

---

## Production Patterns

### Pattern 1: Plugin Architecture

```typescript
// src/plugins/neurolink.ts
import fp from "fastify-plugin";
import { NeuroLink } from "@juspay/neurolink";
import { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    ai: NeuroLink;
  }
}

async function neuroLinkPlugin(
  fastify: FastifyInstance,
  options: { providers: Array<{ name: string; config: Record<string, any> }> },
) {
  const ai = new NeuroLink({ providers: options.providers });
  fastify.decorate("ai", ai);
  fastify.log.info("NeuroLink initialized");
}

export default fp(neuroLinkPlugin, { name: "neurolink" });
```

```typescript
// src/index.ts
import neuroLinkPlugin from "./plugins/neurolink";

await app.register(neuroLinkPlugin, {
  providers: [
    { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
    { name: "anthropic", config: { apiKey: process.env.ANTHROPIC_API_KEY } },
  ],
});

// Now use app.ai anywhere
app.post("/api/generate", async (request, reply) => {
  const result = await app.ai.generate({
    input: { text: request.body.prompt },
  });
  return { content: result.content };
});
```

### Pattern 2: Usage Tracking with Hooks

```typescript
// src/plugins/usage-tracking.ts
import fp from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

async function usageTrackingPlugin(fastify: FastifyInstance) {
  fastify.addHook(
    "onSend",
    async (request: FastifyRequest, reply: FastifyReply, payload: string) => {
      if (reply.statusCode === 200) {
        try {
          const response = JSON.parse(payload);
          if (response.usage) {
            await fastify.cache.lpush(
              `usage:${request.user?.userId || "anonymous"}`,
              JSON.stringify({
                tokens: response.usage.totalTokens,
                cost: response.cost,
                timestamp: new Date(),
              }),
            );
          }
        } catch (error) {
          // Ignore non-JSON responses
        }
      }
      return payload;
    },
  );
}

export default fp(usageTrackingPlugin, { name: "usage-tracking" });
```

### Pattern 3: Error Handler with setErrorHandler

```typescript
// src/plugins/error-handler.ts
import fp from "fastify-plugin";
import { FastifyInstance, FastifyError, FastifyReply } from "fastify";

async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler(
    async (error: FastifyError, request, reply: FastifyReply) => {
      request.log.error({ error: error.message }, "Request error");

      if (error.message.includes("rate limit") || error.statusCode === 429) {
        return reply.code(429).send({
          error: "Rate Limit Exceeded",
          message: "Too many requests. Please try again later.",
        });
      }

      if (error.message.includes("quota")) {
        return reply.code(503).send({
          error: "Service Quota Exceeded",
          message: "AI service quota exceeded.",
        });
      }

      if (error.validation) {
        return reply.code(400).send({
          error: "Validation Error",
          details: error.validation,
        });
      }

      return reply.code(error.statusCode || 500).send({
        error: "Internal Server Error",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Something went wrong",
      });
    },
  );
}

export default fp(errorHandlerPlugin, { name: "error-handler" });
```

---

## Schema Validation

### TypeBox Schema Definitions

```typescript
// src/schemas/ai.ts
import { Type, Static } from "@sinclair/typebox";

export const ProviderSchema = Type.Union([
  Type.Literal("openai"),
  Type.Literal("anthropic"),
  Type.Literal("google-ai"),
]);

export const GenerateRequestSchema = Type.Object({
  prompt: Type.String({ minLength: 1, maxLength: 100000 }),
  provider: Type.Optional(ProviderSchema),
  model: Type.Optional(Type.String()),
  maxTokens: Type.Optional(Type.Integer({ minimum: 1, maximum: 128000 })),
  temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2 })),
});

export type GenerateRequest = Static<typeof GenerateRequestSchema>;

export const GenerateResponseSchema = Type.Object({
  content: Type.String(),
  provider: Type.String(),
  model: Type.String(),
  usage: Type.Object({
    inputTokens: Type.Integer(),
    outputTokens: Type.Integer(),
    totalTokens: Type.Integer(),
  }),
  cost: Type.Optional(Type.Number()),
});

export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  details: Type.Optional(Type.Any()),
});
```

### Route with Full Schema Validation

```typescript
// src/routes/ai.ts
import { FastifyInstance } from "fastify";
import {
  GenerateRequestSchema,
  GenerateResponseSchema,
  GenerateRequest,
  ErrorResponseSchema,
} from "../schemas/ai";

export default async function aiRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: GenerateRequest }>(
    "/generate",
    {
      schema: {
        body: GenerateRequestSchema,
        response: {
          200: GenerateResponseSchema,
          400: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const {
        prompt,
        provider = "openai",
        model,
        maxTokens,
        temperature,
      } = request.body;

      const result = await fastify.ai.generate({
        input: { text: prompt },
        provider,
        model,
        maxTokens,
        temperature,
      });

      return {
        content: result.content,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        cost: result.cost,
      };
    },
  );
}
```

### Validation Options

```typescript
// src/index.ts
const app = Fastify({
  logger: true,
  ajv: {
    customOptions: {
      removeAdditional: "all",
      coerceTypes: true,
      useDefaults: true,
      allErrors: true,
    },
  },
}).withTypeProvider<TypeBoxTypeProvider>();
```

---

## Monitoring and Logging

### Pino Logger (Built-in)

```typescript
// src/index.ts
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    redact: ["req.headers.authorization", "req.headers['x-api-key']"],
  },
});

// Log AI operations
app.post("/api/generate", async (request, reply) => {
  const startTime = Date.now();
  request.log.info(
    { prompt: request.body.prompt.slice(0, 50) },
    "AI request started",
  );

  const result = await app.ai.generate({
    input: { text: request.body.prompt },
  });

  request.log.info(
    {
      provider: result.provider,
      tokens: result.usage.totalTokens,
      duration: Date.now() - startTime,
    },
    "AI request completed",
  );

  return result;
});
```

### Prometheus Metrics

```bash
npm install prom-client
```

```typescript
// src/plugins/metrics.ts
import fp from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  Registry,
  Counter,
  Histogram,
  collectDefaultMetrics,
} from "prom-client";

async function metricsPlugin(fastify: FastifyInstance) {
  const register = new Registry();
  collectDefaultMetrics({ register });

  const httpRequestsTotal = new Counter({
    name: "http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["method", "route", "status"],
    registers: [register],
  });

  const aiRequestsTotal = new Counter({
    name: "ai_requests_total",
    help: "Total AI requests",
    labelNames: ["provider", "model"],
    registers: [register],
  });

  const aiRequestDuration = new Histogram({
    name: "ai_request_duration_seconds",
    help: "AI request duration",
    labelNames: ["provider", "model"],
    registers: [register],
  });

  fastify.addHook(
    "onResponse",
    async (request: FastifyRequest, reply: FastifyReply) => {
      httpRequestsTotal.inc({
        method: request.method,
        route: request.routeOptions?.url || request.url,
        status: reply.statusCode,
      });
    },
  );

  fastify.get("/metrics", async (request, reply) => {
    reply.header("Content-Type", register.contentType);
    return register.metrics();
  });

  fastify.decorate("metrics", { aiRequestsTotal, aiRequestDuration });
}

export default fp(metricsPlugin, { name: "metrics" });
```

---

## Best Practices

### 1. Use Plugin Architecture for Modularity

```typescript
// src/app.ts
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(errorHandlerPlugin);
  await app.register(metricsPlugin);
  await app.register(jwtAuthPlugin);
  await app.register(rateLimitPlugin);
  await app.register(cachePlugin);
  await app.register(neuroLinkPlugin, { providers: [...] });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(aiRoutes, { prefix: "/api" });

  return app;
}
```

### 2. Leverage TypeBox for Type Safety

```typescript
app.post<{ Body: RequestBody }>(
  "/api/generate",
  { schema: { body: RequestSchema } },
  async (request) => {
    // request.body is fully typed
    const { prompt, options } = request.body;
  },
);
```

### 3. Use Hooks for Cross-Cutting Concerns

```typescript
app.addHook("onRequest", async (request) => {
  request.startTime = Date.now();
});

app.addHook("onResponse", async (request, reply) => {
  const duration = Date.now() - request.startTime;
  request.log.info({ duration }, "Request completed");
});
```

### 4. Implement Graceful Shutdown

```typescript
const signals = ["SIGINT", "SIGTERM"];
for (const signal of signals) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
```

### 5. Validate Environment at Startup

```typescript
import { Type } from "@sinclair/typebox";
import Ajv from "ajv";

const ConfigSchema = Type.Object({
  OPENAI_API_KEY: Type.String({ minLength: 1 }),
  JWT_SECRET: Type.String({ minLength: 32 }),
});

const ajv = new Ajv({ coerceTypes: true });
if (!ajv.validate(ConfigSchema, process.env)) {
  throw new Error("Configuration validation failed");
}
```

---

## Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
RUN adduser -S fastify
USER fastify
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --spider -q http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
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

- [ ] Environment variables validated at startup
- [ ] Rate limiting configured with Redis backend
- [ ] JWT authentication implemented
- [ ] Schema validation on all endpoints
- [ ] Comprehensive error handling with setErrorHandler
- [ ] Pino logging with appropriate log levels
- [ ] Prometheus metrics exposed at /metrics
- [ ] Response caching enabled for expensive operations
- [ ] Graceful shutdown implemented
- [ ] Health check endpoint available
- [ ] CORS configured properly (@fastify/cors)
- [ ] Request size limits configured

---

## Related Documentation

- **[API Reference](../../sdk/api-reference.md)** - NeuroLink SDK
- **[Express Integration](./express.md)** - Compare with Express patterns
- **[Compliance Guide](../enterprise/compliance.md)** - Security and authentication
- **[Cost Optimization](../enterprise/cost-optimization.md)** - Reduce costs
- **[Monitoring Guide](../enterprise/monitoring.md)** - Observability

---

## Additional Resources

- **[Fastify Documentation](https://fastify.dev/docs/latest/)** - Official Fastify docs
- **[TypeBox Documentation](https://github.com/sinclairzx81/typebox)** - JSON Schema type builder
- **[Fastify Ecosystem](https://fastify.dev/ecosystem/)** - Official plugins
- **[Pino Logger](https://getpino.io/)** - Fastify's built-in logger

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).

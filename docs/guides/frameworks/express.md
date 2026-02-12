---
title: Express.js Integration Guide
description: Build AI-powered REST APIs with Express.js, authentication, and rate limiting
keywords: express, nodejs, rest api, backend, authentication, rate limiting
---

# Express.js Integration Guide

**Build production-ready AI APIs with Express.js and NeuroLink**

---

## Overview

Express.js is the most popular Node.js web framework for building APIs. This guide shows how to integrate NeuroLink with Express to create scalable, production-ready AI endpoints with authentication, rate limiting, caching, and monitoring.

### Key Features

- **🚀 RESTful APIs**: Standard HTTP endpoints for AI operations
- **🔒 Authentication**: JWT, API keys, OAuth integration
- **⚡ Rate Limiting**: Protect against abuse
- **💾 Response Caching**: Redis-based caching
- **📊 Monitoring**: Prometheus metrics, logging
- **🔄 Streaming**: Server-Sent Events (SSE) for real-time responses

### What You'll Build

- RESTful AI API with Express
- Authentication and authorization
- Rate-limited endpoints
- Response caching with Redis
- Streaming chat endpoints
- Monitoring and analytics

---

## Quick Start

### 1. Initialize Project

```bash
mkdir my-ai-api
cd my-ai-api
npm init -y
npm install express @juspay/neurolink dotenv
npm install -D @types/express @types/node typescript ts-node
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
import express from "express";
import { NeuroLink } from "@juspay/neurolink";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

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

// Basic endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, provider = "openai", model = "gpt-4o-mini" } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const result = await ai.generate({
      input: { text: prompt },
      provider,
      model,
    });

    res.json({
      content: result.content,
      usage: result.usage,
      cost: result.cost,
    });
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI API server running on http://localhost:${PORT}`);
});
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

### API Key Authentication

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({ error: "API key is required" });
  }

  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  next();
}
```

```typescript
// src/index.ts
import { apiKeyAuth } from "./middleware/auth";

// Protected endpoint
app.post("/api/generate", apiKeyAuth, async (req, res) => {
  // ... AI generation
});
```

### JWT Authentication

```typescript
// src/middleware/jwt-auth.ts
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

type AuthRequest = Request & {
  user?: any;
};

export function jwtAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
```

```typescript
// Login endpoint
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  // Verify credentials (example)
  if (username === "admin" && password === "password") {
    const token = jwt.sign(
      { userId: "123", username },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" },
    );

    return res.json({ token });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

// Protected endpoint
app.post("/api/generate", jwtAuth, async (req, res) => {
  console.log("User:", req.user);
  // ... AI generation
});
```

---

## Rate Limiting

### Express Rate Limit

```bash
npm install express-rate-limit
```

```typescript
// src/middleware/rate-limit.ts
import rateLimit from "express-rate-limit";

// Basic rate limiting
export const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for expensive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 5 requests per minute
  message: "Rate limit exceeded for this endpoint",
});
```

```typescript
// src/index.ts
import { limiter, strictLimiter } from "./middleware/rate-limit";

// Apply to all routes
app.use("/api/", limiter);

// Stricter limit for expensive endpoint
app.post("/api/analyze", strictLimiter, async (req, res) => {
  // ... expensive AI operation
});
```

### Custom Rate Limiting with Redis

```bash
npm install redis rate-limit-redis
```

```typescript
// src/middleware/redis-rate-limit.ts
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.connect();

export const redisLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rate_limit:",
  }),
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many requests",
});
```

---

## Response Caching

### Redis Caching Middleware

```bash
npm install redis
```

```typescript
// src/middleware/cache.ts
import { createClient } from "redis";
import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.connect();

export function cache(ttl: number = 3600) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Generate cache key from request body
    const cacheKey = `ai:${createHash("sha256")
      .update(JSON.stringify(req.body))
      .digest("hex")}`;

    try {
      // Check cache
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        console.log("Cache hit:", cacheKey);
        return res.json(JSON.parse(cached));
      }

      // Cache miss - store response
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        redisClient.setEx(cacheKey, ttl, JSON.stringify(body));
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("Cache error:", error);
      next();
    }
  };
}
```

```typescript
// src/index.ts
import { cache } from "./middleware/cache";

// Cached endpoint (1 hour TTL)
app.post("/api/generate", cache(3600), async (req, res) => {
  const result = await ai.generate({
    input: { text: req.body.prompt },
  });

  res.json({ content: result.content });
});
```

---

## Streaming Responses

### Server-Sent Events (SSE)

```typescript
// src/routes/stream.ts
import { Router } from "express";
import { ai } from "../ai";

const router = Router();

router.post("/stream", async (req, res) => {
  const { prompt } = req.body;

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const chunk of ai.stream({
      input: { text: prompt },
      provider: "openai",
      model: "gpt-4o-mini",
    })) {
      res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

export default router;
```

```typescript
// src/index.ts
import streamRouter from "./routes/stream";

app.use("/api", streamRouter);
```

### WebSocket Streaming

```bash
npm install ws @types/ws
```

```typescript
// src/websocket.ts
import { WebSocketServer } from "ws";
import { Server } from "http";
import { ai } from "./ai";

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", async (data) => {
      try {
        const {
          prompt,
          provider = "openai",
          model = "gpt-4o-mini",
        } = JSON.parse(data.toString());

        // Stream AI response over WebSocket
        for await (const chunk of ai.stream({
          input: { text: prompt },
          provider,
          model,
        })) {
          ws.send(JSON.stringify({ type: "chunk", content: chunk.content }));
        }

        ws.send(JSON.stringify({ type: "done" }));
      } catch (error: any) {
        ws.send(JSON.stringify({ type: "error", error: error.message }));
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });
}
```

```typescript
// src/index.ts
import { createServer } from "http";
import { setupWebSocket } from "./websocket";

const server = createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server with WebSocket running on port ${PORT}`);
});
```

---

## Production Patterns

### Pattern 1: Multi-Endpoint AI API

```typescript
// src/routes/ai.ts
import { Router } from "express";
import { ai } from "../ai";
import { jwtAuth } from "../middleware/jwt-auth";
import { limiter } from "../middleware/rate-limit";
import { cache } from "../middleware/cache";

const router = Router();

// Text generation
router.post("/generate", jwtAuth, limiter, cache(3600), async (req, res) => {
  try {
    const { prompt, provider = "openai", model = "gpt-4o-mini" } = req.body;

    const result = await ai.generate({
      input: { text: prompt },
      provider,
      model,
    });

    res.json({
      content: result.content,
      usage: result.usage,
      cost: result.cost,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Summarization
router.post("/summarize", jwtAuth, limiter, async (req, res) => {
  try {
    const { text } = req.body;

    const result = await ai.generate({
      input: { text: `Summarize this text:\n\n${text}` },
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 200,
    });

    res.json({ summary: result.content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Translation
router.post("/translate", jwtAuth, limiter, cache(86400), async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    const result = await ai.generate({
      input: { text: `Translate to ${targetLanguage}: ${text}` },
      provider: "google-ai",
      model: "gemini-2.0-flash",
    });

    res.json({ translation: result.content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Code generation
router.post("/code", jwtAuth, limiter, async (req, res) => {
  try {
    const { description, language } = req.body;

    const result = await ai.generate({
      input: { text: `Write ${language} code: ${description}` },
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    });

    res.json({ code: result.content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Pattern 2: Usage Tracking

```typescript
// src/middleware/usage-tracking.ts
import { Request, Response, NextFunction } from "express";
import { prisma } from "../db";

type AuthRequest = Request & {
  user?: any;
};

export function trackUsage(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const originalJson = res.json.bind(res);

  res.json = async function (body: any) {
    // Track AI usage in database
    if (req.user && body.usage) {
      await prisma.aiUsage.create({
        data: {
          userId: req.user.userId,
          provider: body.provider || "unknown",
          model: body.model || "unknown",
          tokens: body.usage.totalTokens,
          cost: body.cost || 0,
          endpoint: req.path,
          timestamp: new Date(),
        },
      });
    }

    return originalJson(body);
  };

  next();
}
```

```typescript
// src/routes/ai.ts
import { trackUsage } from "../middleware/usage-tracking";

router.post("/generate", jwtAuth, limiter, trackUsage, async (req, res) => {
  // ... AI generation
});

// Get user's usage stats
router.get("/usage", jwtAuth, async (req, res) => {
  const stats = await prisma.aiUsage.aggregate({
    where: { userId: req.user.userId },
    _sum: { tokens: true, cost: true },
    _count: true,
  });

  res.json({
    totalRequests: stats._count,
    totalTokens: stats._sum.tokens || 0,
    totalCost: stats._sum.cost || 0,
  });
});
```

### Pattern 3: Error Handling

```typescript
// src/middleware/error-handler.ts
import { Request, Response, NextFunction } from "express";

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error("Error:", error);

  // AI provider errors
  if (error.message.includes("rate limit")) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      message: "Please try again later",
    });
  }

  if (error.message.includes("quota")) {
    return res.status(503).json({
      error: "Service quota exceeded",
      message: "AI service temporarily unavailable",
    });
  }

  if (error.message.includes("authentication")) {
    return res.status(401).json({
      error: "Authentication failed",
      message: "Invalid API credentials",
    });
  }

  // Generic error
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
}
```

```typescript
// src/index.ts
import { errorHandler } from "./middleware/error-handler";

// ... routes

// Error handler must be last
app.use(errorHandler);
```

---

## Monitoring & Logging

### Prometheus Metrics

```bash
npm install prom-client
```

```typescript
// src/metrics.ts
import { Registry, Counter, Histogram } from "prom-client";

export const register = new Registry();

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export const aiRequestsTotal = new Counter({
  name: "ai_requests_total",
  help: "Total AI requests",
  labelNames: ["provider", "model"],
  registers: [register],
});

export const aiRequestDuration = new Histogram({
  name: "ai_request_duration_seconds",
  help: "AI request duration",
  labelNames: ["provider", "model"],
  registers: [register],
});

export const aiTokensUsed = new Counter({
  name: "ai_tokens_used_total",
  help: "Total AI tokens used",
  labelNames: ["provider", "model"],
  registers: [register],
});

export const aiCostTotal = new Counter({
  name: "ai_cost_total",
  help: "Total AI cost in USD",
  labelNames: ["provider", "model"],
  registers: [register],
});
```

```typescript
// src/index.ts
import { register, httpRequestsTotal, aiRequestsTotal } from "./metrics";

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
});

// Track HTTP requests
app.use((req, res, next) => {
  res.on("finish", () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode,
    });
  });
  next();
});
```

### Request Logging

```bash
npm install winston
```

```typescript
// src/logger.ts
import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});
```

```typescript
// src/index.ts
import { logger } from "./logger";

app.post("/api/generate", async (req, res) => {
  logger.info("AI request received", {
    userId: req.user?.userId,
    prompt: req.body.prompt.substring(0, 50),
  });

  try {
    const result = await ai.generate({
      /* ... */
    });

    logger.info("AI request completed", {
      userId: req.user?.userId,
      provider: result.provider,
      tokens: result.usage.totalTokens,
      cost: result.cost,
    });

    res.json(result);
  } catch (error: any) {
    logger.error("AI request failed", {
      userId: req.user?.userId,
      error: error.message,
    });

    res.status(500).json({ error: error.message });
  }
});
```

---

## Best Practices

### 1. ✅ Use Middleware for Cross-Cutting Concerns

```typescript
// ✅ Good: Compose middleware
app.post(
  "/api/generate",
  jwtAuth, // Authentication
  limiter, // Rate limiting
  cache(3600), // Caching
  trackUsage, // Analytics
  async (req, res) => {
    // Business logic
  },
);
```

### 2. ✅ Implement Proper Error Handling

```typescript
// ✅ Good: Centralized error handling
app.use(errorHandler);
```

### 3. ✅ Cache Expensive Operations

```typescript
// ✅ Good: Cache AI responses
app.post("/api/generate", cache(3600), async (req, res) => {
  // ...
});
```

### 4. ✅ Monitor Performance

```typescript
// ✅ Good: Track metrics
aiRequestDuration.observe({ provider, model }, duration);
aiTokensUsed.inc({ provider, model }, tokens);
```

### 5. ✅ Validate Inputs

```bash
npm install express-validator
```

```typescript
import { body, validationResult } from "express-validator";

app.post(
  "/api/generate",
  body("prompt").isString().isLength({ min: 1, max: 10000 }),
  body("provider").optional().isIn(["openai", "anthropic", "google-ai"]),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // ... AI generation
  },
);
```

---

## Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

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

- [ ] Environment variables configured
- [ ] Rate limiting enabled
- [ ] Authentication implemented
- [ ] Error handling comprehensive
- [ ] Logging configured
- [ ] Metrics endpoint exposed
- [ ] Caching enabled
- [ ] HTTPS configured
- [ ] CORS configured properly
- [ ] Input validation in place

---

## Related Documentation

- **[API Reference](../../sdk/api-reference.md)** - NeuroLink SDK
- **[Compliance Guide](../enterprise/compliance.md)** - Security and authentication
- **[Cost Optimization](../enterprise/cost-optimization.md)** - Reduce costs
- **[Monitoring](../enterprise/monitoring.md)** - Observability
- [Fastify Integration](fastify.md) - High-performance alternative with schema validation

---

## Additional Resources

- **[Express.js Documentation](https://expressjs.com/)** - Official Express docs
- **[Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)** - Production patterns
- **[Express Security](https://expressjs.com/en/advanced/best-practice-security.html)** - Security best practices

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).

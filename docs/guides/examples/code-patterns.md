---
title: Production Code Patterns
description: Best practices, anti-patterns, and battle-tested patterns for production AI applications
keywords: code patterns, best practices, anti-patterns, error handling, caching, rate limiting
---

# Production Code Patterns

**Battle-tested patterns, anti-patterns, and best practices for production AI applications**

---

## Overview

This guide provides reusable code patterns for building production-ready AI applications with NeuroLink. Each pattern includes implementation code, use cases, and common pitfalls.

---

## Table of Contents

1. [Error Handling Patterns](#error-handling-patterns)
2. [Retry & Backoff Strategies](#retry--backoff-strategies)
3. [Streaming Patterns](#streaming-patterns)
4. [Rate Limiting Patterns](#rate-limiting-patterns)
5. [Caching Patterns](#caching-patterns)
6. [Middleware Patterns](#middleware-patterns)
7. [Testing Patterns](#testing-patterns)
8. [Performance Optimization](#performance-optimization)
9. [Security Patterns](#security-patterns)
10. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Error Handling Patterns

### Pattern 1: Comprehensive Error Handling

```typescript
import { NeuroLink, NeuroLinkError } from "@raisahai/neurolink";

class RobustAIService {
  private ai: NeuroLink;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
        {
          name: "anthropic",
          config: { apiKey: process.env.ANTHROPIC_API_KEY },
        },
      ],
      failoverConfig: { enabled: true },
    });
  }

  async generate(prompt: string): Promise<{
    success: boolean;
    content?: string;
    error?: {
      type: string;
      message: string;
      retryable: boolean;
    };
  }> {
    try {
      const result = await this.ai.generate({
        input: { text: prompt },
        provider: "openai",
      });

      return {
        success: true,
        content: result.content,
      };
    } catch (error) {
      if (error instanceof NeuroLinkError) {
        return this.handleNeuroLinkError(error);
      }

      if (error.code === "ECONNREFUSED") {
        return {
          success: false,
          error: {
            type: "NetworkError",
            message: "Cannot connect to AI provider",
            retryable: true,
          },
        };
      }

      if (error.status === 429) {
        return {
          success: false,
          error: {
            type: "RateLimitError",
            message: "Rate limit exceeded",
            retryable: true,
          },
        };
      }

      if (error.status === 401 || error.status === 403) {
        return {
          success: false,
          error: {
            type: "AuthenticationError",
            message: "Invalid API credentials",
            retryable: false,
          },
        };
      }

      return {
        success: false,
        error: {
          type: "UnknownError",
          message: error.message || "An unknown error occurred",
          retryable: false,
        },
      };
    }
  }

  private handleNeuroLinkError(error: NeuroLinkError): any {
    switch (error.code) {
      case "PROVIDER_ERROR":
        return {
          success: false,
          error: {
            type: "ProviderError",
            message: error.message,
            retryable: true,
          },
        };

      case "QUOTA_EXCEEDED":
        return {
          success: false,
          error: {
            type: "QuotaExceeded",
            message: "Provider quota exceeded",
            retryable: true,
          },
        };

      case "TIMEOUT":
        return {
          success: false,
          error: {
            type: "Timeout",
            message: "Request timed out",
            retryable: true,
          },
        };

      default:
        return {
          success: false,
          error: {
            type: "Error",
            message: error.message,
            retryable: false,
          },
        };
    }
  }
}

const aiService = new RobustAIService();
const result = await aiService.generate("Hello");

if (!result.success) {
  if (result.error.retryable) {
    console.log("Retryable error:", result.error.message);
  } else {
    console.error("Fatal error:", result.error.message);
  }
}
```

### Pattern 2: Graceful Degradation

```typescript
class GracefulAIService {
  private ai: NeuroLink;

  async generateWithFallback(prompt: string): Promise<string> {
    try {
      const result = await this.ai.generate({
        input: { text: prompt },
        provider: "openai",
        model: "gpt-4o",
      });
      return result.content;
    } catch (error) {
      console.warn("GPT-4o failed, trying GPT-4o-mini");

      try {
        const result = await this.ai.generate({
          input: { text: prompt },
          provider: "openai",
          model: "gpt-4o-mini",
        });
        return result.content;
      } catch (error) {
        console.warn("OpenAI failed, trying Google AI");

        try {
          const result = await this.ai.generate({
            input: { text: prompt },
            provider: "google-ai",
            model: "gemini-2.0-flash",
          });
          return result.content;
        } catch (error) {
          return this.getStaticFallback(prompt);
        }
      }
    }
  }

  private getStaticFallback(prompt: string): string {
    return "I'm currently experiencing technical difficulties. Please try again later.";
  }
}
```

---

## Retry & Backoff Strategies

### Pattern 1: Exponential Backoff

```typescript
class RetryableAIService {
  private ai: NeuroLink;

  async generateWithRetry(
    // (1)!
    prompt: string,
    maxRetries: number = 3,
  ): Promise<string> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // (2)!
      try {
        const result = await this.ai.generate({
          input: { text: prompt },
          provider: "openai",
        });
        return result.content; // (3)!
      } catch (error) {
        lastError = error;

        if (!this.isRetryable(error)) {
          // (4)!
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // (5)!
          console.log(
            `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
          );
          await this.sleep(delay); // (6)!
        }
      }
    }

    throw lastError; // (7)!
  }

  private isRetryable(error: any): boolean {
    // (8)!
    return (
      error.status === 429 ||
      error.status === 500 ||
      error.status === 502 ||
      error.status === 503 ||
      error.status === 504 ||
      error.code === "ECONNREFUSED" ||
      error.code === "ETIMEDOUT"
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

1. **Retry wrapper**: Automatically retry failed AI requests with exponential backoff to handle transient failures.
2. **Retry loop**: Attempt up to `maxRetries + 1` times (initial attempt + retries). Break early on success.
3. **Success path**: Return immediately on successful generation, no retries needed.
4. **Check if retryable**: Only retry transient errors (rate limits, server errors). Don't retry auth errors or invalid requests.
5. **Exponential backoff**: Wait 1s, 2s, 4s, 8s... between retries (capped at 10s) to give the service time to recover.
6. **Wait before retry**: Sleep to implement backoff delay. Prevents hammering a failing service.
7. **All retries exhausted**: If all attempts fail, throw the last error to the caller.
8. **Retryable errors**: Rate limits (429), server errors (5xx), and network errors are temporary and worth retrying.

### Pattern 2: Exponential Backoff with Jitter

```typescript
class AdvancedRetryService {
  async generateWithJitter(
    prompt: string,
    maxRetries: number = 5,
  ): Promise<string> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.ai.generate({
          input: { text: prompt },
          provider: "openai",
        });
        return result.content;
      } catch (error) {
        if (!this.isRetryable(error) || attempt === maxRetries) {
          throw error;
        }

        const baseDelay = 1000 * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay + jitter, 30000);

        console.log(
          `Retry ${attempt + 1}/${maxRetries} after ${delay.toFixed(0)}ms`,
        );
        await this.sleep(delay);
      }
    }
  }

  private isRetryable(error: any): boolean {
    return error.status >= 500 || error.status === 429;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

---

## Streaming Patterns

### Pattern 1: Server-Sent Events (SSE)

```typescript
import express from "express";

const app = express();

app.get("/api/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream"); // (1)!
  res.setHeader("Cache-Control", "no-cache"); // (2)!
  res.setHeader("Connection", "keep-alive"); // (3)!

  try {
    for await (const chunk of ai.stream({
      // (4)!
      input: { text: req.query.prompt as string },
      provider: "anthropic",
    })) {
      res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`); // (5)!
    }

    res.write("data: [DONE]\n\n"); // (6)!
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`); // (7)!
    res.end();
  }
});
```

1. **SSE content type**: Set `text/event-stream` to enable Server-Sent Events streaming to the browser.
2. **Disable caching**: Prevent proxies and browsers from caching streaming responses.
3. **Keep connection alive**: Maintain long-lived HTTP connection for streaming (won't close after first response).
4. **Stream from AI**: Use `ai.stream()` which returns an async iterator of content chunks as they arrive from the provider.
5. **SSE message format**: Each message starts with `data:` followed by JSON and ends with two newlines (`\n\n`).
6. **Completion signal**: Send `[DONE]` to notify client that streaming is complete and connection can be closed.
7. **Error handling**: Stream errors back to client in same SSE format so UI can display them.

### Pattern 2: React Streaming UI

```typescript
'use client';

import { useState } from 'react';

export default function StreamingChat() {
  const [content, setContent] = useState('');
  const [streaming, setStreaming] = useState(false);

  async function handleStream(prompt: string) {
    setContent('');
    setStreaming(true);

    const response = await fetch('/api/stream?prompt=' + encodeURIComponent(prompt));
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            setStreaming(false);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            setContent(prev => prev + parsed.content);
          } catch (e) {
          }
        }
      }
    }
  }

  return (
    <div>
      <button onClick={() => handleStream('Hello AI')}>
        Start Streaming
      </button>
      <pre>{content}</pre>
      {streaming && <div>Streaming...</div>}
    </div>
  );
}
```

---

## Rate Limiting Patterns

### Pattern 1: Token Bucket

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(tokens: number = 1): Promise<boolean> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async waitForTokens(tokens: number = 1): Promise<void> {
    while (!(await this.consume(tokens))) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

class RateLimitedAIService {
  private ai: NeuroLink;
  private rateLimiter: TokenBucket;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
      ],
    });

    this.rateLimiter = new TokenBucket(10, 1);
  }

  async generate(prompt: string): Promise<string> {
    await this.rateLimiter.waitForTokens(1);

    const result = await this.ai.generate({
      input: { text: prompt },
      provider: "openai",
    });

    return result.content;
  }
}
```

### Pattern 2: Sliding Window

```typescript
class SlidingWindowRateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number,
  ) {}

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  async waitForSlot(): Promise<void> {
    while (!(await this.checkLimit())) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

class WindowRateLimitedService {
  private limiter: SlidingWindowRateLimiter;

  constructor() {
    this.limiter = new SlidingWindowRateLimiter(100, 60000);
  }

  async generate(prompt: string): Promise<string> {
    await this.limiter.waitForSlot();

    const result = await ai.generate({
      input: { text: prompt },
      provider: "openai",
    });

    return result.content;
  }
}
```

---

## Caching Patterns

### Pattern 1: In-Memory Cache with TTL

```typescript
type CacheEntry<T> = {
  value: T;
  expiry: number;
};

class CachedAIService {
  private cache: Map<string, CacheEntry<string>> = new Map();
  private ai: NeuroLink;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
      ],
    });

    setInterval(() => this.cleanup(), 60000);
  }

  async generate(prompt: string, ttlSeconds: number = 3600): Promise<string> {
    const cacheKey = this.getCacheKey(prompt);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      console.log("Cache hit");
      return cached.value;
    }

    console.log("Cache miss");
    const result = await this.ai.generate({
      input: { text: prompt },
      provider: "openai",
    });

    this.cache.set(cacheKey, {
      value: result.content,
      expiry: Date.now() + ttlSeconds * 1000,
    });

    return result.content;
  }

  private getCacheKey(prompt: string): string {
    return require("crypto").createHash("sha256").update(prompt).digest("hex");
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry <= now) {
        this.cache.delete(key);
      }
    }
  }
}
```

### Pattern 2: Redis Cache

```typescript
import Redis from "ioredis";

class RedisCachedAIService {
  private redis: Redis;
  private ai: NeuroLink;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
    });

    this.ai = new NeuroLink({
      providers: [
        { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
      ],
    });
  }

  async generate(prompt: string, ttlSeconds: number = 3600): Promise<string> {
    const cacheKey = `ai:${this.hash(prompt)}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      console.log("Redis cache hit");
      return cached;
    }

    console.log("Redis cache miss");
    const result = await this.ai.generate({
      input: { text: prompt },
      provider: "openai",
    });

    await this.redis.setex(cacheKey, ttlSeconds, result.content);

    return result.content;
  }

  private hash(str: string): string {
    return require("crypto").createHash("sha256").update(str).digest("hex");
  }
}
```

---

## Middleware Patterns

### Pattern 1: Logging Middleware

```typescript
class LoggingMiddleware {
  async execute(
    prompt: string,
    next: (prompt: string) => Promise<string>,
  ): Promise<string> {
    const startTime = Date.now();

    console.log("[AI Request]", {
      timestamp: new Date().toISOString(),
      prompt: prompt.substring(0, 100) + "...",
    });

    try {
      const result = await next(prompt);
      const duration = Date.now() - startTime;

      console.log("[AI Response]", {
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        responseLength: result.length,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error("[AI Error]", {
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        error: error.message,
      });

      throw error;
    }
  }
}
```

### Pattern 2: Metrics Middleware

```typescript
import { Counter, Histogram } from "prom-client";

class MetricsMiddleware {
  private requestCounter: Counter;
  private durationHistogram: Histogram;

  constructor() {
    this.requestCounter = new Counter({
      name: "ai_requests_total",
      help: "Total AI requests",
      labelNames: ["status"],
    });

    this.durationHistogram = new Histogram({
      name: "ai_request_duration_seconds",
      help: "AI request duration",
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });
  }

  async execute(
    prompt: string,
    next: (prompt: string) => Promise<string>,
  ): Promise<string> {
    const startTime = Date.now();

    try {
      const result = await next(prompt);

      this.requestCounter.inc({ status: "success" });
      this.durationHistogram.observe((Date.now() - startTime) / 1000);

      return result;
    } catch (error) {
      this.requestCounter.inc({ status: "error" });
      this.durationHistogram.observe((Date.now() - startTime) / 1000);

      throw error;
    }
  }
}
```

### Pattern 3: Composable Middleware Pipeline

```typescript
type Middleware = (
  prompt: string,
  next: (prompt: string) => Promise<string>,
) => Promise<string>;

class MiddlewarePipeline {
  private middlewares: Middleware[] = [];

  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(
    prompt: string,
    handler: (prompt: string) => Promise<string>,
  ): Promise<string> {
    let index = 0;

    const next = async (p: string): Promise<string> => {
      if (index >= this.middlewares.length) {
        return handler(p);
      }

      const middleware = this.middlewares[index++];
      return middleware(p, next);
    };

    return next(prompt);
  }
}

const pipeline = new MiddlewarePipeline()
  .use(new LoggingMiddleware().execute.bind(new LoggingMiddleware()))
  .use(new MetricsMiddleware().execute.bind(new MetricsMiddleware()));

const result = await pipeline.execute(prompt, async (p) => {
  const res = await ai.generate({ input: { text: p }, provider: "openai" });
  return res.content;
});
```

---

## Testing Patterns

### Pattern 1: Mock AI Responses

```typescript
import { NeuroLink } from "@raisahai/neurolink";

class MockAIService {
  private responses: Map<string, string> = new Map();

  setMockResponse(prompt: string, response: string): void {
    this.responses.set(prompt, response);
  }

  async generate(prompt: string): Promise<string> {
    const response = this.responses.get(prompt);
    if (!response) {
      throw new Error(`No mock response for prompt: ${prompt}`);
    }
    return response;
  }
}

describe("CustomerSupportBot", () => {
  let mockAI: MockAIService;
  let bot: CustomerSupportBot;

  beforeEach(() => {
    mockAI = new MockAIService();
    bot = new CustomerSupportBot(mockAI as any);
  });

  it("should classify FAQ queries correctly", async () => {
    mockAI.setMockResponse("Classify...", "faq");

    const result = await bot.classifyIntent("What is your return policy?");

    expect(result).toBe("faq");
  });

  it("should generate appropriate responses", async () => {
    mockAI.setMockResponse(
      "Answer this FAQ...",
      "We have a 30-day return policy.",
    );

    const response = await bot.handleFAQ("What is your return policy?");

    expect(response).toContain("30-day");
  });
});
```

### Pattern 2: Integration Testing

```typescript
import { NeuroLink } from "@raisahai/neurolink";

describe("AI Integration Tests", () => {
  let ai: NeuroLink;

  beforeAll(() => {
    ai = new NeuroLink({
      providers: [
        {
          name: "openai",
          config: { apiKey: process.env.OPENAI_API_KEY_TEST },
        },
      ],
    });
  });

  it("should generate response", async () => {
    const result = await ai.generate({
      input: { text: 'Say "test successful"' },
      provider: "openai",
    });

    expect(result.content).toContain("test successful");
  }, 30000);

  it("should handle errors gracefully", async () => {
    const aiWithBadKey = new NeuroLink({
      providers: [
        {
          name: "openai",
          config: { apiKey: "invalid-key" },
        },
      ],
    });

    await expect(
      aiWithBadKey.generate({
        input: { text: "test" },
        provider: "openai",
      }),
    ).rejects.toThrow();
  });
});
```

---

## Performance Optimization

### Pattern 1: Parallel Requests

```typescript
async function generateMultiple(prompts: string[]): Promise<string[]> {
  const results = await Promise.all(
    prompts.map((prompt) =>
      ai.generate({
        input: { text: prompt },
        provider: "openai",
      }),
    ),
  );

  return results.map((r) => r.content);
}

const prompts = [
  "Summarize article 1",
  "Summarize article 2",
  "Summarize article 3",
];

const summaries = await generateMultiple(prompts);
```

### Pattern 2: Batching with Queue

```typescript
class BatchQueue {
  private queue: Array<{
    prompt: string;
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  }> = [];

  private processing = false;

  constructor(
    private batchSize: number = 10,
    private batchDelay: number = 100,
  ) {}

  async add(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ prompt, resolve, reject });

      if (!this.processing) {
        this.processBatch();
      }
    });
  }

  private async processBatch(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);

      try {
        const results = await Promise.all(
          batch.map((item) =>
            ai.generate({
              input: { text: item.prompt },
              provider: "openai",
            }),
          ),
        );

        batch.forEach((item, index) => {
          item.resolve(results[index].content);
        });
      } catch (error) {
        batch.forEach((item) => {
          item.reject(error as Error);
        });
      }

      if (this.queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.batchDelay));
      }
    }

    this.processing = false;
  }
}

const batchQueue = new BatchQueue(10, 100);

const result1 = batchQueue.add("Prompt 1");
const result2 = batchQueue.add("Prompt 2");
const result3 = batchQueue.add("Prompt 3");

const [r1, r2, r3] = await Promise.all([result1, result2, result3]);
```

---

## Security Patterns

### Pattern 1: Input Sanitization

```typescript
class SecureAIService {
  async generate(userInput: string): Promise<string> {
    const sanitized = this.sanitizeInput(userInput);

    const result = await ai.generate({
      input: {
        text: `Respond to this user query: "${sanitized}"

Do not execute any commands or code.`,
      },
      provider: "openai",
    });

    return result.content;
  }

  private sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, "")
      .replace(/system:|ignore previous instructions/gi, "")
      .trim()
      .substring(0, 1000);
  }
}
```

### Pattern 2: API Key Rotation

```typescript
class RotatingKeyService {
  private keys: string[];
  private currentIndex = 0;

  constructor(keys: string[]) {
    this.keys = keys;
  }

  getNextKey(): string {
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
  }

  async generate(prompt: string): Promise<string> {
    const apiKey = this.getNextKey();

    const ai = new NeuroLink({
      providers: [
        {
          name: "openai",
          config: { apiKey },
        },
      ],
    });

    const result = await ai.generate({
      input: { text: prompt },
      provider: "openai",
    });

    return result.content;
  }
}

const service = new RotatingKeyService([
  process.env.OPENAI_KEY_1,
  process.env.OPENAI_KEY_2,
  process.env.OPENAI_KEY_3,
]);
```

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: No Error Handling

```typescript
async function bad() {
  const result = await ai.generate({
    input: { text: prompt },
    provider: "openai",
  });
  return result.content;
}
```

**Why it's bad**: No error handling means crashes on API failures

**✅ Better approach**:

```typescript
async function good() {
  try {
    const result = await ai.generate({
      input: { text: prompt },
      provider: "openai",
    });
    return result.content;
  } catch (error) {
    console.error("AI error:", error);
    return "Sorry, I encountered an error";
  }
}
```

### ❌ Anti-Pattern 2: Hardcoded API Keys

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "openai",
      config: { apiKey: "sk-1234567890abcdef" },
    },
  ],
});
```

**Why it's bad**: Security risk, keys in version control

**✅ Better approach**:

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "openai",
      config: { apiKey: process.env.OPENAI_API_KEY },
    },
  ],
});
```

### ❌ Anti-Pattern 3: No Rate Limiting

```typescript
for (let i = 0; i < 1000; i++) {
  await ai.generate({ input: { text: prompts[i] }, provider: "openai" });
}
```

**Why it's bad**: Will hit rate limits, waste money

**✅ Better approach**:

```typescript
const rateLimiter = new TokenBucket(10, 1);

for (let i = 0; i < 1000; i++) {
  await rateLimiter.waitForTokens();
  await ai.generate({ input: { text: prompts[i] }, provider: "openai" });
}
```

### ❌ Anti-Pattern 4: No Caching

```typescript
async function translateText(text: string) {
  return await ai.generate({
    input: { text: `Translate to Spanish: ${text}` },
    provider: "openai",
  });
}

await translateText("Hello");
await translateText("Hello");
await translateText("Hello");
```

**Why it's bad**: Wastes money on duplicate requests

**✅ Better approach**:

```typescript
const cache = new Map();

async function translateText(text: string) {
  if (cache.has(text)) {
    return cache.get(text);
  }

  const result = await ai.generate({
    input: { text: `Translate to Spanish: ${text}` },
    provider: "openai",
  });

  cache.set(text, result.content);
  return result.content;
}
```

### ❌ Anti-Pattern 5: Blocking Sequential Requests

```typescript
const result1 = await ai.generate({
  input: { text: "Query 1" },
  provider: "openai",
});
const result2 = await ai.generate({
  input: { text: "Query 2" },
  provider: "openai",
});
const result3 = await ai.generate({
  input: { text: "Query 3" },
  provider: "openai",
});
```

**Why it's bad**: Slow, wastes time

**✅ Better approach**:

```typescript
const [result1, result2, result3] = await Promise.all([
  ai.generate({ input: { text: "Query 1" }, provider: "openai" }),
  ai.generate({ input: { text: "Query 2" }, provider: "openai" }),
  ai.generate({ input: { text: "Query 3" }, provider: "openai" }),
]);
```

### ❌ Anti-Pattern 6: No Timeouts

```typescript
const result = await ai.generate({
  input: { text: veryLongPrompt },
  provider: "openai",
});
```

**Why it's bad**: Can hang indefinitely

**✅ Better approach**:

```typescript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("Timeout")), 30000),
);

const result = await Promise.race([
  ai.generate({ input: { text: veryLongPrompt }, provider: "openai" }),
  timeoutPromise,
]);
```

### ❌ Anti-Pattern 7: Ignoring Token Limits

```typescript
const result = await ai.generate({
  input: { text: massiveDocument },
  provider: "openai",
  model: "gpt-4o",
});
```

**Why it's bad**: Will fail on token limit

**✅ Better approach**:

```typescript
const MAX_TOKENS = 100000;

let text = massiveDocument;
if (text.length > MAX_TOKENS * 4) {
  text = text.substring(0, MAX_TOKENS * 4);
}

const result = await ai.generate({
  input: { text },
  provider: "openai",
  model: "gpt-4o",
});
```

---

## Related Documentation

- [Use Cases](./use-cases.md) - Real-world examples
- [Enterprise Features](../../guides/enterprise/multi-provider-failover.md) - Production patterns
- [Provider Setup](../../getting-started/providers/index.md) - Provider configuration

---

## Summary

You've learned production-ready patterns for:

✅ Error handling and graceful degradation
✅ Retry strategies with exponential backoff
✅ Streaming responses (SSE, React)
✅ Rate limiting (Token Bucket, Sliding Window)
✅ Caching (In-memory, Redis)
✅ Middleware pipelines
✅ Testing strategies
✅ Performance optimization
✅ Security best practices
✅ Anti-patterns to avoid

These patterns form the foundation of robust, production-ready AI applications.

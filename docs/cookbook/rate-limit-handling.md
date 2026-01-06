# Rate Limit Handling

## Problem

AI providers enforce rate limits to prevent abuse and ensure fair usage. Exceeding these limits results in:

- HTTP 429 errors
- Request failures
- Service disruption
- Temporary bans

Different providers have different limits:

- OpenAI: 3,500 requests/min (paid tier)
- Anthropic: 50 requests/min (free tier)
- Google AI: 60 requests/min

## Solution

Implement intelligent rate limiting with:

1. Token bucket algorithm
2. Request queuing
3. Automatic backoff
4. Per-provider limits
5. Request prioritization

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";

type RateLimitConfig = {
  requestsPerMinute: number;
  burstSize?: number;
  retryAfter?: number;
};

class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private tokens: number;
  private lastRefill: number;
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      requestsPerMinute: config.requestsPerMinute,
      burstSize: config.burstSize || config.requestsPerMinute,
      retryAfter: config.retryAfter || 60000,
    };
    this.tokens = this.config.burstSize;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / 60000) * this.config.requestsPerMinute;

    this.tokens = Math.min(this.tokens + tokensToAdd, this.config.burstSize);
    this.lastRefill = now;
  }

  /**
   * Wait until a token is available
   */
  private async waitForToken(): Promise<void> {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time for next token
    const tokensNeeded = 1 - this.tokens;
    const waitTime = (tokensNeeded / this.config.requestsPerMinute) * 60000;

    console.log(
      `⏳ Rate limit: waiting ${Math.ceil(waitTime)}ms for next token`,
    );

    await new Promise((resolve) => setTimeout(resolve, waitTime));
    this.tokens = 0; // Token consumed
  }

  /**
   * Execute a request with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForToken();

    try {
      return await fn();
    } catch (error: any) {
      // Handle rate limit error
      if (error.status === 429) {
        const retryAfter =
          error.headers?.["retry-after"] || this.config.retryAfter / 1000;

        console.log(`⚠️  Rate limit hit. Retrying after ${retryAfter}s`);

        // Reset tokens on rate limit
        this.tokens = 0;

        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));

        return this.execute(fn);
      }

      throw error;
    }
  }
}

/**
 * Multi-provider rate limiter
 */
class ProviderRateLimiter {
  private limiters = new Map<string, RateLimiter>();
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink();

    // Configure per-provider limits
    this.limiters.set(
      "openai",
      new RateLimiter({ requestsPerMinute: 3000, burstSize: 100 }),
    );
    this.limiters.set(
      "anthropic",
      new RateLimiter({ requestsPerMinute: 50, burstSize: 10 }),
    );
    this.limiters.set(
      "google-ai",
      new RateLimiter({ requestsPerMinute: 60, burstSize: 15 }),
    );
  }

  /**
   * Generate with automatic rate limiting
   */
  async generate(
    prompt: string,
    provider: string = "openai",
    options: any = {},
  ) {
    const limiter = this.limiters.get(provider);
    if (!limiter) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    return limiter.execute(async () => {
      const result = await this.neurolink.generate({
        input: { text: prompt },
        provider,
        ...options,
      });

      console.log(`✅ Request completed (${provider})`);
      return result;
    });
  }

  /**
   * Batch requests with rate limiting
   */
  async batchGenerate(prompts: string[], provider: string = "openai") {
    const results = [];

    for (let i = 0; i < prompts.length; i++) {
      console.log(`\nProcessing ${i + 1}/${prompts.length}`);
      const result = await this.generate(prompts[i], provider);
      results.push(result);
    }

    return results;
  }
}

// Usage Example
async function main() {
  const limiter = new ProviderRateLimiter();

  // Single request
  const result = await limiter.generate(
    "Explain quantum computing",
    "anthropic",
  );
  console.log(result.content);

  // Batch requests - automatically rate limited
  const prompts = Array(100)
    .fill(null)
    .map((_, i) => `Question ${i + 1}: What is ${i + 1} + ${i + 1}?`);

  const results = await limiter.batchGenerate(prompts, "anthropic");
  console.log(`\n✅ Completed ${results.length} requests`);
}

main();
```

## Explanation

### 1. Token Bucket Algorithm

The rate limiter uses a token bucket:

- **Bucket capacity**: `burstSize` (max requests in burst)
- **Refill rate**: `requestsPerMinute / 60` tokens per second
- **Token consumption**: 1 token per request

This allows bursts while maintaining average rate.

### 2. Automatic Refill

Tokens refill continuously based on elapsed time:

```typescript
tokensToAdd = (elapsed_ms / 60000) * requestsPerMinute;
```

### 3. Wait Strategy

When no tokens available:

- Calculate time until next token
- Sleep for that duration
- Consume token and proceed

### 4. 429 Error Handling

When provider returns 429:

- Read `Retry-After` header
- Reset token bucket
- Wait and retry automatically

### 5. Per-Provider Configuration

Different providers have different limits. Configure each separately:

| Provider  | Free Tier  | Paid Tier    | Burst Size |
| --------- | ---------- | ------------ | ---------- |
| OpenAI    | 3 req/min  | 3500 req/min | 100        |
| Anthropic | 50 req/min | 1000 req/min | 10         |
| Google AI | 60 req/min | 1000 req/min | 15         |

## Variations

### Priority Queue

Prioritize important requests:

```typescript
type QueuedRequest = {
  fn: () => Promise<any>;
  priority: number;
  timestamp: number;
};

class PriorityRateLimiter extends RateLimiter {
  private queue: QueuedRequest[] = [];

  async executeWithPriority<T>(
    fn: () => Promise<T>,
    priority: number = 0,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn: async () => {
          try {
            const result = await this.execute(fn);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        priority,
        timestamp: Date.now(),
      });

      // Sort by priority (higher first), then timestamp (earlier first)
      this.queue.sort((a, b) =>
        b.priority !== a.priority
          ? b.priority - a.priority
          : a.timestamp - b.timestamp,
      );

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) return;

    const request = this.queue.shift()!;
    await request.fn();

    if (this.queue.length > 0) {
      this.processQueue();
    }
  }
}
```

### Adaptive Rate Limiting

Adjust limits based on errors:

```typescript
class AdaptiveRateLimiter extends RateLimiter {
  private consecutiveErrors = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await super.execute(fn);
      this.consecutiveErrors = 0; // Reset on success
      return result;
    } catch (error: any) {
      if (error.status === 429) {
        this.consecutiveErrors++;

        // Reduce rate after repeated errors
        if (this.consecutiveErrors >= 3) {
          this.config.requestsPerMinute *= 0.8;
          console.log(
            `⚠️  Reducing rate to ${this.config.requestsPerMinute} req/min`,
          );
        }
      }
      throw error;
    }
  }
}
```

### Distributed Rate Limiting with Redis

For multi-instance deployments:

```typescript
import { Redis } from "ioredis";

class RedisRateLimiter {
  private redis: Redis;
  private key: string;
  private limit: number;
  private window: number; // seconds

  constructor(redis: Redis, key: string, limit: number, window: number = 60) {
    this.redis = redis;
    this.key = key;
    this.limit = limit;
    this.window = window;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const windowStart = now - this.window * 1000;

    // Remove old entries
    await this.redis.zremrangebyscore(this.key, 0, windowStart);

    // Count current requests
    const count = await this.redis.zcard(this.key);

    if (count >= this.limit) {
      const oldestEntry = await this.redis.zrange(this.key, 0, 0, "WITHSCORES");
      const waitTime = oldestEntry[1]
        ? parseInt(oldestEntry[1]) + this.window * 1000 - now
        : 1000;

      console.log(`⏳ Rate limit: waiting ${waitTime}ms`);
      await new Promise((r) => setTimeout(r, waitTime));
      return this.execute(fn);
    }

    // Add current request
    await this.redis.zadd(this.key, now, `${now}-${Math.random()}`);
    await this.redis.expire(this.key, this.window * 2);

    return fn();
  }
}
```

## Best Practices

1. **Set conservative limits**: Start with 80% of provider's limit
2. **Monitor usage**: Track request patterns to optimize limits
3. **Use burst capacity**: Allow occasional spikes while maintaining average rate
4. **Implement backoff**: Exponential backoff on repeated rate limit errors
5. **Cache responses**: Reduce duplicate requests (see [Cost Optimization](cost-optimization.md))

## See Also

- [Cost Optimization](cost-optimization.md)
- [Batch Processing](batch-processing.md)
- [Error Recovery](error-recovery.md)
- [Streaming with Retry](streaming-with-retry.md)

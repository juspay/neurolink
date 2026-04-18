// src/lib/auth/middleware/rateLimitByUser.ts

import type {
  AtomicConsumeResult,
  AuthRateLimitConfig,
  AuthRateLimitRedisClient,
  AuthRequestContext,
  AuthUser,
  AuthenticatedContext,
  RateLimitMiddlewareResult,
  RateLimitResult,
  RateLimitStorage,
  TokenBucket,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/** Mask a userId for safe log output (first 4 chars + "***"). */
function maskUserId(id: string): string {
  return id.length > 4 ? `${id.slice(0, 4)}***` : "***";
}

/**
 * In-memory storage for rate limiting (single instance deployments)
 */
export class MemoryRateLimitStorage implements RateLimitStorage {
  private buckets: Map<string, TokenBucket> = new Map();
  private cleanupInterval?: ReturnType<typeof setInterval>;
  private expiryMs: number;

  constructor(cleanupIntervalMs: number = 60000, expiryMs: number = 3600000) {
    this.expiryMs = expiryMs;
    // Periodically cleanup expired buckets
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredBuckets();
    }, cleanupIntervalMs);
    // Allow Node.js to exit gracefully even if the interval is still active
    this.cleanupInterval.unref();
  }

  async getBucket(userId: string): Promise<TokenBucket | null> {
    return this.buckets.get(userId) || null;
  }

  async setBucket(userId: string, bucket: TokenBucket): Promise<void> {
    this.buckets.set(userId, bucket);
  }

  async deleteBucket(userId: string): Promise<void> {
    this.buckets.delete(userId);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.buckets.clear();
  }

  private cleanupExpiredBuckets(): void {
    const now = Date.now();
    const expiryCutoff = now - this.expiryMs;

    for (const [userId, bucket] of this.buckets.entries()) {
      if (bucket.lastRefill < expiryCutoff) {
        this.buckets.delete(userId);
      }
    }
  }
}

/**
 * Redis-backed storage for rate limiting (distributed deployments)
 */
export class RedisRateLimitStorage implements RateLimitStorage {
  private redisUrl: string;
  private prefix: string;
  private ttlSeconds: number;
  private client: AuthRateLimitRedisClient | null = null;
  private initPromise: Promise<AuthRateLimitRedisClient> | null = null;

  constructor(config: {
    url: string;
    prefix?: string;
    ttlSeconds?: number;
    /** When set, TTL will be at least ceil(windowMs/1000) so keys outlive the rate-limit window. */
    windowMs?: number;
  }) {
    this.redisUrl = config.url;
    this.prefix = config.prefix || "neurolink:ratelimit:";
    const baseTtl = config.ttlSeconds || 3600; // 1 hour default TTL
    const windowTtl = config.windowMs ? Math.ceil(config.windowMs / 1000) : 0;
    this.ttlSeconds = Math.max(baseTtl, windowTtl);
  }

  private async getClient(): Promise<AuthRateLimitRedisClient> {
    if (this.client) {
      return this.client;
    }

    if (!this.initPromise) {
      this.initPromise = this.createClient();
    }

    return this.initPromise;
  }

  private async createClient(): Promise<AuthRateLimitRedisClient> {
    try {
      // Dynamic import to avoid loading Redis unless needed
      const { createClient } = await import("redis");
      const client = createClient({ url: this.redisUrl });
      await client.connect();
      this.client = client as unknown as AuthRateLimitRedisClient;
      return this.client;
    } catch {
      this.initPromise = null;
      throw new Error("Redis client not available for rate limiting");
    }
  }

  async getBucket(userId: string): Promise<TokenBucket | null> {
    try {
      const client = await this.getClient();
      const key = `${this.prefix}${userId}`;
      const data = await client.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as TokenBucket;
    } catch (error) {
      logger.warn("Redis rate limit getBucket failed:", error);
      return null;
    }
  }

  async setBucket(userId: string, bucket: TokenBucket): Promise<void> {
    try {
      const client = await this.getClient();
      const key = `${this.prefix}${userId}`;
      await client.setEx(key, this.ttlSeconds, JSON.stringify(bucket));
    } catch (error) {
      logger.warn("Redis rate limit setBucket failed:", error);
    }
  }

  async deleteBucket(userId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const key = `${this.prefix}${userId}`;
      await client.del(key);
    } catch (error) {
      logger.warn("Redis rate limit deleteBucket failed:", error);
    }
  }

  /**
   * Atomically refill and consume one token using a Redis Lua script.
   *
   * The entire read-modify-write cycle runs inside Redis as a single
   * atomic operation, so two parallel requests for the same user can
   * never read the same token count.
   */
  async atomicConsume(
    userId: string,
    limit: number,
    windowMs: number,
    nowMs: number,
  ): Promise<AtomicConsumeResult | null> {
    try {
      const client = await this.getClient();
      const key = `${this.prefix}${userId}`;

      // Lua script: refill tokens based on elapsed time, then try to consume one.
      // KEYS[1] = bucket key
      // ARGV[1] = limit (max tokens)
      // ARGV[2] = windowMs
      // ARGV[3] = nowMs (current timestamp)
      // ARGV[4] = ttl in seconds
      // ARGV[5] = userId
      //
      // Returns: [tokens (x1000), lastRefill, consumed (0/1)]
      //   – tokens are multiplied by 1000 to preserve 3 decimal places
      //     since Redis Lua returns only integers.
      //   – returns nil when the key does not exist (caller creates bucket).
      const luaScript = `
        local data = redis.call('GET', KEYS[1])
        if not data then
          return nil
        end

        local bucket = cjson.decode(data)
        local limit    = tonumber(ARGV[1])
        local windowMs = tonumber(ARGV[2])
        local nowMs    = tonumber(ARGV[3])
        local ttl      = tonumber(ARGV[4])
        local userId   = ARGV[5]

        -- Refill tokens
        local elapsed    = nowMs - bucket.lastRefill
        local tokensToAdd = (elapsed / windowMs) * limit
        local tokens      = math.min(limit, bucket.tokens + tokensToAdd)
        local lastRefill  = nowMs

        -- Try to consume
        local consumed = 0
        if tokens >= 1 then
          tokens   = tokens - 1
          consumed = 1
        end

        -- Persist
        bucket.tokens     = tokens
        bucket.lastRefill = lastRefill
        bucket.userId     = userId
        redis.call('SETEX', KEYS[1], ttl, cjson.encode(bucket))

        -- Return integers (tokens * 1000 to keep 3 decimal places)
        return { math.floor(tokens * 1000), lastRefill, consumed }
      `;

      const result = await client.eval(
        luaScript,
        1,
        key,
        String(limit),
        String(windowMs),
        String(nowMs),
        String(this.ttlSeconds),
        userId,
      );

      if (result === null || result === undefined) {
        return null; // Key did not exist
      }

      const [tokensTimes1000, lastRefill, consumed] = result as [
        number,
        number,
        number,
      ];

      return {
        bucket: {
          tokens: tokensTimes1000 / 1000,
          lastRefill,
          userId,
        },
        consumed: consumed === 1,
      };
    } catch (error) {
      logger.warn(
        "Redis atomicConsume failed, falling back to non-atomic:",
        error,
      );
      return null; // Fallback: caller will use get+set path
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const pong = await client.ping();
      return pong === "PONG";
    } catch {
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.initPromise = null;
    }
  }
}

// Type for Redis client (simplified interface)

/**
 * Token bucket rate limiter implementation
 *
 * Uses the token bucket algorithm which allows for burst traffic while
 * maintaining an average rate limit. Tokens are continuously added to
 * the bucket at a fixed rate, and each request consumes one token.
 */
export class UserRateLimiter {
  private storage: RateLimitStorage;
  private config: AuthRateLimitConfig;

  constructor(config: AuthRateLimitConfig, storage?: RateLimitStorage) {
    this.config = {
      message: "Rate limit exceeded. Please try again later.",
      ...config,
    };
    this.storage =
      storage ||
      new MemoryRateLimitStorage(
        Math.max(60000, config.windowMs),
        config.windowMs,
      );
  }

  /**
   * Get the rate limit for a specific user based on their roles
   */
  private getLimitForUser(user: AuthUser): number {
    // Check user-specific limits first
    if (this.config.userLimits && user.id in this.config.userLimits) {
      return this.config.userLimits[user.id];
    }

    // Check role-based limits (use highest if user has multiple roles)
    if (this.config.roleLimits) {
      let maxLimit = this.config.maxRequests;
      for (const role of user.roles) {
        if (role in this.config.roleLimits) {
          maxLimit = Math.max(maxLimit, this.config.roleLimits[role]);
        }
      }
      return maxLimit;
    }

    return this.config.maxRequests;
  }

  /**
   * Check if a user should skip rate limiting (based on roles)
   */
  private shouldSkipRateLimit(user: AuthUser): boolean {
    if (!this.config.skipRoles || this.config.skipRoles.length === 0) {
      return false;
    }

    return user.roles.some(
      (role) => this.config.skipRoles?.includes(role) ?? false,
    );
  }

  /**
   * Consume a token from the user's bucket
   * Returns the rate limit result
   *
   * When the storage backend supports `atomicConsume` (e.g. Redis with Lua),
   * the entire refill-and-consume is executed as a single atomic operation,
   * preventing race conditions where parallel requests both read the same
   * token count and both succeed.
   */
  async consume(user: AuthUser): Promise<RateLimitResult> {
    // Skip rate limiting for exempt roles
    if (this.shouldSkipRateLimit(user)) {
      return {
        allowed: true,
        remaining: Infinity,
        resetIn: 0,
        limit: Infinity,
      };
    }

    const userId = user.id;
    const limit = this.getLimitForUser(user);
    const now = Date.now();

    // Try atomic consume first (Redis Lua script – race-condition safe)
    if (this.storage.atomicConsume) {
      const atomicResult = await this.storage.atomicConsume(
        userId,
        limit,
        this.config.windowMs,
        now,
      );

      if (atomicResult !== null) {
        const { bucket, consumed } = atomicResult;

        if (consumed) {
          return {
            allowed: true,
            remaining: Math.floor(bucket.tokens),
            resetIn: Math.ceil(
              ((limit - bucket.tokens) / limit) * this.config.windowMs,
            ),
            limit,
          };
        }

        // Rate limited
        const resetIn = Math.ceil(
          ((1 - bucket.tokens) / limit) * this.config.windowMs,
        );
        return {
          allowed: false,
          remaining: 0,
          resetIn,
          limit,
          error: this.config.message,
        };
      }

      // atomicConsume returned null → bucket does not exist yet.
      // Fall through to create it below.
    }

    // Fallback: non-atomic get+set (safe for single-threaded in-memory storage)
    let bucket = await this.storage.getBucket(userId);

    if (!bucket) {
      // Create new bucket with full tokens
      bucket = {
        tokens: limit,
        lastRefill: now,
        userId,
      };
    }

    // Calculate tokens to add based on time elapsed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / this.config.windowMs) * limit;
    bucket.tokens = Math.min(limit, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Try to consume a token
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      await this.storage.setBucket(userId, bucket);

      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetIn: Math.ceil(
          ((limit - bucket.tokens) / limit) * this.config.windowMs,
        ),
        limit,
      };
    }

    // Rate limited
    await this.storage.setBucket(userId, bucket);

    const resetIn = Math.ceil(
      ((1 - bucket.tokens) / limit) * this.config.windowMs,
    );

    return {
      allowed: false,
      remaining: 0,
      resetIn,
      limit,
      error: this.config.message,
    };
  }

  /**
   * Get current rate limit status for a user without consuming a token
   */
  async getStatus(user: AuthUser): Promise<RateLimitResult> {
    if (this.shouldSkipRateLimit(user)) {
      return {
        allowed: true,
        remaining: Infinity,
        resetIn: 0,
        limit: Infinity,
      };
    }

    const limit = this.getLimitForUser(user);
    const bucket = await this.storage.getBucket(user.id);

    if (!bucket) {
      return {
        allowed: true,
        remaining: limit,
        resetIn: 0,
        limit,
      };
    }

    // Calculate current tokens
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / this.config.windowMs) * limit;
    const currentTokens = Math.min(limit, bucket.tokens + tokensToAdd);

    return {
      allowed: currentTokens >= 1,
      remaining: Math.floor(currentTokens),
      resetIn:
        currentTokens >= 1
          ? 0
          : Math.ceil(((1 - currentTokens) / limit) * this.config.windowMs),
      limit,
    };
  }

  /**
   * Reset rate limit for a user (admin action)
   */
  async resetUser(userId: string): Promise<void> {
    await this.storage.deleteBucket(userId);
    logger.debug(`Rate limit reset for user: ${maskUserId(userId)}`);
  }

  /**
   * Check storage health
   */
  async healthCheck(): Promise<boolean> {
    return this.storage.healthCheck();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.storage.cleanup();
  }
}

/**
 * Middleware result type
 */

/**
 * Create rate limiting middleware for authenticated requests
 *
 * @param config - Rate limit configuration
 * @param storage - Optional custom storage backend
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * const rateLimitMiddleware = createRateLimitByUserMiddleware({
 *   maxRequests: 100,
 *   windowMs: 60000, // 1 minute
 *   roleLimits: {
 *     "premium": 500,
 *     "admin": 1000
 *   },
 *   skipRoles: ["super-admin"]
 * });
 *
 * // Use in server
 * app.use(async (request, context) => {
 *   const result = await rateLimitMiddleware(context);
 *   if (!result.proceed) {
 *     return result.response;
 *   }
 *   // Continue processing...
 * });
 * ```
 */
export function createRateLimitByUserMiddleware(
  config: AuthRateLimitConfig,
  storage?: RateLimitStorage,
): (context: AuthenticatedContext) => Promise<RateLimitMiddlewareResult> {
  const limiter = new UserRateLimiter(config, storage);

  return async (
    context: AuthenticatedContext,
  ): Promise<RateLimitMiddlewareResult> => {
    const result = await limiter.consume(context.user);

    if (!result.allowed) {
      const response = createRateLimitResponse(result);
      return {
        proceed: false,
        rateLimitResult: result,
        response,
      };
    }

    return {
      proceed: true,
      rateLimitResult: result,
    };
  };
}

/**
 * Create a combined auth and rate limit middleware
 *
 * @param authMiddleware - Authentication middleware function
 * @param rateLimitConfig - Rate limit configuration
 * @param storage - Optional custom storage backend
 * @returns Combined middleware function
 *
 * @example
 * ```typescript
 * const protectedRoute = createAuthenticatedRateLimitMiddleware(
 *   createAuthMiddleware({ provider: authProvider }),
 *   { maxRequests: 100, windowMs: 60000 }
 * );
 *
 * // Use in routes
 * app.post("/api/generate", async (request) => {
 *   const result = await protectedRoute(request);
 *   if (!result.proceed) {
 *     return result.response;
 *   }
 *   // Handle request with result.context
 * });
 * ```
 */
export function createAuthenticatedRateLimitMiddleware(
  authMiddleware: (context: AuthRequestContext) => Promise<{
    proceed: boolean;
    context?: AuthenticatedContext;
    response?: Response;
  }>,
  rateLimitConfig: AuthRateLimitConfig,
  storage?: RateLimitStorage,
): (context: AuthRequestContext) => Promise<{
  proceed: boolean;
  context?: AuthenticatedContext;
  rateLimitResult?: RateLimitResult;
  response?: Response;
}> {
  const limiter = new UserRateLimiter(rateLimitConfig, storage);

  return async (context: AuthRequestContext) => {
    // First, authenticate
    const authResult = await authMiddleware(context);

    if (!authResult.proceed || !authResult.context) {
      return authResult;
    }

    // Then, check rate limit
    const rateLimitResult = await limiter.consume(authResult.context.user);

    if (!rateLimitResult.allowed) {
      return {
        proceed: false,
        context: authResult.context,
        rateLimitResult,
        response: createRateLimitResponse(rateLimitResult),
      };
    }

    return {
      proceed: true,
      context: authResult.context,
      rateLimitResult,
    };
  };
}

/**
 * Create 429 Too Many Requests response
 */
function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: result.error || "Rate limit exceeded",
      statusCode: 429,
      retryAfter: Math.ceil(result.resetIn / 1000), // In seconds
      limit: result.limit,
      remaining: result.remaining,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(result.resetIn / 1000)),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Date.now() + result.resetIn),
      },
    },
  );
}

/**
 * Create rate limit storage based on configuration
 *
 * @param config - Storage configuration
 * @returns Appropriate storage backend
 *
 * @example
 * ```typescript
 * // Memory storage (default)
 * const storage = createRateLimitStorage({ type: "memory" });
 *
 * // Redis storage
 * const storage = createRateLimitStorage({
 *   type: "redis",
 *   redis: {
 *     url: "redis://localhost:6379",
 *     prefix: "myapp:ratelimit:"
 *   }
 * });
 * ```
 */
export function createRateLimitStorage(config: {
  type: "memory" | "redis";
  redis?: {
    url: string;
    prefix?: string;
    ttlSeconds?: number;
    windowMs?: number;
  };
  cleanupIntervalMs?: number;
}): RateLimitStorage {
  if (config.type === "redis" && config.redis) {
    return new RedisRateLimitStorage(config.redis);
  }

  return new MemoryRateLimitStorage(config.cleanupIntervalMs);
}

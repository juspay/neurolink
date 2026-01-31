// src/lib/auth/middleware/rateLimitByUser.ts

import type { AuthenticatedContext, AuthUser } from "../../types/authTypes.js";
import { logger } from "../../utils/logger.js";

/**
 * Token bucket state for a single user
 */
type TokenBucket = {
  /** Current number of tokens available */
  tokens: number;
  /** Last time tokens were added */
  lastRefill: number;
  /** User identifier */
  userId: string;
};

/**
 * Rate limit configuration per user or role
 */
export type RateLimitConfig = {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional: Different limits per role (role -> maxRequests) */
  roleLimits?: Record<string, number>;
  /** Optional: Different limits per user ID (userId -> maxRequests) */
  userLimits?: Record<string, number>;
  /** Skip rate limiting for these roles */
  skipRoles?: string[];
  /** Error message when rate limited */
  message?: string;
};

/**
 * Rate limit result
 */
export type RateLimitResult = {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Time until the bucket resets (ms) */
  resetIn: number;
  /** Total limit for this user */
  limit: number;
  /** Error message if rate limited */
  error?: string;
};

/**
 * Interface for rate limit storage backends
 */
export interface RateLimitStorage {
  /** Get the current bucket for a user */
  getBucket(userId: string): Promise<TokenBucket | null>;
  /** Set the bucket for a user */
  setBucket(userId: string, bucket: TokenBucket): Promise<void>;
  /** Delete a bucket (for cleanup) */
  deleteBucket(userId: string): Promise<void>;
  /** Check storage health */
  healthCheck(): Promise<boolean>;
  /** Cleanup resources */
  cleanup(): Promise<void>;
}

/**
 * In-memory storage for rate limiting (single instance deployments)
 */
export class MemoryRateLimitStorage implements RateLimitStorage {
  private buckets: Map<string, TokenBucket> = new Map();
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(cleanupIntervalMs: number = 60000) {
    // Periodically cleanup expired buckets
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredBuckets();
    }, cleanupIntervalMs);
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
    const oneHourAgo = now - 3600000; // 1 hour

    for (const [userId, bucket] of this.buckets.entries()) {
      if (bucket.lastRefill < oneHourAgo) {
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
  private client: RedisClient | null = null;

  constructor(config: { url: string; prefix?: string; ttlSeconds?: number }) {
    this.redisUrl = config.url;
    this.prefix = config.prefix || "neurolink:ratelimit:";
    this.ttlSeconds = config.ttlSeconds || 3600; // 1 hour default TTL
  }

  private async getClient(): Promise<RedisClient> {
    if (!this.client) {
      // Dynamic import to avoid loading Redis unless needed
      const { createClient } = await import("redis");
      const client = createClient({ url: this.redisUrl });
      await client.connect();
      this.client = client as unknown as RedisClient;
    }
    return this.client!;
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
    }
  }
}

// Type for Redis client (simplified interface)
type RedisClient = {
  connect(): Promise<void>;
  quit(): Promise<void>;
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  setEx(key: string, seconds: number, value: string): Promise<void>;
  del(key: string): Promise<number>;
};

/**
 * Token bucket rate limiter implementation
 *
 * Uses the token bucket algorithm which allows for burst traffic while
 * maintaining an average rate limit. Tokens are continuously added to
 * the bucket at a fixed rate, and each request consumes one token.
 */
export class UserRateLimiter {
  private storage: RateLimitStorage;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig, storage?: RateLimitStorage) {
    this.config = {
      message: "Rate limit exceeded. Please try again later.",
      ...config,
    };
    this.storage = storage || new MemoryRateLimitStorage();
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

    return user.roles.some((role) => this.config.skipRoles!.includes(role));
  }

  /**
   * Consume a token from the user's bucket
   * Returns the rate limit result
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

    // Get or create bucket
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
    logger.debug(`Rate limit reset for user: ${userId}`);
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
export type RateLimitMiddlewareResult = {
  /** Whether to proceed with the request */
  proceed: boolean;
  /** Rate limit result */
  rateLimitResult: RateLimitResult;
  /** Error response if rate limited */
  response?: Response;
};

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
  config: RateLimitConfig,
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
  authMiddleware: (request: Request) => Promise<{
    proceed: boolean;
    context?: AuthenticatedContext;
    response?: Response;
  }>,
  rateLimitConfig: RateLimitConfig,
  storage?: RateLimitStorage,
): (request: Request) => Promise<{
  proceed: boolean;
  context?: AuthenticatedContext;
  rateLimitResult?: RateLimitResult;
  response?: Response;
}> {
  const limiter = new UserRateLimiter(rateLimitConfig, storage);

  return async (request: Request) => {
    // First, authenticate
    const authResult = await authMiddleware(request);

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
  redis?: { url: string; prefix?: string; ttlSeconds?: number };
  cleanupIntervalMs?: number;
}): RateLimitStorage {
  if (config.type === "redis" && config.redis) {
    return new RedisRateLimitStorage(config.redis);
  }

  return new MemoryRateLimitStorage(config.cleanupIntervalMs);
}

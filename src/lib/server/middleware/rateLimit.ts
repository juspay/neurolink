/**
 * Rate Limiting Middleware
 * Provides configurable rate limiting for server adapters
 */

import type { MiddlewareDefinition, ServerContext } from "../types.js";
import { RateLimitError as ServerRateLimitError } from "../errors.js";

/**
 * Rate limit middleware configuration
 */
export type RateLimitMiddlewareConfig = {
  /** Maximum requests per window */
  maxRequests: number;

  /** Time window in milliseconds */
  windowMs: number;

  /** Custom error message */
  message?: string;

  /** Skip rate limiting for certain paths */
  skipPaths?: string[];

  /**
   * Custom key generator for identifying clients
   * Default: IP address
   */
  keyGenerator?: (ctx: ServerContext) => string;

  /**
   * Custom response handler for rate limit exceeded
   */
  onRateLimitExceeded?: (ctx: ServerContext, retryAfter: number) => unknown;

  /**
   * Custom rate limit store
   * Default: in-memory store
   */
  store?: RateLimitStore;
};

/**
 * Rate limit entry
 */
export type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/**
 * Rate limit store interface
 * Implement this for custom storage (Redis, etc.)
 */
export type RateLimitStore = {
  /**
   * Get the current entry for a key
   */
  get(key: string): Promise<RateLimitEntry | undefined>;

  /**
   * Set an entry for a key
   */
  set(key: string, entry: RateLimitEntry): Promise<void>;

  /**
   * Increment the counter for a key
   * Returns the current count and reset time
   */
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;

  /**
   * Reset the counter for a key
   */
  reset(key: string): Promise<void>;
};

/**
 * In-memory rate limit store
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries periodically
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get(key: string): Promise<RateLimitEntry | undefined> {
    const record = this.store.get(key);
    if (!record) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > record.resetAt) {
      this.store.delete(key);
      return undefined;
    }

    return record;
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    let record = this.store.get(key);

    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      this.store.set(key, record);
    }

    record.count++;
    return { count: record.count, resetAt: record.resetAt };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetAt) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Create rate limiting middleware
 *
 * Response headers set on all requests:
 * - `X-RateLimit-Limit`: Maximum requests allowed per window
 * - `X-RateLimit-Remaining`: Requests remaining in current window
 * - `X-RateLimit-Reset`: Unix timestamp when the window resets
 *
 * Additional headers on rate limit exceeded (HTTP 429):
 * - `Retry-After`: Seconds to wait before retrying
 *
 * @example
 * ```typescript
 * const rateLimiter = createRateLimitMiddleware({
 *   maxRequests: 100,
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   skipPaths: ["/api/health"],
 * });
 *
 * server.registerMiddleware(rateLimiter);
 * ```
 */
export function createRateLimitMiddleware(
  config: RateLimitMiddlewareConfig,
): MiddlewareDefinition {
  const {
    maxRequests,
    windowMs,
    message = "Too many requests, please try again later",
    skipPaths = [],
    keyGenerator = defaultKeyGenerator,
    onRateLimitExceeded,
    store = new InMemoryRateLimitStore(),
  } = config;

  return {
    name: "rate-limit",
    order: 5, // Run early
    excludePaths: skipPaths,
    handler: async (ctx, next) => {
      const key = keyGenerator(ctx);
      const { count, resetAt } = await store.increment(key, windowMs);

      // Set rate limit headers in responseHeaders (adapters read from here)
      ctx.responseHeaders = ctx.responseHeaders || {};
      ctx.responseHeaders["X-RateLimit-Limit"] = String(maxRequests);
      ctx.responseHeaders["X-RateLimit-Remaining"] = String(
        Math.max(0, maxRequests - count),
      );
      ctx.responseHeaders["X-RateLimit-Reset"] = String(
        Math.ceil(resetAt / 1000),
      );

      if (count > maxRequests) {
        const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

        // Add Retry-After header for 429 responses
        ctx.responseHeaders["Retry-After"] = String(Math.max(0, retryAfter));

        if (onRateLimitExceeded) {
          return onRateLimitExceeded(ctx, retryAfter);
        }

        // Throw a rate limit error that adapters can catch
        throw new ServerRateLimitError(
          retryAfter * 1000,
          message,
          ctx.requestId,
        );
      }

      return next();
    },
  };
}

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(ctx: ServerContext): string {
  return (
    ctx.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    ctx.headers["x-real-ip"] ||
    "unknown"
  );
}

/**
 * Re-export RateLimitError from errors for convenience
 */
export { RateLimitError } from "../errors.js";

/**
 * Create a sliding window rate limiter
 * More accurate than fixed window but slightly more complex
 */
export function createSlidingWindowRateLimitMiddleware(
  config: RateLimitMiddlewareConfig & {
    /** Number of sub-windows for smoothing (default: 10) */
    subWindows?: number;
  },
): MiddlewareDefinition {
  const {
    maxRequests,
    windowMs,
    message = "Too many requests, please try again later",
    skipPaths = [],
    keyGenerator = defaultKeyGenerator,
    onRateLimitExceeded,
    subWindows = 10,
  } = config;

  // Store: key -> array of timestamps
  const store = new Map<string, number[]>();
  const subWindowMs = windowMs / subWindows;

  // Cleanup interval
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        store.set(key, valid);
      }
    }
  }, subWindowMs);

  return {
    name: "sliding-window-rate-limit",
    order: 5,
    excludePaths: skipPaths,
    handler: async (ctx, next) => {
      const key = keyGenerator(ctx);
      const now = Date.now();

      // Get existing timestamps and filter old ones
      let timestamps = store.get(key) || [];
      timestamps = timestamps.filter((t) => now - t < windowMs);

      // Calculate count
      const count = timestamps.length;

      // Set rate limit headers in responseHeaders (adapters read from here)
      ctx.responseHeaders = ctx.responseHeaders || {};
      ctx.responseHeaders["X-RateLimit-Limit"] = String(maxRequests);
      ctx.responseHeaders["X-RateLimit-Remaining"] = String(
        Math.max(0, maxRequests - count - 1),
      );
      ctx.responseHeaders["X-RateLimit-Reset"] = String(
        Math.ceil((now + windowMs) / 1000),
      );

      if (count >= maxRequests) {
        const oldestTimestamp = timestamps[0] || now;
        const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

        // Add Retry-After header for 429 responses
        ctx.responseHeaders["Retry-After"] = String(Math.max(0, retryAfter));

        if (onRateLimitExceeded) {
          return onRateLimitExceeded(ctx, retryAfter);
        }

        throw new ServerRateLimitError(
          retryAfter * 1000,
          message,
          ctx.requestId,
        );
      }

      // Add current request timestamp
      timestamps.push(now);
      store.set(key, timestamps);

      return next();
    },
  };
}

// ============================================
// Compatibility Aliases
// ============================================

/**
 * Alias for InMemoryRateLimitStore for compatibility
 */
export { InMemoryRateLimitStore as MemoryRateLimitStore };

/**
 * Fixed window rate limit configuration (for standalone signature)
 */
export type FixedWindowRateLimitConfig = {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom error message */
  message?: string;
  /** Skip rate limiting for certain paths */
  skipPaths?: string[];
  /** Custom key generator */
  keyGenerator?: (ctx: ServerContext) => string;
  /** Custom rate limit exceeded handler */
  onRateLimitExceeded?: (ctx: ServerContext, retryAfter: number) => unknown;
};

/**
 * Create fixed window rate limit middleware
 *
 * Accepts config and optional store as separate parameters for compatibility.
 * Returns rate limit headers in the response object.
 *
 * @example
 * ```typescript
 * const store = new MemoryRateLimitStore();
 * const middleware = createFixedWindowRateLimitMiddleware(
 *   { windowMs: 60000, maxRequests: 10 },
 *   store
 * );
 * ```
 */
export function createFixedWindowRateLimitMiddleware(
  config: FixedWindowRateLimitConfig,
  store?: RateLimitStore,
): MiddlewareDefinition {
  const {
    maxRequests,
    windowMs,
    message = "Too many requests, please try again later",
    skipPaths = [],
    keyGenerator = defaultKeyGenerator,
    onRateLimitExceeded,
  } = config;

  const rateLimitStore = store ?? new InMemoryRateLimitStore();

  return {
    name: "fixed-window-rate-limit",
    order: 5,
    excludePaths: skipPaths,
    handler: async (ctx, next) => {
      const key = keyGenerator(ctx);
      const { count, resetAt } = await rateLimitStore.increment(key, windowMs);

      // Set rate limit headers in responseHeaders (adapters read from here)
      ctx.responseHeaders = ctx.responseHeaders || {};
      ctx.responseHeaders["X-RateLimit-Limit"] = String(maxRequests);
      ctx.responseHeaders["X-RateLimit-Remaining"] = String(
        Math.max(0, maxRequests - count),
      );
      ctx.responseHeaders["X-RateLimit-Reset"] = String(
        Math.ceil(resetAt / 1000),
      );

      if (count > maxRequests) {
        const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

        // Add Retry-After header for 429 responses
        ctx.responseHeaders["Retry-After"] = String(Math.max(0, retryAfter));

        if (onRateLimitExceeded) {
          return onRateLimitExceeded(ctx, retryAfter);
        }

        throw new ServerRateLimitError(
          retryAfter * 1000,
          message,
          ctx.requestId,
        );
      }

      // Call next handler - headers are already in ctx.responseHeaders for adapters
      return next();
    },
  };
}

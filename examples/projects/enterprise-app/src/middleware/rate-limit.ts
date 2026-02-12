import { Request, Response, NextFunction } from "express";
import { RedisService } from "../services/redis.service";

export type RateLimitConfig = {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs: number;
  /** Maximum number of requests per window (default: 100) */
  maxRequests: number;
  /** Custom key generator function (default: uses IP address) */
  keyGenerator?: (req: Request) => string;
  /** Custom message for rate limit exceeded */
  message?: string;
  /** Whether to add rate limit headers to response (default: true) */
  headers?: boolean;
  /** Skip rate limiting for certain requests */
  skip?: (req: Request) => boolean;
};

type RateLimitRecord = {
  count: number;
  resetTime: number;
};

// In-memory store for rate limiting
const inMemoryStore = new Map<string, RateLimitRecord>();

// Registry of all stores that need cleanup (for tiered rate limiting)
const storeRegistry: Set<Map<string, RateLimitRecord>> = new Set([
  inMemoryStore,
]);

// Cleanup interval for expired entries (runs every minute)
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    // Clean all registered stores (including tiered stores)
    for (const store of storeRegistry) {
      for (const [key, record] of store.entries()) {
        if (now > record.resetTime) {
          store.delete(key);
        }
      }
    }
  }, 60000);

  // Prevent cleanup from keeping process alive
  cleanupInterval.unref();
}

/**
 * Register a store for automatic cleanup
 */
function registerStoreForCleanup(store: Map<string, RateLimitRecord>): void {
  storeRegistry.add(store);
}

/**
 * In-memory rate limiting middleware
 * Best for single-instance deployments or development
 */
export function rateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
  const {
    windowMs = 60000,
    maxRequests = 100,
    keyGenerator = (req: Request) =>
      req.ip || req.socket.remoteAddress || "unknown",
    message = "Too many requests, please try again later",
    headers = true,
    skip,
  } = config;

  // Start cleanup process
  startCleanup();

  return (req: Request, res: Response, next: NextFunction) => {
    // Check if request should skip rate limiting
    if (skip && skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    let record = inMemoryStore.get(key);

    // Reset if window has expired
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      inMemoryStore.set(key, record);

      if (headers) {
        setRateLimitHeaders(
          res,
          maxRequests,
          maxRequests - 1,
          record.resetTime,
        );
      }

      return next();
    }

    // Check if limit exceeded
    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);

      if (headers) {
        setRateLimitHeaders(res, maxRequests, 0, record.resetTime);
        res.set("Retry-After", String(retryAfterSeconds));
      }

      return res.status(429).json({
        error: "Too Many Requests",
        message,
        retryAfter: retryAfterSeconds,
        resetAt: new Date(record.resetTime).toISOString(),
      });
    }

    // Increment counter
    record.count++;

    if (headers) {
      setRateLimitHeaders(
        res,
        maxRequests,
        maxRequests - record.count,
        record.resetTime,
      );
    }

    next();
  };
}

/**
 * Redis-backed rate limiting middleware
 * Best for distributed deployments with multiple instances
 */
export function redisRateLimitMiddleware(
  redisService: RedisService,
  config: Partial<RateLimitConfig> = {},
) {
  const {
    windowMs = 60000,
    maxRequests = 100,
    keyGenerator = (req: Request) =>
      req.ip || req.socket.remoteAddress || "unknown",
    message = "Too many requests, please try again later",
    headers = true,
    skip,
  } = config;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    // Check if request should skip rate limiting
    if (skip && skip(req)) {
      return next();
    }

    const key = keyGenerator(req);

    try {
      const result = await redisService.checkRateLimit(
        key,
        maxRequests,
        windowSeconds,
      );

      if (headers) {
        setRateLimitHeaders(res, maxRequests, result.remaining, result.resetAt);
      }

      if (!result.allowed) {
        const retryAfterSeconds = Math.ceil(
          (result.resetAt - Date.now()) / 1000,
        );

        if (headers) {
          res.set("Retry-After", String(retryAfterSeconds));
        }

        return res.status(429).json({
          error: "Too Many Requests",
          message,
          retryAfter: retryAfterSeconds,
          resetAt: new Date(result.resetAt).toISOString(),
        });
      }

      next();
    } catch (error) {
      // On Redis error, fall through to allow request (fail open)
      console.error("Rate limit Redis error:", error);
      next();
    }
  };
}

/**
 * Tiered rate limiting for different user types
 */
export type TieredRateLimitConfig = {
  /** Rate limit for unauthenticated users */
  anonymous: { windowMs: number; maxRequests: number };
  /** Rate limit for authenticated users */
  authenticated: { windowMs: number; maxRequests: number };
  /** Rate limit for premium/enterprise users */
  premium?: { windowMs: number; maxRequests: number };
  /** Function to determine user tier from request */
  getTier: (req: Request) => "anonymous" | "authenticated" | "premium";
};

export function tieredRateLimitMiddleware(config: TieredRateLimitConfig) {
  const stores = {
    anonymous: new Map<string, RateLimitRecord>(),
    authenticated: new Map<string, RateLimitRecord>(),
    premium: new Map<string, RateLimitRecord>(),
  };

  // Register all tiered stores for cleanup
  registerStoreForCleanup(stores.anonymous);
  registerStoreForCleanup(stores.authenticated);
  registerStoreForCleanup(stores.premium);

  // Start cleanup for all stores
  startCleanup();

  return (req: Request, res: Response, next: NextFunction) => {
    const tier = config.getTier(req);
    const tierConfig = config[tier] || config.anonymous;
    const store = stores[tier];

    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    let record = store.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + tierConfig.windowMs };
      store.set(key, record);
      setRateLimitHeaders(
        res,
        tierConfig.maxRequests,
        tierConfig.maxRequests - 1,
        record.resetTime,
      );
      return next();
    }

    if (record.count >= tierConfig.maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      setRateLimitHeaders(res, tierConfig.maxRequests, 0, record.resetTime);
      res.set("Retry-After", String(retryAfterSeconds));

      return res.status(429).json({
        error: "Too Many Requests",
        message: "Rate limit exceeded for your account tier",
        tier,
        retryAfter: retryAfterSeconds,
        resetAt: new Date(record.resetTime).toISOString(),
      });
    }

    record.count++;
    setRateLimitHeaders(
      res,
      tierConfig.maxRequests,
      tierConfig.maxRequests - record.count,
      record.resetTime,
    );
    next();
  };
}

/**
 * Set standard rate limit headers
 */
function setRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  resetTime: number,
): void {
  res.set("X-RateLimit-Limit", String(limit));
  res.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  res.set("X-RateLimit-Reset", String(Math.ceil(resetTime / 1000)));
}

/**
 * Create rate limiter with custom store
 */
export type RateLimitStore = {
  increment(key: string): Promise<{ count: number; resetTime: number }>;
  get(key: string): Promise<RateLimitRecord | null>;
  reset(key: string): Promise<void>;
};

export function createRateLimiter(
  store: RateLimitStore,
  config: Partial<RateLimitConfig> = {},
) {
  const {
    windowMs = 60000,
    maxRequests = 100,
    keyGenerator = (req: Request) =>
      req.ip || req.socket.remoteAddress || "unknown",
    message = "Too many requests, please try again later",
    headers = true,
    skip,
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (skip && skip(req)) {
      return next();
    }

    const key = keyGenerator(req);

    try {
      const record = await store.increment(key);

      if (headers) {
        setRateLimitHeaders(
          res,
          maxRequests,
          maxRequests - record.count,
          record.resetTime,
        );
      }

      if (record.count > maxRequests) {
        const retryAfterSeconds = Math.ceil(
          (record.resetTime - Date.now()) / 1000,
        );

        if (headers) {
          res.set("Retry-After", String(retryAfterSeconds));
        }

        return res.status(429).json({
          error: "Too Many Requests",
          message,
          retryAfter: retryAfterSeconds,
          resetAt: new Date(record.resetTime).toISOString(),
        });
      }

      next();
    } catch (error) {
      console.error("Rate limiter error:", error);
      next();
    }
  };
}

// Export default for simple usage
export default rateLimitMiddleware;

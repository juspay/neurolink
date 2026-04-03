/**
 * Request Interceptors and Retry Logic
 *
 * Provides middleware interceptors for the NeuroLink client SDK including
 * authentication, logging, retry logic, rate limiting, and request/response transformation.
 *
 * @module @neurolink/client/interceptors
 */

import type {
  Middleware,
  MiddlewareRequest,
  MiddlewareResponse,
  ClientMiddlewareContext as MiddlewareContext,
  ClientRetryConfig as RetryConfig,
  ApiError,
} from "../types/clientTypes.js";
import { logger } from "../utils/logger.js";

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate delay for exponential backoff with jitter
 */
function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  multiplier: number,
): number {
  const delay = initialDelayMs * Math.pow(multiplier, attempt);
  const jitter = Math.random() * 0.1 * delay;
  return Math.min(delay + jitter, maxDelayMs);
}

/**
 * Delay utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a status code is retryable
 */
function isRetryableStatus(
  status: number,
  retryableStatusCodes: number[],
): boolean {
  return retryableStatusCodes.includes(status);
}

// =============================================================================
// Authentication Interceptors
// =============================================================================

/**
 * API Key authentication interceptor
 *
 * Adds X-API-Key header to all requests.
 *
 * @example
 * ```typescript
 * client.use(createApiKeyAuthInterceptor('your-api-key'));
 * ```
 */
export function createApiKeyAuthInterceptor(apiKey: string): Middleware {
  return async (request, next) => {
    request.headers["X-API-Key"] = apiKey;
    return next();
  };
}

/**
 * Bearer token authentication interceptor
 *
 * Adds Authorization header with Bearer token.
 *
 * @example
 * ```typescript
 * client.use(createBearerAuthInterceptor('your-token'));
 * ```
 */
export function createBearerAuthInterceptor(token: string): Middleware {
  return async (request, next) => {
    request.headers["Authorization"] = `Bearer ${token}`;
    return next();
  };
}

/**
 * Dynamic authentication interceptor
 *
 * Retrieves authentication token dynamically for each request.
 * Useful for token refresh scenarios.
 *
 * @example
 * ```typescript
 * client.use(createDynamicAuthInterceptor(async () => {
 *   const token = await getAccessToken();
 *   return { type: 'bearer', token };
 * }));
 * ```
 */
export function createDynamicAuthInterceptor(
  getAuth: () => Promise<
    { type: "apiKey"; key: string } | { type: "bearer"; token: string } | null
  >,
): Middleware {
  return async (request, next) => {
    const auth = await getAuth();

    if (auth) {
      if (auth.type === "apiKey") {
        request.headers["X-API-Key"] = auth.key;
      } else if (auth.type === "bearer") {
        request.headers["Authorization"] = `Bearer ${auth.token}`;
      }
    }

    return next();
  };
}

// =============================================================================
// Logging Interceptors
// =============================================================================

/**
 * Logging interceptor options
 */
export type LoggingInterceptorOptions = {
  /** Log request details */
  logRequest?: boolean;
  /** Log response details */
  logResponse?: boolean;
  /** Log request body */
  logBody?: boolean;
  /** Log response body */
  logResponseBody?: boolean;
  /** Custom logger function */
  logger?: (message: string, data?: unknown) => void;
  /** Redact sensitive fields */
  redactFields?: string[];
};

/**
 * Logging interceptor
 *
 * Logs request and response details for debugging.
 *
 * @example
 * ```typescript
 * client.use(createLoggingInterceptor({
 *   logRequest: true,
 *   logResponse: true,
 *   redactFields: ['apiKey', 'password'],
 * }));
 * ```
 */
export function createLoggingInterceptor(
  options: LoggingInterceptorOptions = {},
): Middleware {
  const {
    logRequest = true,
    logResponse = true,
    logBody = false,
    logResponseBody = false,
    logger: customLogger = (message: string, data?: unknown) =>
      logger.debug(message, data),
    redactFields = ["apiKey", "password", "token", "authorization"],
  } = options;

  const redact = (obj: unknown): unknown => {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(redact);
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (
        redactFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        result[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        result[key] = redact(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  return async (request, next) => {
    const startTime = Date.now();

    if (logRequest) {
      const logData: Record<string, unknown> = {
        method: request.method,
        url: request.url,
        requestId: request.context.requestId,
      };

      if (logBody && request.body) {
        logData.body = redact(request.body);
      }

      customLogger(`[NeuroLink] Request`, logData);
    }

    try {
      const response = await next();
      const duration = Date.now() - startTime;

      if (logResponse) {
        const logData: Record<string, unknown> = {
          status: response.status,
          duration: `${duration}ms`,
          requestId: request.context.requestId,
        };

        if (logResponseBody && response.body) {
          logData.body = redact(response.body);
        }

        customLogger(`[NeuroLink] Response`, logData);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      customLogger(`[NeuroLink] Error`, {
        error: (error as Error).message,
        duration: `${duration}ms`,
        requestId: request.context.requestId,
      });
      throw error;
    }
  };
}

// =============================================================================
// Retry Interceptors
// =============================================================================

/**
 * Retry interceptor options
 */
export type RetryInterceptorOptions = RetryConfig & {
  /** Callback when a retry is attempted */
  onRetry?: (
    attempt: number,
    error: Error | ApiError,
    request: MiddlewareRequest,
  ) => void;
  /** Custom retry condition */
  shouldRetry?: (response: MiddlewareResponse, attempt: number) => boolean;
};

/**
 * Retry interceptor with exponential backoff
 *
 * Automatically retries failed requests with configurable backoff.
 *
 * @example
 * ```typescript
 * client.use(createRetryInterceptor({
 *   maxAttempts: 3,
 *   initialDelayMs: 1000,
 *   maxDelayMs: 10000,
 *   backoffMultiplier: 2,
 *   retryableStatusCodes: [429, 500, 502, 503, 504],
 *   onRetry: (attempt, error) => console.log(`Retry ${attempt}:`, error),
 * }));
 * ```
 */
export function createRetryInterceptor(
  options: RetryInterceptorOptions,
): Middleware {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    retryableStatusCodes = [408, 429, 500, 502, 503, 504],
    retryOnNetworkError = true,
    onRetry,
    shouldRetry,
  } = options;

  return async (request, next) => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await next();

        // Check custom retry condition
        if (shouldRetry && shouldRetry(response, attempt)) {
          if (attempt < maxAttempts - 1) {
            const delay = calculateBackoffDelay(
              attempt,
              initialDelayMs,
              maxDelayMs,
              backoffMultiplier,
            );
            onRetry?.(
              attempt + 1,
              { message: "Custom retry condition met" } as ApiError,
              request,
            );
            await sleep(delay);
            request.context.retryCount = attempt + 1;
            continue;
          }
        }

        // Check if response status is retryable
        if (isRetryableStatus(response.status, retryableStatusCodes)) {
          if (attempt < maxAttempts - 1) {
            const delay = calculateBackoffDelay(
              attempt,
              initialDelayMs,
              maxDelayMs,
              backoffMultiplier,
            );
            const error: ApiError = {
              code: "RETRYABLE_ERROR",
              message: `HTTP ${response.status}`,
              status: response.status,
              retryable: true,
            };
            onRetry?.(attempt + 1, error, request);
            await sleep(delay);
            request.context.retryCount = attempt + 1;
            continue;
          }
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        // Check if network error and should retry
        if (retryOnNetworkError && attempt < maxAttempts - 1) {
          const delay = calculateBackoffDelay(
            attempt,
            initialDelayMs,
            maxDelayMs,
            backoffMultiplier,
          );
          onRetry?.(attempt + 1, error as Error, request);
          await sleep(delay);
          request.context.retryCount = attempt + 1;
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new Error("Max retries exceeded");
  };
}

// =============================================================================
// Rate Limiting Interceptors
// =============================================================================

/**
 * Rate limiter options
 */
export type RateLimiterOptions = {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Strategy when limit is reached: 'queue' or 'throw' */
  strategy?: "queue" | "throw";
  /** Callback when rate limited */
  onRateLimited?: (waitTime: number) => void;
};

/**
 * Token bucket rate limiter
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private maxTokens: number;
  private refillRate: number;
  private queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(maxTokens: number, windowMs: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = maxTokens / windowMs;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate,
    );
    this.lastRefill = now;
  }

  async acquire(strategy: "queue" | "throw"): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    if (strategy === "throw") {
      throw new Error("Rate limit exceeded");
    }

    // Queue strategy: wait for a token
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.queue.length === 0) {
      return;
    }

    const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);

    setTimeout(() => {
      this.refill();

      while (this.tokens >= 1 && this.queue.length > 0) {
        this.tokens -= 1;
        const item = this.queue.shift();
        item?.resolve();
      }

      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, waitTime);
  }
}

/**
 * Rate limiting interceptor
 *
 * Limits the rate of requests to prevent overwhelming the API.
 *
 * @example
 * ```typescript
 * client.use(createRateLimitInterceptor({
 *   maxRequests: 100,
 *   windowMs: 60000, // 100 requests per minute
 *   strategy: 'queue',
 *   onRateLimited: (waitTime) => console.log(`Rate limited, waiting ${waitTime}ms`),
 * }));
 * ```
 */
export function createRateLimitInterceptor(
  options: RateLimiterOptions,
): Middleware {
  const { maxRequests, windowMs, strategy = "queue", onRateLimited } = options;
  const bucket = new TokenBucket(maxRequests, windowMs);

  return async (request, next) => {
    try {
      await bucket.acquire(strategy);
    } catch (error) {
      onRateLimited?.(windowMs / maxRequests);
      throw error;
    }
    return next();
  };
}

// =============================================================================
// Request/Response Transformation Interceptors
// =============================================================================

/**
 * Request transformation interceptor
 *
 * Transform request before sending.
 *
 * @example
 * ```typescript
 * client.use(createRequestTransformInterceptor((request) => {
 *   // Add custom header based on request body
 *   if (request.body?.priority === 'high') {
 *     request.headers['X-Priority'] = 'high';
 *   }
 *   return request;
 * }));
 * ```
 */
export function createRequestTransformInterceptor(
  transform: (
    request: MiddlewareRequest,
  ) => MiddlewareRequest | Promise<MiddlewareRequest>,
): Middleware {
  return async (request, next) => {
    const transformedRequest = await transform(request);
    // Update the original request object
    Object.assign(request, transformedRequest);
    return next();
  };
}

/**
 * Response transformation interceptor
 *
 * Transform response before returning.
 *
 * @example
 * ```typescript
 * client.use(createResponseTransformInterceptor((response) => {
 *   // Add metadata to response
 *   response.context.processedAt = Date.now();
 *   return response;
 * }));
 * ```
 */
export function createResponseTransformInterceptor(
  transform: (
    response: MiddlewareResponse,
  ) => MiddlewareResponse | Promise<MiddlewareResponse>,
): Middleware {
  return async (request, next) => {
    const response = await next();
    return transform(response);
  };
}

// =============================================================================
// Caching Interceptors
// =============================================================================

/**
 * Cache options
 */
export type CacheInterceptorOptions = {
  /** Cache TTL in milliseconds */
  ttl: number;
  /** Maximum cache size */
  maxSize?: number;
  /** Cache key generator */
  keyGenerator?: (request: MiddlewareRequest) => string;
  /** Methods to cache (default: ['GET']) */
  methods?: string[];
  /** Paths to cache (regex patterns) */
  includePaths?: RegExp[];
  /** Paths to exclude from cache */
  excludePaths?: RegExp[];
};

/**
 * Simple in-memory cache
 */
class SimpleCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttl: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Caching interceptor
 *
 * Caches responses to reduce API calls.
 *
 * @example
 * ```typescript
 * client.use(createCacheInterceptor({
 *   ttl: 60000, // 1 minute
 *   methods: ['GET'],
 *   includePaths: [/\/api\/tools/, /\/api\/providers/],
 * }));
 * ```
 */
export function createCacheInterceptor(
  options: CacheInterceptorOptions,
): Middleware {
  const {
    ttl,
    maxSize = 1000,
    keyGenerator = (req) => `${req.method}:${req.url}`,
    methods = ["GET"],
    includePaths,
    excludePaths,
  } = options;

  const cache = new SimpleCache<MiddlewareResponse>(maxSize);

  return async (request, next) => {
    // Check if request should be cached
    if (!methods.includes(request.method)) {
      return next();
    }

    // Check path filters
    const url = new URL(request.url, "http://localhost");
    if (excludePaths?.some((pattern) => pattern.test(url.pathname))) {
      return next();
    }
    if (
      includePaths &&
      !includePaths.some((pattern) => pattern.test(url.pathname))
    ) {
      return next();
    }

    const cacheKey = keyGenerator(request);
    const cached = cache.get(cacheKey);

    if (cached) {
      // Return cached response with cache hit indicator
      return {
        ...cached,
        context: {
          ...cached.context,
          cacheHit: true,
        },
      };
    }

    const response = await next();

    // Only cache successful responses
    if (response.status >= 200 && response.status < 300) {
      cache.set(cacheKey, response, ttl);
    }

    return response;
  };
}

// =============================================================================
// Timeout Interceptors
// =============================================================================

/**
 * Timeout interceptor options
 */
export type TimeoutInterceptorOptions = {
  /** Timeout in milliseconds */
  timeout: number;
  /** Callback when timeout occurs */
  onTimeout?: (request: MiddlewareRequest) => void;
};

/**
 * Timeout interceptor
 *
 * Adds a timeout to requests.
 *
 * @example
 * ```typescript
 * client.use(createTimeoutInterceptor({
 *   timeout: 30000, // 30 seconds
 *   onTimeout: (request) => console.log('Request timed out:', request.url),
 * }));
 * ```
 */
export function createTimeoutInterceptor(
  options: TimeoutInterceptorOptions,
): Middleware {
  const { timeout, onTimeout } = options;

  return async (request, next) => {
    const controller = new AbortController();

    // Store the signal so downstream middleware/httpClient can also use it
    request.context.timeoutSignal = controller.signal;

    // Race next() against a timer that rejects on timeout
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        onTimeout?.(request);
        const error = new Error(`Request timed out after ${timeout}ms`);
        error.name = "TimeoutError";
        reject(error);
      }, timeout);
    });

    try {
      const response = await Promise.race([next(), timeoutPromise]);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (
        (error as Error).name === "TimeoutError" ||
        (error as Error).name === "AbortError"
      ) {
        throw new Error(`Request timed out after ${timeout}ms`, {
          cause: error,
        });
      }
      throw error;
    }
  };
}

// =============================================================================
// Error Handling Interceptors
// =============================================================================

/**
 * Error handling interceptor options
 */
export type ErrorHandlerOptions = {
  /** Custom error handler */
  onError?: (error: Error, request: MiddlewareRequest) => Error | void;
  /** Transform error response */
  transformError?: (error: unknown) => ApiError;
  /** Report errors to external service */
  reportError?: (
    error: Error,
    context: MiddlewareContext,
  ) => void | Promise<void>;
};

/**
 * Error handling interceptor
 *
 * Provides centralized error handling and transformation.
 *
 * @example
 * ```typescript
 * client.use(createErrorHandlerInterceptor({
 *   onError: (error, request) => {
 *     console.error('Request failed:', error.message);
 *   },
 *   reportError: async (error, context) => {
 *     await errorReportingService.report(error, context);
 *   },
 * }));
 * ```
 */
export function createErrorHandlerInterceptor(
  options: ErrorHandlerOptions = {},
): Middleware {
  const { onError, transformError, reportError } = options;

  return async (request, next) => {
    try {
      return await next();
    } catch (error) {
      // Report error if configured
      if (reportError) {
        await reportError(error as Error, request.context);
      }

      // Transform error if configured
      if (transformError) {
        const transformed = transformError(error);
        throw transformed;
      }

      // Call custom handler
      if (onError) {
        const result = onError(error as Error, request);
        if (result) {
          throw result;
        }
      }

      throw error;
    }
  };
}

// =============================================================================
// Composition Utilities
// =============================================================================

/**
 * Compose multiple middleware into one
 *
 * @example
 * ```typescript
 * const combinedMiddleware = composeMiddleware(
 *   createLoggingInterceptor(),
 *   createRetryInterceptor({ maxAttempts: 3 }),
 *   createRateLimitInterceptor({ maxRequests: 100, windowMs: 60000 }),
 * );
 *
 * client.use(combinedMiddleware);
 * ```
 */
export function composeMiddleware(...middlewares: Middleware[]): Middleware {
  return async (request, next) => {
    let index = 0;

    const executeNext = async (): Promise<MiddlewareResponse> => {
      if (index < middlewares.length) {
        const middleware = middlewares[index++];
        return middleware(request, executeNext);
      }
      return next();
    };

    return executeNext();
  };
}

/**
 * Conditionally apply middleware
 *
 * @example
 * ```typescript
 * client.use(conditionalMiddleware(
 *   (request) => request.url.includes('/api/agents'),
 *   createLoggingInterceptor(),
 * ));
 * ```
 */
export function conditionalMiddleware(
  condition: (request: MiddlewareRequest) => boolean,
  middleware: Middleware,
): Middleware {
  return async (request, next) => {
    if (condition(request)) {
      return middleware(request, next);
    }
    return next();
  };
}

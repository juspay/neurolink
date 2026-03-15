/**
 * Common Middleware Components
 * Utility middleware for common server operations
 */

import type { MiddlewareDefinition, ServerContext } from "../types.js";
import { getMetricsAggregator } from "../../observability/index.js";
import {
  SpanSerializer,
  SpanStatus,
  SpanType,
} from "../../observability/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Create request timing middleware
 * Adds timing information to responses
 *
 * @example
 * ```typescript
 * server.registerMiddleware(createTimingMiddleware());
 * ```
 */
export function createTimingMiddleware(): MiddlewareDefinition {
  return {
    name: "timing",
    order: 0, // Run first
    handler: async (ctx, next) => {
      const startTime = Date.now();
      const startHrTime = process.hrtime.bigint();

      // Store start time in metadata
      ctx.metadata.requestStartTime = startTime;

      const span = SpanSerializer.createSpan(
        SpanType.SERVER_REQUEST,
        "server.middleware.timing",
        {
          "server.operation": "middleware",
          "server.middleware": "timing",
        },
      );

      try {
        const result = await next();

        // Calculate duration
        const endHrTime = process.hrtime.bigint();
        const durationNs = Number(endHrTime - startHrTime);
        const durationMs = durationNs / 1_000_000;

        // Add timing headers to responseHeaders (adapters read from here)
        ctx.responseHeaders = ctx.responseHeaders || {};
        ctx.responseHeaders["X-Response-Time"] = `${durationMs.toFixed(2)}ms`;
        ctx.responseHeaders["Server-Timing"] =
          `total;dur=${durationMs.toFixed(2)}`;

        span.durationMs = Date.now() - startTime;
        const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
        getMetricsAggregator().recordSpan(endedSpan);

        return result;
      } catch (error) {
        span.durationMs = Date.now() - startTime;
        const endedSpan = SpanSerializer.endSpan(span, SpanStatus.ERROR);
        endedSpan.statusMessage =
          error instanceof Error ? error.message : String(error);
        getMetricsAggregator().recordSpan(endedSpan);
        throw error;
      }
    },
  };
}

/**
 * Create request ID middleware
 * Ensures every request has a unique ID
 *
 * @example
 * ```typescript
 * server.registerMiddleware(createRequestIdMiddleware());
 * ```
 */
export function createRequestIdMiddleware(options?: {
  /** Header name to check for existing ID */
  headerName?: string;
  /** Prefix for generated IDs */
  prefix?: string;
  /** Custom ID generator */
  generator?: () => string;
}): MiddlewareDefinition {
  const {
    headerName = "x-request-id",
    prefix = "req",
    generator = () =>
      `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  } = options ?? {};

  return {
    name: "request-id",
    order: 0, // Run first
    handler: async (ctx, next) => {
      // Use existing ID or generate new one
      ctx.requestId =
        ctx.headers[headerName.toLowerCase()] || ctx.requestId || generator();

      // Add request ID header to responseHeaders (adapters read from here)
      ctx.responseHeaders = ctx.responseHeaders || {};
      ctx.responseHeaders["X-Request-ID"] = ctx.requestId;

      return next();
    },
  };
}

/**
 * Create error handling middleware
 * Catches errors and formats them consistently
 *
 * @example
 * ```typescript
 * server.registerMiddleware(createErrorHandlingMiddleware({
 *   includeStack: process.env.NODE_ENV === 'development',
 * }));
 * ```
 */
export function createErrorHandlingMiddleware(options?: {
  /** Include stack trace in error response */
  includeStack?: boolean;
  /** Custom error handler */
  onError?: (error: Error, ctx: ServerContext) => unknown;
  /** Log errors */
  logErrors?: boolean;
}): MiddlewareDefinition {
  const { includeStack = false, onError, logErrors = true } = options ?? {};

  return {
    name: "error-handling",
    order: 1, // Run very early to catch all errors
    handler: async (ctx, next) => {
      const span = SpanSerializer.createSpan(
        SpanType.SERVER_REQUEST,
        "server.middleware.errorHandling",
        {
          "server.operation": "middleware",
          "server.middleware": "error-handling",
        },
      );
      const middlewareStartTime = Date.now();

      try {
        const result = await next();
        span.durationMs = Date.now() - middlewareStartTime;
        const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
        getMetricsAggregator().recordSpan(endedSpan);
        return result;
      } catch (error) {
        const err = error as Error & {
          statusCode?: number;
          code?: string;
          response?: unknown;
        };

        if (logErrors) {
          logger.error("[ErrorMiddleware]", {
            requestId: ctx.requestId,
            error: err.message,
            stack: err.stack,
          });
        }

        span.durationMs = Date.now() - middlewareStartTime;
        const endedSpan = SpanSerializer.endSpan(span, SpanStatus.ERROR);
        endedSpan.statusMessage = err.message;
        getMetricsAggregator().recordSpan(endedSpan);

        // Use custom handler if provided
        if (onError) {
          return onError(err, ctx);
        }

        // Default error response
        const statusCode = err.statusCode || 500;
        const errorResponse: Record<string, unknown> = {
          error: {
            code: err.code || `HTTP_${statusCode}`,
            message: statusCode === 500 ? "Internal server error" : err.message,
          },
          metadata: {
            requestId: ctx.requestId,
            timestamp: new Date().toISOString(),
          },
        };

        // Include stack in development
        if (includeStack && err.stack) {
          (errorResponse.error as Record<string, unknown>).stack = err.stack;
        }

        // Store error response in metadata
        ctx.metadata.errorResponse = errorResponse;
        ctx.metadata.errorStatusCode = statusCode;

        // Re-throw for adapter to handle
        throw error;
      }
    },
  };
}

/**
 * Create security headers middleware
 * Adds common security headers to responses
 *
 * @example
 * ```typescript
 * server.registerMiddleware(createSecurityHeadersMiddleware());
 * ```
 */
export function createSecurityHeadersMiddleware(options?: {
  /** Content Security Policy */
  contentSecurityPolicy?: string;
  /** X-Frame-Options (default: DENY) */
  frameOptions?: "DENY" | "SAMEORIGIN" | false;
  /** X-Content-Type-Options (default: nosniff) */
  contentTypeOptions?: "nosniff" | false;
  /** Strict-Transport-Security max age in seconds (default: 31536000) */
  hstsMaxAge?: number | false;
  /** Referrer-Policy (default: strict-origin-when-cross-origin) */
  referrerPolicy?: string | false;
  /** Additional custom headers */
  customHeaders?: Record<string, string>;
}): MiddlewareDefinition {
  const {
    contentSecurityPolicy,
    frameOptions = "DENY",
    contentTypeOptions = "nosniff",
    hstsMaxAge = 31536000,
    referrerPolicy = "strict-origin-when-cross-origin",
    customHeaders = {},
  } = options ?? {};

  // Build headers object
  const securityHeaders: Record<string, string> = {};

  if (contentSecurityPolicy) {
    securityHeaders["Content-Security-Policy"] = contentSecurityPolicy;
  }

  if (frameOptions) {
    securityHeaders["X-Frame-Options"] = frameOptions;
  }

  if (contentTypeOptions) {
    securityHeaders["X-Content-Type-Options"] = contentTypeOptions;
  }

  if (hstsMaxAge !== false) {
    securityHeaders["Strict-Transport-Security"] =
      `max-age=${hstsMaxAge}; includeSubDomains`;
  }

  if (referrerPolicy) {
    securityHeaders["Referrer-Policy"] = referrerPolicy;
  }

  // Add X-XSS-Protection for older browsers
  securityHeaders["X-XSS-Protection"] = "1; mode=block";

  // Add custom headers
  Object.assign(securityHeaders, customHeaders);

  return {
    name: "security-headers",
    order: 2,
    handler: async (ctx, next) => {
      // Add security headers to responseHeaders (adapters read from here)
      ctx.responseHeaders = ctx.responseHeaders || {};
      Object.assign(ctx.responseHeaders, securityHeaders);

      return next();
    },
  };
}

/**
 * Create request logging middleware
 * Logs request and response information
 *
 * @example
 * ```typescript
 * server.registerMiddleware(createLoggingMiddleware({
 *   logBody: process.env.NODE_ENV === 'development',
 * }));
 * ```
 */
export function createLoggingMiddleware(options?: {
  /** Log request body */
  logBody?: boolean;
  /** Log response body */
  logResponse?: boolean;
  /** Custom logger */
  logger?: {
    info: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };
  /** Skip logging for certain paths */
  skipPaths?: string[];
}): MiddlewareDefinition {
  const {
    logBody = false,
    logResponse = false,
    logger = console,
    skipPaths = ["/health", "/ready", "/metrics"],
  } = options ?? {};

  return {
    name: "logging",
    order: 3,
    excludePaths: skipPaths,
    handler: async (ctx, next) => {
      const startTime = Date.now();

      // Log request
      const requestLog: Record<string, unknown> = {
        requestId: ctx.requestId,
        method: ctx.method,
        path: ctx.path,
        query: Object.keys(ctx.query).length > 0 ? ctx.query : undefined,
      };

      if (logBody && ctx.body) {
        requestLog.body = ctx.body;
      }

      logger.info(`[Request] ${ctx.method} ${ctx.path}`, requestLog);

      try {
        const result = await next();
        const duration = Date.now() - startTime;

        // Log response
        const responseLog: Record<string, unknown> = {
          requestId: ctx.requestId,
          duration: `${duration}ms`,
          status: 200,
        };

        if (logResponse && result) {
          responseLog.response = result;
        }

        logger.info(`[Response] ${ctx.method} ${ctx.path}`, responseLog);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const err = error as Error & { statusCode?: number };

        logger.error(`[Error] ${ctx.method} ${ctx.path}`, {
          requestId: ctx.requestId,
          duration: `${duration}ms`,
          error: err.message,
          status: err.statusCode || 500,
        });

        throw error;
      }
    },
  };
}

/**
 * Create compression preference middleware
 * Signals compression preference to adapters
 */
export function createCompressionMiddleware(options?: {
  /** Minimum response size to compress (bytes) */
  threshold?: number;
  /** Content types to compress */
  contentTypes?: string[];
}): MiddlewareDefinition {
  const {
    threshold = 1024,
    contentTypes = [
      "text/",
      "application/json",
      "application/javascript",
      "application/xml",
    ],
  } = options ?? {};

  return {
    name: "compression",
    order: 5,
    handler: async (ctx, next) => {
      // Store compression preferences in metadata
      ctx.metadata.compression = {
        enabled: true,
        threshold,
        contentTypes,
        acceptEncoding: ctx.headers["accept-encoding"] || "",
      };

      return next();
    },
  };
}

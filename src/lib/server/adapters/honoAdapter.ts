/**
 * Hono Server Adapter
 * Primary server adapter implementation using Hono framework
 * Hono is chosen for its performance, TypeScript-first design, and edge compatibility
 */

import type { Context as HonoContext, Next } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { streamSSE } from "hono/streaming";
import { timeout } from "hono/timeout";
import type { NeuroLink } from "../../neurolink.js";
import { logger } from "../../utils/logger.js";
import { AlreadyRunningError, ServerStopError, wrapError } from "../errors.js";
import { BaseServerAdapter } from "../abstract/baseServerAdapter.js";
import type {
  MiddlewareDefinition,
  RouteDefinition,
  ServerAdapterConfig,
  ServerAdapterEvents,
  ServerContext,
} from "../types.js";
import { isErrorResponse } from "../utils/validation.js";

/**
 * Rate limit store entry
 */
type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// Declare global for runtime detection
declare const Bun: { serve: (options: unknown) => unknown } | undefined;
declare const Deno:
  | { serve: (options: unknown, handler: unknown) => unknown }
  | undefined;

/**
 * Hono-specific server adapter
 * Supports multiple runtimes: Bun, Deno, Node.js
 */
export class HonoServerAdapter extends BaseServerAdapter {
  private app!: Hono;
  private server?: unknown;
  private rateLimitStore = new Map<string, RateLimitEntry>();
  private rateLimitCleanupInterval?: ReturnType<typeof setInterval>;
  // Store context by request ID for sharing between middleware and route handlers
  private requestContextStore = new Map<string, ServerContext>();

  constructor(neurolink: NeuroLink, config: ServerAdapterConfig = {}) {
    super(neurolink, config);
  }

  /**
   * Create rate limiter middleware for Hono
   */
  private createRateLimiter(): (
    c: HonoContext,
    next: Next,
  ) => Promise<Response | void> {
    return async (c: HonoContext, next: Next): Promise<Response | void> => {
      // Skip rate limiting for excluded paths
      if (this.config.rateLimit.skipPaths) {
        for (const skipPath of this.config.rateLimit.skipPaths) {
          if (c.req.path.startsWith(skipPath)) {
            return next();
          }
        }
      }

      // Use custom keyGenerator if provided, otherwise default to IP-based key
      let key: string;
      if (this.config.rateLimit.keyGenerator) {
        // Build minimal context for keyGenerator
        const headers: Record<string, string> = {};
        c.req.raw.headers.forEach((value, name) => {
          headers[name] = value;
        });
        const minCtx = {
          requestId: c.req.header("X-Request-ID") || this.generateRequestId(),
          method: c.req.method,
          path: c.req.path,
          headers,
          query: this.extractQuery(c),
          params: c.req.param() as Record<string, string>,
          neurolink: this.neurolink,
          toolRegistry: this.toolRegistry,
          externalServerManager: this.externalServerManager,
          timestamp: Date.now(),
          metadata: {},
        };
        key = this.config.rateLimit.keyGenerator(minCtx as ServerContext);
      } else {
        key =
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          "unknown";
      }
      const now = Date.now();
      const windowMs = this.config.rateLimit.windowMs;
      const maxRequests = this.config.rateLimit.maxRequests;

      let record = this.rateLimitStore.get(key);
      if (!record || now > record.resetAt) {
        record = { count: 0, resetAt: now + windowMs };
        this.rateLimitStore.set(key, record);
      }

      record.count++;

      // Set rate limit headers
      c.header("X-RateLimit-Limit", String(maxRequests));
      c.header(
        "X-RateLimit-Remaining",
        String(Math.max(0, maxRequests - record.count)),
      );
      c.header("X-RateLimit-Reset", String(Math.ceil(record.resetAt / 1000)));

      if (record.count > maxRequests) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);
        c.header("Retry-After", String(retryAfter));
        return c.json(
          {
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: this.config.rateLimit.message,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              retryAfter,
            },
          },
          429,
        );
      }

      return next();
    };
  }

  /**
   * Periodically clean up expired rate limit entries
   */
  private cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetAt) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Initialize Hono framework
   */
  protected initializeFramework(): void {
    this.app = new Hono();

    // Add secure headers
    this.app.use("*", secureHeaders());

    // Add CORS if enabled
    if (this.config.cors.enabled) {
      this.app.use(
        "*",
        cors({
          origin: this.config.cors.origins,
          allowMethods: this.config.cors.methods,
          allowHeaders: this.config.cors.headers,
          credentials: this.config.cors.credentials,
          maxAge: this.config.cors.maxAge,
        }),
      );
    }

    // Add timeout middleware
    this.app.use("*", timeout(this.config.timeout));

    // Add logging if enabled
    if (this.config.logging.enabled) {
      this.app.use("*", honoLogger());
    }

    // Add rate limiting if enabled
    if (this.config.rateLimit.enabled) {
      this.app.use("*", this.createRateLimiter());

      // Schedule periodic cleanup of expired rate limit entries (every minute)
      this.rateLimitCleanupInterval = setInterval(
        () => this.cleanupRateLimitStore(),
        60000,
      );
    }

    // Global error handler
    this.app.onError((error, c) => {
      const requestId =
        c.req.header("X-Request-ID") || this.generateRequestId();

      logger.error("[HonoAdapter] Request error", {
        requestId,
        error: error.message,
        stack: error.stack,
      });

      this.emit("error", {
        requestId,
        error,
        timestamp: new Date(),
      } satisfies ServerAdapterEvents["error"]);

      if (error instanceof HTTPException) {
        return c.json(
          {
            error: {
              code: `HTTP_${error.status}`,
              message: error.message,
            },
            metadata: {
              requestId,
              timestamp: new Date().toISOString(),
            },
          },
          error.status,
        );
      }

      return c.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "An internal error occurred",
          },
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
        500,
      );
    });

    // 404 handler
    this.app.notFound((c) => {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Route ${c.req.method} ${c.req.path} not found`,
          },
        },
        404,
      );
    });
  }

  /**
   * Register route with Hono
   */
  protected registerFrameworkRoute(route: RouteDefinition): void {
    const method = route.method.toLowerCase() as
      | "get"
      | "post"
      | "put"
      | "delete"
      | "patch"
      | "options";

    this.app[method](route.path, async (c: HonoContext) => {
      const requestId =
        c.req.header("X-Request-ID") || this.generateRequestId();
      const connectionId = `conn-${requestId}`;
      const startTime = Date.now();

      // Track connection for graceful shutdown
      this.trackConnection(connectionId, undefined, requestId);

      try {
        // Extract path parameters
        const params = c.req.param() as Record<string, string>;

        // Reuse existing context from middleware if available, otherwise create new one
        const existingCtx = this.requestContextStore.get(requestId);
        const ctx =
          existingCtx ||
          this.createContext({
            requestId,
            method: c.req.method,
            path: c.req.path,
            headers: this.extractHeaders(c),
            query: this.extractQuery(c),
            params,
            body: await this.extractBody(c),
          });

        // Emit request event
        this.emit("request", {
          requestId,
          method: ctx.method,
          path: ctx.path,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["request"]);

        // Handle streaming if configured
        if (route.streaming?.enabled) {
          return await this.handleStreamingResponse(c, ctx, route);
        }

        // Execute handler
        const result = await route.handler(ctx);
        const duration = Date.now() - startTime;

        // Check if result is an error response
        if (isErrorResponse(result)) {
          const statusCode = result.httpStatus ?? 500;

          // Emit response event with error status
          this.emit("response", {
            requestId,
            statusCode,
            duration,
            timestamp: new Date(),
          } satisfies ServerAdapterEvents["response"]);

          // Apply response headers from middleware
          if (ctx.responseHeaders) {
            for (const [key, value] of Object.entries(ctx.responseHeaders)) {
              c.header(key, value);
            }
          }

          // Return error response with proper status code
          // Cast to ContentfulStatusCode since we know error codes are valid HTTP status codes
          return c.json(
            {
              error: result.error,
              metadata: {
                ...result.metadata,
                requestId,
                timestamp: new Date().toISOString(),
                duration,
              },
            },
            statusCode as 400 | 401 | 403 | 404 | 429 | 500 | 503,
          );
        }

        // Emit response event
        this.emit("response", {
          requestId,
          statusCode: 200,
          duration,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["response"]);

        // Apply response headers from middleware
        if (ctx.responseHeaders) {
          for (const [key, value] of Object.entries(ctx.responseHeaders)) {
            c.header(key, value);
          }
        }

        // Return formatted response
        return c.json({
          data: result,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            duration,
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        logger.error("[HonoAdapter] Handler error", {
          requestId,
          route: route.path,
          error: errorMessage,
        });

        throw new HTTPException(500, { message: errorMessage });
      } finally {
        // Untrack connection when request completes
        this.untrackConnection(connectionId);
        // Clean up context store to prevent memory leaks
        this.requestContextStore.delete(requestId);
      }
    });
  }

  /**
   * Handle streaming response using SSE
   */
  private async handleStreamingResponse(
    c: HonoContext,
    ctx: ServerContext,
    route: RouteDefinition,
  ): Promise<Response> {
    // Apply middleware response headers to streaming response before starting the stream
    if (ctx.responseHeaders) {
      for (const [key, value] of Object.entries(ctx.responseHeaders)) {
        c.header(key, value);
      }
    }

    return streamSSE(c, async (stream) => {
      try {
        // Get streaming result from handler
        const result = await route.handler(ctx);

        // If result is an async iterable, stream it
        if (
          result &&
          typeof result === "object" &&
          Symbol.asyncIterator in result
        ) {
          for await (const chunk of result as AsyncIterable<unknown>) {
            await stream.writeSSE({
              data: JSON.stringify(chunk),
              event: "message",
            });
          }
        } else {
          // Single result, send as complete event
          await stream.writeSSE({
            data: JSON.stringify(result),
            event: "complete",
          });
        }

        // Send done event
        await stream.writeSSE({
          data: "",
          event: "done",
        });
      } catch (error) {
        await stream.writeSSE({
          data: JSON.stringify({
            error: error instanceof Error ? error.message : "Stream error",
          }),
          event: "error",
        });
      }
    });
  }

  /**
   * Register middleware with Hono
   */
  protected registerFrameworkMiddleware(
    middleware: MiddlewareDefinition,
  ): void {
    const paths = middleware.paths || ["*"];

    for (const path of paths) {
      this.app.use(path, async (c, next) => {
        // Skip excluded paths
        if (middleware.excludePaths?.some((p) => c.req.path.startsWith(p))) {
          return next();
        }

        // Extract path parameters
        const params = c.req.param() as Record<string, string>;

        // Get or generate request ID for context lookup
        const requestId =
          c.req.header("X-Request-ID") || this.generateRequestId();

        // Reuse existing context from previous middleware if available
        let ctx = this.requestContextStore.get(requestId);
        if (!ctx) {
          // Create new context for the first middleware
          ctx = this.createContext({
            requestId,
            method: c.req.method,
            path: c.req.path,
            headers: this.extractHeaders(c),
            query: this.extractQuery(c),
            params,
            body: await this.extractBody(c),
          });
          // Store context for sharing between middleware and route handlers
          this.requestContextStore.set(requestId, ctx);
        }

        // Execute middleware
        return middleware.handler(ctx, next);
      });
    }
  }

  /**
   * Start the Hono server
   */
  public async start(): Promise<void> {
    // Validate lifecycle state
    this.validateLifecycleState("start", ["initialized", "stopped"]);

    if (this.isRunning) {
      throw new AlreadyRunningError(this.config.port, this.config.host);
    }

    this.lifecycleState = "starting";
    const { port, host } = this.config;

    try {
      // Check if running in Bun environment
      if (typeof Bun !== "undefined") {
        this.server = Bun.serve({
          port,
          hostname: host,
          fetch: this.app.fetch,
        });
      } else if (typeof Deno !== "undefined") {
        // Deno runtime
        this.server = Deno.serve(
          {
            port,
            hostname: host,
          },
          this.app.fetch,
        );
      } else {
        // Fallback to Node.js http module via @hono/node-server
        const { serve } = await import("@hono/node-server");
        this.server = serve({
          fetch: this.app.fetch,
          port,
          hostname: host,
        });
      }

      this.isRunning = true;
      this.startTime = new Date();
      this.lifecycleState = "running";

      logger.info(`[HonoAdapter] Server started on ${host}:${port}`);

      this.emit("started", {
        port,
        host,
        timestamp: this.startTime,
      } satisfies ServerAdapterEvents["started"]);
    } catch (error) {
      this.lifecycleState = "error";
      throw error;
    }
  }

  /**
   * Stop the Hono server with graceful shutdown
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return; // Already stopped, return gracefully (idempotent)
    }

    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    try {
      // Use graceful shutdown from base class
      await this.gracefulShutdown();

      // Clean up rate limit cleanup interval
      if (this.rateLimitCleanupInterval) {
        clearInterval(this.rateLimitCleanupInterval);
        this.rateLimitCleanupInterval = undefined;
      }

      logger.info("[HonoAdapter] Server stopped", { uptime });

      this.emit("stopped", {
        uptime,
        timestamp: new Date(),
      } satisfies ServerAdapterEvents["stopped"]);

      // Reset state for restart capability
      this.resetServerState();
      this.server = undefined;
      this.rateLimitStore.clear();
    } catch (error) {
      const wrappedError = wrapError(error);
      throw new ServerStopError(wrappedError.message, wrappedError);
    }
  }

  // ============================================
  // Lifecycle Methods (Framework-Specific)
  // ============================================

  /**
   * Stop accepting new connections
   */
  protected async stopAcceptingConnections(): Promise<void> {
    // For Hono, this is handled by the underlying server
    logger.debug("[HonoAdapter] Stopping acceptance of new connections");
  }

  /**
   * Close the underlying server
   */
  protected async closeServer(): Promise<void> {
    if (!this.server) {
      return;
    }

    // Handle different server types (Bun, Deno, Node.js)
    const serverObj = this.server as {
      stop?: () => void;
      shutdown?: () => Promise<void>;
      close?: (callback?: (err?: Error) => void) => void;
      closeAllConnections?: () => void;
    };

    if (typeof serverObj.stop === "function") {
      // Bun server
      serverObj.stop();
    } else if (typeof serverObj.shutdown === "function") {
      // Deno server
      await serverObj.shutdown();
    } else if (typeof serverObj.close === "function") {
      // Node.js http server
      await new Promise<void>((resolve, reject) => {
        serverObj.close?.((err?: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  /**
   * Force close all active connections
   */
  protected async forceCloseConnections(): Promise<void> {
    logger.info("[HonoAdapter] Force closing connections", {
      count: this.activeConnections.size,
    });

    if (this.server) {
      const serverObj = this.server as {
        closeAllConnections?: () => void;
      };

      if (typeof serverObj.closeAllConnections === "function") {
        serverObj.closeAllConnections();
      }
    }

    this.activeConnections.clear();
  }

  /**
   * Get the Hono app instance
   */
  public getFrameworkInstance(): unknown {
    return this.app;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private extractHeaders(c: HonoContext): Record<string, string> {
    const headers: Record<string, string> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  private extractQuery(c: HonoContext): Record<string, string> {
    const query: Record<string, string> = {};
    const url = new URL(c.req.url);
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });
    return query;
  }

  private async extractBody(c: HonoContext): Promise<unknown> {
    if (!this.config.bodyParser.enabled) {
      return undefined;
    }

    const contentType = c.req.header("Content-Type") || "";

    if (contentType.includes("application/json")) {
      try {
        return await c.req.json();
      } catch {
        return undefined;
      }
    }

    if (contentType.includes("application/x-www-form-urlencoded")) {
      try {
        return await c.req.parseBody();
      } catch {
        return undefined;
      }
    }

    return undefined;
  }
}

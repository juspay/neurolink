/**
 * Fastify Server Adapter
 * Server adapter implementation using Fastify framework
 * Fastify is known for its high performance and low overhead
 */

import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifyError,
} from "fastify";
import type { NeuroLink } from "../../neurolink.js";
import { logger } from "../../utils/logger.js";
import {
  AlreadyRunningError,
  ServerStartError,
  ServerStopError,
  wrapError,
} from "../errors.js";
import { withTimeout } from "../../utils/errorHandling.js";
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
 * Rate limit context type for error response builder
 */
type RateLimitContext = {
  ttl: number;
  ban?: boolean;
};

/**
 * Fastify-specific server adapter
 * Provides high-performance HTTP server with schema validation
 */
export class FastifyServerAdapter extends BaseServerAdapter {
  private app: FastifyInstance | null = null;
  private frameworkInitialized = false;

  constructor(neurolink: NeuroLink, config: ServerAdapterConfig = {}) {
    super(neurolink, config);
  }

  /**
   * Initialize Fastify framework
   * Called by base class but actual initialization happens in initializeFrameworkAsync
   */
  protected initializeFramework(): void {
    // Framework will be initialized asynchronously in initializeFrameworkAsync
    // This is called by the base class constructor, but we need async imports
  }

  /**
   * Initialize Fastify framework with async imports
   */
  private async initializeFrameworkAsync(): Promise<void> {
    if (this.frameworkInitialized) {
      return;
    }

    // Dynamic import to avoid loading if not used
    const fastifyModule = await import("fastify");
    const Fastify = fastifyModule.default;

    this.app = Fastify({
      logger: this.config.logging.enabled
        ? {
            level: this.config.logging.level,
          }
        : false,
      requestIdHeader: "x-request-id",
      genReqId: () => this.generateRequestId(),
      bodyLimit: this.parseBodyLimit(this.config.bodyParser.maxSize),
    });

    // Register CORS plugin if enabled
    if (this.config.cors.enabled) {
      const corsModule = await import("@fastify/cors");
      await this.app.register(corsModule.default, {
        origin: this.config.cors.origins,
        methods: this.config.cors.methods,
        allowedHeaders: this.config.cors.headers,
        credentials: this.config.cors.credentials,
        maxAge: this.config.cors.maxAge,
      });
    }

    // Register rate limiting plugin if enabled
    if (this.config.rateLimit.enabled) {
      const rateLimitModule = await import("@fastify/rate-limit");
      const windowMs = this.config.rateLimit.windowMs;
      await this.app.register(rateLimitModule.default, {
        max: this.config.rateLimit.maxRequests,
        timeWindow: windowMs,
        errorResponseBuilder: (
          _request: FastifyRequest,
          context: RateLimitContext,
        ) => ({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: this.config.rateLimit.message,
          },
          metadata: {
            retryAfter: Math.ceil(context.ttl / 1000),
            timestamp: new Date().toISOString(),
          },
        }),
      });

      // Add hook to set Retry-After header for 429 responses
      this.app.addHook(
        "onSend",
        async (
          _request: FastifyRequest,
          reply: FastifyReply,
          payload: unknown,
        ) => {
          if (reply.statusCode === 429) {
            const retryAfter = Math.ceil(windowMs / 1000);
            reply.header("Retry-After", String(retryAfter));
          }
          return payload;
        },
      );
    }

    // Add request ID to response headers
    this.app.addHook(
      "onRequest",
      async (request: FastifyRequest, reply: FastifyReply) => {
        reply.header("X-Request-ID", request.id);
      },
    );

    // Global error handler
    this.app.setErrorHandler(
      (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
        const requestId = request.id;

        logger.error("[FastifyAdapter] Request error", {
          requestId,
          error: error.message,
          stack: error.stack,
        });

        this.emit("error", {
          requestId,
          error,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["error"]);

        // Handle different error types
        if (error.statusCode) {
          reply.status(error.statusCode).send({
            error: {
              code: `HTTP_${error.statusCode}`,
              message: error.message,
            },
            metadata: {
              requestId,
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        reply.status(500).send({
          error: {
            code: "INTERNAL_ERROR",
            message: "An internal error occurred",
          },
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        });
      },
    );

    // 404 handler
    this.app.setNotFoundHandler(
      (request: FastifyRequest, reply: FastifyReply) => {
        reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: `Route ${request.method} ${request.url} not found`,
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        });
      },
    );

    this.frameworkInitialized = true;
  }

  /**
   * Parse body limit string to number (bytes)
   */
  private parseBodyLimit(limit: string): number {
    const match = limit.match(/^(\d+)(mb|kb|gb)?$/i);
    if (!match) {
      return 10 * 1024 * 1024; // Default 10MB
    }

    const value = parseInt(match[1], 10);
    const unit = (match[2] || "b").toLowerCase();

    switch (unit) {
      case "gb":
        return value * 1024 * 1024 * 1024;
      case "mb":
        return value * 1024 * 1024;
      case "kb":
        return value * 1024;
      default:
        return value;
    }
  }

  /**
   * Override initialize to ensure async framework setup
   */
  public async initialize(): Promise<void> {
    // Initialize Fastify asynchronously first
    await this.initializeFrameworkAsync();

    // Then call base class initialize
    await super.initialize();
  }

  /**
   * Register route with Fastify
   */
  protected registerFrameworkRoute(route: RouteDefinition): void {
    if (!this.app) {
      throw new Error(
        "Fastify app not initialized. Call initialize() before registering routes.",
      );
    }

    const method = route.method.toUpperCase() as
      | "GET"
      | "POST"
      | "PUT"
      | "DELETE"
      | "PATCH"
      | "OPTIONS";

    // Fastify does not allow duplicate method+path registrations.
    // Skip if route already exists (e.g., built-in health routes).
    if (this.app.hasRoute({ method, url: route.path })) {
      return;
    }

    this.app.route({
      method,
      url: route.path,
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        const requestId = request.id;
        const startTime = Date.now();

        // Create server context
        const ctx = this.createContext({
          requestId,
          method: request.method,
          path: request.url.split("?")[0], // Remove query string
          headers: request.headers as Record<string, string>,
          query: request.query as Record<string, string>,
          params: request.params as Record<string, string>,
          body: request.body,
        });

        // Copy response headers from middleware (stored in request by middleware)
        const reqWithHeaders = request as FastifyRequest & {
          responseHeaders?: Record<string, string>;
        };
        if (reqWithHeaders.responseHeaders) {
          ctx.responseHeaders = { ...reqWithHeaders.responseHeaders };
        }

        // Emit request event
        this.emit("request", {
          requestId,
          method: ctx.method,
          path: ctx.path,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["request"]);

        // Handle streaming if configured
        if (route.streaming?.enabled) {
          return this.handleStreamingResponse(reply, ctx, route);
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

          // Apply response headers from middleware and handler
          if (ctx.responseHeaders) {
            for (const [key, value] of Object.entries(ctx.responseHeaders)) {
              reply.header(key, value);
            }
          }

          // Return error response with proper status code
          reply.status(statusCode);
          return {
            error: result.error,
            metadata: {
              ...result.metadata,
              requestId,
              timestamp: new Date().toISOString(),
              duration,
            },
          };
        }

        // Emit response event
        this.emit("response", {
          requestId,
          statusCode: 200,
          duration,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["response"]);

        // Apply response headers from middleware and handler
        if (ctx.responseHeaders) {
          for (const [key, value] of Object.entries(ctx.responseHeaders)) {
            reply.header(key, value);
          }
        }

        // Return formatted response
        return {
          data: result,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            duration,
          },
        };
      },
    });
  }

  /**
   * Handle streaming response using Server-Sent Events
   */
  private async handleStreamingResponse(
    reply: FastifyReply,
    ctx: ServerContext,
    route: RouteDefinition,
  ): Promise<void> {
    // Set SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    });

    try {
      const result = await route.handler(ctx);

      // Check if result is an async iterable
      if (
        result &&
        typeof result === "object" &&
        Symbol.asyncIterator in result
      ) {
        for await (const chunk of result as AsyncIterable<unknown>) {
          reply.raw.write(`event: message\n`);
          reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      } else {
        // Single result, send as complete event
        reply.raw.write(`event: complete\n`);
        reply.raw.write(`data: ${JSON.stringify(result)}\n\n`);
      }

      // Send done event
      reply.raw.write(`event: done\n`);
      reply.raw.write(`data: \n\n`);
      reply.raw.end();
    } catch (error) {
      reply.raw.write(`event: error\n`);
      reply.raw.write(
        `data: ${JSON.stringify({
          error: error instanceof Error ? error.message : "Stream error",
        })}\n\n`,
      );
      reply.raw.end();
    }
  }

  /**
   * Register middleware with Fastify
   */
  protected registerFrameworkMiddleware(
    middleware: MiddlewareDefinition,
  ): void {
    if (!this.app) {
      throw new Error(
        "Fastify app not initialized. Call initialize() before registering middleware.",
      );
    }

    this.app.addHook(
      "preHandler",
      async (request: FastifyRequest, _reply: FastifyReply) => {
        // Skip excluded paths
        if (middleware.excludePaths?.some((p) => request.url.startsWith(p))) {
          return;
        }

        // Check if path matches
        const paths = middleware.paths || ["/"];
        const matches = paths.some(
          (p) => request.url.startsWith(p) || p === "*",
        );
        if (!matches) {
          return;
        }

        // Initialize response headers storage if not present
        const reqWithHeaders = request as FastifyRequest & {
          responseHeaders: Record<string, string>;
        };
        if (!reqWithHeaders.responseHeaders) {
          reqWithHeaders.responseHeaders = {};
        }

        // Create context with existing response headers from previous middleware
        const ctx = this.createContext({
          requestId: request.id,
          method: request.method,
          path: request.url.split("?")[0],
          headers: request.headers as Record<string, string>,
          query: request.query as Record<string, string>,
          params: request.params as Record<string, string>,
          body: request.body,
        });

        // Copy existing response headers to context
        ctx.responseHeaders = { ...reqWithHeaders.responseHeaders };

        // Execute middleware
        await middleware.handler(ctx, async () => {
          // After middleware execution, merge response headers back to request
          if (ctx.responseHeaders) {
            Object.assign(reqWithHeaders.responseHeaders, ctx.responseHeaders);
          }
        });

        // Also merge headers after handler returns (for middleware that set headers after next())
        if (ctx.responseHeaders) {
          Object.assign(reqWithHeaders.responseHeaders, ctx.responseHeaders);
        }
      },
    );
  }

  /**
   * Start the Fastify server
   */
  public async start(): Promise<void> {
    // Validate lifecycle state
    this.validateLifecycleState("start", ["initialized", "stopped"]);

    if (this.isRunning) {
      throw new AlreadyRunningError(this.config.port, this.config.host);
    }

    if (!this.app) {
      throw new Error(
        "Fastify app not initialized. Call initialize() before starting.",
      );
    }

    // Capture non-null reference for use in closures below
    const app = this.app;

    this.lifecycleState = "starting";
    const { port, host } = this.config;
    const startupTimeout = this.config.timeout || 30000;

    // Track connections via Fastify hooks (must be registered before listen)
    app.addHook("onRequest", async (request: FastifyRequest) => {
      const connectionId = `conn-${request.id}`;
      this.trackConnection(connectionId, request.raw.socket, request.id);
    });

    app.addHook("onResponse", async (request: FastifyRequest) => {
      const connectionId = `conn-${request.id}`;
      this.untrackConnection(connectionId);
    });

    try {
      await withTimeout(
        app.listen({ port, host }),
        startupTimeout,
        new ServerStartError(
          `Fastify server startup timed out after ${startupTimeout}ms`,
          undefined,
          port,
          host,
        ),
      );

      this.isRunning = true;
      this.startTime = new Date();
      this.lifecycleState = "running";

      logger.info(`[FastifyAdapter] Server started on ${host}:${port}`);

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
   * Stop the Fastify server with graceful shutdown
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return; // Already stopped, return gracefully (idempotent)
    }

    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    try {
      // Use graceful shutdown from base class
      await this.gracefulShutdown();

      logger.info("[FastifyAdapter] Server stopped", { uptime });

      this.emit("stopped", {
        uptime,
        timestamp: new Date(),
      } satisfies ServerAdapterEvents["stopped"]);

      // Reset state for restart capability
      this.resetServerState();
      this.frameworkInitialized = false;
      this.app = null;
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
    // Fastify's close() handles this internally
    logger.debug("[FastifyAdapter] Stopping acceptance of new connections");
  }

  /**
   * Close the underlying server
   */
  protected async closeServer(): Promise<void> {
    if (this.app) {
      const closeTimeout = this.shutdownConfig.gracefulShutdownTimeoutMs;
      await withTimeout(
        this.app.close(),
        closeTimeout,
        new Error(`Fastify server close timed out after ${closeTimeout}ms`),
      );
    }
  }

  /**
   * Force close all active connections
   */
  protected async forceCloseConnections(): Promise<void> {
    logger.info("[FastifyAdapter] Force closing connections", {
      count: this.activeConnections.size,
    });

    // Get the underlying server and destroy all sockets
    const server = this.app?.server;
    if (server) {
      // Force close by destroying the server
      server.closeAllConnections?.();
    }

    this.activeConnections.clear();
  }

  /**
   * Get the Fastify instance
   */
  public getFrameworkInstance(): unknown {
    return this.app;
  }
}

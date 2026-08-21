/**
 * Koa Server Adapter
 * Server adapter implementation using Koa framework
 * Koa is known for its elegant middleware composition using async/await
 */

import type Koa from "koa";
import type Router from "@koa/router";
import type { Socket } from "net";
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
  KoaRateLimitEntry,
} from "../../types/index.js";
import { isErrorResponse } from "../utils/validation.js";

/**
 * Koa-specific server adapter
 * Leverages Koa's middleware composition for clean request handling
 */
export class KoaServerAdapter extends BaseServerAdapter {
  private app!: Koa;
  private router!: Router;
  private server?: import("http").Server;
  private frameworkInitialized = false;
  private rateLimitStore = new Map<string, KoaRateLimitEntry>();
  private rateLimitCleanupInterval?: ReturnType<typeof setInterval>;
  private sockets: Set<Socket> = new Set();

  constructor(neurolink: NeuroLink, config: ServerAdapterConfig = {}) {
    super(neurolink, config);
  }

  /**
   * Initialize Koa framework
   * Called by base class but actual initialization happens in initializeFrameworkAsync
   */
  protected initializeFramework(): void {
    // Framework will be initialized asynchronously in initializeFrameworkAsync
    // This is called by the base class constructor, but we need async imports
  }

  /**
   * Initialize Koa framework with async imports
   */
  private async initializeFrameworkAsync(): Promise<void> {
    if (this.frameworkInitialized) {
      return;
    }

    // Dynamic imports to avoid loading if not used
    const KoaModule = await this.importFrameworkDependency<{
      default: typeof import("koa");
    }>("koa", "Koa");
    const RouterModule = await this.importFrameworkDependency<
      typeof import("@koa/router")
    >("@koa/router", "Koa");

    const Koa = KoaModule.default;
    const Router = RouterModule.default;

    this.app = new Koa();
    this.router = new Router();

    // Request ID middleware (first)
    this.app.use(async (ctx: Koa.ParameterizedContext, next: Koa.Next) => {
      ctx.state.requestId =
        (ctx.get("x-request-id") as string) || this.generateRequestId();
      ctx.set("X-Request-ID", ctx.state.requestId);
      await next();
    });

    // Error handling middleware (should be early to catch all errors)
    this.app.use(async (ctx: Koa.ParameterizedContext, next: Koa.Next) => {
      try {
        await next();
      } catch (error) {
        const err = error as Error & { status?: number; statusCode?: number };
        const requestId = ctx.state.requestId;

        logger.error("[KoaAdapter] Request error", {
          requestId,
          error: err.message,
          stack: err.stack,
        });

        this.emit("error", {
          requestId,
          error: err,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["error"]);

        const statusCode = err.status || err.statusCode || 500;
        ctx.status = statusCode;
        ctx.body = {
          error: {
            code: statusCode === 500 ? "INTERNAL_ERROR" : `HTTP_${statusCode}`,
            message:
              statusCode === 500 ? "An internal error occurred" : err.message,
          },
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      }
    });

    // CORS middleware
    if (this.config.cors.enabled) {
      const corsModule = await this.importFrameworkDependency<{
        default: typeof import("@koa/cors");
      }>("@koa/cors", "Koa");
      const cors = corsModule.default;
      this.app.use(
        cors({
          origin: (ctx) => {
            const origin = ctx.request.headers.origin || "*";
            if (this.config.cors.origins.includes("*")) {
              return origin;
            }
            return this.config.cors.origins.includes(origin) ? origin : "";
          },
          allowMethods: this.config.cors.methods?.join(","),
          allowHeaders: this.config.cors.headers?.join(","),
          credentials: this.config.cors.credentials,
          maxAge: this.config.cors.maxAge,
        }),
      );
    }

    // Body parsing middleware
    if (this.config.bodyParser.enabled) {
      const bodyParserModule = await this.importFrameworkDependency<{
        default: typeof import("koa-bodyparser");
      }>("koa-bodyparser", "Koa");
      const bodyParser = bodyParserModule.default;
      this.app.use(
        bodyParser({
          jsonLimit: this.config.bodyParser.jsonLimit,
          enableTypes: ["json", "form", "text"],
        }),
      );
    }

    // Rate limiting middleware
    if (this.config.rateLimit.enabled) {
      this.app.use(this.createRateLimiter());

      // Schedule periodic cleanup of expired rate limit entries
      this.rateLimitCleanupInterval = setInterval(
        () => this.cleanupRateLimitStore(),
        60000,
      );
    }

    // Logging middleware
    if (this.config.logging.enabled) {
      this.app.use(async (ctx: Koa.ParameterizedContext, next: Koa.Next) => {
        const startTime = Date.now();
        logger.info(`[KoaAdapter] ${ctx.method} ${ctx.path}`, {
          requestId: ctx.state.requestId,
        });

        await next();

        logger.info(`[KoaAdapter] ${ctx.method} ${ctx.path} ${ctx.status}`, {
          requestId: ctx.state.requestId,
          duration: Date.now() - startTime,
        });
      });
    }

    // Mount router
    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());

    this.frameworkInitialized = true;
  }

  /**
   * Create rate limiter middleware for Koa
   */
  private createRateLimiter(): Koa.Middleware {
    return async (
      ctx: Koa.ParameterizedContext,
      next: Koa.Next,
    ): Promise<void> => {
      // Skip rate limiting for excluded paths
      if (this.config.rateLimit.skipPaths) {
        for (const skipPath of this.config.rateLimit.skipPaths) {
          if (ctx.path.startsWith(skipPath)) {
            await next();
            return;
          }
        }
      }

      const key =
        ctx.get("x-forwarded-for") ||
        ctx.get("x-real-ip") ||
        ctx.ip ||
        "unknown";
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
      ctx.set("X-RateLimit-Limit", String(maxRequests));
      ctx.set(
        "X-RateLimit-Remaining",
        String(Math.max(0, maxRequests - record.count)),
      );
      ctx.set("X-RateLimit-Reset", String(Math.ceil(record.resetAt / 1000)));

      if (record.count > maxRequests) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);
        ctx.set("Retry-After", String(retryAfter));
        ctx.status = 429;
        ctx.body = {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: this.config.rateLimit.message,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            retryAfter,
          },
        };
        return;
      }

      await next();
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
   * Override initialize to ensure async framework setup
   */
  public async initialize(): Promise<void> {
    // Initialize Koa asynchronously first. This runs before
    // super.initialize()'s try/catch even starts, so a failure here (e.g. the
    // "koa" package is not installed) must be caught here too — otherwise it
    // propagates with lifecycleState left at "uninitialized" instead of
    // "error".
    try {
      await this.initializeFrameworkAsync();
    } catch (error) {
      this.lifecycleState = "error";
      throw error;
    }

    // Then call base class initialize
    await super.initialize();
  }

  /**
   * Register route with Koa
   */
  protected registerFrameworkRoute(route: RouteDefinition): void {
    const method = route.method.toLowerCase() as
      | "get"
      | "post"
      | "put"
      | "delete"
      | "patch"
      | "options";

    this.router[method](route.path, async (ctx: Koa.ParameterizedContext) => {
      const requestId = ctx.state.requestId;
      const startTime = Date.now();

      // Create server context
      const serverCtx = this.createContext({
        requestId,
        method: ctx.method,
        path: ctx.path,
        headers: ctx.headers as Record<string, string>,
        query: ctx.query as Record<string, string>,
        params: ctx.params as Record<string, string>,
        body: ctx.request.body,
      });

      // Copy response headers from middleware (stored in ctx.state by middleware)
      if (ctx.state.responseHeaders) {
        serverCtx.responseHeaders = { ...ctx.state.responseHeaders };
      }

      // Emit request event
      this.emit("request", {
        requestId,
        method: serverCtx.method,
        path: serverCtx.path,
        timestamp: new Date(),
      } satisfies ServerAdapterEvents["request"]);

      // Handle streaming if configured
      if (route.streaming?.enabled) {
        return this.handleStreamingResponse(ctx, serverCtx, route);
      }

      // Execute handler
      const result = await route.handler(serverCtx);
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
        if (serverCtx.responseHeaders) {
          for (const [key, value] of Object.entries(
            serverCtx.responseHeaders,
          )) {
            ctx.set(key, value);
          }
        }

        // Return error response with proper status code
        ctx.status = statusCode;
        ctx.body = {
          error: result.error,
          metadata: {
            ...result.metadata,
            requestId,
            timestamp: new Date().toISOString(),
            duration,
          },
        };
        return;
      }

      // Emit response event
      this.emit("response", {
        requestId,
        statusCode: 200,
        duration,
        timestamp: new Date(),
      } satisfies ServerAdapterEvents["response"]);

      // Apply response headers from middleware and handler
      if (serverCtx.responseHeaders) {
        for (const [key, value] of Object.entries(serverCtx.responseHeaders)) {
          ctx.set(key, value);
        }
      }

      // Return formatted response
      ctx.body = {
        data: result,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          duration,
        },
      };
    });
  }

  /**
   * Handle streaming response using Server-Sent Events
   */
  private async handleStreamingResponse(
    ctx: Koa.ParameterizedContext,
    serverCtx: ServerContext,
    route: RouteDefinition,
  ): Promise<void> {
    // Set SSE headers
    ctx.set("Content-Type", "text/event-stream");
    ctx.set("Cache-Control", "no-cache");
    ctx.set("Connection", "keep-alive");
    ctx.set("X-Accel-Buffering", "no"); // Disable nginx buffering

    ctx.status = 200;

    // Use raw response for streaming
    const stream = ctx.res;

    try {
      const result = await route.handler(serverCtx);

      // Check if result is an async iterable
      if (
        result &&
        typeof result === "object" &&
        Symbol.asyncIterator in result
      ) {
        for await (const chunk of result as AsyncIterable<unknown>) {
          stream.write(`event: message\n`);
          stream.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      } else {
        // Single result, send as complete event
        stream.write(`event: complete\n`);
        stream.write(`data: ${JSON.stringify(result)}\n\n`);
      }

      // Send done event
      stream.write(`event: done\n`);
      stream.write(`data: \n\n`);
      stream.end();
    } catch (error) {
      stream.write(`event: error\n`);
      stream.write(
        `data: ${JSON.stringify({
          error: error instanceof Error ? error.message : "Stream error",
        })}\n\n`,
      );
      stream.end();
    }
  }

  /**
   * Register middleware with Koa
   */
  protected registerFrameworkMiddleware(
    middleware: MiddlewareDefinition,
  ): void {
    this.app.use(async (ctx: Koa.ParameterizedContext, next: Koa.Next) => {
      // Skip excluded paths
      if (middleware.excludePaths?.some((p) => ctx.path.startsWith(p))) {
        return next();
      }

      // Check if path matches
      const paths = middleware.paths || ["/"];
      const matches = paths.some((p) => ctx.path.startsWith(p) || p === "*");
      if (!matches) {
        return next();
      }

      // Initialize response headers storage in ctx.state if not present
      if (!ctx.state.responseHeaders) {
        ctx.state.responseHeaders = {};
      }

      // Create context with existing response headers from previous middleware
      const serverCtx = this.createContext({
        requestId: ctx.state.requestId,
        method: ctx.method,
        path: ctx.path,
        headers: ctx.headers as Record<string, string>,
        query: ctx.query as Record<string, string>,
        params: ctx.params as Record<string, string>,
        body: ctx.request.body,
      });

      // Copy existing response headers to context
      serverCtx.responseHeaders = { ...ctx.state.responseHeaders };

      // Execute middleware
      await middleware.handler(serverCtx, async () => {
        // After middleware execution, merge response headers back to ctx.state
        if (serverCtx.responseHeaders) {
          Object.assign(ctx.state.responseHeaders, serverCtx.responseHeaders);
        }
        return next();
      });

      // Also merge headers after handler returns (for middleware that set headers after next())
      if (serverCtx.responseHeaders) {
        Object.assign(ctx.state.responseHeaders, serverCtx.responseHeaders);
      }
    });
  }

  /**
   * Start the Koa server
   */
  public async start(): Promise<void> {
    // Validate lifecycle state
    this.validateLifecycleState("start", ["initialized", "stopped"]);

    if (this.isRunning) {
      throw new AlreadyRunningError(this.config.port, this.config.host);
    }

    this.lifecycleState = "starting";
    const { port, host } = this.config;

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, host, () => {
          this.isRunning = true;
          this.startTime = new Date();
          this.lifecycleState = "running";

          // Track connections for graceful shutdown
          this.server?.on("connection", (socket: Socket) => {
            const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            this.sockets.add(socket);
            this.trackConnection(connectionId, socket);

            socket.on("close", () => {
              this.sockets.delete(socket);
              this.untrackConnection(connectionId);
            });
          });

          logger.info(`[KoaAdapter] Server started on ${host}:${port}`);

          this.emit("started", {
            port,
            host,
            timestamp: this.startTime,
          } satisfies ServerAdapterEvents["started"]);

          resolve();
        });

        this.server?.on("error", (error: Error) => {
          this.lifecycleState = "error";
          reject(error);
        });
      } catch (error) {
        this.lifecycleState = "error";
        reject(error);
      }
    });
  }

  /**
   * Stop the Koa server with graceful shutdown
   */
  public async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
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

      logger.info("[KoaAdapter] Server stopped", { uptime });

      this.emit("stopped", {
        uptime,
        timestamp: new Date(),
      } satisfies ServerAdapterEvents["stopped"]);

      // Reset state for restart capability
      this.resetServerState();
      this.server = undefined;
      this.sockets.clear();
      this.rateLimitStore.clear();
      this.frameworkInitialized = false;
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
    // For Koa/Node.js HTTP server, close() stops accepting new connections
    logger.debug("[KoaAdapter] Stopping acceptance of new connections");
  }

  /**
   * Close the underlying server
   */
  protected async closeServer(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Force close all active connections
   */
  protected async forceCloseConnections(): Promise<void> {
    logger.info("[KoaAdapter] Force closing connections", {
      count: this.sockets.size,
    });

    for (const socket of this.sockets) {
      socket.destroy();
    }

    this.sockets.clear();
    this.activeConnections.clear();
  }

  /**
   * Get the Koa app instance
   */
  public getFrameworkInstance(): unknown {
    return this.app;
  }
}

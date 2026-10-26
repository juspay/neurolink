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
import {
  AlreadyRunningError,
  ServerAdapterError,
  ServerStopError,
  wrapError,
} from "../errors.js";
import { BaseServerAdapter } from "../abstract/baseServerAdapter.js";
import type {
  MiddlewareDefinition,
  RouteDefinition,
  ServerAdapterConfig,
  ServerAdapterEvents,
  ServerContext,
  KoaRateLimitEntry,
} from "../../types/index.js";
import { resolveClientAddress } from "../utils/clientAddress.js";
import { shapeRouteError } from "../utils/clientError.js";
import { pathMatchesAny } from "../utils/pathMatch.js";
import { isErrorResponse } from "../utils/validation.js";
import {
  isRawBodyContentType,
  isWebResponse,
  parseByteLimit,
  RawBodyTooLargeError,
  readRawBody,
  readWebResponse,
} from "../utils/rawBody.js";

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
  // The rate limiter counts nothing it cannot attribute, and says so once.
  private warnedNoClientAddress = false;
  // Middleware from registerMiddleware(). It runs through one dispatcher that
  // is mounted ahead of the router: app.use() after the router is mounted
  // would only ever see requests no route matched.
  private registeredMiddleware: Koa.Middleware[] = [];

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

        this.logRequestError("KoaAdapter", requestId, err);

        this.emitRequestError({
          requestId,
          error: err,
          timestamp: new Date(),
        });

        const adapterError =
          error instanceof ServerAdapterError ? error : undefined;
        const statusCode =
          adapterError?.getHttpStatus() || err.status || err.statusCode || 500;
        // A 4xx carries a message this server or Koa composed; any 5xx's
        // text stays in the log.
        const serverSide = statusCode >= 500;
        ctx.status = statusCode;
        ctx.body = {
          error: {
            code:
              adapterError?.code ??
              (serverSide ? "INTERNAL_ERROR" : `HTTP_${statusCode}`),
            message: serverSide ? "An internal error occurred" : err.message,
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
            // The wildcard is sent as the literal "*": reflecting the
            // request's Origin instead would grant any page a credentialed
            // allowance the wildcard itself cannot carry.
            if (this.config.cors.origins.includes("*")) {
              return "*";
            }
            const origin = ctx.request.headers.origin ?? "";
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
      // Uploads (multipart, octet-stream, audio/*) reach the route as bytes.
      const rawLimit = parseByteLimit(this.config.bodyParser.rawMaxSize);
      this.app.use(async (ctx, next) => {
        if (isRawBodyContentType(ctx.get("content-type"))) {
          try {
            ctx.request.body = await readRawBody(ctx.req, rawLimit);
          } catch (error) {
            if (error instanceof RawBodyTooLargeError) {
              ctx.status = 413;
              ctx.body = {
                error: { code: "PAYLOAD_TOO_LARGE", message: error.message },
              };
              return;
            }
            throw error;
          }
        }
        await next();
      });
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

    this.app.use((ctx: Koa.ParameterizedContext, next: Koa.Next) =>
      this.runRegisteredMiddleware(ctx, next),
    );

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
      if (pathMatchesAny(ctx.path, this.config.rateLimit.skipPaths)) {
        await next();
        return;
      }

      // The TCP peer, or behind a declared proxy the client it reports. A
      // header alone used to be the key, so a rotating X-Forwarded-For escaped
      // the limit; a request with no attributable address is let through
      // rather than pooled with every other such request.
      const key = this.config.rateLimit.keyGenerator
        ? this.config.rateLimit.keyGenerator(
            this.createContext({
              requestId: ctx.state.requestId,
              method: ctx.method,
              path: ctx.path,
              headers: ctx.headers as Record<string, string>,
              query: ctx.query as Record<string, string>,
              params: {},
              remoteAddress: ctx.req.socket?.remoteAddress,
            }),
          )
        : resolveClientAddress({
            remoteAddress: ctx.req.socket?.remoteAddress,
            forwardedFor: ctx.get("x-forwarded-for") || undefined,
            trustProxy: this.config.rateLimit.trustProxy,
            trustedProxies: this.config.rateLimit.trustedProxies,
          });
      if (key === undefined) {
        if (!this.warnedNoClientAddress) {
          this.warnedNoClientAddress = true;
          logger.alwaysStderr(
            "[KoaAdapter] A request arrived with no peer address, so the rate limiter cannot count it; configure rateLimit.keyGenerator to limit by another key.",
          );
        }
        await next();
        return;
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
        remoteAddress: ctx.req.socket?.remoteAddress,
      });

      // Copy response headers from middleware (stored in ctx.state by middleware)
      if (ctx.state.responseHeaders) {
        serverCtx.responseHeaders = { ...ctx.state.responseHeaders };
      }
      this.restoreCarriedContext(serverCtx, ctx.state.carriedContext);

      // The handler learns of a client that went away, and a request over
      // `config.timeout` is answered 504 and its work aborted. Koa applied no
      // request timeout at all.
      const abort = this.attachRequestAbort(serverCtx, {
        onClientClose: (listener) =>
          ctx.req.on("close", () => {
            if (!ctx.res.writableFinished) {
              listener();
            }
          }),
        applyTimeout: !route.streaming?.enabled,
      });

      // Emit request event
      this.emit("request", {
        requestId,
        method: serverCtx.method,
        path: serverCtx.path,
        timestamp: new Date(),
      } satisfies ServerAdapterEvents["request"]);

      try {
        // Handle streaming if configured
        if (route.streaming?.enabled) {
          return await this.handleStreamingResponse(ctx, serverCtx, route);
        }

        // Execute handler
        const result = abort.deadline
          ? await Promise.race([route.handler(serverCtx), abort.deadline])
          : await route.handler(serverCtx);
        const duration = Date.now() - startTime;

        // A route that answers in its own wire format returns a web Response.
        if (isWebResponse(result)) {
          const raw = await readWebResponse(result);
          this.emit("response", {
            requestId,
            statusCode: raw.status,
            duration,
            timestamp: new Date(),
          } satisfies ServerAdapterEvents["response"]);
          for (const [key, value] of Object.entries({
            ...serverCtx.responseHeaders,
            ...raw.headers,
          })) {
            ctx.set(key, value);
          }
          ctx.status = raw.status;
          ctx.body = raw.body;
          return;
        }

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
          for (const [key, value] of Object.entries(
            serverCtx.responseHeaders,
          )) {
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
      } catch (error) {
        // The exception's text stays in the log under this request id; the
        // client gets a fixed message for its category.
        const shaped = shapeRouteError("KoaAdapter", requestId, error);
        this.emitRequestError({
          requestId,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date(),
        });
        this.emit("response", {
          requestId,
          statusCode: shaped.status,
          duration: Date.now() - startTime,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["response"]);
        if (ctx.res.headersSent) {
          ctx.res.end();
          return;
        }
        ctx.status = shaped.status;
        ctx.body = {
          error: { code: shaped.code, message: shaped.message },
          metadata: { requestId, timestamp: new Date().toISOString() },
        };
      } finally {
        abort.release();
      }
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
      const shaped = shapeRouteError("KoaAdapter", serverCtx.requestId, error);
      stream.write(`event: error\n`);
      stream.write(
        `data: ${JSON.stringify({
          error: shaped.message,
          code: shaped.code,
          status: shaped.status,
          requestId: serverCtx.requestId,
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
    this.registeredMiddleware.push(
      async (ctx: Koa.ParameterizedContext, next: Koa.Next) => {
        // Skip excluded paths
        if (pathMatchesAny(ctx.path, middleware.excludePaths)) {
          return next();
        }

        // Check if path matches
        if (!pathMatchesAny(ctx.path, middleware.paths || ["/"])) {
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
          remoteAddress: ctx.req.socket?.remoteAddress,
        });

        // Copy existing response headers to context
        serverCtx.responseHeaders = { ...ctx.state.responseHeaders };
        this.restoreCarriedContext(serverCtx, ctx.state.carriedContext);

        // Execute middleware
        await middleware.handler(serverCtx, async () => {
          // What this middleware set (ctx.user included) is for the next
          // middleware and the route handler, which build their own contexts.
          ctx.state.carriedContext = this.captureCarriedContext(serverCtx);
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
      },
    );
  }

  /**
   * Run registered middleware in registration order, then continue to the
   * router. Reads the list per request, so later registrations apply too.
   */
  private runRegisteredMiddleware(
    ctx: Koa.ParameterizedContext,
    next: Koa.Next,
  ): Promise<void> {
    const dispatch = async (index: number): Promise<void> => {
      const middleware = this.registeredMiddleware[index];
      if (!middleware) {
        await next();
        return;
      }
      await middleware(ctx, () => dispatch(index + 1));
    };
    return dispatch(0);
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
          this.warnIfSensitiveRoutesUnauthenticated();

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

  public override getNativeServer(): unknown {
    return this.server;
  }
}

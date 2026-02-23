/**
 * Express Server Adapter
 * Server adapter implementation using Express framework
 */

import type { Express, NextFunction, Request, Response } from "express";
import type { Socket } from "net";
import type { NeuroLink } from "../../neurolink.js";
import { logger } from "../../utils/logger.js";
import {
  AlreadyRunningError,
  ServerAdapterError,
  ServerStartError,
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
} from "../types.js";
import { isErrorResponse } from "../utils/validation.js";

/**
 * Express-specific server adapter
 */
export class ExpressServerAdapter extends BaseServerAdapter {
  private app!: Express;
  private server?: import("http").Server;
  private frameworkInitialized = false;
  private sockets: Set<Socket> = new Set();

  constructor(neurolink: NeuroLink, config: ServerAdapterConfig = {}) {
    super(neurolink, config);
  }

  /**
   * Initialize Express framework asynchronously
   */
  protected initializeFramework(): void {
    // Framework will be initialized asynchronously in initializeFrameworkAsync
    // This is called by the base class constructor, but we need async imports
  }

  /**
   * Initialize Express framework with async imports
   */
  private async initializeFrameworkAsync(): Promise<void> {
    if (this.frameworkInitialized) {
      return;
    }

    // Dynamic import to avoid loading if not used (ESM-compatible)
    const expressModule = await import("express");
    const express = expressModule.default;
    this.app = express();

    // Body parsing
    if (this.config.bodyParser.enabled) {
      const bodyLimit =
        this.config.bodyParser.maxSize ||
        this.config.bodyParser.jsonLimit ||
        "10mb";
      this.app.use(
        express.json({ limit: this.config.bodyParser.jsonLimit || bodyLimit }),
      );
      this.app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
    }

    // CORS
    if (this.config.cors.enabled) {
      const corsModule = await import("cors");
      const cors = corsModule.default;
      this.app.use(
        cors({
          origin: this.config.cors.origins,
          methods: this.config.cors.methods,
          allowedHeaders: this.config.cors.headers,
          credentials: this.config.cors.credentials,
          maxAge: this.config.cors.maxAge,
        }),
      );
    }

    // Rate limiting
    if (this.config.rateLimit.enabled) {
      const rateLimitModule = await import("express-rate-limit");
      const rateLimit = rateLimitModule.default;
      const windowMs = this.config.rateLimit.windowMs;
      const limiter = rateLimit({
        windowMs,
        max: this.config.rateLimit.maxRequests,
        message: {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: this.config.rateLimit.message,
          },
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req: Request, res: Response) => {
          const retryAfter = Math.ceil(windowMs / 1000);
          res.setHeader("Retry-After", String(retryAfter));
          res.status(429).json({
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: this.config.rateLimit.message,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              retryAfter,
            },
          });
        },
      });
      this.app.use(limiter);
    }

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId =
        (req.headers["x-request-id"] as string) || this.generateRequestId();
      req.headers["x-request-id"] = requestId;
      res.setHeader("X-Request-ID", requestId);
      next();
    });

    // Logging middleware
    if (this.config.logging.enabled) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const startTime = Date.now();
        const requestId = req.headers["x-request-id"] as string;

        logger.info(`[ExpressAdapter] ${req.method} ${req.path}`, {
          requestId,
        });

        res.on("finish", () => {
          logger.info(
            `[ExpressAdapter] ${req.method} ${req.path} ${res.statusCode}`,
            {
              requestId,
              duration: Date.now() - startTime,
            },
          );
        });

        next();
      });
    }

    this.frameworkInitialized = true;
  }

  /**
   * Override initialize to ensure async framework setup
   */
  public async initialize(): Promise<void> {
    // Initialize Express asynchronously first
    await this.initializeFrameworkAsync();

    // Then call base class initialize
    await super.initialize();
  }

  /**
   * Register route with Express
   */
  protected registerFrameworkRoute(route: RouteDefinition): void {
    const method = route.method.toLowerCase() as
      | "get"
      | "post"
      | "put"
      | "delete"
      | "patch"
      | "options";

    this.app[method](
      route.path,
      async (req: Request, res: Response, next: NextFunction) => {
        const requestId = req.headers["x-request-id"] as string;
        const startTime = Date.now();

        // Create server context
        const ctx = this.createContext({
          requestId,
          method: req.method,
          path: req.path,
          headers: req.headers as Record<string, string>,
          query: req.query as Record<string, string>,
          params: req.params as Record<string, string>,
          body: req.body,
        });

        // Copy response headers from middleware (stored in res.locals by middleware)
        if (res.locals.responseHeaders) {
          ctx.responseHeaders = { ...res.locals.responseHeaders };
        }

        // Emit request event
        this.emit("request", {
          requestId,
          method: ctx.method,
          path: ctx.path,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["request"]);

        try {
          // Handle streaming if configured
          if (route.streaming?.enabled) {
            return this.handleStreamingResponse(res, ctx, route);
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
                res.setHeader(key, value);
              }
            }

            // Return error response with proper status code
            res.status(statusCode).json({
              error: result.error,
              metadata: {
                ...result.metadata,
                requestId,
                timestamp: new Date().toISOString(),
                duration,
              },
            });
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
          if (ctx.responseHeaders) {
            for (const [key, value] of Object.entries(ctx.responseHeaders)) {
              res.setHeader(key, value);
            }
          }

          // Return formatted response
          res.json({
            data: result,
            metadata: {
              requestId,
              timestamp: new Date().toISOString(),
              duration,
            },
          });
        } catch (error) {
          next(error);
        }
      },
    );

    // Error handling middleware (should be registered once after all routes)
    this.setupErrorHandler();
  }

  /**
   * Setup error handling middleware
   */
  private errorHandlerRegistered = false;
  private setupErrorHandler(): void {
    if (this.errorHandlerRegistered) {
      return;
    }
    this.errorHandlerRegistered = true;

    this.app.use(
      (error: Error, req: Request, res: Response, _next: NextFunction) => {
        const requestId = req.headers["x-request-id"] as string;

        logger.error("[ExpressAdapter] Request error", {
          requestId,
          error: error.message,
          stack: error.stack,
        });

        this.emit("error", {
          requestId,
          error,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["error"]);

        // Use dynamic status code from ServerAdapterError if available
        const isServerAdapterError = error instanceof ServerAdapterError;
        const statusCode = isServerAdapterError ? error.getHttpStatus() : 500;
        const errorCode = isServerAdapterError ? error.code : "INTERNAL_ERROR";
        const errorMessage = isServerAdapterError
          ? error.message
          : "An internal error occurred";

        res.status(statusCode).json({
          error: {
            code: errorCode,
            message: errorMessage,
          },
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        });
      },
    );
  }

  /**
   * Handle streaming response using SSE
   */
  private async handleStreamingResponse(
    res: Response,
    ctx: ServerContext,
    route: RouteDefinition,
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const result = await route.handler(ctx);

      if (
        result &&
        typeof result === "object" &&
        Symbol.asyncIterator in result
      ) {
        for await (const chunk of result as AsyncIterable<unknown>) {
          res.write(`event: message\n`);
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      } else {
        res.write(`event: complete\n`);
        res.write(`data: ${JSON.stringify(result)}\n\n`);
      }

      res.write(`event: done\n`);
      res.write(`data: \n\n`);
      res.end();
    } catch (error) {
      res.write(`event: error\n`);
      res.write(
        `data: ${JSON.stringify({
          error: error instanceof Error ? error.message : "Stream error",
        })}\n\n`,
      );
      res.end();
    }
  }

  /**
   * Register middleware with Express
   */
  protected registerFrameworkMiddleware(
    middleware: MiddlewareDefinition,
  ): void {
    const paths = middleware.paths || ["/"];

    for (const path of paths) {
      this.app.use(
        path,
        async (req: Request, res: Response, next: NextFunction) => {
          // Skip excluded paths
          if (middleware.excludePaths?.some((p) => req.path.startsWith(p))) {
            return next();
          }

          // Initialize response headers storage in res.locals if not present
          if (!res.locals.responseHeaders) {
            res.locals.responseHeaders = {};
          }

          // Create context with existing response headers from previous middleware
          const ctx = this.createContext({
            requestId:
              (req.headers["x-request-id"] as string) ||
              this.generateRequestId(),
            method: req.method,
            path: req.path,
            headers: req.headers as Record<string, string>,
            query: req.query as Record<string, string>,
            params: req.params as Record<string, string>,
            body: req.body,
          });

          // Copy existing response headers to context
          ctx.responseHeaders = { ...res.locals.responseHeaders };

          // Execute middleware
          try {
            await middleware.handler(ctx, async () => {
              // After middleware execution, merge response headers back to res.locals
              if (ctx.responseHeaders) {
                Object.assign(res.locals.responseHeaders, ctx.responseHeaders);
              }
              return new Promise<void>((resolve) => {
                next();
                resolve();
              });
            });

            // Also merge headers after handler returns (for middleware that set headers after next())
            if (ctx.responseHeaders) {
              Object.assign(res.locals.responseHeaders, ctx.responseHeaders);
            }
          } catch (error) {
            next(error);
          }
        },
      );
    }
  }

  /**
   * Start the Express server
   */
  public async start(): Promise<void> {
    // Validate lifecycle state
    this.validateLifecycleState("start", ["initialized", "stopped"]);

    if (this.isRunning) {
      throw new AlreadyRunningError(this.config.port, this.config.host);
    }

    this.lifecycleState = "starting";
    const { port, host } = this.config;
    const startupTimeout = this.config.timeout || 30000;

    const startPromise = new Promise<void>((resolve, reject) => {
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

          logger.info(`[ExpressAdapter] Server started on ${host}:${port}`);

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

    let startupTimer: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      startupTimer = setTimeout(() => {
        this.lifecycleState = "error";
        reject(
          new ServerStartError(
            `Express server startup timed out after ${startupTimeout}ms`,
            undefined,
            port,
            host,
          ),
        );
      }, startupTimeout);
    });

    try {
      await Promise.race([startPromise, timeoutPromise]);
    } finally {
      // Always clear the timeout to prevent memory leak
      if (startupTimer) {
        clearTimeout(startupTimer);
      }
    }
  }

  /**
   * Stop the Express server with graceful shutdown
   */
  public async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return; // Already stopped, return gracefully (idempotent)
    }

    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    try {
      // Use graceful shutdown from base class
      await this.gracefulShutdown();

      logger.info("[ExpressAdapter] Server stopped", { uptime });

      this.emit("stopped", {
        uptime,
        timestamp: new Date(),
      } satisfies ServerAdapterEvents["stopped"]);

      // Reset state for restart capability
      this.resetServerState();
      this.server = undefined;
      this.sockets.clear();
      this.frameworkInitialized = false;
      this.errorHandlerRegistered = false;
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
    // For Express/Node.js HTTP server, we don't explicitly stop accepting
    // The server.close() will stop accepting new connections
    // But we can prevent new requests by setting a flag checked in middleware
    logger.debug("[ExpressAdapter] Stopping acceptance of new connections");
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
    logger.info("[ExpressAdapter] Force closing connections", {
      count: this.sockets.size,
    });

    for (const socket of this.sockets) {
      socket.destroy();
    }

    this.sockets.clear();
    this.activeConnections.clear();
  }

  /**
   * Get the Express app instance
   */
  public getFrameworkInstance(): unknown {
    return this.app;
  }
}

/**
 * Abstract Server Adapter
 * Base class for all framework-specific server adapters
 * Follows NeuroLink's composition and factory patterns
 */

import { EventEmitter } from "events";
import type { ExternalServerManager } from "../../mcp/externalServerManager.js";
import type { MCPToolRegistry } from "../../mcp/toolRegistry.js";
import type { NeuroLink } from "../../neurolink.js";
import { getMetricsAggregator } from "../../observability/index.js";
import {
  SpanSerializer,
  SpanStatus,
  SpanType,
} from "../../observability/index.js";
import { withTimeout } from "../../utils/errorHandling.js";
import { logger } from "../../utils/logger.js";
import {
  DrainTimeoutError,
  InvalidLifecycleStateError,
  ShutdownTimeoutError,
} from "../errors.js";
import type {
  MiddlewareDefinition,
  RedactionConfig,
  RequiredServerAdapterConfig,
  RequiredShutdownConfig,
  RouteDefinition,
  ServerAdapterConfig,
  ServerAdapterEvents,
  ServerContext,
  ServerLifecycleState,
  ServerStatus,
  TrackedConnection,
} from "../types.js";

/**
 * Abstract base class for server adapters
 * Provides common functionality and defines the interface for framework-specific implementations
 */
export abstract class BaseServerAdapter extends EventEmitter {
  protected readonly config: RequiredServerAdapterConfig;
  protected readonly redactionConfig?: RedactionConfig;
  protected readonly neurolink: NeuroLink;
  protected readonly toolRegistry: MCPToolRegistry;
  protected readonly externalServerManager?: ExternalServerManager;
  protected routes: Map<string, RouteDefinition> = new Map();
  protected middlewares: MiddlewareDefinition[] = [];
  protected isRunning = false;
  protected startTime?: Date;

  // Lifecycle management properties
  protected lifecycleState: ServerLifecycleState = "uninitialized";
  protected activeConnections: Map<string, TrackedConnection> = new Map();
  protected readonly shutdownConfig: RequiredShutdownConfig;

  constructor(neurolink: NeuroLink, config: ServerAdapterConfig = {}) {
    super();

    this.neurolink = neurolink;
    this.toolRegistry = neurolink.getToolRegistry();
    this.externalServerManager = neurolink.getExternalServerManager();

    // Store redaction config (optional, disabled by default)
    this.redactionConfig = config.redaction;

    // Apply shutdown defaults
    this.shutdownConfig = {
      gracefulShutdownTimeoutMs:
        config.shutdown?.gracefulShutdownTimeoutMs ?? 30000,
      drainTimeoutMs: config.shutdown?.drainTimeoutMs ?? 15000,
      forceClose: config.shutdown?.forceClose ?? true,
    };

    // Apply defaults
    this.config = {
      port: config.port ?? 3000,
      host: config.host ?? "0.0.0.0",
      basePath: config.basePath ?? "/api",
      cors: {
        enabled: config.cors?.enabled ?? true,
        origins: config.cors?.origins ?? ["*"],
        methods: config.cors?.methods ?? [
          "GET",
          "POST",
          "PUT",
          "DELETE",
          "PATCH",
          "OPTIONS",
        ],
        headers: config.cors?.headers ?? [
          "Content-Type",
          "Authorization",
          "X-Request-ID",
        ],
        credentials: config.cors?.credentials ?? false,
        maxAge: config.cors?.maxAge ?? 86400,
      },
      rateLimit: {
        enabled: config.rateLimit?.enabled ?? true,
        windowMs: config.rateLimit?.windowMs ?? 15 * 60 * 1000, // 15 minutes
        maxRequests: config.rateLimit?.maxRequests ?? 100,
        message:
          config.rateLimit?.message ??
          "Too many requests, please try again later",
        skipPaths: config.rateLimit?.skipPaths,
        keyGenerator: config.rateLimit?.keyGenerator,
      },
      bodyParser: {
        enabled: config.bodyParser?.enabled ?? true,
        maxSize: config.bodyParser?.maxSize ?? "10mb",
        jsonLimit: config.bodyParser?.jsonLimit ?? "10mb",
        urlEncoded: config.bodyParser?.urlEncoded ?? true,
      },
      logging: {
        enabled: config.logging?.enabled ?? true,
        level: config.logging?.level ?? "info",
        includeBody: config.logging?.includeBody ?? false,
        includeResponse: config.logging?.includeResponse ?? false,
      },
      timeout: config.timeout ?? 30000,
      enableMetrics: config.enableMetrics ?? true,
      enableSwagger: config.enableSwagger ?? false,
      disableBuiltInHealth: config.disableBuiltInHealth ?? false,
      shutdown: this.shutdownConfig,
    };
  }

  // ============================================
  // Abstract Methods (Framework-Specific)
  // ============================================

  /**
   * Initialize the underlying server framework
   */
  protected abstract initializeFramework(): void;

  /**
   * Register a route with the framework
   */
  protected abstract registerFrameworkRoute(route: RouteDefinition): void;

  /**
   * Register middleware with the framework
   */
  protected abstract registerFrameworkMiddleware(
    middleware: MiddlewareDefinition,
  ): void;

  /**
   * Start the server
   */
  public abstract start(): Promise<void>;

  /**
   * Stop the server
   */
  public abstract stop(): Promise<void>;

  /**
   * Get the underlying framework instance (for advanced usage)
   */
  public abstract getFrameworkInstance(): unknown;

  // ============================================
  // Abstract Lifecycle Methods (Framework-Specific)
  // ============================================

  /**
   * Stop accepting new connections
   * Called during graceful shutdown to prevent new requests
   */
  protected abstract stopAcceptingConnections(): Promise<void>;

  /**
   * Close the underlying server
   * Called after connections are drained or timeout
   */
  protected abstract closeServer(): Promise<void>;

  /**
   * Force close all active connections
   * Called when drain timeout expires and forceClose is true
   */
  protected abstract forceCloseConnections(): Promise<void>;

  // ============================================
  // Common Methods (Shared Implementation)
  // ============================================

  /**
   * Initialize the server adapter
   * Sets up routes, middleware, and framework
   */
  public async initialize(): Promise<void> {
    // Validate lifecycle state for initialization
    if (
      this.lifecycleState !== "uninitialized" &&
      this.lifecycleState !== "stopped"
    ) {
      throw new InvalidLifecycleStateError("initialize", this.lifecycleState, [
        "uninitialized",
        "stopped",
      ]);
    }

    this.lifecycleState = "initializing";

    logger.info("[ServerAdapter] Initializing server adapter", {
      port: this.config.port,
      host: this.config.host,
      basePath: this.config.basePath,
    });

    const span = SpanSerializer.createSpan(
      SpanType.SERVER_REQUEST,
      "server.initialize",
      {
        "server.operation": "initialize",
        "server.port": this.config.port,
        "server.host": this.config.host,
      },
    );
    const startTime = Date.now();

    try {
      // Initialize framework-specific setup
      this.initializeFramework();

      // Register built-in middleware
      this.registerBuiltInMiddleware();

      // Register built-in routes
      await this.registerBuiltInRoutes();

      this.lifecycleState = "initialized";

      this.emit("initialized", {
        config: this.config,
        routeCount: this.routes.size,
        middlewareCount: this.middlewares.length,
      } satisfies ServerAdapterEvents["initialized"]);

      logger.info("[ServerAdapter] Server adapter initialized", {
        routes: this.routes.size,
        middlewares: this.middlewares.length,
      });

      span.durationMs = Date.now() - startTime;
      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(endedSpan);
    } catch (error) {
      this.lifecycleState = "error";
      span.durationMs = Date.now() - startTime;
      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.ERROR);
      endedSpan.statusMessage =
        error instanceof Error ? error.message : String(error);
      getMetricsAggregator().recordSpan(endedSpan);
      throw error;
    }
  }

  /**
   * Register a custom route
   */
  public registerRoute(route: RouteDefinition): void {
    const routeKey = `${route.method.toUpperCase()}:${route.path}`;

    if (this.routes.has(routeKey)) {
      logger.warn(
        `[ServerAdapter] Route ${routeKey} already exists, replacing`,
      );
    }

    this.routes.set(routeKey, route);
    this.registerFrameworkRoute(route);

    logger.debug(`[ServerAdapter] Registered route: ${routeKey}`, {
      description: route.description,
      streaming: route.streaming?.enabled,
      auth: route.auth,
    });
  }

  /**
   * Register multiple routes from a route group
   */
  public registerRouteGroup(group: {
    prefix: string;
    routes: RouteDefinition[];
    middleware?: MiddlewareDefinition[];
  }): void {
    // Register group-specific middleware first
    if (group.middleware) {
      for (const middleware of group.middleware) {
        this.registerMiddleware({
          ...middleware,
          paths: middleware.paths ?? [group.prefix],
        });
      }
    }

    // Register all routes in the group with prefix applied
    for (const route of group.routes) {
      // Only prepend prefix if route path doesn't already start with it
      // (route definitions include full paths like /api/agent/execute)
      const needsPrefix = !route.path.startsWith(group.prefix);
      const prefixedPath = this.normalizePath(
        needsPrefix ? `${group.prefix}${route.path}` : route.path,
      );
      const prefixedRoute = {
        ...route,
        path: prefixedPath,
      };
      this.registerRoute(prefixedRoute);
    }

    logger.debug(`[ServerAdapter] Registered route group: ${group.prefix}`, {
      routes: group.routes.length,
      middleware: group.middleware?.length ?? 0,
    });
  }

  /**
   * Normalize a path by removing duplicate slashes and ensuring leading slash
   */
  private normalizePath(path: string): string {
    return "/" + path.split("/").filter(Boolean).join("/");
  }

  /**
   * Register custom middleware
   */
  public registerMiddleware(middleware: MiddlewareDefinition): void {
    this.middlewares.push(middleware);
    this.registerFrameworkMiddleware(middleware);

    logger.debug(`[ServerAdapter] Registered middleware: ${middleware.name}`, {
      order: middleware.order,
      paths: middleware.paths,
    });
  }

  /**
   * Create request context from incoming request
   */
  protected createContext(options: {
    requestId: string;
    method: string;
    path: string;
    headers: Record<string, string>;
    query?: Record<string, string>;
    params?: Record<string, string>;
    body?: unknown;
  }): ServerContext {
    return {
      requestId: options.requestId,
      method: options.method,
      path: options.path,
      headers: options.headers,
      query: options.query ?? {},
      params: options.params ?? {},
      body: options.body,
      neurolink: this.neurolink,
      toolRegistry: this.toolRegistry,
      externalServerManager: this.externalServerManager,
      timestamp: Date.now(),
      metadata: {},
      redaction: this.redactionConfig,
    };
  }

  /**
   * Register built-in middleware
   */
  protected registerBuiltInMiddleware(): void {
    // Request ID middleware
    this.registerMiddleware({
      name: "requestId",
      order: 0,
      handler: async (ctx, next) => {
        ctx.requestId = ctx.requestId || this.generateRequestId();
        return next();
      },
    });

    // Logging middleware
    if (this.config.logging.enabled) {
      this.registerMiddleware({
        name: "logging",
        order: 1,
        handler: async (ctx, next) => {
          const start = Date.now();
          logger.info(`[ServerAdapter] ${ctx.method} ${ctx.path}`, {
            requestId: ctx.requestId,
          });

          const result = await next();

          logger.info(`[ServerAdapter] ${ctx.method} ${ctx.path} completed`, {
            requestId: ctx.requestId,
            duration: Date.now() - start,
          });

          return result;
        },
      });
    }
  }

  /**
   * Register built-in routes
   * Only registers health routes if disableBuiltInHealth is false (default)
   */
  protected async registerBuiltInRoutes(): Promise<void> {
    // Skip built-in health routes if disabled (to avoid duplication with healthRoutes)
    if (!this.config.disableBuiltInHealth) {
      // Health check
      this.registerRoute({
        method: "GET",
        path: `${this.config.basePath}/health`,
        handler: async () => ({
          status: "ok",
          timestamp: new Date().toISOString(),
          uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
          version: process.env.npm_package_version || "unknown",
        }),
        description: "Health check endpoint",
        tags: ["system"],
      });

      // Ready check
      this.registerRoute({
        method: "GET",
        path: `${this.config.basePath}/ready`,
        handler: async (ctx) => {
          const toolRegistry = ctx.toolRegistry;
          const readinessTimeout = this.config.timeout || 5000;

          let tools: unknown[];
          let toolsAvailable: boolean;

          try {
            tools = await withTimeout(
              toolRegistry.listTools(),
              readinessTimeout,
              new Error(
                `toolRegistry.listTools timed out after ${readinessTimeout}ms`,
              ),
            );
            toolsAvailable = tools.length > 0;
          } catch (error) {
            logger.warn("[ServerAdapter] Tool registry check timed out", {
              timeout: readinessTimeout,
              error: error instanceof Error ? error.message : String(error),
            });
            // Return degraded status but don't fail the readiness check
            toolsAvailable = false;
          }

          return {
            ready: true,
            timestamp: new Date().toISOString(),
            services: {
              neurolink: true,
              tools: toolsAvailable,
              externalServers: !!ctx.externalServerManager,
            },
          };
        },
        description: "Readiness check endpoint",
        tags: ["system"],
      });
    }

    // Metrics endpoint (if enabled)
    if (this.config.enableMetrics) {
      this.registerRoute({
        method: "GET",
        path: `${this.config.basePath}/metrics`,
        handler: async () => {
          const status = this.getStatus();
          return {
            server: {
              running: status.running,
              uptime: status.uptime,
              routes: status.routes,
              middlewares: status.middlewares,
            },
            process: {
              memoryUsage: process.memoryUsage(),
              cpuUsage: process.cpuUsage(),
              pid: process.pid,
            },
            timestamp: new Date().toISOString(),
          };
        },
        description: "Server metrics endpoint",
        tags: ["system"],
      });
    }
  }

  /**
   * Generate unique request ID
   */
  protected generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // ============================================
  // Lifecycle Management Methods
  // ============================================

  /**
   * Get the current lifecycle state
   */
  public getLifecycleState(): ServerLifecycleState {
    return this.lifecycleState;
  }

  /**
   * Track a new connection
   * @param id Unique connection identifier
   * @param socket Optional underlying socket object
   * @param requestId Optional associated request ID
   */
  protected trackConnection(
    id: string,
    socket?: unknown,
    requestId?: string,
  ): void {
    this.activeConnections.set(id, {
      id,
      createdAt: Date.now(),
      socket,
      requestId,
      isActive: true,
    });

    logger.debug("[ServerAdapter] Connection tracked", {
      connectionId: id,
      activeConnections: this.activeConnections.size,
    });
  }

  /**
   * Untrack a connection (when it's completed)
   * @param id Connection identifier to remove
   */
  protected untrackConnection(id: string): void {
    const removed = this.activeConnections.delete(id);

    if (removed) {
      logger.debug("[ServerAdapter] Connection untracked", {
        connectionId: id,
        activeConnections: this.activeConnections.size,
      });
    }
  }

  /**
   * Get the number of active connections
   */
  public getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }

  /**
   * Perform graceful shutdown with connection draining
   * This method handles the complete shutdown lifecycle
   */
  protected async gracefulShutdown(): Promise<void> {
    const { gracefulShutdownTimeoutMs, drainTimeoutMs, forceClose } =
      this.shutdownConfig;

    logger.info("[ServerAdapter] Starting graceful shutdown", {
      activeConnections: this.activeConnections.size,
      gracefulShutdownTimeoutMs,
      drainTimeoutMs,
    });

    const shutdownSpan = SpanSerializer.createSpan(
      SpanType.SERVER_REQUEST,
      "server.shutdown",
      {
        "server.operation": "gracefulShutdown",
        "server.activeConnections": this.activeConnections.size,
      },
    );
    const shutdownStartTime = Date.now();

    // Timer references for cleanup
    let shutdownTimer: NodeJS.Timeout | undefined;
    let drainTimer: NodeJS.Timeout | undefined;

    try {
      // Set draining state
      this.lifecycleState = "draining";

      // Stop accepting new connections (covered by shutdown span)
      await this.stopAcceptingConnections();

      logger.info("[ServerAdapter] Stopped accepting new connections");

      // Create drain promise that resolves when all connections are closed
      const drainPromise = this.drainConnections();

      // Create timeout promise for overall shutdown
      const shutdownTimeoutPromise = new Promise<never>((_, reject) => {
        shutdownTimer = setTimeout(() => {
          reject(
            new ShutdownTimeoutError(
              gracefulShutdownTimeoutMs,
              this.activeConnections.size,
            ),
          );
        }, gracefulShutdownTimeoutMs);
      });

      // Create timeout promise for drain phase
      const drainTimeoutPromise = new Promise<"drain_timeout">((resolve) => {
        drainTimer = setTimeout(() => {
          resolve("drain_timeout");
        }, drainTimeoutMs);
      });
      // Race drain against drain timeout
      const drainResult = await Promise.race([
        drainPromise,
        drainTimeoutPromise,
      ]);

      if (drainResult === "drain_timeout" && this.activeConnections.size > 0) {
        logger.warn("[ServerAdapter] Drain timeout reached", {
          remainingConnections: this.activeConnections.size,
        });

        if (forceClose) {
          logger.info("[ServerAdapter] Force closing remaining connections");
          await this.forceCloseConnections();
        } else {
          throw new DrainTimeoutError(
            drainTimeoutMs,
            this.activeConnections.size,
          );
        }
      }

      // Set stopping state
      this.lifecycleState = "stopping";

      // Close the server with shutdown timeout
      await Promise.race([this.closeServer(), shutdownTimeoutPromise]);

      logger.info("[ServerAdapter] Server closed successfully");

      shutdownSpan.durationMs = Date.now() - shutdownStartTime;
      const endedShutdownSpan = SpanSerializer.endSpan(
        shutdownSpan,
        SpanStatus.OK,
      );
      getMetricsAggregator().recordSpan(endedShutdownSpan);
    } catch (error) {
      // If force close is enabled and we hit a timeout, try to force close
      if (
        forceClose &&
        (error instanceof ShutdownTimeoutError ||
          error instanceof DrainTimeoutError)
      ) {
        logger.warn("[ServerAdapter] Timeout during shutdown, forcing close", {
          error: error.message,
        });
        await this.forceCloseConnections();
        await this.closeServer();
        shutdownSpan.durationMs = Date.now() - shutdownStartTime;
        const endedShutdownSpan = SpanSerializer.endSpan(
          shutdownSpan,
          SpanStatus.OK,
        );
        getMetricsAggregator().recordSpan(endedShutdownSpan);
      } else {
        this.lifecycleState = "error";
        shutdownSpan.durationMs = Date.now() - shutdownStartTime;
        const endedShutdownSpan = SpanSerializer.endSpan(
          shutdownSpan,
          SpanStatus.ERROR,
        );
        endedShutdownSpan.statusMessage =
          error instanceof Error ? error.message : String(error);
        getMetricsAggregator().recordSpan(endedShutdownSpan);
        throw error;
      }
    } finally {
      // Clean up timers to prevent memory leaks and unhandled rejections
      if (shutdownTimer) {
        clearTimeout(shutdownTimer);
      }
      if (drainTimer) {
        clearTimeout(drainTimer);
      }
    }
  }

  /**
   * Wait for all active connections to drain
   * Resolves when activeConnections is empty
   */
  protected async drainConnections(): Promise<void> {
    if (this.activeConnections.size === 0) {
      logger.debug("[ServerAdapter] No active connections to drain");
      return;
    }

    logger.info("[ServerAdapter] Draining connections", {
      count: this.activeConnections.size,
    });

    return new Promise<void>((resolve) => {
      // Check periodically if all connections are drained
      const checkInterval = setInterval(() => {
        if (this.activeConnections.size === 0) {
          clearInterval(checkInterval);
          logger.info("[ServerAdapter] All connections drained");
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Reset server state for restart capability
   * Call this after stop() completes to allow restart
   */
  protected resetServerState(): void {
    this.isRunning = false;
    this.startTime = undefined;
    this.activeConnections.clear();
    this.lifecycleState = "stopped";

    logger.debug("[ServerAdapter] Server state reset for restart capability");
  }

  /**
   * Validate lifecycle state transition
   * @param operation The operation being performed
   * @param allowedStates States that allow the operation
   */
  protected validateLifecycleState(
    operation: string,
    allowedStates: ServerLifecycleState[],
  ): void {
    if (!allowedStates.includes(this.lifecycleState)) {
      throw new InvalidLifecycleStateError(
        operation,
        this.lifecycleState,
        allowedStates,
      );
    }
  }

  /**
   * Get server status
   */
  public getStatus(): ServerStatus {
    return {
      running: this.isRunning,
      port: this.config.port,
      host: this.config.host,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      routes: this.routes.size,
      middlewares: this.middlewares.length,
      lifecycleState: this.lifecycleState,
      activeConnections: this.activeConnections.size,
    };
  }

  /**
   * List all registered routes
   */
  public listRoutes(): RouteDefinition[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get configuration
   */
  public getConfig(): RequiredServerAdapterConfig {
    return { ...this.config };
  }
}

# Server Adapters Implementation Guide

This document provides a complete implementation guide for adding Mastra-style server adapters to NeuroLink, enabling deployment of NeuroLink's AI capabilities through multiple web frameworks.

## Table of Contents

1. [Overview](#overview)
2. [Current NeuroLink Server Analysis](#current-neurolink-server-analysis)
3. [Architecture Design](#architecture-design)
4. [Abstract Server Adapter](#abstract-server-adapter)
5. [TypeScript Interfaces](#typescript-interfaces)
6. [Server Implementations](#server-implementations)
   - [Hono Adapter (Primary)](#hono-adapter-primary)
   - [Express Adapter](#express-adapter)
   - [Fastify Adapter](#fastify-adapter)
   - [Koa Adapter](#koa-adapter)
7. [Common Features](#common-features)
8. [API Endpoints](#api-endpoints)
9. [Integration Patterns](#integration-patterns)
10. [Step-by-Step Implementation Plan](#step-by-step-implementation-plan)

---

## Overview

Server adapters provide a framework-agnostic way to expose NeuroLink's AI capabilities through HTTP APIs. Following Mastra's pattern, we implement an abstract server adapter that can be extended for different web frameworks (Hono, Express, Fastify, Koa).

### Goals

- **Framework Agnostic**: Support multiple web frameworks through a unified interface
- **Type Safe**: Full TypeScript support with proper typing
- **Production Ready**: Include CORS, rate limiting, body parsing, and error handling
- **Feature Complete**: Expose all NeuroLink capabilities through REST APIs
- **Extensible**: Easy to add new endpoints and frameworks

### Key Features

- Agent execution endpoints
- Workflow management endpoints
- Tool discovery and execution endpoints
- Memory management endpoints
- MCP server management endpoints
- Health check and metrics endpoints
- Streaming support for real-time AI responses

---

## Current NeuroLink Server Analysis

### Existing Server Patterns

NeuroLink currently has server-related code in the examples directory:

**File**: `/examples/projects/chat-app/src/server.ts`

```typescript
// Current pattern: Direct Express setup
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import rateLimit from "express-rate-limit";

export async function createServer(): Promise<Express> {
  const app = express();

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  });
  app.use(limiter);

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    // ...
  });

  // Routes
  app.use("/api/chat", chatRouter);
  app.get("/api/health", healthHandler);

  return app;
}
```

### Key Patterns to Preserve

1. **Middleware Configuration**: Rate limiting, body parsing, CORS
2. **Route Organization**: Modular route registration
3. **Error Handling**: Centralized error handling middleware
4. **Health Checks**: Standard health check endpoint

### Gaps to Address

1. **No Abstract Server Interface**: Current implementation is Express-specific
2. **No Framework Abstraction**: Cannot easily switch frameworks
3. **Limited Endpoint Coverage**: Only chat endpoints implemented
4. **No MCP/Tool Endpoints**: External MCP servers not exposed via HTTP
5. **No Workflow Endpoints**: Workflow execution not exposed

---

## Architecture Design

### Design Principles

Following NeuroLink's established patterns from `00-neurolink-architecture-patterns.md`:

1. **Factory Pattern**: ServerAdapterFactory for creating framework-specific adapters
2. **Registry Pattern**: Route registry for endpoint management
3. **Composition Pattern**: Build adapters by composing smaller modules
4. **Graceful Degradation**: Handle missing optional features

### Directory Structure

```
src/lib/server/
├── index.ts                      # Main exports
├── types.ts                      # Server-related types
├── abstract/
│   └── baseServerAdapter.ts      # Abstract server adapter
├── adapters/
│   ├── honoAdapter.ts           # Hono implementation (primary)
│   ├── expressAdapter.ts        # Express implementation
│   ├── fastifyAdapter.ts        # Fastify implementation
│   └── koaAdapter.ts            # Koa implementation
├── routes/
│   ├── agentRoutes.ts           # Agent endpoints
│   ├── workflowRoutes.ts        # Workflow endpoints
│   ├── toolRoutes.ts            # Tool endpoints
│   ├── memoryRoutes.ts          # Memory endpoints
│   ├── mcpRoutes.ts             # MCP server endpoints
│   └── healthRoutes.ts          # Health check endpoints
├── middleware/
│   ├── cors.ts                  # CORS middleware
│   ├── rateLimit.ts             # Rate limiting
│   ├── bodyParser.ts            # Body parsing
│   ├── errorHandler.ts          # Error handling
│   └── requestContext.ts        # Request context
└── factory/
    └── serverAdapterFactory.ts  # Factory for creating adapters
```

---

## Abstract Server Adapter

### Base Server Adapter Class

**File**: `/src/lib/server/abstract/baseServerAdapter.ts`

```typescript
/**
 * Abstract Server Adapter
 * Base class for all framework-specific server adapters
 * Follows NeuroLink's composition and factory patterns
 */

import { EventEmitter } from "events";
import type { NeuroLink } from "../../neurolink.js";
import type { MCPToolRegistry } from "../../mcp/toolRegistry.js";
import type { ExternalServerManager } from "../../mcp/externalServerManager.js";
import type {
  ServerAdapterConfig,
  ServerContext,
  RouteDefinition,
  MiddlewareDefinition,
  ServerAdapterEvents,
} from "../types.js";
import { logger } from "../../utils/logger.js";

/**
 * Abstract base class for server adapters
 * Provides common functionality and defines the interface for framework-specific implementations
 */
export abstract class BaseServerAdapter extends EventEmitter {
  protected readonly config: Required<ServerAdapterConfig>;
  protected readonly neurolink: NeuroLink;
  protected readonly toolRegistry: MCPToolRegistry;
  protected readonly externalServerManager?: ExternalServerManager;
  protected routes: Map<string, RouteDefinition> = new Map();
  protected middlewares: MiddlewareDefinition[] = [];
  protected isRunning = false;
  protected startTime?: Date;

  constructor(neurolink: NeuroLink, config: ServerAdapterConfig = {}) {
    super();

    this.neurolink = neurolink;
    this.toolRegistry = neurolink.getToolRegistry();
    this.externalServerManager = neurolink.getExternalServerManager();

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
          "OPTIONS",
        ],
        headers: config.cors?.headers ?? ["Content-Type", "Authorization"],
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
      },
      bodyParser: {
        enabled: config.bodyParser?.enabled ?? true,
        maxSize: config.bodyParser?.maxSize ?? "10mb",
        jsonLimit: config.bodyParser?.jsonLimit ?? "10mb",
      },
      logging: {
        enabled: config.logging?.enabled ?? true,
        level: config.logging?.level ?? "info",
      },
      timeout: config.timeout ?? 30000,
      enableMetrics: config.enableMetrics ?? true,
      enableSwagger: config.enableSwagger ?? false,
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
  // Common Methods (Shared Implementation)
  // ============================================

  /**
   * Initialize the server adapter
   * Sets up routes, middleware, and framework
   */
  public async initialize(): Promise<void> {
    logger.info("[ServerAdapter] Initializing server adapter", {
      port: this.config.port,
      host: this.config.host,
      basePath: this.config.basePath,
    });

    // Initialize framework-specific setup
    this.initializeFramework();

    // Register built-in middleware
    this.registerBuiltInMiddleware();

    // Register built-in routes
    await this.registerBuiltInRoutes();

    this.emit("initialized", {
      config: this.config,
      routeCount: this.routes.size,
      middlewareCount: this.middlewares.length,
    } satisfies ServerAdapterEvents["initialized"]);

    logger.info("[ServerAdapter] Server adapter initialized", {
      routes: this.routes.size,
      middlewares: this.middlewares.length,
    });
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

    logger.debug(`[ServerAdapter] Registered route: ${routeKey}`);
  }

  /**
   * Register custom middleware
   */
  public registerMiddleware(middleware: MiddlewareDefinition): void {
    this.middlewares.push(middleware);
    this.registerFrameworkMiddleware(middleware);

    logger.debug(`[ServerAdapter] Registered middleware: ${middleware.name}`);
  }

  /**
   * Create request context from incoming request
   */
  protected createContext(
    requestId: string,
    method: string,
    path: string,
    headers: Record<string, string>,
    query?: Record<string, string>,
    body?: unknown,
  ): ServerContext {
    return {
      requestId,
      method,
      path,
      headers,
      query: query ?? {},
      body,
      neurolink: this.neurolink,
      toolRegistry: this.toolRegistry,
      externalServerManager: this.externalServerManager,
      timestamp: Date.now(),
      metadata: {},
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
   */
  protected async registerBuiltInRoutes(): Promise<void> {
    // Health check
    this.registerRoute({
      method: "GET",
      path: `${this.config.basePath}/health`,
      handler: async (ctx) => ({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
        version: process.env.npm_package_version || "unknown",
      }),
      description: "Health check endpoint",
    });

    // Ready check
    this.registerRoute({
      method: "GET",
      path: `${this.config.basePath}/ready`,
      handler: async (ctx) => {
        const toolRegistry = ctx.toolRegistry;
        const tools = await toolRegistry.listTools();

        return {
          ready: true,
          timestamp: new Date().toISOString(),
          services: {
            neurolink: true,
            tools: tools.length > 0,
            externalServers: !!ctx.externalServerManager,
          },
        };
      },
      description: "Readiness check endpoint",
    });
  }

  /**
   * Generate unique request ID
   */
  protected generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get server status
   */
  public getStatus(): {
    running: boolean;
    port: number;
    host: string;
    uptime: number;
    routes: number;
    middlewares: number;
  } {
    return {
      running: this.isRunning,
      port: this.config.port,
      host: this.config.host,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      routes: this.routes.size,
      middlewares: this.middlewares.length,
    };
  }

  /**
   * List all registered routes
   */
  public listRoutes(): RouteDefinition[] {
    return Array.from(this.routes.values());
  }
}
```

---

## TypeScript Interfaces

**File**: `/src/lib/server/types.ts`

```typescript
/**
 * Server Adapter Types
 * Comprehensive type system for server adapters
 */

import type { NeuroLink } from "../neurolink.js";
import type { MCPToolRegistry } from "../mcp/toolRegistry.js";
import type { ExternalServerManager } from "../mcp/externalServerManager.js";
import type { JsonValue, JsonObject } from "../types/common.js";

// ============================================
// Configuration Types
// ============================================

/**
 * Server adapter configuration
 */
export type ServerAdapterConfig = {
  /** Server port (default: 3000) */
  port?: number;

  /** Server host (default: "0.0.0.0") */
  host?: string;

  /** Base path for all routes (default: "/api") */
  basePath?: string;

  /** CORS configuration */
  cors?: CORSConfig;

  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;

  /** Body parser configuration */
  bodyParser?: BodyParserConfig;

  /** Logging configuration */
  logging?: LoggingConfig;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Enable metrics endpoint (default: true) */
  enableMetrics?: boolean;

  /** Enable Swagger/OpenAPI documentation (default: false) */
  enableSwagger?: boolean;
};

/**
 * CORS configuration
 */
export type CORSConfig = {
  /** Enable CORS (default: true) */
  enabled?: boolean;

  /** Allowed origins (default: ["*"]) */
  origins?: string[];

  /** Allowed HTTP methods */
  methods?: string[];

  /** Allowed headers */
  headers?: string[];

  /** Allow credentials */
  credentials?: boolean;

  /** Preflight cache max age in seconds */
  maxAge?: number;
};

/**
 * Rate limiting configuration
 */
export type RateLimitConfig = {
  /** Enable rate limiting (default: true) */
  enabled?: boolean;

  /** Time window in milliseconds (default: 15 minutes) */
  windowMs?: number;

  /** Maximum requests per window (default: 100) */
  maxRequests?: number;

  /** Custom error message */
  message?: string;

  /** Skip rate limiting for certain paths */
  skipPaths?: string[];

  /** Custom key generator function */
  keyGenerator?: (ctx: ServerContext) => string;
};

/**
 * Body parser configuration
 */
export type BodyParserConfig = {
  /** Enable body parsing (default: true) */
  enabled?: boolean;

  /** Maximum body size (default: "10mb") */
  maxSize?: string;

  /** JSON body limit (default: "10mb") */
  jsonLimit?: string;

  /** Enable URL-encoded body parsing */
  urlEncoded?: boolean;
};

/**
 * Logging configuration
 */
export type LoggingConfig = {
  /** Enable request logging (default: true) */
  enabled?: boolean;

  /** Log level */
  level?: "debug" | "info" | "warn" | "error";

  /** Include request body in logs */
  includeBody?: boolean;

  /** Include response body in logs */
  includeResponse?: boolean;
};

// ============================================
// Request/Response Types
// ============================================

/**
 * Server request context
 * Passed to all route handlers and middleware
 */
export type ServerContext = {
  /** Unique request ID */
  requestId: string;

  /** HTTP method */
  method: string;

  /** Request path */
  path: string;

  /** Request headers */
  headers: Record<string, string>;

  /** Query parameters */
  query: Record<string, string>;

  /** Request body (parsed) */
  body?: unknown;

  /** NeuroLink SDK instance */
  neurolink: NeuroLink;

  /** Tool registry instance */
  toolRegistry: MCPToolRegistry;

  /** External server manager (optional) */
  externalServerManager?: ExternalServerManager;

  /** Request timestamp */
  timestamp: number;

  /** Additional metadata */
  metadata: Record<string, JsonValue>;

  /** User information (if authenticated) */
  user?: {
    id: string;
    email?: string;
    roles?: string[];
  };

  /** Session information */
  session?: {
    id: string;
    data?: Record<string, JsonValue>;
  };
};

/**
 * Server response object
 */
export type ServerResponse<T = unknown> = {
  /** Response data */
  data?: T;

  /** Error information */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };

  /** Response metadata */
  metadata?: {
    requestId: string;
    timestamp: string;
    duration?: number;
  };
};

/**
 * Streaming response configuration
 */
export type StreamingConfig = {
  /** Enable streaming response */
  enabled: boolean;

  /** Content type for streaming */
  contentType?: "text/event-stream" | "application/x-ndjson";

  /** Keep-alive interval in milliseconds */
  keepAliveInterval?: number;
};

// ============================================
// Route Types
// ============================================

/**
 * Route definition
 */
export type RouteDefinition = {
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";

  /** Route path (supports parameters like :id) */
  path: string;

  /** Route handler function */
  handler: RouteHandler;

  /** Route description (for documentation) */
  description?: string;

  /** Request schema (for validation) */
  requestSchema?: JsonObject;

  /** Response schema (for documentation) */
  responseSchema?: JsonObject;

  /** Authentication required */
  auth?: boolean;

  /** Required roles */
  roles?: string[];

  /** Rate limit override for this route */
  rateLimit?: RateLimitConfig;

  /** Streaming configuration */
  streaming?: StreamingConfig;

  /** Route tags (for documentation) */
  tags?: string[];
};

/**
 * Route handler function
 */
export type RouteHandler<T = unknown> = (
  ctx: ServerContext,
) => Promise<T | ServerResponse<T>>;

/**
 * Route group for organizing related routes
 */
export type RouteGroup = {
  /** Group prefix */
  prefix: string;

  /** Routes in this group */
  routes: RouteDefinition[];

  /** Middleware specific to this group */
  middleware?: MiddlewareDefinition[];

  /** Group-level authentication */
  auth?: boolean;

  /** Group-level roles */
  roles?: string[];
};

// ============================================
// Middleware Types
// ============================================

/**
 * Middleware definition
 */
export type MiddlewareDefinition = {
  /** Middleware name */
  name: string;

  /** Execution order (lower = earlier) */
  order?: number;

  /** Middleware handler */
  handler: MiddlewareHandler;

  /** Paths to apply middleware to (default: all) */
  paths?: string[];

  /** Paths to exclude from middleware */
  excludePaths?: string[];
};

/**
 * Middleware handler function
 */
export type MiddlewareHandler = (
  ctx: ServerContext,
  next: () => Promise<unknown>,
) => Promise<unknown>;

// ============================================
// Event Types
// ============================================

/**
 * Server adapter events
 */
export type ServerAdapterEvents = {
  /** Server initialized */
  initialized: {
    config: ServerAdapterConfig;
    routeCount: number;
    middlewareCount: number;
  };

  /** Server started */
  started: {
    port: number;
    host: string;
    timestamp: Date;
  };

  /** Server stopped */
  stopped: {
    uptime: number;
    timestamp: Date;
  };

  /** Request received */
  request: {
    requestId: string;
    method: string;
    path: string;
    timestamp: Date;
  };

  /** Response sent */
  response: {
    requestId: string;
    statusCode: number;
    duration: number;
    timestamp: Date;
  };

  /** Error occurred */
  error: {
    requestId?: string;
    error: Error;
    timestamp: Date;
  };
};

// ============================================
// API Request/Response Types
// ============================================

/**
 * Agent execution request
 */
export type AgentExecuteRequest = {
  /** Input prompt or message */
  input: string | { text: string; images?: string[]; files?: string[] };

  /** Provider to use (optional) */
  provider?: string;

  /** Model to use (optional) */
  model?: string;

  /** System prompt (optional) */
  systemPrompt?: string;

  /** Temperature (0-1) */
  temperature?: number;

  /** Maximum tokens */
  maxTokens?: number;

  /** Tools to enable */
  tools?: string[];

  /** Enable streaming */
  stream?: boolean;

  /** Session ID for conversation memory */
  sessionId?: string;

  /** User ID for context */
  userId?: string;
};

/**
 * Agent execution response
 */
export type AgentExecuteResponse = {
  /** Generated content */
  content: string;

  /** Provider used */
  provider: string;

  /** Model used */
  model: string;

  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /** Tool calls made */
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
  }>;

  /** Finish reason */
  finishReason?: string;

  /** Response metadata */
  metadata?: Record<string, JsonValue>;
};

/**
 * Tool execution request
 */
export type ToolExecuteRequest = {
  /** Tool name */
  name: string;

  /** Tool arguments */
  arguments: Record<string, unknown>;

  /** Session context */
  sessionId?: string;

  /** User context */
  userId?: string;
};

/**
 * Tool execution response
 */
export type ToolExecuteResponse = {
  /** Whether execution was successful */
  success: boolean;

  /** Result data */
  data?: unknown;

  /** Error message if failed */
  error?: string;

  /** Execution duration in ms */
  duration: number;

  /** Tool metadata */
  metadata?: Record<string, JsonValue>;
};

/**
 * MCP server status response
 */
export type MCPServerStatusResponse = {
  /** Server ID */
  serverId: string;

  /** Server name */
  name: string;

  /** Connection status */
  status: "connected" | "disconnected" | "connecting" | "failed";

  /** Available tools count */
  toolCount: number;

  /** Last health check time */
  lastHealthCheck?: string;

  /** Error message if failed */
  error?: string;
};

// ============================================
// Factory Types
// ============================================

/**
 * Supported server frameworks
 */
export type ServerFramework = "hono" | "express" | "fastify" | "koa";

/**
 * Server adapter factory options
 */
export type ServerAdapterFactoryOptions = {
  /** Framework to use */
  framework: ServerFramework;

  /** NeuroLink instance */
  neurolink: NeuroLink;

  /** Server configuration */
  config?: ServerAdapterConfig;
};
```

---

## Server Implementations

### Hono Adapter (Primary)

**File**: `/src/lib/server/adapters/honoAdapter.ts`

```typescript
/**
 * Hono Server Adapter
 * Primary server adapter implementation using Hono framework
 * Hono is chosen for its performance, TypeScript-first design, and edge compatibility
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { HTTPException } from "hono/http-exception";
import { streamSSE } from "hono/streaming";
import type { Context as HonoContext } from "hono";
import { BaseServerAdapter } from "../abstract/baseServerAdapter.js";
import type { NeuroLink } from "../../neurolink.js";
import type {
  ServerAdapterConfig,
  ServerContext,
  RouteDefinition,
  MiddlewareDefinition,
  ServerAdapterEvents,
  StreamingConfig,
} from "../types.js";
import { logger } from "../../utils/logger.js";

/**
 * Hono-specific server adapter
 */
export class HonoServerAdapter extends BaseServerAdapter {
  private app!: Hono;
  private server?: ReturnType<typeof Bun.serve> | import("http").Server;

  constructor(neurolink: NeuroLink, config: ServerAdapterConfig = {}) {
    super(neurolink, config);
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
      const startTime = Date.now();

      // Create server context
      const ctx = this.createContext(
        requestId,
        c.req.method,
        c.req.path,
        this.extractHeaders(c),
        this.extractQuery(c),
        await this.extractBody(c),
      );

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
          return await this.handleStreamingResponse(c, ctx, route);
        }

        // Execute handler
        const result = await route.handler(ctx);
        const duration = Date.now() - startTime;

        // Emit response event
        this.emit("response", {
          requestId,
          statusCode: 200,
          duration,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["response"]);

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

        // Create context
        const ctx = this.createContext(
          c.req.header("X-Request-ID") || this.generateRequestId(),
          c.req.method,
          c.req.path,
          this.extractHeaders(c),
          this.extractQuery(c),
          await this.extractBody(c),
        );

        // Execute middleware
        return middleware.handler(ctx, next);
      });
    }
  }

  /**
   * Start the Hono server
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("[HonoAdapter] Server is already running");
      return;
    }

    const { port, host } = this.config;

    // Check if running in Bun environment
    if (typeof Bun !== "undefined") {
      this.server = Bun.serve({
        port,
        hostname: host,
        fetch: this.app.fetch,
      });
    } else {
      // Fallback to Node.js http module
      const { serve } = await import("@hono/node-server");
      this.server = serve({
        fetch: this.app.fetch,
        port,
        hostname: host,
      });
    }

    this.isRunning = true;
    this.startTime = new Date();

    logger.info(`[HonoAdapter] Server started on ${host}:${port}`);

    this.emit("started", {
      port,
      host,
      timestamp: this.startTime,
    } satisfies ServerAdapterEvents["started"]);
  }

  /**
   * Stop the Hono server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn("[HonoAdapter] Server is not running");
      return;
    }

    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    if (this.server) {
      if ("stop" in this.server && typeof this.server.stop === "function") {
        this.server.stop();
      } else if (
        "close" in this.server &&
        typeof this.server.close === "function"
      ) {
        await new Promise<void>((resolve) => {
          (this.server as import("http").Server).close(() => resolve());
        });
      }
    }

    this.isRunning = false;

    logger.info("[HonoAdapter] Server stopped", { uptime });

    this.emit("stopped", {
      uptime,
      timestamp: new Date(),
    } satisfies ServerAdapterEvents["stopped"]);
  }

  /**
   * Get the Hono app instance
   */
  public getFrameworkInstance(): Hono {
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
```

### Express Adapter

**File**: `/src/lib/server/adapters/expressAdapter.ts`

```typescript
/**
 * Express Server Adapter
 * Server adapter implementation using Express framework
 */

import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { BaseServerAdapter } from "../abstract/baseServerAdapter.js";
import type { NeuroLink } from "../../neurolink.js";
import type {
  ServerAdapterConfig,
  ServerContext,
  RouteDefinition,
  MiddlewareDefinition,
  ServerAdapterEvents,
} from "../types.js";
import { logger } from "../../utils/logger.js";

/**
 * Express-specific server adapter
 */
export class ExpressServerAdapter extends BaseServerAdapter {
  private app!: Express;
  private server?: import("http").Server;

  constructor(neurolink: NeuroLink, config: ServerAdapterConfig = {}) {
    super(neurolink, config);
  }

  /**
   * Initialize Express framework
   */
  protected initializeFramework(): void {
    this.app = express();

    // Body parsing
    if (this.config.bodyParser.enabled) {
      this.app.use(express.json({ limit: this.config.bodyParser.jsonLimit }));
      this.app.use(express.urlencoded({ extended: true }));
    }

    // CORS
    if (this.config.cors.enabled) {
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
      const limiter = rateLimit({
        windowMs: this.config.rateLimit.windowMs,
        max: this.config.rateLimit.maxRequests,
        message: {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: this.config.rateLimit.message,
          },
        },
        standardHeaders: true,
        legacyHeaders: false,
      });
      this.app.use(limiter);
    }

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.headers["x-request-id"] =
        req.headers["x-request-id"] || this.generateRequestId();
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

    // Error handling middleware
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

        res.status(500).json({
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
        const ctx = this.createContext(
          requestId,
          req.method,
          req.path,
          req.headers as Record<string, string>,
          req.query as Record<string, string>,
          req.body,
        );

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

          // Emit response event
          this.emit("response", {
            requestId,
            statusCode: 200,
            duration,
            timestamp: new Date(),
          } satisfies ServerAdapterEvents["response"]);

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

          // Create context
          const ctx = this.createContext(
            (req.headers["x-request-id"] as string) || this.generateRequestId(),
            req.method,
            req.path,
            req.headers as Record<string, string>,
            req.query as Record<string, string>,
            req.body,
          );

          // Execute middleware
          try {
            await middleware.handler(ctx, async () => {
              return new Promise<void>((resolve) => {
                next();
                resolve();
              });
            });
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
    if (this.isRunning) {
      logger.warn("[ExpressAdapter] Server is already running");
      return;
    }

    const { port, host } = this.config;

    return new Promise((resolve) => {
      this.server = this.app.listen(port, host, () => {
        this.isRunning = true;
        this.startTime = new Date();

        logger.info(`[ExpressAdapter] Server started on ${host}:${port}`);

        this.emit("started", {
          port,
          host,
          timestamp: this.startTime,
        } satisfies ServerAdapterEvents["started"]);

        resolve();
      });
    });
  }

  /**
   * Stop the Express server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      logger.warn("[ExpressAdapter] Server is not running");
      return;
    }

    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false;

        logger.info("[ExpressAdapter] Server stopped", { uptime });

        this.emit("stopped", {
          uptime,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["stopped"]);

        resolve();
      });
    });
  }

  /**
   * Get the Express app instance
   */
  public getFrameworkInstance(): Express {
    return this.app;
  }
}
```

### Fastify Adapter

**File**: `/src/lib/server/adapters/fastifyAdapter.ts`

```typescript
/**
 * Fastify Server Adapter
 * Server adapter implementation using Fastify framework
 */

import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import { BaseServerAdapter } from "../abstract/baseServerAdapter.js";
import type { NeuroLink } from "../../neurolink.js";
import type {
  ServerAdapterConfig,
  ServerContext,
  RouteDefinition,
  MiddlewareDefinition,
  ServerAdapterEvents,
} from "../types.js";
import { logger } from "../../utils/logger.js";

/**
 * Fastify-specific server adapter
 */
export class FastifyServerAdapter extends BaseServerAdapter {
  private app!: FastifyInstance;

  constructor(neurolink: NeuroLink, config: ServerAdapterConfig = {}) {
    super(neurolink, config);
  }

  /**
   * Initialize Fastify framework
   */
  protected initializeFramework(): void {
    this.app = Fastify({
      logger: this.config.logging.enabled,
      requestIdHeader: "x-request-id",
      genReqId: () => this.generateRequestId(),
    });

    // CORS
    if (this.config.cors.enabled) {
      this.app.register(fastifyCors, {
        origin: this.config.cors.origins,
        methods: this.config.cors.methods,
        allowedHeaders: this.config.cors.headers,
        credentials: this.config.cors.credentials,
        maxAge: this.config.cors.maxAge,
      });
    }

    // Rate limiting
    if (this.config.rateLimit.enabled) {
      this.app.register(fastifyRateLimit, {
        max: this.config.rateLimit.maxRequests,
        timeWindow: this.config.rateLimit.windowMs,
        errorResponseBuilder: (_request, context) => ({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: this.config.rateLimit.message,
          },
          metadata: {
            retryAfter: context.ttl,
          },
        }),
      });
    }

    // Error handler
    this.app.setErrorHandler((error, request, reply) => {
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
    });

    // 404 handler
    this.app.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: `Route ${request.method} ${request.url} not found`,
        },
      });
    });
  }

  /**
   * Register route with Fastify
   */
  protected registerFrameworkRoute(route: RouteDefinition): void {
    const method = route.method.toLowerCase() as
      | "get"
      | "post"
      | "put"
      | "delete"
      | "patch"
      | "options";

    this.app.route({
      method: method.toUpperCase() as any,
      url: route.path,
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        const requestId = request.id;
        const startTime = Date.now();

        // Create server context
        const ctx = this.createContext(
          requestId,
          request.method,
          request.url,
          request.headers as Record<string, string>,
          request.query as Record<string, string>,
          request.body,
        );

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
            return this.handleStreamingResponse(reply, ctx, route);
          }

          // Execute handler
          const result = await route.handler(ctx);
          const duration = Date.now() - startTime;

          // Emit response event
          this.emit("response", {
            requestId,
            statusCode: 200,
            duration,
            timestamp: new Date(),
          } satisfies ServerAdapterEvents["response"]);

          // Return formatted response
          return {
            data: result,
            metadata: {
              requestId,
              timestamp: new Date().toISOString(),
              duration,
            },
          };
        } catch (error) {
          throw error;
        }
      },
    });
  }

  /**
   * Handle streaming response
   */
  private async handleStreamingResponse(
    reply: FastifyReply,
    ctx: ServerContext,
    route: RouteDefinition,
  ): Promise<void> {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      const result = await route.handler(ctx);

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
        reply.raw.write(`event: complete\n`);
        reply.raw.write(`data: ${JSON.stringify(result)}\n\n`);
      }

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
    this.app.addHook("preHandler", async (request, reply) => {
      // Skip excluded paths
      if (middleware.excludePaths?.some((p) => request.url.startsWith(p))) {
        return;
      }

      // Check if path matches
      const paths = middleware.paths || ["/"];
      const matches = paths.some((p) => request.url.startsWith(p) || p === "*");
      if (!matches) {
        return;
      }

      // Create context
      const ctx = this.createContext(
        request.id,
        request.method,
        request.url,
        request.headers as Record<string, string>,
        request.query as Record<string, string>,
        request.body,
      );

      // Execute middleware
      await middleware.handler(ctx, async () => {});
    });
  }

  /**
   * Start the Fastify server
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("[FastifyAdapter] Server is already running");
      return;
    }

    const { port, host } = this.config;

    await this.app.listen({ port, host });

    this.isRunning = true;
    this.startTime = new Date();

    logger.info(`[FastifyAdapter] Server started on ${host}:${port}`);

    this.emit("started", {
      port,
      host,
      timestamp: this.startTime,
    } satisfies ServerAdapterEvents["started"]);
  }

  /**
   * Stop the Fastify server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn("[FastifyAdapter] Server is not running");
      return;
    }

    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    await this.app.close();

    this.isRunning = false;

    logger.info("[FastifyAdapter] Server stopped", { uptime });

    this.emit("stopped", {
      uptime,
      timestamp: new Date(),
    } satisfies ServerAdapterEvents["stopped"]);
  }

  /**
   * Get the Fastify instance
   */
  public getFrameworkInstance(): FastifyInstance {
    return this.app;
  }
}
```

### Koa Adapter

**File**: `/src/lib/server/adapters/koaAdapter.ts`

```typescript
/**
 * Koa Server Adapter
 * Server adapter implementation using Koa framework
 */

import Koa from "koa";
import Router from "@koa/router";
import koaCors from "@koa/cors";
import koaBodyParser from "koa-bodyparser";
import type { Context as KoaContext, Next } from "koa";
import { BaseServerAdapter } from "../abstract/baseServerAdapter.js";
import type { NeuroLink } from "../../neurolink.js";
import type {
  ServerAdapterConfig,
  ServerContext,
  RouteDefinition,
  MiddlewareDefinition,
  ServerAdapterEvents,
} from "../types.js";
import { logger } from "../../utils/logger.js";

/**
 * Koa-specific server adapter
 */
export class KoaServerAdapter extends BaseServerAdapter {
  private app!: Koa;
  private router!: Router;
  private server?: import("http").Server;

  constructor(neurolink: NeuroLink, config: ServerAdapterConfig = {}) {
    super(neurolink, config);
  }

  /**
   * Initialize Koa framework
   */
  protected initializeFramework(): void {
    this.app = new Koa();
    this.router = new Router();

    // CORS
    if (this.config.cors.enabled) {
      this.app.use(
        koaCors({
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

    // Body parsing
    if (this.config.bodyParser.enabled) {
      this.app.use(
        koaBodyParser({
          jsonLimit: this.config.bodyParser.jsonLimit,
        }),
      );
    }

    // Request ID middleware
    this.app.use(async (ctx: KoaContext, next: Next) => {
      ctx.state.requestId = ctx.get("x-request-id") || this.generateRequestId();
      ctx.set("x-request-id", ctx.state.requestId);
      await next();
    });

    // Logging middleware
    if (this.config.logging.enabled) {
      this.app.use(async (ctx: KoaContext, next: Next) => {
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

    // Error handling
    this.app.use(async (ctx: KoaContext, next: Next) => {
      try {
        await next();
      } catch (error) {
        const err = error as Error;
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

        ctx.status = 500;
        ctx.body = {
          error: {
            code: "INTERNAL_ERROR",
            message: "An internal error occurred",
          },
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      }
    });

    // Mount router
    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
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

    this.router[method](route.path, async (ctx: KoaContext) => {
      const requestId = ctx.state.requestId;
      const startTime = Date.now();

      // Create server context
      const serverCtx = this.createContext(
        requestId,
        ctx.method,
        ctx.path,
        ctx.headers as Record<string, string>,
        ctx.query as Record<string, string>,
        ctx.request.body,
      );

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
          return this.handleStreamingResponse(ctx, serverCtx, route);
        }

        // Execute handler
        const result = await route.handler(serverCtx);
        const duration = Date.now() - startTime;

        // Emit response event
        this.emit("response", {
          requestId,
          statusCode: 200,
          duration,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["response"]);

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
        throw error;
      }
    });
  }

  /**
   * Handle streaming response
   */
  private async handleStreamingResponse(
    ctx: KoaContext,
    serverCtx: ServerContext,
    route: RouteDefinition,
  ): Promise<void> {
    ctx.set("Content-Type", "text/event-stream");
    ctx.set("Cache-Control", "no-cache");
    ctx.set("Connection", "keep-alive");

    ctx.status = 200;

    const stream = ctx.res;

    try {
      const result = await route.handler(serverCtx);

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
        stream.write(`event: complete\n`);
        stream.write(`data: ${JSON.stringify(result)}\n\n`);
      }

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
    this.app.use(async (ctx: KoaContext, next: Next) => {
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

      // Create context
      const serverCtx = this.createContext(
        ctx.state.requestId,
        ctx.method,
        ctx.path,
        ctx.headers as Record<string, string>,
        ctx.query as Record<string, string>,
        ctx.request.body,
      );

      // Execute middleware
      await middleware.handler(serverCtx, next);
    });
  }

  /**
   * Start the Koa server
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("[KoaAdapter] Server is already running");
      return;
    }

    const { port, host } = this.config;

    return new Promise((resolve) => {
      this.server = this.app.listen(port, host, () => {
        this.isRunning = true;
        this.startTime = new Date();

        logger.info(`[KoaAdapter] Server started on ${host}:${port}`);

        this.emit("started", {
          port,
          host,
          timestamp: this.startTime,
        } satisfies ServerAdapterEvents["started"]);

        resolve();
      });
    });
  }

  /**
   * Stop the Koa server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      logger.warn("[KoaAdapter] Server is not running");
      return;
    }

    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false;

        logger.info("[KoaAdapter] Server stopped", { uptime });

        this.emit("stopped", {
          uptime,
          timestamp: new Date(),
        } satisfies ServerAdapterEvents["stopped"]);

        resolve();
      });
    });
  }

  /**
   * Get the Koa app instance
   */
  public getFrameworkInstance(): Koa {
    return this.app;
  }
}
```

---

## Common Features

### Server Adapter Factory

**File**: `/src/lib/server/factory/serverAdapterFactory.ts`

```typescript
/**
 * Server Adapter Factory
 * Creates framework-specific server adapters
 */

import type { NeuroLink } from "../../neurolink.js";
import type { BaseServerAdapter } from "../abstract/baseServerAdapter.js";
import type {
  ServerFramework,
  ServerAdapterConfig,
  ServerAdapterFactoryOptions,
} from "../types.js";
import { logger } from "../../utils/logger.js";

/**
 * Factory for creating server adapters
 */
export class ServerAdapterFactory {
  private static adapters = new Map<
    ServerFramework,
    new (
      neurolink: NeuroLink,
      config?: ServerAdapterConfig,
    ) => BaseServerAdapter
  >();

  private static initialized = false;

  /**
   * Register all available adapters
   */
  static async registerAllAdapters(): Promise<void> {
    if (this.initialized) return;

    // Use dynamic imports to avoid loading all frameworks
    this.adapters.set(
      "hono",
      (await import("../adapters/honoAdapter.js")).HonoServerAdapter,
    );
    this.adapters.set(
      "express",
      (await import("../adapters/expressAdapter.js")).ExpressServerAdapter,
    );
    this.adapters.set(
      "fastify",
      (await import("../adapters/fastifyAdapter.js")).FastifyServerAdapter,
    );
    this.adapters.set(
      "koa",
      (await import("../adapters/koaAdapter.js")).KoaServerAdapter,
    );

    this.initialized = true;
    logger.debug("[ServerAdapterFactory] All adapters registered");
  }

  /**
   * Create a server adapter for the specified framework
   */
  static async create(
    options: ServerAdapterFactoryOptions,
  ): Promise<BaseServerAdapter> {
    await this.registerAllAdapters();

    const AdapterClass = this.adapters.get(options.framework);

    if (!AdapterClass) {
      throw new Error(
        `Unknown server framework: ${options.framework}. ` +
          `Available: ${Array.from(this.adapters.keys()).join(", ")}`,
      );
    }

    const adapter = new AdapterClass(options.neurolink, options.config);
    await adapter.initialize();

    return adapter;
  }

  /**
   * Get available frameworks
   */
  static getAvailableFrameworks(): ServerFramework[] {
    return ["hono", "express", "fastify", "koa"];
  }

  /**
   * Check if a framework is available
   */
  static isFrameworkAvailable(framework: ServerFramework): boolean {
    return this.getAvailableFrameworks().includes(framework);
  }
}
```

### Route Builders

**File**: `/src/lib/server/routes/index.ts`

```typescript
/**
 * Route Builders
 * Pre-built route definitions for common NeuroLink endpoints
 */

import type { RouteGroup, RouteDefinition, ServerContext } from "../types.js";
import type {
  AgentExecuteRequest,
  AgentExecuteResponse,
  ToolExecuteRequest,
  ToolExecuteResponse,
  MCPServerStatusResponse,
} from "../types.js";

/**
 * Create agent routes
 */
export function createAgentRoutes(basePath: string = "/api"): RouteGroup {
  return {
    prefix: `${basePath}/agent`,
    routes: [
      {
        method: "POST",
        path: `${basePath}/agent/execute`,
        handler: async (ctx: ServerContext): Promise<AgentExecuteResponse> => {
          const request = ctx.body as AgentExecuteRequest;

          const result = await ctx.neurolink.generate({
            input: request.input,
            provider: request.provider,
            model: request.model,
            systemPrompt: request.systemPrompt,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            tools: request.tools,
            context: {
              sessionId: request.sessionId,
              userId: request.userId,
            },
          });

          return {
            content: result.content,
            provider: result.provider,
            model: result.model,
            usage: result.usage,
            toolCalls: result.toolCalls,
            finishReason: result.finishReason,
          };
        },
        description: "Execute agent with prompt",
        tags: ["agent"],
      },
      {
        method: "POST",
        path: `${basePath}/agent/stream`,
        streaming: { enabled: true },
        handler: async (ctx: ServerContext) => {
          const request = ctx.body as AgentExecuteRequest;

          const result = await ctx.neurolink.stream({
            input: request.input,
            provider: request.provider,
            model: request.model,
            systemPrompt: request.systemPrompt,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            tools: request.tools,
          });

          return result.stream;
        },
        description: "Stream agent response",
        tags: ["agent", "streaming"],
      },
    ],
  };
}

/**
 * Create tool routes
 */
export function createToolRoutes(basePath: string = "/api"): RouteGroup {
  return {
    prefix: `${basePath}/tools`,
    routes: [
      {
        method: "GET",
        path: `${basePath}/tools`,
        handler: async (ctx: ServerContext) => {
          const tools = await ctx.toolRegistry.listTools();
          return {
            tools: tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              serverId: tool.serverId,
              category: tool.category,
            })),
            total: tools.length,
          };
        },
        description: "List all available tools",
        tags: ["tools"],
      },
      {
        method: "GET",
        path: `${basePath}/tools/:toolName`,
        handler: async (ctx: ServerContext) => {
          const toolName = ctx.path.split("/").pop()!;
          const toolInfo = ctx.toolRegistry.getToolInfo(toolName);

          if (!toolInfo) {
            throw new Error(`Tool '${toolName}' not found`);
          }

          return toolInfo;
        },
        description: "Get tool information",
        tags: ["tools"],
      },
      {
        method: "POST",
        path: `${basePath}/tools/:toolName/execute`,
        handler: async (ctx: ServerContext): Promise<ToolExecuteResponse> => {
          const toolName = ctx.path.split("/")[ctx.path.split("/").length - 2];
          const request = ctx.body as ToolExecuteRequest;
          const startTime = Date.now();

          try {
            const result = await ctx.toolRegistry.executeTool(
              toolName,
              request.arguments,
              {
                sessionId: request.sessionId || ctx.requestId,
                userId: request.userId,
              },
            );

            return {
              success: true,
              data: result,
              duration: Date.now() - startTime,
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: Date.now() - startTime,
            };
          }
        },
        description: "Execute a tool",
        tags: ["tools"],
      },
    ],
  };
}

/**
 * Create MCP server routes
 */
export function createMCPRoutes(basePath: string = "/api"): RouteGroup {
  return {
    prefix: `${basePath}/mcp`,
    routes: [
      {
        method: "GET",
        path: `${basePath}/mcp/servers`,
        handler: async (ctx: ServerContext) => {
          if (!ctx.externalServerManager) {
            return { servers: [], total: 0 };
          }

          const statuses = ctx.externalServerManager.getServerStatuses();
          return {
            servers: statuses.map((status) => ({
              serverId: status.serverId,
              status: status.status,
              isHealthy: status.isHealthy,
              toolCount: status.toolCount,
              lastHealthCheck: status.checkedAt?.toISOString(),
            })),
            total: statuses.length,
          };
        },
        description: "List all MCP servers",
        tags: ["mcp"],
      },
      {
        method: "GET",
        path: `${basePath}/mcp/servers/:serverId`,
        handler: async (
          ctx: ServerContext,
        ): Promise<MCPServerStatusResponse> => {
          const serverId = ctx.path.split("/").pop()!;

          if (!ctx.externalServerManager) {
            throw new Error("MCP server manager not available");
          }

          const server = ctx.externalServerManager.getServer(serverId);
          if (!server) {
            throw new Error(`MCP server '${serverId}' not found`);
          }

          return {
            serverId,
            name: server.config.id,
            status: server.status,
            toolCount: server.tools.size,
            lastHealthCheck: server.lastHealthCheck?.toISOString(),
            error: server.lastError,
          };
        },
        description: "Get MCP server status",
        tags: ["mcp"],
      },
      {
        method: "GET",
        path: `${basePath}/mcp/servers/:serverId/tools`,
        handler: async (ctx: ServerContext) => {
          const serverId = ctx.path.split("/")[ctx.path.split("/").length - 2];

          if (!ctx.externalServerManager) {
            throw new Error("MCP server manager not available");
          }

          const tools = ctx.externalServerManager.getServerTools(serverId);
          return {
            serverId,
            tools: tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              isAvailable: tool.isAvailable,
            })),
            total: tools.length,
          };
        },
        description: "List tools for MCP server",
        tags: ["mcp", "tools"],
      },
    ],
  };
}

/**
 * Create memory routes
 */
export function createMemoryRoutes(basePath: string = "/api"): RouteGroup {
  return {
    prefix: `${basePath}/memory`,
    routes: [
      {
        method: "GET",
        path: `${basePath}/memory/sessions`,
        handler: async (ctx: ServerContext) => {
          const memory = ctx.neurolink.getConversationMemory();
          if (!memory) {
            return { sessions: [], total: 0 };
          }

          const sessions = memory.listSessions();
          return {
            sessions,
            total: sessions.length,
          };
        },
        description: "List conversation sessions",
        tags: ["memory"],
      },
      {
        method: "GET",
        path: `${basePath}/memory/sessions/:sessionId`,
        handler: async (ctx: ServerContext) => {
          const sessionId = ctx.path.split("/").pop()!;
          const memory = ctx.neurolink.getConversationMemory();

          if (!memory) {
            throw new Error("Memory not configured");
          }

          const history = await memory.getHistory(sessionId);
          return {
            sessionId,
            messages: history,
            messageCount: history.length,
          };
        },
        description: "Get conversation history",
        tags: ["memory"],
      },
      {
        method: "DELETE",
        path: `${basePath}/memory/sessions/:sessionId`,
        handler: async (ctx: ServerContext) => {
          const sessionId = ctx.path.split("/").pop()!;
          const memory = ctx.neurolink.getConversationMemory();

          if (!memory) {
            throw new Error("Memory not configured");
          }

          await memory.clearSession(sessionId);
          return { success: true, sessionId };
        },
        description: "Clear conversation session",
        tags: ["memory"],
      },
    ],
  };
}

/**
 * Create all standard routes
 */
export function createAllRoutes(basePath: string = "/api"): RouteGroup[] {
  return [
    createAgentRoutes(basePath),
    createToolRoutes(basePath),
    createMCPRoutes(basePath),
    createMemoryRoutes(basePath),
  ];
}
```

---

## API Endpoints

### Complete Endpoint Reference

| Endpoint                     | Method | Description           |
| ---------------------------- | ------ | --------------------- |
| `/api/health`                | GET    | Health check          |
| `/api/ready`                 | GET    | Readiness check       |
| `/api/agent/execute`         | POST   | Execute agent         |
| `/api/agent/stream`          | POST   | Stream agent response |
| `/api/tools`                 | GET    | List all tools        |
| `/api/tools/:name`           | GET    | Get tool info         |
| `/api/tools/:name/execute`   | POST   | Execute tool          |
| `/api/mcp/servers`           | GET    | List MCP servers      |
| `/api/mcp/servers/:id`       | GET    | Get server status     |
| `/api/mcp/servers/:id/tools` | GET    | List server tools     |
| `/api/memory/sessions`       | GET    | List sessions         |
| `/api/memory/sessions/:id`   | GET    | Get session history   |
| `/api/memory/sessions/:id`   | DELETE | Clear session         |

---

## Integration Patterns

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { ServerAdapterFactory } from "@juspay/neurolink/server";

// Create NeuroLink instance
const neurolink = new NeuroLink({
  conversationMemory: { enabled: true },
});

// Create server adapter
const server = await ServerAdapterFactory.create({
  framework: "hono", // or "express", "fastify", "koa"
  neurolink,
  config: {
    port: 3000,
    cors: { enabled: true },
    rateLimit: { enabled: true, maxRequests: 100 },
  },
});

// Start server
await server.start();

console.log(`Server running on http://localhost:3000`);
```

### Custom Routes

```typescript
import { ServerAdapterFactory } from "@juspay/neurolink/server";

const server = await ServerAdapterFactory.create({
  framework: "hono",
  neurolink,
});

// Add custom route
server.registerRoute({
  method: "POST",
  path: "/api/custom/analyze",
  handler: async (ctx) => {
    const { text } = ctx.body as { text: string };

    const result = await ctx.neurolink.generate({
      input: `Analyze this text: ${text}`,
      provider: "anthropic",
    });

    return { analysis: result.content };
  },
  description: "Custom text analysis endpoint",
});

await server.start();
```

### Custom Middleware

```typescript
server.registerMiddleware({
  name: "authentication",
  order: 5,
  handler: async (ctx, next) => {
    const token = ctx.headers["authorization"];

    if (!token) {
      throw new Error("Authentication required");
    }

    // Validate token and set user
    ctx.user = await validateToken(token);

    return next();
  },
  excludePaths: ["/api/health", "/api/ready"],
});
```

### Framework Integration

```typescript
// Get underlying framework instance for advanced usage
const honoApp = server.getFrameworkInstance();

// Add framework-specific functionality
honoApp.get("/custom-hono-route", (c) => {
  return c.text("Direct Hono route");
});
```

---

## Step-by-Step Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

1. **Create Directory Structure**
   - Create `/src/lib/server/` directory
   - Set up subdirectories: `abstract`, `adapters`, `routes`, `middleware`, `factory`

2. **Implement Type System**
   - Create `/src/lib/server/types.ts` with all interfaces
   - Add type exports to `/src/lib/types/index.ts`

3. **Implement Base Server Adapter**
   - Create `/src/lib/server/abstract/baseServerAdapter.ts`
   - Test with mock implementation

### Phase 2: Primary Adapter (Week 2-3)

4. **Implement Hono Adapter**
   - Create `/src/lib/server/adapters/honoAdapter.ts`
   - Add streaming support
   - Add error handling
   - Write unit tests

5. **Implement Server Factory**
   - Create `/src/lib/server/factory/serverAdapterFactory.ts`
   - Add dynamic imports
   - Write integration tests

### Phase 3: Additional Adapters (Week 3-4)

6. **Implement Express Adapter**
   - Create `/src/lib/server/adapters/expressAdapter.ts`
   - Port existing chat-app server patterns
   - Write tests

7. **Implement Fastify Adapter**
   - Create `/src/lib/server/adapters/fastifyAdapter.ts`
   - Write tests

8. **Implement Koa Adapter**
   - Create `/src/lib/server/adapters/koaAdapter.ts`
   - Write tests

### Phase 4: Route Builders (Week 4-5)

9. **Create Route Builders**
   - Implement agent routes
   - Implement tool routes
   - Implement MCP routes
   - Implement memory routes
   - Write integration tests

10. **Create Middleware Components**
    - Implement rate limiter
    - Implement authentication middleware
    - Implement request validation
    - Write tests

### Phase 5: Integration & Documentation (Week 5-6)

11. **NeuroLink Integration**
    - Add `getToolRegistry()` method to NeuroLink
    - Add `getExternalServerManager()` method
    - Add `getConversationMemory()` method
    - Update exports

12. **Testing**
    - Write comprehensive unit tests
    - Write integration tests
    - Write E2E tests for each framework

13. **Documentation**
    - Update README
    - Add API documentation
    - Add migration guide
    - Add examples

### Implementation Checklist

- [ ] Create directory structure
- [ ] Implement `ServerAdapterConfig` types
- [ ] Implement `ServerContext` types
- [ ] Implement `RouteDefinition` types
- [ ] Implement `BaseServerAdapter` abstract class
- [ ] Implement `HonoServerAdapter`
- [ ] Implement `ExpressServerAdapter`
- [ ] Implement `FastifyServerAdapter`
- [ ] Implement `KoaServerAdapter`
- [ ] Implement `ServerAdapterFactory`
- [ ] Implement agent routes
- [ ] Implement tool routes
- [ ] Implement MCP routes
- [ ] Implement memory routes
- [ ] Add streaming support
- [ ] Add authentication middleware
- [ ] Add rate limiting
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update NeuroLink class
- [ ] Update exports
- [ ] Add documentation

---

## References

- **NeuroLink Architecture**: `/docs/mastra-features-implementation/00-neurolink-architecture-patterns.md`
- **MCP Tool Registry**: `/src/lib/mcp/toolRegistry.ts`
- **External Server Manager**: `/src/lib/mcp/externalServerManager.ts`
- **Middleware System**: `/src/lib/middleware/factory.ts`
- **Existing Server Example**: `/examples/projects/chat-app/src/server.ts`
- **Hono Documentation**: https://hono.dev
- **Express Documentation**: https://expressjs.com
- **Fastify Documentation**: https://fastify.dev
- **Koa Documentation**: https://koajs.com

# Server Adapters Implementation Plan

This document provides a detailed phased implementation plan for adding Mastra-style server adapters to NeuroLink, enabling deployment of NeuroLink's AI capabilities through multiple web frameworks (Express, Fastify, Koa, Hono).

## Table of Contents

1. [Prerequisites and Dependencies](#prerequisites-and-dependencies)
2. [Phase 1: Server Adapter Interface](#phase-1-server-adapter-interface)
3. [Phase 2: Express Adapter Implementation](#phase-2-express-adapter-implementation)
4. [Phase 3: Fastify Adapter Implementation](#phase-3-fastify-adapter-implementation)
5. [Phase 4: Koa Adapter Implementation](#phase-4-koa-adapter-implementation)
6. [Phase 5: Hono Adapter Implementation](#phase-5-hono-adapter-implementation)
7. [Phase 6: OpenAPI Documentation Generation](#phase-6-openapi-documentation-generation)
8. [Phase 7: Testing and Examples](#phase-7-testing-and-examples)
9. [Estimated Effort Per Phase](#estimated-effort-per-phase)
10. [Framework Compatibility Matrix](#framework-compatibility-matrix)
11. [Risk Assessment and Mitigation](#risk-assessment-and-mitigation)
12. [AI SDK Streaming Protocol](#ai-sdk-streaming-protocol)
13. [Mastra Server Architecture](#mastra-server-architecture)
14. [Build System Lessons](#build-system-lessons)
15. [Updated Framework Priority](#updated-framework-priority)
16. [Edge Runtime Considerations](#edge-runtime-considerations)

---

## Prerequisites and Dependencies

### Required Dependencies

Before starting implementation, the following dependencies must be added to `package.json`:

```json
{
  "dependencies": {
    "hono": "^4.6.0"
  },
  "optionalDependencies": {
    "express": "^4.21.0",
    "fastify": "^5.0.0",
    "koa": "^2.15.0",
    "@koa/router": "^13.0.0",
    "@koa/cors": "^5.0.0",
    "koa-bodyparser": "^4.4.1",
    "@fastify/cors": "^10.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "express-rate-limit": "^7.4.0",
    "cors": "^2.8.5",
    "@hono/node-server": "^1.13.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/koa": "^2.15.0",
    "@types/koa__router": "^12.0.4",
    "@types/koa__cors": "^5.0.0",
    "@types/koa-bodyparser": "^4.3.12",
    "@types/cors": "^2.8.17",
    "supertest": "^7.0.0"
  }
}
```

### Existing NeuroLink Components Required

The following existing NeuroLink components must be accessible:

| Component               | Location                                | Purpose              |
| ----------------------- | --------------------------------------- | -------------------- |
| `NeuroLink`             | `/src/lib/neurolink.ts`                 | Main SDK class       |
| `MCPToolRegistry`       | `/src/lib/mcp/toolRegistry.ts`          | Tool management      |
| `ExternalServerManager` | `/src/lib/mcp/externalServerManager.ts` | MCP server lifecycle |
| `ConversationMemory`    | `/src/lib/memory/conversationMemory.ts` | Memory management    |
| `Logger`                | `/src/lib/utils/logger.ts`              | Logging utilities    |
| `ErrorFactory`          | `/src/lib/utils/errorHandling.ts`       | Error handling       |

### NeuroLink Class Modifications Required

Before implementing server adapters, add the following accessor methods to `NeuroLink` class:

```typescript
// In /src/lib/neurolink.ts

/**
 * Get the tool registry instance
 */
public getToolRegistry(): MCPToolRegistry {
  return this.toolRegistry;
}

/**
 * Get the external server manager instance
 */
public getExternalServerManager(): ExternalServerManager | undefined {
  return this.externalServerManager;
}

/**
 * Get the conversation memory instance
 */
public getConversationMemory(): ConversationMemory | undefined {
  return this.conversationMemory;
}
```

### Directory Structure to Create

```
src/lib/server/
├── index.ts                      # Main exports
├── types.ts                      # Server-related types
├── abstract/
│   └── baseServerAdapter.ts      # Abstract server adapter
├── adapters/
│   ├── honoAdapter.ts            # Hono implementation (primary)
│   ├── expressAdapter.ts         # Express implementation
│   ├── fastifyAdapter.ts         # Fastify implementation
│   └── koaAdapter.ts             # Koa implementation
├── routes/
│   ├── index.ts                  # Route exports
│   ├── agentRoutes.ts            # Agent endpoints
│   ├── toolRoutes.ts             # Tool endpoints
│   ├── mcpRoutes.ts              # MCP server endpoints
│   ├── memoryRoutes.ts           # Memory endpoints
│   └── healthRoutes.ts           # Health check endpoints
├── middleware/
│   ├── index.ts                  # Middleware exports
│   ├── cors.ts                   # CORS middleware
│   ├── rateLimit.ts              # Rate limiting
│   ├── errorHandler.ts           # Error handling
│   ├── requestContext.ts         # Request context
│   └── authentication.ts         # Authentication middleware
├── factory/
│   └── serverAdapterFactory.ts   # Factory for creating adapters
└── openapi/
    ├── generator.ts              # OpenAPI spec generator
    ├── schemas.ts                # JSON Schema definitions
    └── templates.ts              # OpenAPI templates
```

---

## Phase 1: Server Adapter Interface

**Duration**: 5-7 days
**Priority**: Critical
**Dependencies**: None

### Objectives

1. Define comprehensive TypeScript interfaces for server adapters
2. Implement the abstract `BaseServerAdapter` class
3. Create the `ServerAdapterFactory` for adapter instantiation
4. Establish common type definitions

### Tasks

#### Task 1.1: Create Type Definitions

**File**: `/src/lib/server/types.ts`

**Deliverables**:

- `ServerAdapterConfig` interface with all configuration options
- `CORSConfig`, `RateLimitConfig`, `BodyParserConfig`, `LoggingConfig` interfaces
- `ServerContext` interface for request context
- `RouteDefinition` and `RouteGroup` interfaces
- `MiddlewareDefinition` and `MiddlewareHandler` types
- `ServerAdapterEvents` interface for event typing
- API request/response types (`AgentExecuteRequest`, `ToolExecuteRequest`, etc.)
- `ServerFramework` type union

**Key Design Decisions**:

1. `ServerContext` must include references to `NeuroLink`, `MCPToolRegistry`, and `ExternalServerManager`
2. Routes support both sync and streaming responses via `StreamingConfig`
3. All configuration options have sensible defaults
4. Type safety enforced throughout

#### Task 1.2: Implement Base Server Adapter

**File**: `/src/lib/server/abstract/baseServerAdapter.ts`

**Deliverables**:

- Abstract class extending `EventEmitter` for lifecycle events
- Configuration normalization with defaults
- Abstract methods for framework-specific implementations
- Common route registration logic
- Built-in middleware registration (request ID, logging)
- Built-in routes (health, ready)
- Server status and route listing methods

**Abstract Methods to Define**:

```typescript
protected abstract initializeFramework(): void;
protected abstract registerFrameworkRoute(route: RouteDefinition): void;
protected abstract registerFrameworkMiddleware(middleware: MiddlewareDefinition): void;
public abstract start(): Promise<void>;
public abstract stop(): Promise<void>;
public abstract getFrameworkInstance(): unknown;
```

**Common Methods to Implement**:

```typescript
public async initialize(): Promise<void>;
public registerRoute(route: RouteDefinition): void;
public registerMiddleware(middleware: MiddlewareDefinition): void;
protected createContext(...): ServerContext;
protected registerBuiltInMiddleware(): void;
protected registerBuiltInRoutes(): Promise<void>;
protected generateRequestId(): string;
public getStatus(): ServerStatus;
public listRoutes(): RouteDefinition[];
```

#### Task 1.3: Implement Server Adapter Factory

**File**: `/src/lib/server/factory/serverAdapterFactory.ts`

**Deliverables**:

- Factory class with dynamic adapter registration
- `create()` method for adapter instantiation
- Framework availability checks
- Dynamic imports to avoid loading unused frameworks

**Key Implementation**:

```typescript
export class ServerAdapterFactory {
  private static adapters = new Map<ServerFramework, AdapterConstructor>();
  private static initialized = false;

  static async registerAllAdapters(): Promise<void>;
  static async create(
    options: ServerAdapterFactoryOptions,
  ): Promise<BaseServerAdapter>;
  static getAvailableFrameworks(): ServerFramework[];
  static isFrameworkAvailable(framework: ServerFramework): boolean;
}
```

#### Task 1.4: Create Route Builders

**File**: `/src/lib/server/routes/index.ts`

**Deliverables**:

- `createAgentRoutes(basePath)` - Agent execution endpoints
- `createToolRoutes(basePath)` - Tool management endpoints
- `createMCPRoutes(basePath)` - MCP server management endpoints
- `createMemoryRoutes(basePath)` - Memory/session endpoints
- `createAllRoutes(basePath)` - Convenience method for all routes

### Acceptance Criteria

- [ ] All types compile without errors
- [ ] `BaseServerAdapter` can be extended by concrete adapters
- [ ] Factory correctly creates adapters with dynamic imports
- [ ] Route builders create valid `RouteGroup` objects
- [ ] Unit tests pass for all components
- [ ] JSDoc documentation for all public APIs

### Test Coverage Requirements

| Component            | Unit Tests                | Integration Tests |
| -------------------- | ------------------------- | ----------------- |
| Types                | Type compilation tests    | N/A               |
| BaseServerAdapter    | Mock implementation tests | N/A               |
| ServerAdapterFactory | Registration tests        | N/A               |
| Route Builders       | Route generation tests    | N/A               |

---

## Phase 2: Express Adapter Implementation

**Duration**: 5-7 days
**Priority**: High
**Dependencies**: Phase 1 complete

### Objectives

1. Implement Express-specific server adapter
2. Port existing patterns from `/examples/projects/chat-app/src/server.ts`
3. Support SSE streaming for real-time responses
4. Integrate with Express middleware ecosystem

### Tasks

#### Task 2.1: Implement Express Adapter Class

**File**: `/src/lib/server/adapters/expressAdapter.ts`

**Deliverables**:

- `ExpressServerAdapter` class extending `BaseServerAdapter`
- Framework initialization with Express app
- Route registration using Express router
- Middleware registration using Express middleware
- Server start/stop with Node.js http server

**Key Implementation Details**:

```typescript
export class ExpressServerAdapter extends BaseServerAdapter {
  private app!: Express;
  private server?: import("http").Server;

  protected initializeFramework(): void {
    this.app = express();
    // Body parsing
    // CORS configuration
    // Rate limiting
    // Request ID middleware
    // Logging middleware
    // Error handling middleware
  }

  protected registerFrameworkRoute(route: RouteDefinition): void {
    // Map route to Express router method
    // Handle streaming routes with SSE
    // Wrap handler with context creation
  }

  protected registerFrameworkMiddleware(
    middleware: MiddlewareDefinition,
  ): void {
    // Register middleware with path matching
    // Handle excluded paths
  }

  public async start(): Promise<void> {
    // Start Express server
    // Emit 'started' event
  }

  public async stop(): Promise<void> {
    // Gracefully close server
    // Emit 'stopped' event
  }

  public getFrameworkInstance(): Express {
    return this.app;
  }
}
```

#### Task 2.2: Implement Express Streaming Support

**Deliverables**:

- SSE (Server-Sent Events) support for streaming responses
- Proper header configuration for streaming
- Error handling in streams
- Connection keep-alive handling

**Implementation Pattern**:

```typescript
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
    if (Symbol.asyncIterator in result) {
      for await (const chunk of result) {
        res.write(`event: message\ndata: ${JSON.stringify(chunk)}\n\n`);
      }
    }
    res.write(`event: done\ndata: \n\n`);
    res.end();
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({ error })}\n\n`);
    res.end();
  }
}
```

#### Task 2.3: Implement Express Middleware Integration

**Deliverables**:

- CORS middleware using `cors` package
- Rate limiting using `express-rate-limit`
- Body parsing with size limits
- Error handling middleware with proper error responses

#### Task 2.4: Write Express Adapter Tests

**Test Files**:

- `/test/server/adapters/expressAdapter.test.ts`
- `/test/server/adapters/expressAdapter.integration.test.ts`

**Test Cases**:

1. Adapter initialization
2. Route registration (GET, POST, PUT, DELETE)
3. Streaming response handling
4. Middleware execution order
5. Error handling
6. Server start/stop lifecycle
7. CORS handling
8. Rate limiting behavior

### Acceptance Criteria

- [ ] All Express routes register correctly
- [ ] Streaming responses work with SSE
- [ ] Middleware executes in correct order
- [ ] Error responses follow consistent format
- [ ] Server starts and stops gracefully
- [ ] Integration with existing Express middleware works
- [ ] Tests achieve >80% coverage

### Migration from Existing Chat App Server

Document migration steps from `/examples/projects/chat-app/src/server.ts`:

1. Replace direct Express setup with `ServerAdapterFactory`
2. Move route handlers to route builder pattern
3. Update middleware to use adapter middleware system
4. Maintain backward compatibility with existing API contracts

---

## Phase 3: Fastify Adapter Implementation

**Duration**: 4-5 days
**Priority**: High
**Dependencies**: Phase 1 complete

### Objectives

1. Implement Fastify-specific server adapter
2. Leverage Fastify's schema validation capabilities
3. Support streaming with Fastify's reply system
4. Integrate with Fastify plugin ecosystem

### Tasks

#### Task 3.1: Implement Fastify Adapter Class

**File**: `/src/lib/server/adapters/fastifyAdapter.ts`

**Deliverables**:

- `FastifyServerAdapter` class extending `BaseServerAdapter`
- Framework initialization with Fastify instance
- Route registration using Fastify route method
- Hook-based middleware registration
- Async server lifecycle management

**Key Implementation Details**:

```typescript
export class FastifyServerAdapter extends BaseServerAdapter {
  private app!: FastifyInstance;

  protected initializeFramework(): void {
    this.app = Fastify({
      logger: this.config.logging.enabled,
      requestIdHeader: "x-request-id",
      genReqId: () => this.generateRequestId(),
    });
    // Register plugins
    // Set error handler
    // Set 404 handler
  }

  protected registerFrameworkRoute(route: RouteDefinition): void {
    this.app.route({
      method: route.method,
      url: route.path,
      handler: async (request, reply) => {
        // Create context, execute handler, return response
      },
    });
  }

  protected registerFrameworkMiddleware(
    middleware: MiddlewareDefinition,
  ): void {
    this.app.addHook("preHandler", async (request, reply) => {
      // Execute middleware
    });
  }

  public async start(): Promise<void> {
    await this.app.listen({ port: this.config.port, host: this.config.host });
    // Emit 'started' event
  }

  public async stop(): Promise<void> {
    await this.app.close();
    // Emit 'stopped' event
  }
}
```

#### Task 3.2: Implement Fastify Streaming Support

**Deliverables**:

- Raw reply streaming for SSE
- Proper header handling for streaming responses
- Connection management

**Implementation Pattern**:

```typescript
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

  // Stream handling using reply.raw.write()
}
```

#### Task 3.3: Integrate Fastify Plugins

**Deliverables**:

- `@fastify/cors` integration
- `@fastify/rate-limit` integration
- Custom error response builder

#### Task 3.4: Write Fastify Adapter Tests

**Test Files**:

- `/test/server/adapters/fastifyAdapter.test.ts`
- `/test/server/adapters/fastifyAdapter.integration.test.ts`

**Test Cases**:

1. Adapter initialization with plugins
2. Route registration with schema validation
3. Streaming response handling
4. Hook-based middleware execution
5. Error handling with custom responses
6. Server lifecycle management
7. Plugin integration verification

### Acceptance Criteria

- [ ] All Fastify routes register correctly
- [ ] Plugin integration works properly
- [ ] Streaming responses work via raw reply
- [ ] Hooks execute in correct order
- [ ] Error responses use custom builder
- [ ] Server starts and stops asynchronously
- [ ] Tests achieve >80% coverage

---

## Phase 4: Koa Adapter Implementation

**Duration**: 4-5 days
**Priority**: Medium
**Dependencies**: Phase 1 complete

### Objectives

1. Implement Koa-specific server adapter
2. Leverage Koa's middleware composition model
3. Support streaming with Koa's context/response
4. Integrate with Koa router and middleware ecosystem

### Tasks

#### Task 4.1: Implement Koa Adapter Class

**File**: `/src/lib/server/adapters/koaAdapter.ts`

**Deliverables**:

- `KoaServerAdapter` class extending `BaseServerAdapter`
- Framework initialization with Koa app and router
- Route registration using @koa/router
- Middleware registration using Koa's use() pattern
- Server lifecycle with http.Server

**Key Implementation Details**:

```typescript
export class KoaServerAdapter extends BaseServerAdapter {
  private app!: Koa;
  private router!: Router;
  private server?: import("http").Server;

  protected initializeFramework(): void {
    this.app = new Koa();
    this.router = new Router();
    // CORS middleware
    // Body parser middleware
    // Request ID middleware
    // Logging middleware
    // Error handling middleware
    // Mount router
  }

  protected registerFrameworkRoute(route: RouteDefinition): void {
    this.router[route.method.toLowerCase()](route.path, async (ctx) => {
      // Create server context, execute handler, set body
    });
  }

  protected registerFrameworkMiddleware(
    middleware: MiddlewareDefinition,
  ): void {
    this.app.use(async (ctx, next) => {
      // Path matching and middleware execution
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        // Emit 'started' event
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server?.close(() => {
        // Emit 'stopped' event
        resolve();
      });
    });
  }
}
```

#### Task 4.2: Implement Koa Streaming Support

**Deliverables**:

- Direct response stream handling
- SSE format with proper headers
- Error handling in streams

**Implementation Pattern**:

```typescript
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
  // Stream handling using stream.write()
}
```

#### Task 4.3: Integrate Koa Middleware

**Deliverables**:

- `@koa/cors` integration
- `koa-bodyparser` integration
- Custom rate limiting middleware (Koa lacks built-in support)

#### Task 4.4: Write Koa Adapter Tests

**Test Files**:

- `/test/server/adapters/koaAdapter.test.ts`
- `/test/server/adapters/koaAdapter.integration.test.ts`

**Test Cases**:

1. Adapter initialization
2. Router-based route registration
3. Streaming response handling
4. Middleware composition order
5. Error handling via try/catch middleware
6. Server lifecycle with promises
7. CORS and body parsing verification

### Acceptance Criteria

- [ ] All Koa routes register via router
- [ ] Middleware composes correctly
- [ ] Streaming responses work via ctx.res
- [ ] Error handling catches and formats errors
- [ ] Server starts and stops with promises
- [ ] Tests achieve >80% coverage

---

## Phase 5: Hono Adapter Implementation

**Duration**: 5-6 days
**Priority**: High (Primary adapter)
**Dependencies**: Phase 1 complete

### Objectives

1. Implement Hono as the primary server adapter
2. Leverage Hono's edge-compatible, TypeScript-first design
3. Support SSE streaming with Hono's streaming utilities
4. Enable deployment to edge runtimes (Bun, Cloudflare Workers)

### Tasks

#### Task 5.1: Implement Hono Adapter Class

**File**: `/src/lib/server/adapters/honoAdapter.ts`

**Deliverables**:

- `HonoServerAdapter` class extending `BaseServerAdapter`
- Framework initialization with Hono app
- Route registration using Hono's method handlers
- Middleware registration using Hono's use() pattern
- Multi-runtime support (Bun, Node.js)

**Key Implementation Details**:

```typescript
export class HonoServerAdapter extends BaseServerAdapter {
  private app!: Hono;
  private server?: ReturnType<typeof Bun.serve> | import("http").Server;

  protected initializeFramework(): void {
    this.app = new Hono();
    // Secure headers middleware
    // CORS middleware (hono/cors)
    // Timeout middleware (hono/timeout)
    // Logger middleware (hono/logger)
    // Global error handler
    // 404 handler
  }

  protected registerFrameworkRoute(route: RouteDefinition): void {
    this.app[route.method.toLowerCase()](route.path, async (c) => {
      // Create context, handle streaming, execute handler
      // Return c.json() for regular responses
    });
  }

  protected registerFrameworkMiddleware(
    middleware: MiddlewareDefinition,
  ): void {
    this.app.use("*", async (c, next) => {
      // Path matching and middleware execution
    });
  }

  public async start(): Promise<void> {
    if (typeof Bun !== "undefined") {
      this.server = Bun.serve({
        port: this.config.port,
        hostname: this.config.host,
        fetch: this.app.fetch,
      });
    } else {
      const { serve } = await import("@hono/node-server");
      this.server = serve({
        fetch: this.app.fetch,
        port: this.config.port,
        hostname: this.config.host,
      });
    }
    // Emit 'started' event
  }

  public async stop(): Promise<void> {
    // Handle Bun.serve.stop() or Node server.close()
    // Emit 'stopped' event
  }
}
```

#### Task 5.2: Implement Hono Streaming Support

**Deliverables**:

- SSE streaming using `hono/streaming` utilities
- `streamSSE` helper usage
- Event-based message formatting

**Implementation Pattern**:

```typescript
import { streamSSE } from "hono/streaming";

private async handleStreamingResponse(
  c: HonoContext,
  ctx: ServerContext,
  route: RouteDefinition,
): Promise<Response> {
  return streamSSE(c, async (stream) => {
    try {
      const result = await route.handler(ctx);
      if (Symbol.asyncIterator in result) {
        for await (const chunk of result) {
          await stream.writeSSE({
            data: JSON.stringify(chunk),
            event: "message",
          });
        }
      }
      await stream.writeSSE({ data: "", event: "done" });
    } catch (error) {
      await stream.writeSSE({
        data: JSON.stringify({ error }),
        event: "error",
      });
    }
  });
}
```

#### Task 5.3: Implement Multi-Runtime Support

**Deliverables**:

- Bun runtime detection and server creation
- Node.js fallback using `@hono/node-server`
- Environment-specific optimizations

#### Task 5.4: Integrate Hono Built-in Middleware

**Deliverables**:

- `hono/cors` for CORS handling
- `hono/secure-headers` for security headers
- `hono/timeout` for request timeouts
- `hono/logger` for request logging
- Custom rate limiting (implement or use third-party)

#### Task 5.5: Write Hono Adapter Tests

**Test Files**:

- `/test/server/adapters/honoAdapter.test.ts`
- `/test/server/adapters/honoAdapter.integration.test.ts`

**Test Cases**:

1. Adapter initialization
2. Route registration with all HTTP methods
3. SSE streaming with streamSSE
4. Middleware execution order
5. HTTPException handling
6. Multi-runtime detection
7. Server lifecycle (Bun vs Node)
8. Header extraction and body parsing

### Acceptance Criteria

- [ ] All Hono routes register correctly
- [ ] SSE streaming works with streamSSE
- [ ] Middleware executes in correct order
- [ ] Error responses follow HTTPException pattern
- [ ] Bun and Node.js runtimes both work
- [ ] Server starts and stops gracefully
- [ ] Tests achieve >80% coverage

---

## Phase 6: OpenAPI Documentation Generation

**Duration**: 4-5 days
**Priority**: Medium
**Dependencies**: Phases 1-5 complete

### Objectives

1. Auto-generate OpenAPI 3.1 specifications from route definitions
2. Create JSON Schema definitions for all request/response types
3. Integrate Swagger UI for interactive documentation
4. Support both static generation and runtime serving

### Tasks

#### Task 6.1: Create OpenAPI Generator

**File**: `/src/lib/server/openapi/generator.ts`

**Deliverables**:

- `OpenAPIGenerator` class for spec generation
- Route-to-operation conversion
- Schema inference from TypeScript types
- Path parameter extraction

**Key Implementation**:

```typescript
export class OpenAPIGenerator {
  private spec: OpenAPISpec;

  constructor(options: OpenAPIGeneratorOptions) {
    this.spec = {
      openapi: "3.1.0",
      info: {
        title: options.title || "NeuroLink API",
        version: options.version || "1.0.0",
        description: options.description,
      },
      servers: options.servers || [],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {},
      },
    };
  }

  addRoute(route: RouteDefinition): void {
    // Convert route to OpenAPI path item
  }

  addRouteGroup(group: RouteGroup): void {
    // Add all routes in group
  }

  addSchema(name: string, schema: JSONSchema): void {
    // Add component schema
  }

  generate(): OpenAPISpec {
    return this.spec;
  }

  toJSON(): string {
    return JSON.stringify(this.spec, null, 2);
  }

  toYAML(): string {
    // Convert to YAML format
  }
}
```

#### Task 6.2: Define JSON Schemas

**File**: `/src/lib/server/openapi/schemas.ts`

**Deliverables**:

- Schema definitions for all API types
- Request body schemas
- Response schemas
- Error response schemas

**Schemas to Define**:

```typescript
export const schemas = {
  AgentExecuteRequest: {
    /* ... */
  },
  AgentExecuteResponse: {
    /* ... */
  },
  ToolExecuteRequest: {
    /* ... */
  },
  ToolExecuteResponse: {
    /* ... */
  },
  MCPServerStatus: {
    /* ... */
  },
  ErrorResponse: {
    /* ... */
  },
  HealthResponse: {
    /* ... */
  },
  // ... more schemas
};
```

#### Task 6.3: Create OpenAPI Templates

**File**: `/src/lib/server/openapi/templates.ts`

**Deliverables**:

- Common operation templates
- Security scheme templates
- Tag definitions
- Server templates

#### Task 6.4: Integrate Swagger UI

**Deliverables**:

- Swagger UI serving endpoint
- Static spec serving endpoint
- Optional Swagger UI hosting

**Integration Options**:

```typescript
// Option 1: Serve spec at /api/openapi.json
server.registerRoute({
  method: "GET",
  path: "/api/openapi.json",
  handler: async () => generator.generate(),
});

// Option 2: Serve Swagger UI at /api/docs
server.registerRoute({
  method: "GET",
  path: "/api/docs",
  handler: async () => swaggerUIHTML,
});
```

#### Task 6.5: Write OpenAPI Tests

**Test Files**:

- `/test/server/openapi/generator.test.ts`

**Test Cases**:

1. Spec generation from routes
2. Schema addition and reference
3. Path parameter handling
4. JSON and YAML output
5. Complete spec validation

### Acceptance Criteria

- [ ] OpenAPI spec validates against 3.1 schema
- [ ] All routes have corresponding operations
- [ ] Schemas match TypeScript types
- [ ] Swagger UI renders correctly
- [ ] Spec can be exported as JSON/YAML
- [ ] Tests achieve >80% coverage

---

## Phase 7: Testing and Examples

**Duration**: 5-7 days
**Priority**: High
**Dependencies**: Phases 1-6 complete

### Objectives

1. Comprehensive test coverage for all adapters
2. Integration tests with real NeuroLink instances
3. Example applications for each framework
4. Performance benchmarking
5. Documentation with usage examples

### Tasks

#### Task 7.1: Unit Tests

**Test Directories**:

- `/test/server/types.test.ts`
- `/test/server/abstract/baseServerAdapter.test.ts`
- `/test/server/factory/serverAdapterFactory.test.ts`
- `/test/server/routes/*.test.ts`

**Coverage Targets**:
| Component | Target Coverage |
|-----------|-----------------|
| Types | 100% (compilation) |
| BaseServerAdapter | 90% |
| ServerAdapterFactory | 90% |
| Route Builders | 85% |
| Each Adapter | 85% |

#### Task 7.2: Integration Tests

**Test Directory**: `/test/server/integration/`

**Test Files**:

- `expressAdapter.integration.test.ts`
- `fastifyAdapter.integration.test.ts`
- `koaAdapter.integration.test.ts`
- `honoAdapter.integration.test.ts`

**Integration Test Scenarios**:

1. Full request/response cycle with NeuroLink
2. Tool execution via HTTP
3. MCP server status queries
4. Streaming agent responses
5. Memory session management
6. Concurrent request handling
7. Error propagation and formatting

#### Task 7.3: E2E Tests

**Test Directory**: `/test/server/e2e/`

**E2E Test Scenarios**:

1. Start server, make requests, stop server
2. Multiple adapters running simultaneously
3. Load testing with concurrent requests
4. Long-running streaming connections
5. Server restart and recovery

#### Task 7.4: Create Example Applications

**Example Directories**:

- `/examples/server/express-server/`
- `/examples/server/fastify-server/`
- `/examples/server/koa-server/`
- `/examples/server/hono-server/`
- `/examples/server/multi-framework/`

**Example Contents**:
Each example should include:

- `src/index.ts` - Main server setup
- `src/custom-routes.ts` - Custom route examples
- `src/custom-middleware.ts` - Custom middleware examples
- `package.json` - Dependencies
- `README.md` - Setup and usage instructions

**Example Server Template**:

```typescript
// examples/server/express-server/src/index.ts
import { NeuroLink } from "@juspay/neurolink";
import {
  ServerAdapterFactory,
  createAllRoutes,
} from "@juspay/neurolink/server";

async function main() {
  // Create NeuroLink instance
  const neurolink = new NeuroLink({
    conversationMemory: { enabled: true },
  });

  // Add MCP servers
  await neurolink.addExternalMCPServer("github", {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    transport: "stdio",
  });

  // Create server adapter
  const server = await ServerAdapterFactory.create({
    framework: "express",
    neurolink,
    config: {
      port: 3000,
      cors: { enabled: true },
      rateLimit: { enabled: true, maxRequests: 100 },
      enableSwagger: true,
    },
  });

  // Register all standard routes
  for (const routeGroup of createAllRoutes()) {
    for (const route of routeGroup.routes) {
      server.registerRoute(route);
    }
  }

  // Add custom route
  server.registerRoute({
    method: "POST",
    path: "/api/custom/summarize",
    handler: async (ctx) => {
      const { text } = ctx.body as { text: string };
      const result = await ctx.neurolink.generate({
        input: `Summarize: ${text}`,
        provider: "anthropic",
      });
      return { summary: result.content };
    },
    description: "Custom text summarization",
  });

  // Start server
  await server.start();
  console.log("Server running on http://localhost:3000");
  console.log("API docs at http://localhost:3000/api/docs");
}

main().catch(console.error);
```

#### Task 7.5: Performance Benchmarking

**Benchmark Scenarios**:

1. Requests per second (RPS) for each adapter
2. Memory usage under load
3. Streaming throughput
4. Cold start time

**Benchmark Tools**:

- `autocannon` for HTTP benchmarking
- `clinic` for Node.js profiling

**Benchmark Script**: `/scripts/benchmark-server-adapters.ts`

#### Task 7.6: Documentation

**Documentation Files**:

- `/docs/features/server-adapters.md` - Feature guide
- `/docs/features/server-adapters-api.md` - API reference
- `/docs/features/server-adapters-migration.md` - Migration guide
- Update `/README.md` with server adapter section

### Acceptance Criteria

- [ ] All unit tests pass with >85% coverage
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Examples run successfully
- [ ] Performance benchmarks documented
- [ ] Documentation complete and accurate

---

## Estimated Effort Per Phase

| Phase                             | Duration       | Effort (Person-Days) | Priority |
| --------------------------------- | -------------- | -------------------- | -------- |
| Phase 1: Server Adapter Interface | 5-7 days       | 6                    | Critical |
| Phase 2: Express Adapter          | 5-7 days       | 6                    | High     |
| Phase 3: Fastify Adapter          | 4-5 days       | 4                    | High     |
| Phase 4: Koa Adapter              | 4-5 days       | 4                    | Medium   |
| Phase 5: Hono Adapter             | 5-6 days       | 5                    | High     |
| Phase 6: OpenAPI Documentation    | 4-5 days       | 4                    | Medium   |
| Phase 7: Testing and Examples     | 5-7 days       | 6                    | High     |
| **Total**                         | **32-42 days** | **35**               | -        |

### Resource Requirements

- **Primary Developer**: Full-time, 6-7 weeks
- **QA/Testing**: Part-time, 2 weeks overlap with development
- **Documentation**: Part-time, 1 week at end

### Parallel Execution Opportunities

The following can be done in parallel:

- Phase 2, 3, 4, 5 can partially overlap after Phase 1 core types are complete
- Phase 6 can start once 2+ adapters are complete
- Phase 7 testing can start incrementally as adapters complete

**Optimized Timeline with Parallelization**: 4-5 weeks

---

## Framework Compatibility Matrix

### Feature Support by Framework

| Feature                                      | Express    | Fastify  | Koa        | Hono       |
| -------------------------------------------- | ---------- | -------- | ---------- | ---------- |
| HTTP Methods (GET, POST, PUT, DELETE, PATCH) | Yes        | Yes      | Yes        | Yes        |
| Path Parameters                              | Yes        | Yes      | Yes        | Yes        |
| Query Parameters                             | Yes        | Yes      | Yes        | Yes        |
| JSON Body Parsing                            | Yes        | Yes      | Yes        | Yes        |
| URL-Encoded Body                             | Yes        | Yes      | Yes        | Yes        |
| CORS                                         | Yes        | Yes      | Yes        | Yes        |
| Rate Limiting                                | Yes        | Yes      | Custom     | Custom     |
| SSE Streaming                                | Yes        | Yes      | Yes        | Yes        |
| WebSocket                                    | Plugin     | Plugin   | Plugin     | Built-in   |
| Request Timeout                              | Middleware | Plugin   | Middleware | Built-in   |
| Request ID                                   | Middleware | Built-in | Middleware | Middleware |
| Secure Headers                               | Helmet     | Plugin   | Middleware | Built-in   |

### Runtime Support by Framework

| Runtime            | Express | Fastify | Koa     | Hono |
| ------------------ | ------- | ------- | ------- | ---- |
| Node.js            | Yes     | Yes     | Yes     | Yes  |
| Bun                | Partial | Partial | Partial | Yes  |
| Deno               | No      | Partial | Partial | Yes  |
| Cloudflare Workers | No      | No      | No      | Yes  |
| AWS Lambda         | Adapter | Adapter | Adapter | Yes  |
| Vercel Edge        | No      | No      | No      | Yes  |

### Performance Characteristics

| Metric                  | Express  | Fastify  | Koa      | Hono      |
| ----------------------- | -------- | -------- | -------- | --------- |
| Requests/sec (baseline) | ~15k     | ~50k     | ~30k     | ~60k      |
| Memory (baseline)       | Medium   | Low      | Low      | Very Low  |
| Startup Time            | Fast     | Fast     | Fast     | Very Fast |
| TypeScript Support      | External | External | External | Native    |
| Middleware Overhead     | Medium   | Low      | Low      | Very Low  |

_Note: Performance numbers are approximate and depend on hardware, workload, and configuration._

### Plugin Ecosystem

| Category       | Express                | Fastify                        | Koa                   | Hono          |
| -------------- | ---------------------- | ------------------------------ | --------------------- | ------------- |
| Authentication | passport, express-jwt  | @fastify/auth, @fastify/jwt    | koa-passport, koa-jwt | hono/jwt      |
| Validation     | joi, express-validator | @fastify/type-provider-\*, ajv | koa-validate          | zod, valibot  |
| Database       | sequelize, typeorm     | @fastify/postgres              | any                   | any           |
| Session        | express-session        | @fastify/session               | koa-session           | Custom        |
| Upload         | multer                 | @fastify/multipart             | koa-multer            | Built-in      |
| Compression    | compression            | @fastify/compress              | koa-compress          | hono/compress |

### Recommended Framework by Use Case

| Use Case           | Recommended Framework | Reason                           |
| ------------------ | --------------------- | -------------------------------- |
| Enterprise/Legacy  | Express               | Largest ecosystem, most familiar |
| High Performance   | Fastify               | Best Node.js performance         |
| Minimalist API     | Koa                   | Clean middleware composition     |
| Edge/Multi-Runtime | Hono                  | Native edge support              |
| TypeScript-First   | Hono or Fastify       | Best TypeScript integration      |
| Quick Prototyping  | Express               | Most documentation/examples      |

---

## Risk Assessment and Mitigation

### Technical Risks

| Risk                                 | Probability | Impact | Mitigation                                          |
| ------------------------------------ | ----------- | ------ | --------------------------------------------------- |
| Framework API breaking changes       | Medium      | High   | Pin dependency versions, abstract framework APIs    |
| Streaming incompatibilities          | Medium      | Medium | Test streaming early, have fallback implementations |
| Performance regressions              | Low         | Medium | Benchmark continuously, profile hotspots            |
| TypeScript type conflicts            | Medium      | Low    | Use strict typing, test type exports                |
| Memory leaks in long-running servers | Low         | High   | Load test extensively, implement proper cleanup     |

### Operational Risks

| Risk                          | Probability | Impact | Mitigation                                                |
| ----------------------------- | ----------- | ------ | --------------------------------------------------------- |
| Optional dependency conflicts | Medium      | Medium | Use peer dependencies, document requirements              |
| Bundle size increase          | Medium      | Low    | Use dynamic imports, tree-shaking                         |
| Documentation lag             | High        | Medium | Write docs alongside code, review before release          |
| Backward compatibility        | Low         | High   | Version major releases properly, provide migration guides |

### Mitigation Strategies

1. **Abstraction Layer**: The `BaseServerAdapter` abstraction insulates users from framework-specific changes
2. **Dynamic Imports**: All framework-specific code uses dynamic imports to minimize bundle impact
3. **Comprehensive Testing**: Unit, integration, and E2E tests catch issues early
4. **Version Pinning**: Specify exact versions for framework dependencies in documentation
5. **Graceful Degradation**: Adapters fail gracefully with clear error messages

---

## AI SDK Streaming Protocol

Based on research into Vercel AI SDK's streaming patterns, NeuroLink server adapters should implement the **Data Stream Protocol** for maximum frontend compatibility.

### Data Stream Protocol Overview

The AI SDK uses Server-Sent Events (SSE) format with several advantages:

| Feature                  | Benefit                             |
| ------------------------ | ----------------------------------- |
| Improved standardization | Consistent format across clients    |
| Keep-alive through ping  | Prevents connection timeouts        |
| Reconnect capabilities   | Automatic recovery from disconnects |
| Better cache handling    | CDN-friendly streaming              |

### Text Streaming Pattern

Text content uses a start/delta/end pattern:

```typescript
// Server-Sent Event format
// text-start: {"id": "text-1"}
// text-delta: {"id": "text-1", "delta": "Hello "}
// text-delta: {"id": "text-1", "delta": "world!"}
// text-end: {"id": "text-1"}
```

### Implementation for NeuroLink Server Adapters

```typescript
// In /src/lib/server/streaming/dataStream.ts

type DataStreamOptions = {
  contentType: "text" | "tool-call" | "tool-result" | "data" | "error";
};

export class DataStreamResponse {
  private encoder = new TextEncoder();

  constructor(
    private stream: ReadableStream,
    private options: { headers?: Record<string, string> } = {},
  ) {}

  toResponse(): Response {
    return new Response(this.stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "x-vercel-ai-ui-message-stream": "v1",
        ...this.options.headers,
      },
    });
  }
}

export function createDataStream(options: {
  execute: (dataStream: DataStreamWriter) => Promise<void>;
}): DataStreamResponse {
  const { readable, writable } = new TransformStream();
  const writer = new DataStreamWriter(writable.getWriter());

  options.execute(writer).finally(() => writer.close());

  return new DataStreamResponse(readable);
}

export class DataStreamWriter {
  constructor(private writer: WritableStreamDefaultWriter) {}

  async writeTextStart(id: string): Promise<void> {
    await this.write({ event: "text-start", data: { id } });
  }

  async writeTextDelta(id: string, delta: string): Promise<void> {
    await this.write({ event: "text-delta", data: { id, delta } });
  }

  async writeTextEnd(id: string): Promise<void> {
    await this.write({ event: "text-end", data: { id } });
  }

  async writeToolCall(toolCall: ToolCallData): Promise<void> {
    await this.write({ event: "tool-call", data: toolCall });
  }

  async writeToolResult(toolResult: ToolResultData): Promise<void> {
    await this.write({ event: "tool-result", data: toolResult });
  }

  async writeData(data: unknown): Promise<void> {
    await this.write({ event: "data", data });
  }

  async writeError(error: { message: string; code?: string }): Promise<void> {
    await this.write({ event: "error", data: error });
  }

  private async write(event: { event: string; data: unknown }): Promise<void> {
    const formatted = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
    await this.writer.write(new TextEncoder().encode(formatted));
  }

  async close(): Promise<void> {
    await this.writer.close();
  }
}
```

### Custom Backend Integration Header

For non-AI-SDK frontends, set the `x-vercel-ai-ui-message-stream` header to `v1`:

```typescript
// Express/Fastify/Koa example
res.setHeader("x-vercel-ai-ui-message-stream", "v1");
res.setHeader("Content-Type", "text/event-stream");
```

### Stream Types Support

| Stream Type          | Description                     | Implementation Priority |
| -------------------- | ------------------------------- | ----------------------- |
| **Text Stream**      | Plain text chunks for responses | High - Phase 2          |
| **Data Stream**      | Structured data with metadata   | High - Phase 2          |
| **Tool Call Stream** | Tool invocation events          | Medium - Phase 3        |
| **Object Stream**    | Partial JSON objects            | Medium - Phase 4        |

---

## Mastra Server Architecture

Based on research into Mastra's architecture, NeuroLink should adopt Hono as the primary server framework with a multi-framework abstraction layer.

### Mastra's Hono-Based Pattern

Mastra uses Hono for its HTTP server implementation in `packages/core/src/server/`:

```
mastra/packages/core/src/server/
├── index.ts           # Hono app initialization
├── routes/            # Route handlers
│   ├── agents.ts      # /api/agents/*
│   ├── workflows.ts   # /api/workflows/*
│   └── tools.ts       # /api/tools/*
├── middleware/        # Custom middleware
└── handlers/          # Request handlers
```

### Key Patterns to Adopt

#### 1. Central Orchestrator Integration

```typescript
// Server adapter receives Mastra/NeuroLink instance
class ServerAdapter {
  constructor(
    private neurolink: NeuroLink,
    private config: ServerAdapterConfig,
  ) {
    // Access all components through central instance
    this.toolRegistry = neurolink.getToolRegistry();
    this.memory = neurolink.getConversationMemory();
    this.externalServers = neurolink.getExternalServerManager();
  }
}
```

#### 2. Event-Driven Architecture

```typescript
// Mastra uses pub/sub for loose coupling
server.on("request:start", ({ requestId, path }) => {
  logger.info(`Request ${requestId} started: ${path}`);
});

server.on("request:error", ({ requestId, error }) => {
  logger.error(`Request ${requestId} failed:`, error);
});

server.on("agent:response", ({ agentId, response }) => {
  // Telemetry integration
  telemetry.trackAgentResponse(agentId, response);
});
```

#### 3. Automatic OpenAPI Generation

Mastra auto-generates OpenAPI specs from route definitions:

```typescript
// Route definition with schema
const agentRoute = {
  method: "POST",
  path: "/api/agents/:agentId/generate",
  schema: {
    params: z.object({ agentId: z.string() }),
    body: z.object({
      prompt: z.string(),
      options: z
        .object({
          temperature: z.number().optional(),
          maxTokens: z.number().optional(),
        })
        .optional(),
    }),
    response: z.object({
      content: z.string(),
      usage: z.object({
        promptTokens: z.number(),
        completionTokens: z.number(),
      }),
    }),
  },
  handler: agentGenerateHandler,
};

// OpenAPI spec auto-generated from schema
```

### Hono-First Design Rationale

| Aspect        | Hono                        | Express/Fastify/Koa |
| ------------- | --------------------------- | ------------------- |
| Edge Runtime  | Native support              | Limited/No          |
| Bundle Size   | ~14KB                       | 200KB+              |
| TypeScript    | Native                      | External types      |
| Performance   | ~60K req/s                  | 15-50K req/s        |
| Multi-Runtime | Bun, Deno, CF Workers, Node | Node primarily      |

### Recommended Architecture

```
src/lib/server/
├── hono/                     # Primary Hono implementation
│   ├── app.ts               # Hono app factory
│   ├── routes/              # Route definitions
│   └── middleware/          # Hono middleware
├── adapters/                 # Framework adapters
│   ├── express.ts           # Express wrapper
│   ├── fastify.ts           # Fastify wrapper
│   └── koa.ts               # Koa wrapper
├── streaming/               # Streaming utilities
│   ├── dataStream.ts        # AI SDK Data Stream Protocol
│   └── sse.ts               # SSE helpers
└── openapi/                 # OpenAPI generation
```

---

## Build System Lessons

Based on NeuroLink's build system evolution history, the following lessons should inform server adapter implementation:

### Key Lessons from NeuroLink History

#### 1. Start with Separate TypeScript Configs

The CLI build benefited from `tsconfig.cli.json`. Server adapters should follow this pattern:

```json
// tsconfig.server.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/server",
    "rootDir": "./src",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true
  },
  "include": ["src/lib/server/**/*.ts"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}
```

#### 2. Dynamic Imports for Optional Dependencies

NeuroLink uses dynamic imports for providers to avoid circular dependencies. Apply this to server frameworks:

```typescript
// Good: Dynamic import for optional frameworks
export class ServerAdapterFactory {
  static async create(options: {
    framework: ServerFramework;
  }): Promise<BaseServerAdapter> {
    switch (options.framework) {
      case "hono":
        const { HonoServerAdapter } = await import("./adapters/honoAdapter.js");
        return new HonoServerAdapter(options);
      case "express":
        const { ExpressServerAdapter } = await import(
          "./adapters/expressAdapter.js"
        );
        return new ExpressServerAdapter(options);
      // ...
    }
  }
}
```

#### 3. ESM Compatibility is Critical

NeuroLink required Node.js 20+ for ESM compatibility. Server adapters must:

- Use `"type": "module"` in package.json
- Use `.js` extensions in imports
- Support `moduleResolution: "NodeNext"`

```typescript
// Correct ESM imports
import { createTool } from "../tools/index.js";
import type { ServerConfig } from "../types/server.js";
```

#### 4. Build Validation is Essential

Add server-specific build validations:

```javascript
// scripts/server-validations.cjs
module.exports = {
  validateServerBuild() {
    // Check all adapters compile
    // Verify exports are correct
    // Ensure optional dependencies don't break build
  },
};
```

#### 5. Vitest Integration Pattern

Follow the existing Vitest configuration for server tests:

```typescript
// vitest.config.server.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/lib/server/**/*.test.ts", "test/server/**/*.test.ts"],
    setupFiles: ["./test/server/setup.ts"],
    testTimeout: 30000,
    coverage: {
      include: ["src/lib/server/**/*"],
      thresholds: {
        "src/lib/server/**/*": {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
  },
});
```

### Build Scripts to Add

```json
{
  "scripts": {
    "build:server": "tsc --project tsconfig.server.json",
    "test:server": "vitest run --config vitest.config.server.ts",
    "validate:server": "node scripts/server-validations.cjs"
  }
}
```

---

## Updated Framework Priority

Based on research findings, the framework implementation priority should be updated:

### Revised Priority Order

| Priority         | Framework | Rationale                                                     |
| ---------------- | --------- | ------------------------------------------------------------- |
| **1 (Critical)** | Hono      | Edge-native, multi-runtime, Mastra's choice, best performance |
| **2 (High)**     | Express   | Largest ecosystem, enterprise adoption, migration path        |
| **3 (Medium)**   | Fastify   | Performance-focused Node.js teams, schema validation          |
| **4 (Lower)**    | Koa       | Minimalist teams, specific middleware requirements            |

### Rationale for Hono as Primary

1. **Edge Runtime Support**: Native support for Cloudflare Workers, Vercel Edge, Deno Deploy
2. **Mastra Alignment**: Following proven patterns from Mastra's architecture
3. **AI SDK Compatibility**: Better streaming support for AI SDK Data Stream Protocol
4. **Future-Proof**: Multi-runtime support (Bun, Deno, Node.js)
5. **Performance**: Fastest benchmarks among all frameworks
6. **TypeScript-Native**: No external type definitions needed

### Implementation Phase Updates

| Phase   | Original        | Updated                               |
| ------- | --------------- | ------------------------------------- |
| Phase 2 | Express Adapter | **Hono Adapter** (moved from Phase 5) |
| Phase 3 | Fastify Adapter | Express Adapter (moved from Phase 2)  |
| Phase 4 | Koa Adapter     | Fastify Adapter (moved from Phase 3)  |
| Phase 5 | Hono Adapter    | Koa Adapter (moved from Phase 4)      |

---

## Edge Runtime Considerations

Server adapters must support edge runtimes for modern deployment patterns.

### Supported Edge Runtimes

| Runtime            | Provider   | Hono Support | Node.js APIs           |
| ------------------ | ---------- | ------------ | ---------------------- |
| Cloudflare Workers | Cloudflare | Native       | Limited (Web APIs)     |
| Vercel Edge        | Vercel     | Native       | Limited (Edge Runtime) |
| Deno Deploy        | Deno       | Native       | Deno APIs              |
| Fastly Compute     | Fastly     | Native       | Limited                |
| Netlify Edge       | Netlify    | Native       | Limited                |

### Edge vs Node.js Feature Matrix

| Feature         | Edge Runtimes     | Node.js      |
| --------------- | ----------------- | ------------ |
| File System     | No                | Yes          |
| Native Modules  | No                | Yes          |
| WebSocket       | Yes (some)        | Yes          |
| SSE Streaming   | Yes               | Yes          |
| Request Timeout | Platform-specific | Configurable |
| Cold Start      | ~50ms             | ~500ms+      |
| Memory Limit    | 128MB typical     | Configurable |
| Execution Time  | 30s-60s           | Unlimited    |

### Edge-Compatible Patterns

#### 1. Avoid Node.js-Specific APIs

```typescript
// Bad: Node.js-specific
import fs from "fs";
import path from "path";

// Good: Web-standard APIs
const response = await fetch(url);
const data = await response.json();
```

#### 2. Use Web Crypto API

```typescript
// Bad: Node.js crypto
import crypto from "crypto";
const hash = crypto.createHash("sha256").update(data).digest("hex");

// Good: Web Crypto
const hashBuffer = await crypto.subtle.digest("SHA-256", data);
const hash = Array.from(new Uint8Array(hashBuffer))
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");
```

#### 3. Environment Detection

```typescript
// In /src/lib/server/utils/runtime.ts

export function detectRuntime(): "edge" | "node" | "bun" | "deno" {
  if (typeof Deno !== "undefined") return "deno";
  if (typeof Bun !== "undefined") return "bun";
  if (typeof EdgeRuntime !== "undefined") return "edge";
  if (typeof process !== "undefined" && process.versions?.node) return "node";
  return "edge"; // Default to edge for unknown environments
}

export function isEdgeRuntime(): boolean {
  return ["edge", "deno"].includes(detectRuntime());
}
```

### Hono Multi-Runtime Support

```typescript
// In /src/lib/server/adapters/honoAdapter.ts

export class HonoServerAdapter extends BaseServerAdapter {
  public async start(): Promise<void> {
    const runtime = detectRuntime();

    switch (runtime) {
      case "bun":
        this.server = Bun.serve({
          port: this.config.port,
          hostname: this.config.host,
          fetch: this.app.fetch,
        });
        break;

      case "deno":
        // Deno.serve is available globally
        this.server = Deno.serve(
          {
            port: this.config.port,
            hostname: this.config.host,
          },
          this.app.fetch,
        );
        break;

      case "node":
        const { serve } = await import("@hono/node-server");
        this.server = serve({
          fetch: this.app.fetch,
          port: this.config.port,
          hostname: this.config.host,
        });
        break;

      case "edge":
        // Edge runtimes don't need explicit server start
        // The platform handles request routing
        this.emit("started", { port: 0, runtime: "edge" });
        return;
    }

    this.emit("started", { port: this.config.port, runtime });
  }
}
```

### Cloudflare Workers Deployment

```typescript
// cloudflare-worker.ts
import {
  HonoServerAdapter,
  ServerAdapterFactory,
} from "@juspay/neurolink/server";

const neurolink = new NeuroLink({
  // Cloudflare-compatible configuration
  // No file system access, no native modules
});

const server = await ServerAdapterFactory.create({
  framework: "hono",
  neurolink,
  config: {
    // Edge-optimized settings
    cors: { enabled: true },
  },
});

// Export for Cloudflare Workers
export default {
  fetch: server.getFrameworkInstance().fetch,
};
```

### Vercel Edge Function

```typescript
// app/api/chat/route.ts
import { NeuroLink } from "@juspay/neurolink";
import { createDataStream } from "@juspay/neurolink/server";

export const runtime = "edge";

export async function POST(req: Request) {
  const neurolink = new NeuroLink({
    // Edge-compatible config
  });

  const { messages } = await req.json();

  return createDataStream({
    execute: async (dataStream) => {
      const stream = await neurolink.stream({
        input: messages,
        provider: "openai",
      });

      for await (const chunk of stream) {
        dataStream.writeTextDelta("msg-1", chunk.text);
      }
      dataStream.writeTextEnd("msg-1");
    },
  }).toResponse();
}
```

### Edge Limitations and Workarounds

| Limitation                     | Workaround                                 |
| ------------------------------ | ------------------------------------------ |
| No file system                 | Use KV storage, R2, or external APIs       |
| No native modules              | Use WASM or pure JS alternatives           |
| Memory limits                  | Stream large responses, paginate results   |
| Execution time                 | Use Durable Objects for long-running tasks |
| No WebSockets (some platforms) | Use SSE for real-time communication        |

---

## References

- **Source Document**: `/docs/mastra-features-implementation/11-server-adapters.md`
- **Architecture Patterns**: `/docs/mastra-features-implementation/00-neurolink-architecture-patterns.md`
- **Provider Implementation Patterns**: `/docs/mastra-features-implementation/patterns/04-provider-implementation-patterns.md`
- **Existing Server Example**: `/examples/projects/chat-app/src/server.ts`
- **MCP Tool Registry**: `/src/lib/mcp/toolRegistry.ts`
- **External Server Manager**: `/src/lib/mcp/externalServerManager.ts`

### Research Documents

- **AI SDK Research**: `/docs/mastra-features-implementation/research/online/10-ai-sdk-research.md`
- **Build System Evolution**: `/docs/mastra-features-implementation/research/git-history/10-build-system-evolution.md`
- **Mastra Architecture Research**: `/docs/mastra-features-implementation/research/online/01-mastra-architecture-research.md`

### External Documentation

- **Hono**: https://hono.dev
- **Express**: https://expressjs.com
- **Fastify**: https://fastify.dev
- **Koa**: https://koajs.com
- **OpenAPI 3.1**: https://spec.openapis.org/oas/v3.1.0
- **Vercel AI SDK**: https://ai-sdk.dev
- **Mastra Framework**: https://mastra.ai/docs
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Vercel Edge Functions**: https://vercel.com/docs/functions/edge-functions

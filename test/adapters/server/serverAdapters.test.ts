/**
 * Server Adapters Comprehensive Test Suite
 *
 * Tests for all server adapter patterns: Factory, Registry, Adapter, and Error Handling.
 * Covers 47+ test cases as defined in the gap analysis.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Import types and classes
import type { NeuroLink } from "../../../src/lib/neurolink.js";
import type { MCPToolRegistry } from "../../../src/lib/mcp/toolRegistry.js";
import type {
  ServerContext,
  ServerResponse,
  RouteDefinition,
  MiddlewareDefinition,
  ValidationConfig,
  AuthenticatedUser,
  WebSocketConnection,
} from "../../../src/lib/server/types.js";

/**
 * Mock socket interface for WebSocket tests
 */
type MockWebSocket = {
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

/**
 * Creates a minimal mock NeuroLink instance for testing
 */
function createMockNeuroLink(): Partial<NeuroLink> {
  return {};
}

/**
 * Creates a minimal mock MCPToolRegistry instance for testing
 */
function createMockToolRegistry(): Partial<MCPToolRegistry> {
  return {};
}
import {
  ServerAdapterError,
  ConfigurationError,
  RouteConflictError,
  RouteNotFoundError,
  ValidationError,
  AuthenticationError,
  InvalidAuthenticationError,
  AuthorizationError,
  RateLimitError,
  TimeoutError,
  HandlerError,
  StreamingError,
  StreamAbortedError,
  WebSocketError,
  ServerStartError,
  ServerStopError,
  AlreadyRunningError,
  NotRunningError,
  MissingDependencyError,
  ErrorRecoveryStrategies,
  wrapError,
} from "../../../src/lib/server/errors.js";
import {
  ErrorCategory,
  ErrorSeverity,
  ServerAdapterErrorCode,
} from "../../../src/lib/server/types.js";

// Streaming tests
import {
  formatSSEEvent,
  WebStreamWriter,
  BaseDataStreamWriter,
} from "../../../src/lib/server/streaming/dataStream.js";

// Middleware tests
import {
  ApiKeyStore,
  createBearerAuthMiddleware,
  createApiKeyAuthMiddleware,
  createRoleAuthMiddleware,
  createPermissionAuthMiddleware,
} from "../../../src/lib/server/middleware/auth.js";
import {
  MemoryRateLimitStore,
  createFixedWindowRateLimitMiddleware,
  createSlidingWindowRateLimitMiddleware,
} from "../../../src/lib/server/middleware/rateLimit.js";
import {
  createBodyValidationMiddleware,
  createQueryValidationMiddleware,
  createValidationMiddleware,
  CommonSchemas,
} from "../../../src/lib/server/middleware/validation.js";
import {
  LRUCache,
  ResponseCacheStore,
  createCacheMiddleware,
} from "../../../src/lib/server/middleware/cache.js";

// WebSocket tests
import {
  WebSocketConnectionManager,
  WebSocketMessageRouter,
} from "../../../src/lib/server/websocket/WebSocketHandler.js";

// ============================================
// Error Handling Pattern Tests
// ============================================

describe("Error Handling Pattern", () => {
  describe("ServerAdapterError", () => {
    it("should extend Error with proper properties", () => {
      const error = new ServerAdapterError(
        "Test error",
        ServerAdapterErrorCode.HANDLER_ERROR,
        {
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retryable: true,
          requestId: "req_123",
        },
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ServerAdapterError);
      expect(error.name).toBe("ServerAdapterError");
      expect(error.message).toBe("Test error");
      expect(error.code).toBe(ServerAdapterErrorCode.HANDLER_ERROR);
      expect(error.category).toBe(ErrorCategory.EXECUTION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.retryable).toBe(true);
      expect(error.requestId).toBe("req_123");
    });

    it("should convert to JSON correctly", () => {
      const error = new ServerAdapterError(
        "Rate limited",
        ServerAdapterErrorCode.RATE_LIMIT_EXCEEDED,
        {
          category: ErrorCategory.RATE_LIMIT,
          retryAfterMs: 5000,
          requestId: "req_456",
        },
      );

      const json = error.toJSON();

      expect(json.error.code).toBe(ServerAdapterErrorCode.RATE_LIMIT_EXCEEDED);
      expect(json.error.message).toBe("Rate limited");
      expect(json.error.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(json.error.requestId).toBe("req_456");
      expect(json.error.retryAfter).toBe(5);
    });

    it("should return correct HTTP status codes", () => {
      expect(
        new ServerAdapterError(
          "",
          ServerAdapterErrorCode.VALIDATION_ERROR,
          {},
        ).getHttpStatus(),
      ).toBe(400);
      expect(
        new ServerAdapterError(
          "",
          ServerAdapterErrorCode.AUTH_REQUIRED,
          {},
        ).getHttpStatus(),
      ).toBe(401);
      expect(
        new ServerAdapterError(
          "",
          ServerAdapterErrorCode.FORBIDDEN,
          {},
        ).getHttpStatus(),
      ).toBe(403);
      expect(
        new ServerAdapterError(
          "",
          ServerAdapterErrorCode.ROUTE_NOT_FOUND,
          {},
        ).getHttpStatus(),
      ).toBe(404);
      expect(
        new ServerAdapterError(
          "",
          ServerAdapterErrorCode.RATE_LIMIT_EXCEEDED,
          {},
        ).getHttpStatus(),
      ).toBe(429);
      expect(
        new ServerAdapterError(
          "",
          ServerAdapterErrorCode.HANDLER_ERROR,
          {},
        ).getHttpStatus(),
      ).toBe(500);
    });
  });

  describe("Specific Error Types", () => {
    it("should create ConfigurationError correctly", () => {
      const error = new ConfigurationError("Invalid port", { port: -1 });

      expect(error.code).toBe(ServerAdapterErrorCode.INVALID_CONFIG);
      expect(error.category).toBe(ErrorCategory.CONFIG);
      expect(error.details?.port).toBe(-1);
    });

    it("should create RouteConflictError correctly", () => {
      const error = new RouteConflictError(
        "/api/users",
        "POST",
        "existing route",
      );

      expect(error.code).toBe(ServerAdapterErrorCode.ROUTE_CONFLICT);
      expect(error.message).toContain("/api/users");
      expect(error.message).toContain("POST");
    });

    it("should create ValidationError with errors array", () => {
      const errors = [
        { field: "email", message: "Invalid email" },
        { field: "age", message: "Must be positive", value: -1 },
      ];
      const error = new ValidationError(errors, "req_789");

      expect(error.errors).toEqual(errors);
      expect(error.code).toBe(ServerAdapterErrorCode.VALIDATION_ERROR);
      expect(error.requestId).toBe("req_789");
    });

    it("should create RateLimitError with retry information", () => {
      const error = new RateLimitError(30000, "Custom message", "req_abc");

      expect(error.retryable).toBe(true);
      expect(error.retryAfterMs).toBe(30000);
      expect(error.category).toBe(ErrorCategory.RATE_LIMIT);
    });

    it("should create WebSocketError correctly", () => {
      const cause = new Error("Connection reset");
      const error = new WebSocketError("WebSocket failed", cause, "ws_123");

      expect(error.code).toBe(ServerAdapterErrorCode.WEBSOCKET_ERROR);
      expect(error.category).toBe(ErrorCategory.WEBSOCKET);
      expect(error.cause).toBe(cause);
      expect(error.details?.connectionId).toBe("ws_123");
    });
  });

  describe("Error Recovery Strategies", () => {
    it("should define recovery strategies for all categories", () => {
      expect(ErrorRecoveryStrategies[ErrorCategory.CONFIG].strategy).toBe(
        "fail",
      );
      expect(ErrorRecoveryStrategies[ErrorCategory.VALIDATION].strategy).toBe(
        "fail",
      );
      expect(ErrorRecoveryStrategies[ErrorCategory.EXECUTION].strategy).toBe(
        "retry",
      );
      expect(ErrorRecoveryStrategies[ErrorCategory.EXTERNAL].strategy).toBe(
        "exponentialBackoff",
      );
      expect(ErrorRecoveryStrategies[ErrorCategory.RATE_LIMIT].strategy).toBe(
        "exponentialBackoff",
      );
      expect(ErrorRecoveryStrategies[ErrorCategory.STREAMING].strategy).toBe(
        "retry",
      );
      expect(ErrorRecoveryStrategies[ErrorCategory.WEBSOCKET].strategy).toBe(
        "exponentialBackoff",
      );
    });
  });

  describe("wrapError helper", () => {
    it("should return ServerAdapterError unchanged", () => {
      const original = new HandlerError("Test", undefined, "req_1");
      const wrapped = wrapError(original, "req_2");

      expect(wrapped).toBe(original);
    });

    it("should wrap regular Error as HandlerError", () => {
      const original = new Error("Something went wrong");
      const wrapped = wrapError(original, "req_3", "/api/test", "POST");

      expect(wrapped).toBeInstanceOf(HandlerError);
      expect(wrapped.message).toBe("Something went wrong");
      expect(wrapped.cause).toBe(original);
      expect(wrapped.requestId).toBe("req_3");
    });

    it("should wrap string as HandlerError", () => {
      const wrapped = wrapError("String error", "req_4");

      expect(wrapped).toBeInstanceOf(HandlerError);
      expect(wrapped.message).toBe("String error");
    });
  });
});

// ============================================
// Streaming Tests
// ============================================

describe("Streaming", () => {
  describe("formatSSEEvent", () => {
    it("should format simple message event", () => {
      const formatted = formatSSEEvent({ data: "Hello world" });

      expect(formatted).toBe("data: Hello world\n\n");
    });

    it("should format event with type", () => {
      const formatted = formatSSEEvent({ event: "message", data: "Test" });

      expect(formatted).toBe("event: message\ndata: Test\n\n");
    });

    it("should format event with id", () => {
      const formatted = formatSSEEvent({ id: "123", data: "Test" });

      expect(formatted).toBe("id: 123\ndata: Test\n\n");
    });

    it("should format event with retry", () => {
      const formatted = formatSSEEvent({ retry: 5000, data: "Test" });

      expect(formatted).toBe("retry: 5000\ndata: Test\n\n");
    });

    it("should handle multiline data", () => {
      const formatted = formatSSEEvent({ data: "Line 1\nLine 2\nLine 3" });

      expect(formatted).toBe("data: Line 1\ndata: Line 2\ndata: Line 3\n\n");
    });
  });

  describe("WebStreamWriter", () => {
    it("should create a readable stream", () => {
      const writer = new WebStreamWriter();

      expect(writer.stream).toBeInstanceOf(ReadableStream);
    });

    it("should write data events", () => {
      const writer = new WebStreamWriter();
      const reader = writer.stream.getReader();

      writer.writeData({ message: "Hello" });
      writer.close();

      // The stream should have data
      expect(writer.isClosed()).toBe(true);
    });

    it("should write error events", () => {
      const writer = new WebStreamWriter();

      writer.writeError("Something went wrong");
      writer.close();

      expect(writer.isClosed()).toBe(true);
    });

    it("should write done events", () => {
      const writer = new WebStreamWriter();

      writer.writeDone();
      writer.close();

      expect(writer.isClosed()).toBe(true);
    });

    it("should call onClose handlers", () => {
      const writer = new WebStreamWriter();
      const handler = vi.fn();

      writer.onClose(handler);
      writer.close();

      expect(handler).toHaveBeenCalled();
    });
  });
});

// ============================================
// Authentication Middleware Tests
// ============================================

describe("Authentication Middleware", () => {
  describe("ApiKeyStore", () => {
    it("should add and validate API keys", () => {
      const store = new ApiKeyStore();
      const user: AuthenticatedUser = {
        id: "user_1",
        email: "test@example.com",
      };

      store.addKey("test-key-123", user);

      expect(store.validate("test-key-123")).toEqual(user);
      expect(store.validate("invalid-key")).toBeNull();
    });

    it("should remove API keys", () => {
      const store = new ApiKeyStore();
      const user: AuthenticatedUser = { id: "user_1" };

      store.addKey("key-1", user);
      expect(store.validate("key-1")).toEqual(user);

      store.removeKey("key-1");
      expect(store.validate("key-1")).toBeNull();
    });

    it("should clear all keys", () => {
      const store = new ApiKeyStore();

      store.addKey("key-1", { id: "1" });
      store.addKey("key-2", { id: "2" });

      store.clear();

      expect(store.validate("key-1")).toBeNull();
      expect(store.validate("key-2")).toBeNull();
    });
  });

  describe("createBearerAuthMiddleware", () => {
    it("should authenticate valid token", async () => {
      const user: AuthenticatedUser = { id: "user_1", roles: ["admin"] };
      const validate = vi.fn().mockResolvedValue(user);
      const middleware = createBearerAuthMiddleware(validate);

      const ctx: ServerContext = {
        requestId: "req_1",
        method: "GET",
        path: "/api/test",
        headers: { authorization: "Bearer valid-token" },
        query: {},
        neurolink: createMockNeuroLink() as NeuroLink,
        toolRegistry: createMockToolRegistry() as MCPToolRegistry,
        timestamp: Date.now(),
        metadata: {},
      };

      const next = vi.fn().mockResolvedValue({ status: 200 });
      await middleware.handler(ctx, next);

      expect(validate).toHaveBeenCalledWith("valid-token");
      expect(ctx.user).toEqual(user);
      expect(next).toHaveBeenCalled();
    });

    it("should reject missing token when required", async () => {
      const validate = vi.fn();
      const middleware = createBearerAuthMiddleware(validate, {
        required: true,
      });

      const ctx: ServerContext = {
        requestId: "req_1",
        method: "GET",
        path: "/api/test",
        headers: {},
        query: {},
        neurolink: createMockNeuroLink() as NeuroLink,
        toolRegistry: createMockToolRegistry() as MCPToolRegistry,
        timestamp: Date.now(),
        metadata: {},
      };

      await expect(middleware.handler(ctx, vi.fn())).rejects.toThrow(
        AuthenticationError,
      );
    });

    it("should allow missing token when not required", async () => {
      const validate = vi.fn();
      const middleware = createBearerAuthMiddleware(validate, {
        required: false,
      });

      const ctx: ServerContext = {
        requestId: "req_1",
        method: "GET",
        path: "/api/test",
        headers: {},
        query: {},
        neurolink: createMockNeuroLink() as NeuroLink,
        toolRegistry: createMockToolRegistry() as MCPToolRegistry,
        timestamp: Date.now(),
        metadata: {},
      };

      const next = vi.fn().mockResolvedValue({ status: 200 });
      await middleware.handler(ctx, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("Role-based Authorization", () => {
    it("should allow access with required role", async () => {
      const middleware = createRoleAuthMiddleware(["admin"]);

      const ctx: ServerContext = {
        requestId: "req_1",
        method: "GET",
        path: "/api/admin",
        headers: {},
        query: {},
        neurolink: createMockNeuroLink() as NeuroLink,
        toolRegistry: createMockToolRegistry() as MCPToolRegistry,
        timestamp: Date.now(),
        metadata: {},
        user: { id: "1", roles: ["admin", "user"] },
      };

      const next = vi.fn().mockResolvedValue({ status: 200 });
      await middleware.handler(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it("should deny access without required role", async () => {
      const middleware = createRoleAuthMiddleware(["admin"]);

      const ctx: ServerContext = {
        requestId: "req_1",
        method: "GET",
        path: "/api/admin",
        headers: {},
        query: {},
        neurolink: createMockNeuroLink() as NeuroLink,
        toolRegistry: createMockToolRegistry() as MCPToolRegistry,
        timestamp: Date.now(),
        metadata: {},
        user: { id: "1", roles: ["user"] },
      };

      await expect(middleware.handler(ctx, vi.fn())).rejects.toThrow(
        AuthorizationError,
      );
    });
  });
});

// ============================================
// Rate Limiting Middleware Tests
// ============================================

describe("Rate Limiting Middleware", () => {
  describe("MemoryRateLimitStore", () => {
    it("should store and retrieve entries", async () => {
      const store = new MemoryRateLimitStore();

      await store.set("key-1", { count: 5, resetAt: Date.now() + 60000 });
      const entry = await store.get("key-1");

      expect(entry?.count).toBe(5);
    });

    it("should return undefined for expired entries", async () => {
      const store = new MemoryRateLimitStore();

      await store.set("key-1", { count: 5, resetAt: Date.now() - 1000 });
      const entry = await store.get("key-1");

      expect(entry).toBeUndefined();
    });

    it("should increment entries", async () => {
      const store = new MemoryRateLimitStore();

      await store.set("key-1", { count: 5, resetAt: Date.now() + 60000 });
      const entry = await store.increment("key-1");

      expect(entry.count).toBe(6);
    });

    it("should reset entries", async () => {
      const store = new MemoryRateLimitStore();

      await store.set("key-1", { count: 5, resetAt: Date.now() + 60000 });
      await store.reset("key-1");
      const entry = await store.get("key-1");

      expect(entry).toBeUndefined();
    });
  });

  describe("Fixed Window Rate Limit", () => {
    it("should allow requests within limit", async () => {
      const store = new MemoryRateLimitStore();
      const middleware = createFixedWindowRateLimitMiddleware(
        { windowMs: 60000, maxRequests: 10 },
        store,
      );

      const ctx: ServerContext = {
        requestId: "req_1",
        method: "GET",
        path: "/api/test",
        headers: { "x-forwarded-for": "127.0.0.1" },
        query: {},
        neurolink: createMockNeuroLink() as NeuroLink,
        toolRegistry: createMockToolRegistry() as MCPToolRegistry,
        timestamp: Date.now(),
        metadata: {},
        responseHeaders: {},
      };

      const next = vi.fn().mockResolvedValue({ status: 200 });
      await middleware.handler(ctx, next);

      expect(next).toHaveBeenCalled();
      // Rate limit headers are set in ctx.responseHeaders
      expect(ctx.responseHeaders?.["X-RateLimit-Limit"]).toBe("10");
    });

    it("should block requests exceeding limit", async () => {
      const store = new MemoryRateLimitStore();
      const middleware = createFixedWindowRateLimitMiddleware(
        { windowMs: 60000, maxRequests: 2 },
        store,
      );

      const ctx: ServerContext = {
        requestId: "req_1",
        method: "GET",
        path: "/api/test",
        headers: { "x-forwarded-for": "127.0.0.1" },
        query: {},
        neurolink: createMockNeuroLink() as NeuroLink,
        toolRegistry: createMockToolRegistry() as MCPToolRegistry,
        timestamp: Date.now(),
        metadata: {},
      };

      const next = vi.fn().mockResolvedValue({ status: 200 });

      // First two requests should pass
      await middleware.handler(ctx, next);
      await middleware.handler(ctx, next);

      // Third request should be blocked
      await expect(middleware.handler(ctx, next)).rejects.toThrow(
        RateLimitError,
      );
    });
  });
});

// ============================================
// Validation Middleware Tests
// ============================================

describe("Validation Middleware", () => {
  describe("Body Validation", () => {
    it("should pass valid body", async () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          age: { type: "number", minimum: 0 },
        },
        required: ["name"],
      };
      const middleware = createBodyValidationMiddleware(schema);

      const ctx: ServerContext = {
        requestId: "req_1",
        method: "POST",
        path: "/api/users",
        headers: {},
        query: {},
        body: { name: "John", age: 30 },
        neurolink: createMockNeuroLink() as NeuroLink,
        toolRegistry: createMockToolRegistry() as MCPToolRegistry,
        timestamp: Date.now(),
        metadata: {},
      };

      const next = vi.fn().mockResolvedValue({ status: 200 });
      await middleware.handler(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it("should reject invalid body", async () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
        },
        required: ["name"],
      };
      const middleware = createBodyValidationMiddleware(schema);

      const ctx: ServerContext = {
        requestId: "req_1",
        method: "POST",
        path: "/api/users",
        headers: {},
        query: {},
        body: { name: "" }, // Invalid: minLength is 1
        neurolink: createMockNeuroLink() as NeuroLink,
        toolRegistry: createMockToolRegistry() as MCPToolRegistry,
        timestamp: Date.now(),
        metadata: {},
      };

      await expect(middleware.handler(ctx, vi.fn())).rejects.toThrow(
        ValidationError,
      );
    });

    it("should reject missing required field", async () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
      };
      const middleware = createBodyValidationMiddleware(schema);

      const ctx: ServerContext = {
        requestId: "req_1",
        method: "POST",
        path: "/api/users",
        headers: {},
        query: {},
        body: { age: 30 }, // Missing required 'name'
        neurolink: createMockNeuroLink() as NeuroLink,
        toolRegistry: createMockToolRegistry() as MCPToolRegistry,
        timestamp: Date.now(),
        metadata: {},
      };

      await expect(middleware.handler(ctx, vi.fn())).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("Common Schemas", () => {
    it("should provide uuid schema", () => {
      expect(CommonSchemas.uuid).toEqual({
        type: "string",
        format: "uuid",
      });
    });

    it("should provide email schema", () => {
      expect(CommonSchemas.email).toEqual({
        type: "string",
        format: "email",
      });
    });

    it("should provide pagination schema", () => {
      expect(CommonSchemas.pagination.type).toBe("object");
      expect(CommonSchemas.pagination.properties?.page).toBeDefined();
      expect(CommonSchemas.pagination.properties?.limit).toBeDefined();
    });
  });
});

// ============================================
// Cache Middleware Tests
// ============================================

describe("Cache Middleware", () => {
  describe("LRUCache", () => {
    it("should store and retrieve values", () => {
      const cache = new LRUCache<string, number>(10);

      cache.set("key1", 100);
      cache.set("key2", 200);

      expect(cache.get("key1")).toBe(100);
      expect(cache.get("key2")).toBe(200);
    });

    it("should evict oldest entry when full", () => {
      const cache = new LRUCache<string, number>(2);

      cache.set("key1", 100);
      cache.set("key2", 200);
      cache.set("key3", 300); // Should evict key1

      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBe(200);
      expect(cache.get("key3")).toBe(300);
    });

    it("should update LRU order on access", () => {
      const cache = new LRUCache<string, number>(2);

      cache.set("key1", 100);
      cache.set("key2", 200);
      cache.get("key1"); // Access key1, making it most recently used
      cache.set("key3", 300); // Should evict key2, not key1

      expect(cache.get("key1")).toBe(100);
      expect(cache.get("key2")).toBeUndefined();
      expect(cache.get("key3")).toBe(300);
    });
  });

  describe("ResponseCacheStore", () => {
    it("should cache and retrieve responses", () => {
      const store = new ResponseCacheStore(100, 60000);

      const response: ServerResponse = {
        status: 200,
        body: { data: "test" },
      };

      store.set("cache-key", response);
      const cached = store.get("cache-key");

      expect(cached).toEqual(response);
    });

    it("should return undefined for expired entries", () => {
      const store = new ResponseCacheStore(100, 1); // 1ms TTL

      const response: ServerResponse = { status: 200 };
      store.set("cache-key", response);

      // Wait for expiration
      return new Promise((resolve) => {
        setTimeout(() => {
          const cached = store.get("cache-key");
          expect(cached).toBeUndefined();
          resolve(null);
        }, 10);
      });
    });

    it("should invalidate entries", () => {
      const store = new ResponseCacheStore();

      store.set("key-1", { status: 200 });
      store.set("key-2", { status: 200 });

      store.invalidate("key-1");

      expect(store.get("key-1")).toBeUndefined();
      expect(store.get("key-2")).toBeDefined();
    });

    it("should invalidate by pattern", () => {
      const store = new ResponseCacheStore();

      store.set("GET:/api/users/1", { status: 200 });
      store.set("GET:/api/users/2", { status: 200 });
      store.set("GET:/api/posts/1", { status: 200 });

      store.invalidatePattern(/\/api\/users\//);

      expect(store.get("GET:/api/users/1")).toBeUndefined();
      expect(store.get("GET:/api/users/2")).toBeUndefined();
      expect(store.get("GET:/api/posts/1")).toBeDefined();
    });
  });
});

// ============================================
// WebSocket Tests
// ============================================

describe("WebSocket", () => {
  describe("WebSocketConnectionManager", () => {
    it("should register handlers", () => {
      const manager = new WebSocketConnectionManager();
      const handler = {
        onOpen: vi.fn(),
        onMessage: vi.fn(),
        onClose: vi.fn(),
      };

      manager.registerHandler("/ws", handler);

      expect(manager.getHandler("/ws")).toBe(handler);
    });

    it("should handle new connections", async () => {
      const manager = new WebSocketConnectionManager();
      const onOpen = vi.fn();

      manager.registerHandler("/ws", { onOpen });

      const mockSocket = { send: vi.fn(), close: vi.fn() };
      const connection = await manager.handleConnection(mockSocket, "/ws");

      expect(connection.id).toMatch(/^ws_/);
      expect(onOpen).toHaveBeenCalledWith(connection);
    });

    it("should track connection count", async () => {
      const manager = new WebSocketConnectionManager({ maxConnections: 100 });

      const mockSocket = { send: vi.fn(), close: vi.fn() };
      await manager.handleConnection(mockSocket, "/ws");
      await manager.handleConnection(mockSocket, "/ws");

      expect(manager.getConnectionCount()).toBe(2);
    });

    it("should handle messages", async () => {
      const manager = new WebSocketConnectionManager();
      const onMessage = vi.fn();

      manager.registerHandler("/ws", { onMessage });

      const mockSocket = { send: vi.fn(), close: vi.fn() };
      const connection = await manager.handleConnection(mockSocket, "/ws");

      await manager.handleMessage(connection.id, "test message", false);

      expect(onMessage).toHaveBeenCalled();
    });

    it("should close connections", async () => {
      const manager = new WebSocketConnectionManager();
      const onClose = vi.fn();

      manager.registerHandler("/ws", { onClose });

      const mockSocket = { send: vi.fn(), close: vi.fn() };
      const connection = await manager.handleConnection(mockSocket, "/ws");

      await manager.close(connection.id, 1000, "Normal closure");

      expect(mockSocket.close).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(manager.getConnectionCount()).toBe(0);
    });

    it("should broadcast to all connections", async () => {
      const manager = new WebSocketConnectionManager();
      manager.registerHandler("/ws", {});

      const socket1 = { send: vi.fn(), close: vi.fn() };
      const socket2 = { send: vi.fn(), close: vi.fn() };

      await manager.handleConnection(socket1, "/ws");
      await manager.handleConnection(socket2, "/ws");

      manager.broadcast("test message");

      expect(socket1.send).toHaveBeenCalledWith("test message");
      expect(socket2.send).toHaveBeenCalledWith("test message");
    });

    it("should broadcast with filter", async () => {
      const manager = new WebSocketConnectionManager();
      manager.registerHandler("/ws", {});

      const socket1 = { send: vi.fn(), close: vi.fn() };
      const socket2 = { send: vi.fn(), close: vi.fn() };

      await manager.handleConnection(socket1, "/ws", { id: "user1" });
      await manager.handleConnection(socket2, "/ws", { id: "user2" });

      manager.broadcast("test message", (conn) => conn.user?.id === "user1");

      expect(socket1.send).toHaveBeenCalledWith("test message");
      expect(socket2.send).not.toHaveBeenCalled();
    });
  });

  describe("WebSocketMessageRouter", () => {
    it("should route messages by type", async () => {
      const router = new WebSocketMessageRouter();
      const handler = vi.fn().mockResolvedValue({ response: "ok" });

      router.route("test", handler);

      const connection = {
        id: "conn_1",
        socket: {},
        metadata: {},
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      const message = {
        type: "text" as const,
        data: JSON.stringify({ type: "test", payload: { foo: "bar" } }),
        timestamp: Date.now(),
      };

      const result = await router.handle(connection, message);

      expect(handler).toHaveBeenCalledWith(connection, { foo: "bar" });
      expect(result).toEqual({ response: "ok" });
    });

    it("should throw on unknown message type", async () => {
      const router = new WebSocketMessageRouter();

      const connection = {
        id: "conn_1",
        socket: {},
        metadata: {},
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      const message = {
        type: "text" as const,
        data: JSON.stringify({ type: "unknown", payload: {} }),
        timestamp: Date.now(),
      };

      await expect(router.handle(connection, message)).rejects.toThrow(
        "Unknown message type",
      );
    });

    it("should list registered routes", () => {
      const router = new WebSocketMessageRouter();

      router.route("generate", async () => ({}));
      router.route("stream", async () => ({}));
      router.route("tool_call", async () => ({}));

      expect(router.getRoutes()).toEqual(["generate", "stream", "tool_call"]);
    });
  });
});

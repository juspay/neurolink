/**
 * ArgumentValidators Tests
 *
 * Tests for type guards, validation functions, and context helpers.
 */

import { describe, it, expect } from "vitest";
import {
  isDynamicFunction,
  isContextAwareFunction,
  isAsyncFunction,
  getResolutionType,
  requiresContext,
  isAsyncArgument,
  isRequestContext,
  isRequestContextUser,
  isRequestContextTenant,
  isRequestContextSession,
  isDynamicResolutionContext,
  validateRequestContext,
  validateUser,
  validateTenant,
  validateSession,
  generateRequestId,
  generateSessionId,
  createRequestContext,
  createMinimalContext,
  createResolutionContext,
  assertContextProvided,
  assertDefined,
  asStatic,
  asFunction,
} from "../../src/lib/arguments/ArgumentValidators.js";
import type { DynamicArgument } from "../../src/lib/arguments/types/argumentTypes.js";

// ============================================================================
// Type Guard Tests
// ============================================================================

describe("ArgumentValidators - Type Guards", () => {
  describe("isDynamicFunction", () => {
    it("should return false for static values", () => {
      expect(isDynamicFunction("static")).toBe(false);
      expect(isDynamicFunction(123)).toBe(false);
      expect(isDynamicFunction(null)).toBe(false);
      expect(isDynamicFunction(undefined)).toBe(false);
      expect(isDynamicFunction({ key: "value" })).toBe(false);
      expect(isDynamicFunction([1, 2, 3])).toBe(false);
    });

    it("should return true for functions", () => {
      expect(isDynamicFunction(() => "value")).toBe(true);
      expect(isDynamicFunction(async () => "value")).toBe(true);
      expect(isDynamicFunction((ctx: unknown) => ctx)).toBe(true);
    });
  });

  describe("isContextAwareFunction", () => {
    it("should return false for zero-arg functions", () => {
      const syncFn = () => "value";
      const asyncFn = async () => "value";

      expect(isContextAwareFunction(syncFn)).toBe(false);
      expect(isContextAwareFunction(asyncFn)).toBe(false);
    });

    it("should return true for functions with parameters", () => {
      const contextFn = (ctx: unknown) => ctx;
      const asyncContextFn = async (ctx: unknown) => ctx;

      expect(isContextAwareFunction(contextFn)).toBe(true);
      expect(isContextAwareFunction(asyncContextFn)).toBe(true);
    });
  });

  describe("isAsyncFunction", () => {
    it("should return false for sync functions", () => {
      const syncFn = () => "value";
      expect(isAsyncFunction(syncFn)).toBe(false);
    });

    it("should return true for async functions", () => {
      const asyncFn = async () => "value";
      expect(isAsyncFunction(asyncFn)).toBe(true);
    });
  });

  describe("getResolutionType", () => {
    it("should return 'static' for non-function values", () => {
      expect(getResolutionType("value")).toBe("static");
      expect(getResolutionType(123)).toBe("static");
      expect(getResolutionType({ key: "value" })).toBe("static");
    });

    it("should return 'sync-function' for sync zero-arg functions", () => {
      expect(getResolutionType(() => "value")).toBe("sync-function");
    });

    it("should return 'async-function' for async zero-arg functions", () => {
      expect(getResolutionType(async () => "value")).toBe("async-function");
    });

    it("should return 'context-aware' for sync context functions", () => {
      expect(getResolutionType((ctx: unknown) => "value")).toBe(
        "context-aware",
      );
    });

    it("should return 'context-aware-async' for async context functions", () => {
      expect(getResolutionType(async (ctx: unknown) => "value")).toBe(
        "context-aware-async",
      );
    });
  });

  describe("requiresContext", () => {
    it("should return false for static values and zero-arg functions", () => {
      expect(requiresContext("static")).toBe(false);
      expect(requiresContext(() => "value")).toBe(false);
      expect(requiresContext(async () => "value")).toBe(false);
    });

    it("should return true for context-aware functions", () => {
      expect(requiresContext((ctx: unknown) => "value")).toBe(true);
      expect(requiresContext(async (ctx: unknown) => "value")).toBe(true);
    });
  });

  describe("isAsyncArgument", () => {
    it("should return false for static values and sync functions", () => {
      expect(isAsyncArgument("static")).toBe(false);
      expect(isAsyncArgument(() => "value")).toBe(false);
    });

    it("should return true for async functions", () => {
      expect(isAsyncArgument(async () => "value")).toBe(true);
    });
  });
});

// ============================================================================
// Context Type Guard Tests
// ============================================================================

describe("ArgumentValidators - Context Type Guards", () => {
  describe("isRequestContext", () => {
    it("should return false for invalid values", () => {
      expect(isRequestContext(null)).toBe(false);
      expect(isRequestContext(undefined)).toBe(false);
      expect(isRequestContext("string")).toBe(false);
      expect(isRequestContext({})).toBe(false);
      expect(isRequestContext({ requestId: 123 })).toBe(false);
    });

    it("should return true for valid request context", () => {
      expect(
        isRequestContext({
          requestId: "req-123",
          timestamp: Date.now(),
        }),
      ).toBe(true);

      expect(
        isRequestContext({
          requestId: "req-123",
          timestamp: Date.now(),
          user: { id: "user1" },
          tenant: { id: "tenant1" },
        }),
      ).toBe(true);
    });
  });

  describe("isRequestContextUser", () => {
    it("should return false for invalid values", () => {
      expect(isRequestContextUser(null)).toBe(false);
      expect(isRequestContextUser({})).toBe(false);
      expect(isRequestContextUser({ id: 123 })).toBe(false);
    });

    it("should return true for valid user", () => {
      expect(isRequestContextUser({ id: "user1" })).toBe(true);
      expect(
        isRequestContextUser({
          id: "user1",
          email: "user@example.com",
          roles: ["admin"],
        }),
      ).toBe(true);
    });
  });

  describe("isRequestContextTenant", () => {
    it("should return false for invalid values", () => {
      expect(isRequestContextTenant(null)).toBe(false);
      expect(isRequestContextTenant({})).toBe(false);
    });

    it("should return true for valid tenant", () => {
      expect(isRequestContextTenant({ id: "tenant1" })).toBe(true);
      expect(
        isRequestContextTenant({ id: "tenant1", plan: "enterprise" }),
      ).toBe(true);
    });
  });

  describe("isRequestContextSession", () => {
    it("should return false for invalid values", () => {
      expect(isRequestContextSession(null)).toBe(false);
      expect(isRequestContextSession({ id: "session1" })).toBe(false);
    });

    it("should return true for valid session", () => {
      expect(
        isRequestContextSession({ id: "session1", startedAt: Date.now() }),
      ).toBe(true);
    });
  });

  describe("isDynamicResolutionContext", () => {
    it("should return false for invalid values", () => {
      expect(isDynamicResolutionContext(null)).toBe(false);
      expect(isDynamicResolutionContext({})).toBe(false);
      expect(isDynamicResolutionContext({ requestContext: {} })).toBe(false);
    });

    it("should return true for valid resolution context", () => {
      expect(
        isDynamicResolutionContext({
          requestContext: {
            requestId: "req-123",
            timestamp: Date.now(),
          },
        }),
      ).toBe(true);
    });
  });
});

// ============================================================================
// Validation Function Tests
// ============================================================================

describe("ArgumentValidators - Validation Functions", () => {
  describe("validateRequestContext", () => {
    it("should return errors for invalid context", () => {
      const result = validateRequestContext({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "requestId is required and must be a string",
      );
      expect(result.errors).toContain(
        "timestamp is required and must be a number",
      );
    });

    it("should return valid for correct context", () => {
      const result = validateRequestContext({
        requestId: "req-123",
        timestamp: Date.now(),
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate nested user", () => {
      const result = validateRequestContext({
        requestId: "req-123",
        timestamp: Date.now(),
        user: { roles: "not-an-array" },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("user.id"))).toBe(true);
    });
  });

  describe("validateUser", () => {
    it("should return errors for invalid user", () => {
      const result = validateUser({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "user.id is required and must be a string",
      );
    });

    it("should validate roles as array of strings", () => {
      const result = validateUser({ id: "user1", roles: [1, 2, 3] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("user.roles must contain only strings");
    });

    it("should pass for valid user", () => {
      const result = validateUser({
        id: "user1",
        email: "user@example.com",
        roles: ["admin", "user"],
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("validateTenant", () => {
    it("should return errors for invalid tenant", () => {
      const result = validateTenant({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "tenant.id is required and must be a string",
      );
    });

    it("should warn for non-standard plan", () => {
      const result = validateTenant({ id: "tenant1", plan: "custom-plan" });
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("validateSession", () => {
    it("should return errors for invalid session", () => {
      const result = validateSession({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "session.id is required and must be a string",
      );
      expect(result.errors).toContain(
        "session.startedAt is required and must be a number",
      );
    });

    it("should warn for expired session", () => {
      const result = validateSession({
        id: "session1",
        startedAt: Date.now() - 10000,
        expiresAt: Date.now() - 5000,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain("session has expired");
    });
  });
});

// ============================================================================
// Context Creation Tests
// ============================================================================

describe("ArgumentValidators - Context Creation", () => {
  describe("generateRequestId", () => {
    it("should generate unique request IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("generateSessionId", () => {
    it("should generate unique session IDs", () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();

      expect(id1).toMatch(/^sess_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("createRequestContext", () => {
    it("should create context with defaults", () => {
      const ctx = createRequestContext();

      expect(ctx.requestId).toBeDefined();
      expect(ctx.timestamp).toBeDefined();
      expect(typeof ctx.timestamp).toBe("number");
    });

    it("should use provided values", () => {
      const ctx = createRequestContext({
        requestId: "custom-id",
        user: { id: "user1" },
        tenant: { id: "tenant1", plan: "enterprise" },
      });

      expect(ctx.requestId).toBe("custom-id");
      expect(ctx.user?.id).toBe("user1");
      expect(ctx.tenant?.plan).toBe("enterprise");
    });
  });

  describe("createMinimalContext", () => {
    it("should create minimal context", () => {
      const ctx = createMinimalContext();

      expect(ctx.requestId).toBeDefined();
      expect(ctx.timestamp).toBeDefined();
      expect(ctx.user).toBeUndefined();
      expect(ctx.tenant).toBeUndefined();
    });

    it("should use provided request ID", () => {
      const ctx = createMinimalContext("my-request-id");
      expect(ctx.requestId).toBe("my-request-id");
    });
  });

  describe("createResolutionContext", () => {
    it("should create resolution context from request context", () => {
      const requestContext = createRequestContext({ user: { id: "user1" } });
      const resolutionContext = createResolutionContext(requestContext);

      expect(resolutionContext.requestContext).toBe(requestContext);
      expect(resolutionContext.neurolink).toBeUndefined();
      expect(resolutionContext.signal).toBeUndefined();
    });

    it("should include neurolink and signal if provided", () => {
      const requestContext = createRequestContext();
      const neurolink = {
        getAvailableTools: async () => [],
        getProviderStatus: async () => true,
        getRuntimeContext: () => undefined,
      };
      const controller = new AbortController();

      const resolutionContext = createResolutionContext(
        requestContext,
        neurolink,
        controller.signal,
      );

      expect(resolutionContext.neurolink).toBe(neurolink);
      expect(resolutionContext.signal).toBe(controller.signal);
    });
  });
});

// ============================================================================
// Assertion Tests
// ============================================================================

describe("ArgumentValidators - Assertions", () => {
  describe("assertContextProvided", () => {
    it("should throw when context is undefined", () => {
      expect(() => assertContextProvided(undefined)).toThrow(
        /context required/i,
      );
    });

    it("should throw with argument name if provided", () => {
      expect(() => assertContextProvided(undefined, "testArg")).toThrow(
        /testArg/,
      );
    });

    it("should throw when requestContext is missing", () => {
      expect(() => assertContextProvided({} as never)).toThrow(
        /requestContext is required/i,
      );
    });

    it("should not throw for valid context", () => {
      const context = {
        requestContext: createRequestContext(),
      };

      expect(() => assertContextProvided(context)).not.toThrow();
    });
  });

  describe("assertDefined", () => {
    it("should throw for null", () => {
      expect(() => assertDefined(null, "testValue")).toThrow(
        "testValue is required but was null",
      );
    });

    it("should throw for undefined", () => {
      expect(() => assertDefined(undefined, "testValue")).toThrow(
        "testValue is required but was undefined",
      );
    });

    it("should not throw for defined values", () => {
      expect(() => assertDefined("value", "testValue")).not.toThrow();
      expect(() => assertDefined(0, "testValue")).not.toThrow();
      expect(() => assertDefined(false, "testValue")).not.toThrow();
      expect(() => assertDefined("", "testValue")).not.toThrow();
    });
  });
});

// ============================================================================
// Type Narrowing Tests
// ============================================================================

describe("ArgumentValidators - Type Narrowing", () => {
  describe("asStatic", () => {
    it("should return value for static arguments", () => {
      expect(asStatic("value")).toBe("value");
      expect(asStatic(123)).toBe(123);
      expect(asStatic(null)).toBeNull();
    });

    it("should return null for function arguments", () => {
      expect(asStatic(() => "value")).toBeNull();
      expect(asStatic(async () => "value")).toBeNull();
    });
  });

  describe("asFunction", () => {
    it("should return null for static arguments", () => {
      expect(asFunction("value")).toBeNull();
      expect(asFunction(123)).toBeNull();
    });

    it("should return function for function arguments", () => {
      const fn = () => "value";
      expect(asFunction(fn)).toBe(fn);

      const asyncFn = async () => "value";
      expect(asFunction(asyncFn)).toBe(asyncFn);
    });
  });
});

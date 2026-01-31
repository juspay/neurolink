/**
 * ContextResolver Tests
 *
 * Tests for AsyncLocalStorage-based request context management.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getCurrentContext,
  requireCurrentContext,
  getContextValue,
  withRequestContext,
  withUpdatedContext,
  withUser,
  withTenant,
  withSession,
  setRuntimeValue,
  getRuntimeValue,
  deleteRuntimeValue,
  hasRuntimeValue,
  RequestContextBuilder,
  createContextFromRequest,
  getContextHeaders,
  cloneContext,
  createCurrentResolutionContext,
  hasContext,
  getCurrentUserId,
  getCurrentTenantId,
  getCurrentTenantPlan,
  hasRole,
  hasPermission,
  isEnterpriseTenant,
} from "../../../src/lib/arguments/resolvers/ContextResolver.js";

// ============================================================================
// Context Access Tests
// ============================================================================

describe("ContextResolver - Context Access", () => {
  describe("getCurrentContext", () => {
    it("should return undefined outside context scope", () => {
      const ctx = getCurrentContext();
      expect(ctx).toBeUndefined();
    });

    it("should return context inside scope", async () => {
      await withRequestContext({ user: { id: "user1" } }, () => {
        const ctx = getCurrentContext();
        expect(ctx).toBeDefined();
        expect(ctx?.user?.id).toBe("user1");
      });
    });
  });

  describe("requireCurrentContext", () => {
    it("should throw outside context scope", () => {
      expect(() => requireCurrentContext()).toThrow(/no request context/i);
    });

    it("should return context inside scope", async () => {
      await withRequestContext({ user: { id: "user1" } }, () => {
        const ctx = requireCurrentContext();
        expect(ctx).toBeDefined();
        expect(ctx.user?.id).toBe("user1");
      });
    });
  });

  describe("getContextValue", () => {
    it("should return undefined outside scope", () => {
      const value = getContextValue<string>("user.id");
      expect(value).toBeUndefined();
    });

    it("should navigate nested paths", async () => {
      await withRequestContext(
        {
          user: { id: "user1", preferences: { preferredModel: "gpt-4o" } },
          tenant: { id: "tenant1", plan: "enterprise" },
        },
        () => {
          expect(getContextValue<string>("user.id")).toBe("user1");
          expect(
            getContextValue<string>("user.preferences.preferredModel"),
          ).toBe("gpt-4o");
          expect(getContextValue<string>("tenant.plan")).toBe("enterprise");
          expect(getContextValue<string>("user.nonexistent")).toBeUndefined();
        },
      );
    });
  });
});

// ============================================================================
// Context Scope Tests
// ============================================================================

describe("ContextResolver - Context Scopes", () => {
  describe("withRequestContext", () => {
    it("should run function with context", async () => {
      let capturedId: string | undefined;

      await withRequestContext({ user: { id: "user1" } }, () => {
        capturedId = getCurrentContext()?.user?.id;
      });

      expect(capturedId).toBe("user1");
    });

    it("should propagate through async operations", async () => {
      await withRequestContext({ user: { id: "user1" } }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const ctx = getCurrentContext();
        expect(ctx?.user?.id).toBe("user1");
      });
    });

    it("should isolate nested contexts", async () => {
      await withRequestContext({ user: { id: "outer" } }, async () => {
        expect(getCurrentContext()?.user?.id).toBe("outer");

        await withRequestContext({ user: { id: "inner" } }, async () => {
          expect(getCurrentContext()?.user?.id).toBe("inner");
        });

        // Should be back to outer
        expect(getCurrentContext()?.user?.id).toBe("outer");
      });
    });

    it("should return function result", async () => {
      const result = await withRequestContext({}, () => "result");
      expect(result).toBe("result");
    });

    it("should handle async function results", async () => {
      const result = await withRequestContext({}, async () => {
        await new Promise((r) => setTimeout(r, 10));
        return "async-result";
      });
      expect(result).toBe("async-result");
    });
  });

  describe("withUpdatedContext", () => {
    it("should merge with current context", async () => {
      await withRequestContext(
        { user: { id: "user1" }, tenant: { id: "tenant1" } },
        async () => {
          await withUpdatedContext(
            { tenant: { id: "tenant2", plan: "pro" } },
            () => {
              const ctx = getCurrentContext();
              expect(ctx?.user?.id).toBe("user1"); // Preserved
              expect(ctx?.tenant?.id).toBe("tenant2"); // Updated
              expect(ctx?.tenant?.plan).toBe("pro"); // Added
            },
          );
        },
      );
    });

    it("should create new context if none exists", async () => {
      await withUpdatedContext({ user: { id: "new-user" } }, () => {
        const ctx = getCurrentContext();
        expect(ctx).toBeDefined();
        expect(ctx?.user?.id).toBe("new-user");
      });
    });
  });

  describe("withUser", () => {
    it("should set user in context", async () => {
      await withUser({ id: "user1", email: "user@example.com" }, () => {
        const ctx = getCurrentContext();
        expect(ctx?.user?.id).toBe("user1");
        expect(ctx?.user?.email).toBe("user@example.com");
      });
    });

    it("should merge with existing user", async () => {
      await withRequestContext(
        { user: { id: "user1", roles: ["admin"] } },
        async () => {
          await withUser({ id: "user1", email: "new@example.com" }, () => {
            const ctx = getCurrentContext();
            expect(ctx?.user?.id).toBe("user1");
            expect(ctx?.user?.email).toBe("new@example.com");
            expect(ctx?.user?.roles).toEqual(["admin"]);
          });
        },
      );
    });
  });

  describe("withTenant", () => {
    it("should set tenant in context", async () => {
      await withTenant({ id: "tenant1", plan: "enterprise" }, () => {
        const ctx = getCurrentContext();
        expect(ctx?.tenant?.id).toBe("tenant1");
        expect(ctx?.tenant?.plan).toBe("enterprise");
      });
    });
  });

  describe("withSession", () => {
    it("should set session in context", async () => {
      const startedAt = Date.now();
      await withSession({ id: "session1", startedAt }, () => {
        const ctx = getCurrentContext();
        expect(ctx?.session?.id).toBe("session1");
        expect(ctx?.session?.startedAt).toBe(startedAt);
      });
    });
  });
});

// ============================================================================
// Runtime Values Tests
// ============================================================================

describe("ContextResolver - Runtime Values", () => {
  it("should set and get runtime values", async () => {
    await withRequestContext({}, () => {
      setRuntimeValue("key1", "value1");
      expect(getRuntimeValue<string>("key1")).toBe("value1");
    });
  });

  it("should check if runtime value exists", async () => {
    await withRequestContext({}, () => {
      expect(hasRuntimeValue("missing")).toBe(false);
      setRuntimeValue("exists", true);
      expect(hasRuntimeValue("exists")).toBe(true);
    });
  });

  it("should delete runtime values", async () => {
    await withRequestContext({}, () => {
      setRuntimeValue("toDelete", "value");
      expect(hasRuntimeValue("toDelete")).toBe(true);

      const deleted = deleteRuntimeValue("toDelete");
      expect(deleted).toBe(true);
      expect(hasRuntimeValue("toDelete")).toBe(false);
    });
  });

  it("should throw when setting value outside context", () => {
    expect(() => setRuntimeValue("key", "value")).toThrow(
      /outside of request context/i,
    );
  });

  it("should return undefined for missing value", async () => {
    await withRequestContext({}, () => {
      expect(getRuntimeValue<string>("missing")).toBeUndefined();
    });
  });
});

// ============================================================================
// Context Builder Tests
// ============================================================================

describe("ContextResolver - RequestContextBuilder", () => {
  it("should build context with fluent API", () => {
    const ctx = new RequestContextBuilder()
      .withUser({ id: "user1", email: "user@example.com" })
      .withTenant({ id: "tenant1", plan: "enterprise" })
      .withSession({ id: "session1", startedAt: Date.now() })
      .withCustom({ feature: "test" })
      .build();

    expect(ctx.user?.id).toBe("user1");
    expect(ctx.tenant?.plan).toBe("enterprise");
    expect(ctx.session?.id).toBe("session1");
    expect(ctx.custom?.feature).toBe("test");
    expect(ctx.requestId).toBeDefined();
    expect(ctx.timestamp).toBeDefined();
  });

  it("should set custom request ID", () => {
    const ctx = new RequestContextBuilder().withRequestId("custom-id").build();

    expect(ctx.requestId).toBe("custom-id");
  });

  it("should set environment", () => {
    const ctx = new RequestContextBuilder()
      .withEnvironment({ nodeEnv: "production", region: "us-east-1" })
      .build();

    expect(ctx.environment?.nodeEnv).toBe("production");
    expect(ctx.environment?.region).toBe("us-east-1");
  });

  it("should set resource", () => {
    const ctx = new RequestContextBuilder()
      .withResource("document", "doc-123")
      .build();

    expect(ctx.resource?.type).toBe("document");
    expect(ctx.resource?.id).toBe("doc-123");
  });

  it("should set single custom value", () => {
    const ctx = new RequestContextBuilder()
      .withCustomValue("key1", "value1")
      .withCustomValue("key2", "value2")
      .build();

    expect(ctx.custom?.key1).toBe("value1");
    expect(ctx.custom?.key2).toBe("value2");
  });

  it("should build resolution context", () => {
    const neurolink = {
      getAvailableTools: async () => [],
      getProviderStatus: async () => true,
      getRuntimeContext: () => undefined,
    };

    const resCtx = new RequestContextBuilder()
      .withUser({ id: "user1" })
      .buildResolutionContext(neurolink);

    expect(resCtx.requestContext.user?.id).toBe("user1");
    expect(resCtx.neurolink).toBe(neurolink);
  });
});

// ============================================================================
// HTTP Integration Tests
// ============================================================================

describe("ContextResolver - HTTP Integration", () => {
  describe("createContextFromRequest", () => {
    it("should create context from headers", () => {
      const headers = {
        "x-request-id": "req-123",
        "x-user-id": "user-456",
        "x-tenant-id": "tenant-789",
        "x-session-id": "session-abc",
      };

      const ctx = createContextFromRequest(headers);

      expect(ctx.requestId).toBe("req-123");
      expect(ctx.user?.id).toBe("user-456");
      expect(ctx.tenant?.id).toBe("tenant-789");
      expect(ctx.session?.id).toBe("session-abc");
    });

    it("should generate request ID if not provided", () => {
      const ctx = createContextFromRequest({});
      expect(ctx.requestId).toMatch(/^req_/);
    });

    it("should use custom header names", () => {
      const headers = {
        "custom-request": "custom-req-id",
        "custom-user": "custom-user-id",
      };

      const ctx = createContextFromRequest(headers, {
        requestIdHeader: "custom-request",
        userIdHeader: "custom-user",
      });

      expect(ctx.requestId).toBe("custom-req-id");
      expect(ctx.user?.id).toBe("custom-user-id");
    });

    it("should handle array header values", () => {
      const headers = {
        "x-request-id": ["first-value", "second-value"],
      };

      const ctx = createContextFromRequest(headers);
      expect(ctx.requestId).toBe("first-value");
    });
  });

  describe("getContextHeaders", () => {
    it("should return empty object outside context", () => {
      const headers = getContextHeaders();
      expect(headers).toEqual({});
    });

    it("should return context as headers", async () => {
      await withRequestContext(
        {
          requestId: "req-123",
          user: { id: "user-456" },
          tenant: { id: "tenant-789" },
          session: { id: "session-abc", startedAt: Date.now() },
        },
        () => {
          const headers = getContextHeaders();

          expect(headers["x-request-id"]).toBe("req-123");
          expect(headers["x-user-id"]).toBe("user-456");
          expect(headers["x-tenant-id"]).toBe("tenant-789");
          expect(headers["x-session-id"]).toBe("session-abc");
        },
      );
    });
  });
});

// ============================================================================
// Context Utility Tests
// ============================================================================

describe("ContextResolver - Utilities", () => {
  describe("cloneContext", () => {
    it("should return undefined outside context", () => {
      const cloned = cloneContext();
      expect(cloned).toBeUndefined();
    });

    it("should clone context with modifications", async () => {
      await withRequestContext(
        { user: { id: "user1" }, tenant: { id: "tenant1" } },
        () => {
          const cloned = cloneContext({
            tenant: { id: "tenant2", plan: "pro" },
          });

          expect(cloned?.user?.id).toBe("user1");
          expect(cloned?.tenant?.id).toBe("tenant2");
          expect(cloned?.tenant?.plan).toBe("pro");

          // Original should be unchanged
          const original = getCurrentContext();
          expect(original?.tenant?.id).toBe("tenant1");
        },
      );
    });
  });

  describe("createCurrentResolutionContext", () => {
    it("should return undefined outside context", () => {
      const resCtx = createCurrentResolutionContext();
      expect(resCtx).toBeUndefined();
    });

    it("should create resolution context from current", async () => {
      const neurolink = {
        getAvailableTools: async () => [],
        getProviderStatus: async () => true,
        getRuntimeContext: () => undefined,
      };

      await withRequestContext({ user: { id: "user1" } }, () => {
        const resCtx = createCurrentResolutionContext(neurolink);

        expect(resCtx).toBeDefined();
        expect(resCtx?.requestContext.user?.id).toBe("user1");
        expect(resCtx?.neurolink).toBe(neurolink);
      });
    });
  });

  describe("hasContext", () => {
    it("should return false outside context", () => {
      expect(hasContext()).toBe(false);
    });

    it("should return true inside context", async () => {
      await withRequestContext({}, () => {
        expect(hasContext()).toBe(true);
      });
    });
  });

  describe("getCurrentUserId", () => {
    it("should return undefined outside context", () => {
      expect(getCurrentUserId()).toBeUndefined();
    });

    it("should return user ID inside context", async () => {
      await withRequestContext({ user: { id: "user1" } }, () => {
        expect(getCurrentUserId()).toBe("user1");
      });
    });
  });

  describe("getCurrentTenantId", () => {
    it("should return tenant ID", async () => {
      await withRequestContext({ tenant: { id: "tenant1" } }, () => {
        expect(getCurrentTenantId()).toBe("tenant1");
      });
    });
  });

  describe("getCurrentTenantPlan", () => {
    it("should return tenant plan", async () => {
      await withRequestContext(
        { tenant: { id: "t1", plan: "enterprise" } },
        () => {
          expect(getCurrentTenantPlan()).toBe("enterprise");
        },
      );
    });
  });

  describe("hasRole", () => {
    it("should check user roles", async () => {
      await withRequestContext(
        { user: { id: "u1", roles: ["admin", "user"] } },
        () => {
          expect(hasRole("admin")).toBe(true);
          expect(hasRole("user")).toBe(true);
          expect(hasRole("superadmin")).toBe(false);
        },
      );
    });
  });

  describe("hasPermission", () => {
    it("should check user permissions", async () => {
      await withRequestContext(
        { user: { id: "u1", permissions: ["read", "write"] } },
        () => {
          expect(hasPermission("read")).toBe(true);
          expect(hasPermission("delete")).toBe(false);
        },
      );
    });
  });

  describe("isEnterpriseTenant", () => {
    it("should check enterprise plan", async () => {
      await withRequestContext(
        { tenant: { id: "t1", plan: "enterprise" } },
        () => {
          expect(isEnterpriseTenant()).toBe(true);
        },
      );

      await withRequestContext({ tenant: { id: "t1", plan: "pro" } }, () => {
        expect(isEnterpriseTenant()).toBe(false);
      });
    });
  });
});

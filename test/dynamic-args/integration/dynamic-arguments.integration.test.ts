/**
 * Dynamic Arguments Integration Tests
 *
 * Comprehensive integration tests for NeuroLink's Dynamic Arguments system,
 * validating runtime resolution patterns, multi-level caching, AsyncLocalStorage
 * context propagation, argument validation, and dependency injection.
 *
 * @module test/dynamic-args/integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  // Core resolution utilities
  resolveDynamicArgument,
  resolveDynamicArguments,
  resolveDynamicConfig,
  memoizeDynamicArgument,
  withFallback,
  conditional,
  mapDynamicArgument,
  combineDynamicArguments,
  hasDynamicArgument,
  hasDynamicProperties,
  clearResolutionCache,
  getResolutionCacheStats,
  destroyResolver,

  // Type guards
  isDynamicFunction,
  isContextAwareFunction,

  // Request context system
  createRequestContext,
  withRequestContext,
  getCurrentContext,
  requireContext,
  hasContext,
  updateCurrentContext,
  setRuntimeValue,
  getRuntimeValue,
  deleteRuntimeValue,
  clearRuntimeValues,
  createResolutionContext,
  createResolutionContextFromRequest,
  createContextFromRequest,
  RequestContextBuilder,
  createChildContext,
  withChildContext,

  // Caching system
  DynamicCache,
  dynamicCache,
  createCacheKey,
  createStrategyCacheKey,
  withCache,
  invalidateCachePattern,

  // Environment variable utilities
  interpolateEnvVars,
  fromEnv,
  envVar,
  envSwitch,
  envJson,
  envNumber,
  envBoolean,
  envList,

  // Types
  type DynamicArgument,
  type DynamicResolutionContext,
  type RequestContext,
  type ResolutionOptions,
  type CacheStrategy,
} from "../../../src/lib/dynamic/index.js";

// =============================================================================
// TEST SUITE 1: RUNTIME RESOLUTION PATTERNS
// =============================================================================

describe("Dynamic Arguments - Runtime Resolution Patterns", () => {
  afterEach(() => {
    clearResolutionCache();
  });

  describe("Static Value Resolution", () => {
    it("should resolve static string values", async () => {
      const arg: DynamicArgument<string> = "gpt-4o";
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("gpt-4o");
      expect(result.resolutionType).toBe("static");
      expect(result.fromCache).toBe(false);
    });

    it("should resolve static number values", async () => {
      const arg: DynamicArgument<number> = 0.7;
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe(0.7);
      expect(result.resolutionType).toBe("static");
    });

    it("should resolve static object values", async () => {
      const config = { model: "gpt-4o", temperature: 0.5 };
      const arg: DynamicArgument<typeof config> = config;
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toEqual(config);
      expect(result.resolutionType).toBe("static");
    });

    it("should resolve static array values", async () => {
      const tools = ["read_file", "write_file", "list_directory"];
      const arg: DynamicArgument<string[]> = tools;
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toEqual(tools);
      expect(result.resolutionType).toBe("static");
    });
  });

  describe("Sync Function Resolution", () => {
    it("should resolve synchronous function values", async () => {
      const arg: DynamicArgument<string> = () => "claude-3-sonnet";
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("claude-3-sonnet");
      expect(result.resolutionType).toBe("sync-function");
    });

    it("should resolve sync function with closure", async () => {
      const modelPrefix = "gpt";
      const arg: DynamicArgument<string> = () => `${modelPrefix}-4o`;
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("gpt-4o");
    });

    it("should resolve sync function reading environment", async () => {
      process.env.TEST_MODEL = "test-model-123";
      const arg: DynamicArgument<string> = () =>
        process.env.TEST_MODEL || "default";
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("test-model-123");
      delete process.env.TEST_MODEL;
    });
  });

  describe("Async Function Resolution", () => {
    it("should resolve async function values", async () => {
      const arg: DynamicArgument<string> = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async-model";
      };
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("async-model");
      expect(result.resolutionType).toBe("async-function");
    });

    it("should handle async function with external API simulation", async () => {
      const fetchConfig = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { model: "fetched-model", temperature: 0.8 };
      };

      const arg: DynamicArgument<string> = async () => {
        const config = await fetchConfig();
        return config.model;
      };

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe("fetched-model");
    });

    it("should respect timeout option", async () => {
      const slowArg: DynamicArgument<string> = async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return "slow-result";
      };

      await expect(
        resolveDynamicArgument(slowArg, undefined, { timeout: 100 }),
      ).rejects.toThrow(/timed out/);
    });
  });

  describe("Context-Aware Function Resolution", () => {
    it("should resolve context-aware function with user context", async () => {
      const arg: DynamicArgument<string> = ({ requestContext }) =>
        requestContext.user?.preferences?.preferredModel || "default-model";

      const context: DynamicResolutionContext = {
        requestContext: {
          requestId: "test-req-1",
          timestamp: Date.now(),
          user: {
            id: "user-123",
            preferences: {
              preferredModel: "claude-3-opus",
            },
          },
        },
      };

      const result = await resolveDynamicArgument(arg, context);
      expect(result.value).toBe("claude-3-opus");
      expect(result.resolutionType).toBe("context-aware");
    });

    it("should resolve context-aware function with tenant context", async () => {
      const arg: DynamicArgument<string> = ({ requestContext }) => {
        if (requestContext.tenant?.plan === "enterprise") {
          return "claude-3-opus";
        }
        return "claude-3-sonnet";
      };

      const enterpriseContext: DynamicResolutionContext = {
        requestContext: {
          requestId: "test-req-2",
          timestamp: Date.now(),
          tenant: { id: "tenant-1", plan: "enterprise" },
        },
      };

      const freeContext: DynamicResolutionContext = {
        requestContext: {
          requestId: "test-req-3",
          timestamp: Date.now(),
          tenant: { id: "tenant-2", plan: "free" },
        },
      };

      const enterpriseResult = await resolveDynamicArgument(
        arg,
        enterpriseContext,
      );
      expect(enterpriseResult.value).toBe("claude-3-opus");

      const freeResult = await resolveDynamicArgument(arg, freeContext);
      expect(freeResult.value).toBe("claude-3-sonnet");
    });

    it("should throw when context-aware function called without context", async () => {
      const arg: DynamicArgument<string> = ({ requestContext }) =>
        requestContext.user?.id || "unknown";

      await expect(resolveDynamicArgument(arg)).rejects.toThrow(
        /requires resolution context/,
      );
    });

    it("should handle async context-aware functions", async () => {
      const arg: DynamicArgument<number> = async ({ requestContext }) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return requestContext.tenant?.quotas?.maxTokensPerRequest || 1000;
      };

      const context: DynamicResolutionContext = {
        requestContext: {
          requestId: "test-req-4",
          timestamp: Date.now(),
          tenant: {
            id: "tenant-1",
            quotas: { maxTokensPerRequest: 5000 },
          },
        },
      };

      const result = await resolveDynamicArgument(arg, context);
      expect(result.value).toBe(5000);
    });
  });

  describe("Batch Resolution", () => {
    it("should resolve multiple arguments in parallel", async () => {
      const args = [
        "static-model",
        () => "sync-temperature",
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return "async-tools";
        },
      ] as const;

      const results = await resolveDynamicArguments(args);
      expect(results).toEqual([
        "static-model",
        "sync-temperature",
        "async-tools",
      ]);
    });

    it("should resolve dynamic config object", async () => {
      const config = {
        model: "gpt-4o",
        temperature: () => 0.7,
        maxTokens: async () => 4096,
      };

      const resolved = await resolveDynamicConfig(config);
      expect(resolved.model).toBe("gpt-4o");
      expect(resolved.temperature).toBe(0.7);
      expect(resolved.maxTokens).toBe(4096);
    });
  });
});

// =============================================================================
// TEST SUITE 2: MULTI-LEVEL CACHING
// =============================================================================

describe("Dynamic Arguments - Multi-Level Caching", () => {
  let cache: DynamicCache;

  beforeEach(() => {
    cache = new DynamicCache({ ttl: 5000, maxSize: 100 });
  });

  afterEach(() => {
    cache.destroy();
    dynamicCache.clear();
    clearResolutionCache();
  });

  describe("Per-Request Caching", () => {
    it("should cache values within a single request", () => {
      const context: RequestContext = {
        requestId: "req-001",
        timestamp: Date.now(),
      };

      cache.set("model", "gpt-4o", "per-request", context);
      const cached = cache.get<string>("model", "per-request", context);

      expect(cached).toBe("gpt-4o");
    });

    it("should isolate per-request cache between requests", () => {
      const context1: RequestContext = {
        requestId: "req-001",
        timestamp: Date.now(),
      };
      const context2: RequestContext = {
        requestId: "req-002",
        timestamp: Date.now(),
      };

      cache.set("model", "model-for-req-1", "per-request", context1);
      cache.set("model", "model-for-req-2", "per-request", context2);

      expect(cache.get<string>("model", "per-request", context1)).toBe(
        "model-for-req-1",
      );
      expect(cache.get<string>("model", "per-request", context2)).toBe(
        "model-for-req-2",
      );
    });

    it("should clear per-request cache independently", () => {
      const context1: RequestContext = {
        requestId: "req-001",
        timestamp: Date.now(),
      };
      const context2: RequestContext = {
        requestId: "req-002",
        timestamp: Date.now(),
      };

      cache.set("model", "model-1", "per-request", context1);
      cache.set("model", "model-2", "per-request", context2);

      cache.clearRequest("req-001");

      expect(
        cache.get<string>("model", "per-request", context1),
      ).toBeUndefined();
      expect(cache.get<string>("model", "per-request", context2)).toBe(
        "model-2",
      );
    });
  });

  describe("Per-User Caching", () => {
    it("should cache values per user across requests", () => {
      const context1: RequestContext = {
        requestId: "req-001",
        timestamp: Date.now(),
        user: { id: "user-123" },
      };
      const context2: RequestContext = {
        requestId: "req-002",
        timestamp: Date.now(),
        user: { id: "user-123" },
      };

      cache.set("preferences", { theme: "dark" }, "per-user", context1);
      const cached = cache.get<{ theme: string }>(
        "preferences",
        "per-user",
        context2,
      );

      expect(cached).toEqual({ theme: "dark" });
    });

    it("should isolate per-user cache between users", () => {
      const userA: RequestContext = {
        requestId: "req-001",
        timestamp: Date.now(),
        user: { id: "user-A" },
      };
      const userB: RequestContext = {
        requestId: "req-002",
        timestamp: Date.now(),
        user: { id: "user-B" },
      };

      cache.set("model", "opus", "per-user", userA);
      cache.set("model", "sonnet", "per-user", userB);

      expect(cache.get<string>("model", "per-user", userA)).toBe("opus");
      expect(cache.get<string>("model", "per-user", userB)).toBe("sonnet");
    });

    it("should expire per-user cache entries by TTL", async () => {
      const shortTtlCache = new DynamicCache({ ttl: 50 });
      const context: RequestContext = {
        requestId: "req-001",
        timestamp: Date.now(),
        user: { id: "user-123" },
      };

      shortTtlCache.set("model", "gpt-4o", "per-user", context, 50);
      expect(shortTtlCache.get<string>("model", "per-user", context)).toBe(
        "gpt-4o",
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(
        shortTtlCache.get<string>("model", "per-user", context),
      ).toBeUndefined();
      shortTtlCache.destroy();
    });
  });

  describe("Per-Tenant Caching", () => {
    it("should cache values per tenant across users", () => {
      const user1: RequestContext = {
        requestId: "req-001",
        timestamp: Date.now(),
        user: { id: "user-A" },
        tenant: { id: "tenant-1" },
      };
      const user2: RequestContext = {
        requestId: "req-002",
        timestamp: Date.now(),
        user: { id: "user-B" },
        tenant: { id: "tenant-1" },
      };

      cache.set("tenantConfig", { maxTokens: 10000 }, "per-tenant", user1);
      const cached = cache.get<{ maxTokens: number }>(
        "tenantConfig",
        "per-tenant",
        user2,
      );

      expect(cached).toEqual({ maxTokens: 10000 });
    });

    it("should isolate per-tenant cache between tenants", () => {
      const tenantA: RequestContext = {
        requestId: "req-001",
        timestamp: Date.now(),
        tenant: { id: "tenant-A" },
      };
      const tenantB: RequestContext = {
        requestId: "req-002",
        timestamp: Date.now(),
        tenant: { id: "tenant-B" },
      };

      cache.set("quota", 1000, "per-tenant", tenantA);
      cache.set("quota", 5000, "per-tenant", tenantB);

      expect(cache.get<number>("quota", "per-tenant", tenantA)).toBe(1000);
      expect(cache.get<number>("quota", "per-tenant", tenantB)).toBe(5000);
    });
  });

  describe("Global Caching", () => {
    it("should cache values globally", () => {
      cache.set("globalConfig", { version: "1.0" }, "global");
      const cached = cache.get<{ version: string }>("globalConfig", "global");

      expect(cached).toEqual({ version: "1.0" });
    });

    it("should share global cache across all contexts", () => {
      const context1: RequestContext = {
        requestId: "req-001",
        timestamp: Date.now(),
        user: { id: "user-A" },
        tenant: { id: "tenant-1" },
      };
      const context2: RequestContext = {
        requestId: "req-002",
        timestamp: Date.now(),
        user: { id: "user-B" },
        tenant: { id: "tenant-2" },
      };

      cache.set("sharedValue", "shared", "global", context1);
      expect(cache.get<string>("sharedValue", "global", context2)).toBe(
        "shared",
      );
    });

    it("should enforce max size for global cache", () => {
      const smallCache = new DynamicCache({ ttl: 5000, maxSize: 3 });

      smallCache.set("key1", "val1", "global");
      smallCache.set("key2", "val2", "global");
      smallCache.set("key3", "val3", "global");
      smallCache.set("key4", "val4", "global"); // Should evict oldest

      const stats = smallCache.getStats();
      expect(stats.globalEntries).toBeLessThanOrEqual(3);
      smallCache.destroy();
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate cache entries by pattern", () => {
      cache.set("model:gpt-4o", "config1", "global");
      cache.set("model:claude", "config2", "global");
      cache.set("tool:read_file", "config3", "global");

      const invalidated = invalidateCachePattern(/^model:/, "global");

      expect(invalidated).toBe(2);
      expect(cache.get("model:gpt-4o", "global")).toBeUndefined();
      expect(cache.get("model:claude", "global")).toBeUndefined();
      expect(cache.get("tool:read_file", "global")).toBe("config3");
    });

    it("should delete specific cache entries", () => {
      const context: RequestContext = {
        requestId: "req-001",
        timestamp: Date.now(),
        user: { id: "user-123" },
      };

      cache.set("model", "gpt-4o", "per-user", context);
      expect(cache.has("model", "per-user", context)).toBe(true);

      cache.delete("model", "per-user", context);
      expect(cache.has("model", "per-user", context)).toBe(false);
    });
  });

  describe("Cache Statistics", () => {
    it("should track cache statistics accurately", () => {
      const context: RequestContext = {
        requestId: "req-001",
        timestamp: Date.now(),
        user: { id: "user-123" },
        tenant: { id: "tenant-456" },
      };

      cache.set("req-val", "value", "per-request", context);
      cache.set("user-val", "value", "per-user", context);
      cache.set("tenant-val", "value", "per-tenant", context);
      cache.set("global-val", "value", "global");

      const stats = cache.getStats();

      expect(stats.requestCaches).toBe(1);
      expect(stats.userCaches).toBe(1);
      expect(stats.tenantCaches).toBe(1);
      expect(stats.globalEntries).toBe(1);
      expect(stats.totalRequestEntries).toBe(1);
      expect(stats.totalUserEntries).toBe(1);
      expect(stats.totalTenantEntries).toBe(1);
    });
  });

  describe("withCache Decorator", () => {
    it("should cache function results with specified strategy", async () => {
      let callCount = 0;
      const expensiveOperation = async (id: string) => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `result-${id}`;
      };

      const cachedOp = withCache(expensiveOperation, {
        strategy: "global",
        ttl: 5000,
        keyGenerator: (id) => `op:${id}`,
      });

      const result1 = await cachedOp("test");
      const result2 = await cachedOp("test");

      expect(result1).toBe("result-test");
      expect(result2).toBe("result-test");
      expect(callCount).toBe(1); // Second call should use cache
    });
  });
});

// =============================================================================
// TEST SUITE 3: ASYNCLOCALSTORAGE CONTEXT PROPAGATION
// =============================================================================

describe("Dynamic Arguments - AsyncLocalStorage Context Propagation", () => {
  afterEach(() => {
    clearResolutionCache();
  });

  describe("Basic Context Operations", () => {
    it("should create request context with defaults", () => {
      const context = createRequestContext();

      expect(context.requestId).toMatch(/^req_\d+_/);
      expect(context.timestamp).toBeGreaterThan(0);
      expect(context.runtime).toBeInstanceOf(Map);
    });

    it("should create request context with provided values", () => {
      const context = createRequestContext({
        user: { id: "user-123", email: "test@example.com" },
        tenant: { id: "tenant-456", plan: "enterprise" },
      });

      expect(context.user?.id).toBe("user-123");
      expect(context.tenant?.plan).toBe("enterprise");
    });
  });

  describe("Context Propagation via withRequestContext", () => {
    it("should propagate context to nested async calls", async () => {
      let capturedUserId: string | undefined;

      await withRequestContext({ user: { id: "user-123" } }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        capturedUserId = getCurrentContext()?.user?.id;
      });

      expect(capturedUserId).toBe("user-123");
    });

    it("should isolate context between concurrent requests", async () => {
      const results: string[] = [];

      await Promise.all([
        withRequestContext({ user: { id: "user-A" } }, async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          results.push(`A:${getCurrentContext()?.user?.id}`);
        }),
        withRequestContext({ user: { id: "user-B" } }, async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`B:${getCurrentContext()?.user?.id}`);
        }),
      ]);

      expect(results).toContain("A:user-A");
      expect(results).toContain("B:user-B");
    });

    it("should have no context outside withRequestContext", async () => {
      expect(hasContext()).toBe(false);
      expect(getCurrentContext()).toBeUndefined();

      await withRequestContext({ user: { id: "user-123" } }, async () => {
        expect(hasContext()).toBe(true);
        expect(getCurrentContext()).toBeDefined();
      });

      expect(hasContext()).toBe(false);
    });
  });

  describe("Context Updates", () => {
    it("should update current context within request", async () => {
      await withRequestContext({ user: { id: "user-123" } }, async () => {
        expect(getCurrentContext()?.user?.email).toBeUndefined();

        updateCurrentContext({
          user: { id: "user-123", email: "user@example.com" },
        });

        expect(getCurrentContext()?.user?.email).toBe("user@example.com");
      });
    });

    it("should manage runtime values", async () => {
      await withRequestContext({}, async () => {
        setRuntimeValue("taskComplexity", "high");
        setRuntimeValue("estimatedTokens", 5000);

        expect(getRuntimeValue<string>("taskComplexity")).toBe("high");
        expect(getRuntimeValue<number>("estimatedTokens")).toBe(5000);

        deleteRuntimeValue("taskComplexity");
        expect(getRuntimeValue<string>("taskComplexity")).toBeUndefined();

        clearRuntimeValues();
        expect(getRuntimeValue<number>("estimatedTokens")).toBeUndefined();
      });
    });
  });

  describe("Child Context", () => {
    it("should create child context inheriting from parent", async () => {
      await withRequestContext(
        {
          user: { id: "user-123" },
          tenant: { id: "tenant-456" },
        },
        async () => {
          await withChildContext(
            { user: { id: "user-789" } }, // Override user
            async () => {
              const ctx = getCurrentContext();
              expect(ctx?.user?.id).toBe("user-789"); // Overridden
              expect(ctx?.tenant?.id).toBe("tenant-456"); // Inherited
            },
          );

          // Parent context unchanged
          expect(getCurrentContext()?.user?.id).toBe("user-123");
        },
      );
    });

    it("should merge runtime values from parent and child", async () => {
      await withRequestContext({}, async () => {
        setRuntimeValue("parentKey", "parentValue");

        const childCtx = createChildContext({
          runtime: new Map([["childKey", "childValue"]]),
        });

        expect(childCtx.runtime?.get("parentKey")).toBe("parentValue");
        expect(childCtx.runtime?.get("childKey")).toBe("childValue");
      });
    });
  });

  describe("RequestContextBuilder", () => {
    it("should build context using fluent API", async () => {
      const result = await new RequestContextBuilder()
        .withUser({ id: "user-123", email: "user@example.com" })
        .withTenant({ id: "tenant-456", plan: "enterprise" })
        .withSession({ id: "session-789" })
        .withRuntimeValue("taskType", "analysis")
        .run(async () => {
          const ctx = getCurrentContext();
          return {
            userId: ctx?.user?.id,
            tenantPlan: ctx?.tenant?.plan,
            taskType: ctx?.runtime?.get("taskType"),
          };
        });

      expect(result.userId).toBe("user-123");
      expect(result.tenantPlan).toBe("enterprise");
      expect(result.taskType).toBe("analysis");
    });

    it("should add user preferences via builder", async () => {
      const context = new RequestContextBuilder()
        .withUser({ id: "user-123" })
        .withUserPreferences({
          preferredModel: "claude-3-opus",
          temperature: 0.7,
        })
        .build();

      expect(context.user?.preferences?.preferredModel).toBe("claude-3-opus");
    });

    it("should add tenant quotas via builder", async () => {
      const context = new RequestContextBuilder()
        .withTenant({ id: "tenant-123" })
        .withTenantQuotas({
          tokensPerDay: 100000,
          requestsPerMinute: 60,
        })
        .build();

      expect(context.tenant?.quotas?.tokensPerDay).toBe(100000);
    });
  });

  describe("HTTP Request Context Creation", () => {
    it("should create context from HTTP request object", () => {
      const httpRequest = {
        headers: {
          "x-user-id": "user-from-header",
          "x-tenant-id": "tenant-from-header",
          "x-session-id": "session-from-header",
        },
      };

      const context = createContextFromRequest(httpRequest);

      expect(context.user?.id).toBe("user-from-header");
      expect(context.tenant?.id).toBe("tenant-from-header");
      expect(context.session?.id).toBe("session-from-header");
    });

    it("should prefer explicit user/tenant over headers", () => {
      const httpRequest = {
        headers: {
          "x-user-id": "header-user",
        },
        user: { id: "explicit-user", email: "user@example.com" },
      };

      const context = createContextFromRequest(httpRequest);

      expect(context.user?.id).toBe("explicit-user");
      expect(context.user?.email).toBe("user@example.com");
    });
  });
});

// =============================================================================
// TEST SUITE 4: ARGUMENT VALIDATION AND TYPE GUARDS
// =============================================================================

describe("Dynamic Arguments - Validation and Type Guards", () => {
  describe("isDynamicFunction Type Guard", () => {
    it("should identify static values as non-functions", () => {
      expect(isDynamicFunction("static-string")).toBe(false);
      expect(isDynamicFunction(42)).toBe(false);
      expect(isDynamicFunction({ key: "value" })).toBe(false);
      expect(isDynamicFunction(null)).toBe(false);
      expect(isDynamicFunction(undefined)).toBe(false);
    });

    it("should identify functions as dynamic", () => {
      expect(isDynamicFunction(() => "value")).toBe(true);
      expect(isDynamicFunction(async () => "value")).toBe(true);
      expect(
        isDynamicFunction(({ requestContext }) => requestContext.requestId),
      ).toBe(true);
    });
  });

  describe("isContextAwareFunction Type Guard", () => {
    it("should identify zero-arg functions", () => {
      const noArgs = () => "value";
      expect(isContextAwareFunction(noArgs)).toBe(false);
    });

    it("should identify context-aware functions", () => {
      const withContext = (ctx: DynamicResolutionContext) =>
        ctx.requestContext.requestId;
      expect(isContextAwareFunction(withContext)).toBe(true);
    });
  });

  describe("hasDynamicArgument", () => {
    it("should detect dynamic arguments", () => {
      expect(hasDynamicArgument("static")).toBe(false);
      expect(hasDynamicArgument(() => "dynamic")).toBe(true);
    });
  });

  describe("hasDynamicProperties", () => {
    it("should detect objects with dynamic properties", () => {
      const staticConfig = { model: "gpt-4o", temperature: 0.7 };
      const dynamicConfig = { model: () => "gpt-4o", temperature: 0.7 };

      expect(hasDynamicProperties(staticConfig)).toBe(false);
      expect(hasDynamicProperties(dynamicConfig)).toBe(true);
    });
  });
});

// =============================================================================
// TEST SUITE 5: DEFAULT VALUE HANDLING
// =============================================================================

describe("Dynamic Arguments - Default Value Handling", () => {
  afterEach(() => {
    clearResolutionCache();
  });

  describe("Resolution with Defaults", () => {
    it("should return default value on error when throwOnError is false", async () => {
      const failingArg: DynamicArgument<string> = () => {
        throw new Error("Resolution failed");
      };

      const result = await resolveDynamicArgument(failingArg, undefined, {
        throwOnError: false,
        defaultValue: "fallback-model",
      });

      expect(result.value).toBe("fallback-model");
    });

    it("should throw error when throwOnError is true (default)", async () => {
      const failingArg: DynamicArgument<string> = () => {
        throw new Error("Resolution failed");
      };

      await expect(resolveDynamicArgument(failingArg)).rejects.toThrow(
        "Resolution failed",
      );
    });
  });

  describe("withFallback Utility", () => {
    it("should use first non-null/undefined value", async () => {
      const argWithFallback = withFallback(
        () => undefined,
        () => null,
        () => "third-value",
        "fourth-value",
      );

      const context = createResolutionContext();
      const result = await resolveDynamicArgument(argWithFallback, context);
      expect(result.value).toBe("third-value");
    });

    it("should work with context-aware fallbacks", async () => {
      const argWithFallback = withFallback(
        ({ requestContext }) =>
          requestContext.user?.preferences?.preferredModel,
        ({ requestContext }) => requestContext.tenant?.settings?.defaultModel,
        "gpt-4o-mini",
      );

      const context: DynamicResolutionContext = {
        requestContext: {
          requestId: "test",
          timestamp: Date.now(),
          user: { id: "user-1" }, // No preferences
          tenant: {
            id: "tenant-1",
            settings: { defaultModel: "claude-3-sonnet" },
          },
        },
      };

      const result = await resolveDynamicArgument(argWithFallback, context);
      expect(result.value).toBe("claude-3-sonnet");
    });

    it("should throw when all fallbacks fail", async () => {
      const argWithFallback = withFallback(
        () => undefined,
        () => null,
      );

      const context = createResolutionContext();
      await expect(
        resolveDynamicArgument(argWithFallback, context),
      ).rejects.toThrow("All fallbacks failed");
    });
  });
});

// =============================================================================
// TEST SUITE 6: TYPE COERCION
// =============================================================================

describe("Dynamic Arguments - Type Coercion", () => {
  describe("Environment Variable Type Coercion", () => {
    afterEach(() => {
      delete process.env.TEST_NUMBER;
      delete process.env.TEST_BOOL;
      delete process.env.TEST_JSON;
      delete process.env.TEST_LIST;
    });

    it("should coerce environment variable to number", async () => {
      process.env.TEST_NUMBER = "42";
      const arg = envNumber("TEST_NUMBER", 0);
      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe(42);
    });

    it("should return default for invalid number", async () => {
      process.env.TEST_NUMBER = "not-a-number";
      const arg = envNumber("TEST_NUMBER", 100);
      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe(100);
    });

    it("should coerce environment variable to boolean", async () => {
      const testCases = [
        { input: "true", expected: true },
        { input: "1", expected: true },
        { input: "yes", expected: true },
        { input: "on", expected: true },
        { input: "false", expected: false },
        { input: "0", expected: false },
        { input: "no", expected: false },
        { input: "off", expected: false },
      ];

      for (const { input, expected } of testCases) {
        process.env.TEST_BOOL = input;
        const arg = envBoolean("TEST_BOOL");
        const result = await resolveDynamicArgument(arg);
        expect(result.value).toBe(expected);
      }
    });

    it("should parse JSON from environment variable", async () => {
      process.env.TEST_JSON = '{"model": "gpt-4o", "temperature": 0.7}';
      const arg = envJson<{ model: string; temperature: number }>("TEST_JSON");
      const result = await resolveDynamicArgument(arg);
      expect(result.value).toEqual({ model: "gpt-4o", temperature: 0.7 });
    });

    it("should parse comma-separated list from environment variable", async () => {
      process.env.TEST_LIST = "openai, anthropic, google";
      const arg = envList("TEST_LIST");
      const result = await resolveDynamicArgument(arg);
      expect(result.value).toEqual(["openai", "anthropic", "google"]);
    });
  });

  describe("mapDynamicArgument Transform", () => {
    it("should transform resolved value", async () => {
      const baseArg: DynamicArgument<string> = () => "hello world";
      const transformedArg = mapDynamicArgument(baseArg, (value) =>
        value.toUpperCase(),
      );

      const context = createResolutionContext();
      const result = await resolveDynamicArgument(transformedArg, context);
      expect(result.value).toBe("HELLO WORLD");
    });

    it("should support async transforms", async () => {
      const baseArg: DynamicArgument<number> = () => 5;
      const transformedArg = mapDynamicArgument(baseArg, async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return value * 2;
      });

      const context = createResolutionContext();
      const result = await resolveDynamicArgument(transformedArg, context);
      expect(result.value).toBe(10);
    });
  });
});

// =============================================================================
// TEST SUITE 7: DEPENDENCY INJECTION
// =============================================================================

describe("Dynamic Arguments - Dependency Injection", () => {
  describe("NeuroLink Instance Access", () => {
    it("should access neurolink methods in resolution context", async () => {
      const mockNeurolink = {
        getAvailableTools: vi
          .fn()
          .mockResolvedValue(["read_file", "write_file"]),
        getProviderStatus: vi.fn().mockResolvedValue(true),
        getRuntimeContext: vi.fn().mockReturnValue(new Map([["key", "value"]])),
      };

      const arg: DynamicArgument<string[]> = async ({ neurolink }) => {
        if (neurolink) {
          return await neurolink.getAvailableTools();
        }
        return [];
      };

      const context: DynamicResolutionContext = {
        requestContext: createRequestContext(),
        neurolink: mockNeurolink,
      };

      const result = await resolveDynamicArgument(arg, context);
      expect(result.value).toEqual(["read_file", "write_file"]);
      expect(mockNeurolink.getAvailableTools).toHaveBeenCalled();
    });

    it("should check provider status via injected instance", async () => {
      const mockNeurolink = {
        getAvailableTools: vi.fn(),
        getProviderStatus: vi
          .fn()
          .mockImplementation(async (provider: string) => {
            return provider === "openai";
          }),
        getRuntimeContext: vi.fn(),
      };

      const selectAvailableProvider: DynamicArgument<string> = async ({
        neurolink,
      }) => {
        const providers = ["anthropic", "openai", "google"];
        for (const provider of providers) {
          if (neurolink && (await neurolink.getProviderStatus(provider))) {
            return provider;
          }
        }
        return "fallback";
      };

      const context: DynamicResolutionContext = {
        requestContext: createRequestContext(),
        neurolink: mockNeurolink,
      };

      const result = await resolveDynamicArgument(
        selectAvailableProvider,
        context,
      );
      expect(result.value).toBe("openai");
    });
  });

  describe("AbortSignal Integration", () => {
    it("should handle abort signal in resolution context", async () => {
      const controller = new AbortController();

      const arg: DynamicArgument<string> = async ({ signal }) => {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 1000);
          signal?.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new Error("Aborted"));
          });
        });
        return "completed";
      };

      const context: DynamicResolutionContext = {
        requestContext: createRequestContext(),
        signal: controller.signal,
      };

      // Abort after 50ms
      setTimeout(() => controller.abort(), 50);

      await expect(resolveDynamicArgument(arg, context)).rejects.toThrow(
        "Aborted",
      );
    });
  });
});

// =============================================================================
// TEST SUITE 8: CONTEXT INHERITANCE
// =============================================================================

describe("Dynamic Arguments - Context Inheritance", () => {
  describe("Nested Context Resolution", () => {
    it("should resolve with inherited context values", async () => {
      await withRequestContext(
        {
          user: { id: "parent-user" },
          tenant: { id: "parent-tenant", plan: "enterprise" },
        },
        async () => {
          const arg: DynamicArgument<{ userId: string; tenantId: string }> = ({
            requestContext,
          }) => ({
            userId: requestContext.user?.id || "unknown",
            tenantId: requestContext.tenant?.id || "unknown",
          });

          const context = createResolutionContext();
          const result = await resolveDynamicArgument(arg, context);

          expect(result.value.userId).toBe("parent-user");
          expect(result.value.tenantId).toBe("parent-tenant");
        },
      );
    });

    it("should allow child context to override parent values", async () => {
      await withRequestContext({ user: { id: "parent-user" } }, async () => {
        await withChildContext({ user: { id: "child-user" } }, async () => {
          const ctx = getCurrentContext();
          expect(ctx?.user?.id).toBe("child-user");
        });
      });
    });
  });

  describe("Runtime Value Inheritance", () => {
    it("should inherit runtime values from parent context", async () => {
      await withRequestContext({}, async () => {
        setRuntimeValue("parentValue", "inherited");

        const childCtx = createChildContext();
        expect(childCtx.runtime?.get("parentValue")).toBe("inherited");
      });
    });

    it("should allow child to override parent runtime values", async () => {
      await withRequestContext({}, async () => {
        setRuntimeValue("sharedKey", "parent-value");

        const childCtx = createChildContext({
          runtime: new Map([["sharedKey", "child-value"]]),
        });

        expect(childCtx.runtime?.get("sharedKey")).toBe("child-value");
      });
    });
  });
});

// =============================================================================
// TEST SUITE 9: ENVIRONMENT VARIABLE INTERPOLATION
// =============================================================================

describe("Dynamic Arguments - Environment Variable Interpolation", () => {
  afterEach(() => {
    delete process.env.MY_VAR;
    delete process.env.OPTIONAL_VAR;
    delete process.env.NODE_ENV;
    delete process.env.DEFAULT_MODEL;
  });

  describe("Basic Interpolation", () => {
    it("should interpolate simple environment variables", () => {
      process.env.MY_VAR = "my-value";
      const result = interpolateEnvVars("Value: ${MY_VAR}");
      expect(result).toBe("Value: my-value");
    });

    it("should return empty string for unset variables", () => {
      const result = interpolateEnvVars("Value: ${UNSET_VAR}");
      expect(result).toBe("Value: ");
    });
  });

  describe("Default Value Syntax", () => {
    it("should use default when variable is unset", () => {
      const result = interpolateEnvVars("Model: ${DEFAULT_MODEL:-gpt-4o}");
      expect(result).toBe("Model: gpt-4o");
    });

    it("should use variable value when set", () => {
      process.env.DEFAULT_MODEL = "claude-3-opus";
      const result = interpolateEnvVars("Model: ${DEFAULT_MODEL:-gpt-4o}");
      expect(result).toBe("Model: claude-3-opus");
    });
  });

  describe("Replacement Syntax", () => {
    it("should use replacement when variable is set", () => {
      process.env.MY_VAR = "anything";
      const result = interpolateEnvVars("Debug: ${MY_VAR:+enabled}");
      expect(result).toBe("Debug: enabled");
    });

    it("should use empty string when variable is unset", () => {
      const result = interpolateEnvVars("Debug: ${MY_VAR:+enabled}");
      expect(result).toBe("Debug: ");
    });
  });

  describe("fromEnv Utility", () => {
    it("should create dynamic argument from env template", async () => {
      process.env.DEFAULT_MODEL = "gpt-4o";
      const arg = fromEnv("${DEFAULT_MODEL:-fallback}");
      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe("gpt-4o");
    });
  });

  describe("envVar Utility", () => {
    it("should create dynamic argument for single env var", async () => {
      process.env.MY_VAR = "test-value";
      const arg = envVar("MY_VAR", "default");
      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe("test-value");
    });

    it("should return default when env var is unset", async () => {
      const arg = envVar("UNSET_VAR", "default-value");
      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe("default-value");
    });
  });

  describe("envSwitch Utility", () => {
    it("should select value based on environment", async () => {
      process.env.NODE_ENV = "production";
      const arg = envSwitch(
        "NODE_ENV",
        {
          development: "gpt-4o-mini",
          production: "gpt-4o",
          test: "gpt-3.5-turbo",
        },
        "gpt-4o-mini",
      );

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe("gpt-4o");
    });

    it("should use default for unknown environment", async () => {
      process.env.NODE_ENV = "staging";
      const arg = envSwitch(
        "NODE_ENV",
        {
          development: "dev-model",
          production: "prod-model",
        },
        "default-model",
      );

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe("default-model");
    });
  });
});

// =============================================================================
// TEST SUITE 10: MEMOIZATION
// =============================================================================

describe("Dynamic Arguments - Memoization", () => {
  afterEach(() => {
    clearResolutionCache();
  });

  describe("memoizeDynamicArgument", () => {
    it("should memoize expensive computations", async () => {
      let callCount = 0;
      const expensiveArg: DynamicArgument<string> = async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "computed-value";
      };

      const memoizedArg = memoizeDynamicArgument(expensiveArg, {
        cacheTtl: 5000,
      });
      const context = createResolutionContext();

      const result1 = await resolveDynamicArgument(memoizedArg, context);
      const result2 = await resolveDynamicArgument(memoizedArg, context);

      expect(result1.value).toBe("computed-value");
      expect(result2.value).toBe("computed-value");
      expect(callCount).toBe(1); // Second call should use memoized value
    });

    it("should not memoize static values", () => {
      const staticArg: DynamicArgument<string> = "static-value";
      const memoizedArg = memoizeDynamicArgument(staticArg);
      expect(memoizedArg).toBe("static-value"); // Should return as-is
    });

    it("should expire memoized values after TTL", async () => {
      let callCount = 0;
      const arg: DynamicArgument<string> = () => {
        callCount++;
        return `call-${callCount}`;
      };

      const memoizedArg = memoizeDynamicArgument(arg, { cacheTtl: 50 });
      const context = createResolutionContext();

      const result1 = await resolveDynamicArgument(memoizedArg, context);
      expect(result1.value).toBe("call-1");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result2 = await resolveDynamicArgument(memoizedArg, context);
      expect(result2.value).toBe("call-2");
    });
  });
});

// =============================================================================
// TEST SUITE 11: CONDITIONAL RESOLUTION
// =============================================================================

describe("Dynamic Arguments - Conditional Resolution", () => {
  afterEach(() => {
    clearResolutionCache();
  });

  describe("conditional Utility", () => {
    it("should resolve to ifTrue when condition is true", async () => {
      const conditionalArg = conditional(
        () => true,
        "enterprise-model",
        "free-model",
      );

      const context = createResolutionContext();
      const result = await resolveDynamicArgument(conditionalArg, context);
      expect(result.value).toBe("enterprise-model");
    });

    it("should resolve to ifFalse when condition is false", async () => {
      const conditionalArg = conditional(
        () => false,
        "enterprise-model",
        "free-model",
      );

      const context = createResolutionContext();
      const result = await resolveDynamicArgument(conditionalArg, context);
      expect(result.value).toBe("free-model");
    });

    it("should work with context-aware conditions", async () => {
      const conditionalArg = conditional(
        ({ requestContext }) => requestContext.tenant?.plan === "enterprise",
        "claude-3-opus",
        "claude-3-sonnet",
      );

      const enterpriseContext: DynamicResolutionContext = {
        requestContext: {
          requestId: "test",
          timestamp: Date.now(),
          tenant: { id: "t1", plan: "enterprise" },
        },
      };

      const freeContext: DynamicResolutionContext = {
        requestContext: {
          requestId: "test",
          timestamp: Date.now(),
          tenant: { id: "t2", plan: "free" },
        },
      };

      const enterpriseResult = await resolveDynamicArgument(
        conditionalArg,
        enterpriseContext,
      );
      expect(enterpriseResult.value).toBe("claude-3-opus");

      const freeResult = await resolveDynamicArgument(
        conditionalArg,
        freeContext,
      );
      expect(freeResult.value).toBe("claude-3-sonnet");
    });

    it("should support nested conditionals", async () => {
      const nestedConditional = conditional(
        () => true,
        conditional(() => false, "a", "b"),
        "c",
      );

      const context = createResolutionContext();
      const result = await resolveDynamicArgument(nestedConditional, context);
      expect(result.value).toBe("b");
    });
  });
});

// =============================================================================
// TEST SUITE 12: COMBINE DYNAMIC ARGUMENTS
// =============================================================================

describe("Dynamic Arguments - Combining Arguments", () => {
  afterEach(() => {
    clearResolutionCache();
  });

  describe("combineDynamicArguments", () => {
    it("should combine multiple arguments into one", async () => {
      const combinedArg = combineDynamicArguments(
        [() => "gpt-4o", () => 0.7, async () => 4096],
        ([model, temperature, maxTokens]) => ({
          model,
          temperature,
          maxTokens,
        }),
      );

      const context = createResolutionContext();
      const result = await resolveDynamicArgument(combinedArg, context);

      expect(result.value).toEqual({
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 4096,
      });
    });

    it("should work with context-aware arguments", async () => {
      const combinedArg = combineDynamicArguments(
        [
          ({ requestContext }) =>
            requestContext.user?.preferences?.preferredModel || "default",
          ({ requestContext }) =>
            requestContext.tenant?.settings?.defaultTemperature || 0.5,
        ],
        ([model, temperature]) => ({ model, temperature }),
      );

      const context: DynamicResolutionContext = {
        requestContext: {
          requestId: "test",
          timestamp: Date.now(),
          user: {
            id: "user-1",
            preferences: { preferredModel: "claude-3-opus" },
          },
          tenant: {
            id: "tenant-1",
            settings: { defaultTemperature: 0.8 },
          },
        },
      };

      const result = await resolveDynamicArgument(combinedArg, context);
      expect(result.value).toEqual({
        model: "claude-3-opus",
        temperature: 0.8,
      });
    });
  });
});

// =============================================================================
// TEST SUITE 13: CACHE KEY GENERATION
// =============================================================================

describe("Dynamic Arguments - Cache Key Generation", () => {
  describe("createCacheKey", () => {
    it("should create cache key from parts", () => {
      const key = createCacheKey("model", "user-123", "gpt-4o");
      expect(key).toBe("model:user-123:gpt-4o");
    });

    it("should filter out undefined/empty parts", () => {
      const key = createCacheKey("model", undefined, "gpt-4o", "");
      expect(key).toBe("model:gpt-4o");
    });
  });

  describe("createStrategyCacheKey", () => {
    it("should create strategy-specific cache keys", () => {
      const context: RequestContext = {
        requestId: "req-123",
        timestamp: Date.now(),
        user: { id: "user-456" },
        tenant: { id: "tenant-789" },
      };

      expect(createStrategyCacheKey("model", "per-request", context)).toBe(
        "model:request:req-123",
      );
      expect(createStrategyCacheKey("model", "per-user", context)).toBe(
        "model:user:user-456",
      );
      expect(createStrategyCacheKey("model", "per-tenant", context)).toBe(
        "model:tenant:tenant-789",
      );
      expect(createStrategyCacheKey("model", "global")).toBe("model:global");
      expect(createStrategyCacheKey("model", "none")).toBe("");
    });
  });
});

// =============================================================================
// TEST SUITE 14: RESOLUTION TIMING AND PERFORMANCE
// =============================================================================

describe("Dynamic Arguments - Resolution Timing", () => {
  afterEach(() => {
    clearResolutionCache();
  });

  it("should track resolution time for static values", async () => {
    const arg: DynamicArgument<string> = "static";
    const result = await resolveDynamicArgument(arg);

    expect(result.resolutionTime).toBeGreaterThanOrEqual(0);
    expect(result.resolutionTime).toBeLessThan(50); // Should be very fast
  });

  it("should track resolution time for async values", async () => {
    const arg: DynamicArgument<string> = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "async-result";
    };

    const result = await resolveDynamicArgument(arg);

    expect(result.resolutionTime).toBeGreaterThanOrEqual(50);
  });

  it("should show cache hit in resolution time", async () => {
    const arg: DynamicArgument<string> = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "cached-result";
    };

    // First call - not cached
    const result1 = await resolveDynamicArgument(arg, undefined, {
      cache: true,
      cacheTtl: 5000,
    });
    expect(result1.fromCache).toBe(false);
    expect(result1.resolutionTime).toBeGreaterThanOrEqual(50);

    // Second call - cached
    const result2 = await resolveDynamicArgument(arg, undefined, {
      cache: true,
      cacheTtl: 5000,
    });
    expect(result2.fromCache).toBe(true);
    expect(result2.resolutionTime).toBeLessThan(10); // Cache hit should be fast
  });
});

// =============================================================================
// TEST SUITE 15: CLEANUP AND LIFECYCLE
// =============================================================================

describe("Dynamic Arguments - Cleanup and Lifecycle", () => {
  it("should clear resolution cache", () => {
    clearResolutionCache();
    const stats = getResolutionCacheStats();
    expect(stats.size).toBe(0);
  });

  it("should destroy resolver and cleanup intervals", () => {
    // This should not throw
    expect(() => destroyResolver()).not.toThrow();
  });

  it("should destroy DynamicCache and cleanup intervals", () => {
    const cache = new DynamicCache();
    cache.set("key", "value", "global");

    expect(cache.getStats().globalEntries).toBe(1);

    cache.destroy();

    expect(cache.getStats().globalEntries).toBe(0);
  });
});

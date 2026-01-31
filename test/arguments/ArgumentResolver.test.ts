/**
 * ArgumentResolver Tests
 *
 * Tests for the core argument resolution engine.
 * Covers all 4 resolution patterns: static, sync, async, context-aware.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ArgumentResolver,
  resolveDynamicArgument,
  resolveDynamicArguments,
  resolveDynamicConfig,
  withFallback,
  conditional,
  memoize,
  lazy,
  transform,
  all,
  any,
  resetDefaultResolver,
} from "../../src/lib/arguments/ArgumentResolver.js";
import type {
  DynamicArgument,
  DynamicResolutionContext,
  RequestContext,
} from "../../src/lib/arguments/types/argumentTypes.js";
import { createRequestContext } from "../../src/lib/arguments/ArgumentValidators.js";

// ============================================================================
// Test Helpers
// ============================================================================

function createTestContext(
  overrides: Partial<RequestContext> = {},
): DynamicResolutionContext {
  const requestContext = createRequestContext({
    requestId: "test-req-123",
    user: {
      id: "user1",
      email: "user@example.com",
      roles: ["user"],
      permissions: ["read"],
      preferences: {
        preferredModel: "gpt-4o",
        temperature: 0.7,
      },
    },
    tenant: {
      id: "tenant1",
      plan: "pro",
      settings: {
        defaultModel: "claude-3-sonnet",
        enableTools: true,
      },
    },
    ...overrides,
  });

  return { requestContext };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Static Value Pattern Tests
// ============================================================================

describe("ArgumentResolver - Static Value Pattern", () => {
  afterEach(() => {
    resetDefaultResolver();
  });

  it("should resolve static string value", async () => {
    const model: DynamicArgument<string> = "gpt-4o";
    const result = await resolveDynamicArgument(model);

    expect(result.value).toBe("gpt-4o");
    expect(result.resolutionType).toBe("static");
    expect(result.fromCache).toBe(false);
    expect(result.resolutionTime).toBeGreaterThanOrEqual(0);
  });

  it("should resolve static number value", async () => {
    const temperature: DynamicArgument<number> = 0.7;
    const result = await resolveDynamicArgument(temperature);

    expect(result.value).toBe(0.7);
    expect(result.resolutionType).toBe("static");
  });

  it("should resolve static boolean value", async () => {
    const enabled: DynamicArgument<boolean> = true;
    const result = await resolveDynamicArgument(enabled);

    expect(result.value).toBe(true);
    expect(result.resolutionType).toBe("static");
  });

  it("should resolve static array value", async () => {
    const tools: DynamicArgument<string[]> = ["readFile", "writeFile"];
    const result = await resolveDynamicArgument(tools);

    expect(result.value).toEqual(["readFile", "writeFile"]);
    expect(result.resolutionType).toBe("static");
  });

  it("should resolve static object value", async () => {
    const config: DynamicArgument<{ model: string; temp: number }> = {
      model: "gpt-4o",
      temp: 0.5,
    };
    const result = await resolveDynamicArgument(config);

    expect(result.value).toEqual({ model: "gpt-4o", temp: 0.5 });
    expect(result.resolutionType).toBe("static");
  });

  it("should handle null static value", async () => {
    const nullValue: DynamicArgument<null> = null;
    const result = await resolveDynamicArgument(nullValue);

    expect(result.value).toBeNull();
    expect(result.resolutionType).toBe("static");
  });

  it("should handle undefined static value", async () => {
    const undefinedValue: DynamicArgument<undefined> = undefined;
    const result = await resolveDynamicArgument(undefinedValue);

    expect(result.value).toBeUndefined();
    expect(result.resolutionType).toBe("static");
  });
});

// ============================================================================
// Synchronous Function Pattern Tests
// ============================================================================

describe("ArgumentResolver - Synchronous Function Pattern", () => {
  afterEach(() => {
    resetDefaultResolver();
  });

  it("should resolve sync function returning string", async () => {
    let callCount = 0;
    const getModel: DynamicArgument<string> = () => {
      callCount++;
      return "gpt-4o";
    };

    const result = await resolveDynamicArgument(getModel);

    expect(result.value).toBe("gpt-4o");
    expect(result.resolutionType).toBe("sync-function");
    expect(callCount).toBe(1);
  });

  it("should resolve sync function with environment variable", async () => {
    const originalEnv = process.env.TEST_MODEL;
    process.env.TEST_MODEL = "claude-3-opus";

    const getModel: DynamicArgument<string> = () =>
      process.env.TEST_MODEL || "default";
    const result = await resolveDynamicArgument(getModel);

    expect(result.value).toBe("claude-3-opus");
    expect(result.resolutionType).toBe("sync-function");

    process.env.TEST_MODEL = originalEnv;
  });

  it("should handle sync function returning number", async () => {
    const getTemp: DynamicArgument<number> = () => 0.8;
    const result = await resolveDynamicArgument(getTemp);

    expect(result.value).toBe(0.8);
    expect(result.resolutionType).toBe("sync-function");
  });

  it("should handle sync function throwing error with throwOnError=true", async () => {
    const throwingFn: DynamicArgument<string> = () => {
      throw new Error("Sync error");
    };

    await expect(
      resolveDynamicArgument(throwingFn, undefined, { throwOnError: true }),
    ).rejects.toThrow("Sync error");
  });

  it("should handle sync function error with default value", async () => {
    const throwingFn: DynamicArgument<string> = () => {
      throw new Error("Sync error");
    };

    const result = await resolveDynamicArgument(throwingFn, undefined, {
      throwOnError: false,
      defaultValue: "fallback",
    });

    expect(result.value).toBe("fallback");
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("Sync error");
  });

  it("should call sync function exactly once per resolution", async () => {
    let callCount = 0;
    const counting: DynamicArgument<number> = () => ++callCount;

    await resolveDynamicArgument(counting, undefined, { cache: false });
    await resolveDynamicArgument(counting, undefined, { cache: false });
    await resolveDynamicArgument(counting, undefined, { cache: false });

    expect(callCount).toBe(3);
  });
});

// ============================================================================
// Asynchronous Function Pattern Tests
// ============================================================================

describe("ArgumentResolver - Asynchronous Function Pattern", () => {
  afterEach(() => {
    resetDefaultResolver();
  });

  it("should resolve async function", async () => {
    const getModel: DynamicArgument<string> = async () => {
      await sleep(10);
      return "gpt-4o";
    };

    const result = await resolveDynamicArgument(getModel);

    expect(result.value).toBe("gpt-4o");
    expect(result.resolutionType).toBe("async-function");
    expect(result.resolutionTime).toBeGreaterThanOrEqual(10);
  });

  it("should resolve async function with API call simulation", async () => {
    const mockFetch = async () => ({ model: "claude-3-opus" });

    const getModel: DynamicArgument<string> = async () => {
      const config = await mockFetch();
      return config.model;
    };

    const result = await resolveDynamicArgument(getModel);

    expect(result.value).toBe("claude-3-opus");
    expect(result.resolutionType).toBe("async-function");
  });

  it("should timeout async function when taking too long", async () => {
    const slowFn: DynamicArgument<string> = async () => {
      await sleep(5000);
      return "should-not-return";
    };

    await expect(
      resolveDynamicArgument(slowFn, undefined, { timeout: 100 }),
    ).rejects.toThrow(/timed out/i);
  });

  it("should use default value on async function failure", async () => {
    const failFn: DynamicArgument<string> = async () => {
      throw new Error("API failed");
    };

    const result = await resolveDynamicArgument(failFn, undefined, {
      throwOnError: false,
      defaultValue: "gpt-4o",
    });

    expect(result.value).toBe("gpt-4o");
    expect(result.error).toBeDefined();
  });

  it("should resolve multiple async functions in parallel", async () => {
    const fn1: DynamicArgument<string> = async () => {
      await sleep(50);
      return "a";
    };
    const fn2: DynamicArgument<string> = async () => {
      await sleep(50);
      return "b";
    };
    const fn3: DynamicArgument<string> = async () => {
      await sleep(50);
      return "c";
    };

    const start = Date.now();
    const batch = await resolveDynamicArguments([fn1, fn2, fn3]);
    const duration = Date.now() - start;

    expect(batch.values[0].value).toBe("a");
    expect(batch.values[1].value).toBe("b");
    expect(batch.values[2].value).toBe("c");
    // Parallel execution should take ~50ms, not ~150ms
    expect(duration).toBeLessThan(150);
  });
});

// ============================================================================
// Context-Aware Function Pattern Tests
// ============================================================================

describe("ArgumentResolver - Context-Aware Function Pattern", () => {
  afterEach(() => {
    resetDefaultResolver();
  });

  it("should resolve context-aware function with tenant plan", async () => {
    const selectModel: DynamicArgument<string> = ({ requestContext }) => {
      return requestContext.tenant?.plan === "enterprise"
        ? "claude-3-opus"
        : "claude-3-sonnet";
    };

    const enterpriseContext = createTestContext({
      tenant: { id: "t1", plan: "enterprise" },
    });
    const proContext = createTestContext({
      tenant: { id: "t2", plan: "pro" },
    });

    const enterpriseResult = await resolveDynamicArgument(
      selectModel,
      enterpriseContext,
    );
    const proResult = await resolveDynamicArgument(selectModel, proContext);

    expect(enterpriseResult.value).toBe("claude-3-opus");
    expect(enterpriseResult.resolutionType).toBe("context-aware");
    expect(proResult.value).toBe("claude-3-sonnet");
  });

  it("should resolve context-aware function with user preferences", async () => {
    const selectModel: DynamicArgument<string> = ({ requestContext }) => {
      return requestContext.user?.preferences?.preferredModel || "gpt-4o";
    };

    const context = createTestContext();
    const result = await resolveDynamicArgument(selectModel, context);

    expect(result.value).toBe("gpt-4o");
    expect(result.resolutionType).toBe("context-aware");
  });

  it("should filter tools based on user permissions", async () => {
    const selectTools: DynamicArgument<string[]> = ({ requestContext }) => {
      const roles = requestContext.user?.roles || [];
      const tools = ["getCurrentTime"];
      if (roles.includes("file:read")) {
        tools.push("readFile");
      }
      if (roles.includes("file:write")) {
        tools.push("writeFile");
      }
      return tools;
    };

    const context = createTestContext({
      user: { id: "u1", roles: ["file:read", "file:write"] },
    });
    const result = await resolveDynamicArgument(selectTools, context);

    expect(result.value).toEqual(["getCurrentTime", "readFile", "writeFile"]);
  });

  it("should resolve async context-aware function", async () => {
    const mockDb = {
      getUserModel: async (userId: string) =>
        userId === "user1" ? "claude-3-opus" : "gpt-4o",
    };

    const selectModel: DynamicArgument<string> = async ({ requestContext }) => {
      const userId = requestContext.user?.id || "default";
      return await mockDb.getUserModel(userId);
    };

    const context = createTestContext();
    const result = await resolveDynamicArgument(selectModel, context);

    expect(result.value).toBe("claude-3-opus");
    expect(result.resolutionType).toBe("context-aware-async");
  });

  it("should throw when context required but not provided", async () => {
    const contextFn: DynamicArgument<string> = ({ requestContext }) =>
      requestContext.tenant?.id || "default";

    await expect(resolveDynamicArgument(contextFn, undefined)).rejects.toThrow(
      /context required/i,
    );
  });

  it("should handle multi-level context access", async () => {
    const selectModel: DynamicArgument<string> = ({ requestContext }) => {
      const userLevel = requestContext.user?.preferences?.temperature
        ? "user"
        : "none";
      const tenantLevel =
        requestContext.tenant?.plan === "enterprise" ? "enterprise" : "basic";
      const sessionActive = requestContext.session?.id ? "active" : "inactive";
      return `${userLevel}-${tenantLevel}-${sessionActive}`;
    };

    const context = createTestContext({
      user: { id: "u1", preferences: { temperature: 0.7 } },
      tenant: { id: "t1", plan: "enterprise" },
      session: { id: "s1", startedAt: Date.now() },
    });

    const result = await resolveDynamicArgument(selectModel, context);
    expect(result.value).toBe("user-enterprise-active");
  });
});

// ============================================================================
// Pattern Detection Tests
// ============================================================================

describe("ArgumentResolver - Pattern Detection", () => {
  afterEach(() => {
    resetDefaultResolver();
  });

  it("should correctly detect all pattern types", async () => {
    const staticModel: DynamicArgument<string> = "gpt-4o";
    const syncFn: DynamicArgument<string> = () => "claude-3-opus";
    const asyncFn: DynamicArgument<string> = async () => "gpt-4o-turbo";
    const contextFn: DynamicArgument<string> = ({ requestContext }) =>
      requestContext.tenant?.settings?.defaultModel || "gpt-4o";

    const context = createTestContext();

    const [sr, sr2, ar, cr] = await Promise.all([
      resolveDynamicArgument(staticModel),
      resolveDynamicArgument(syncFn),
      resolveDynamicArgument(asyncFn),
      resolveDynamicArgument(contextFn, context),
    ]);

    expect(sr.resolutionType).toBe("static");
    expect(sr2.resolutionType).toBe("sync-function");
    expect(ar.resolutionType).toBe("async-function");
    expect(cr.resolutionType).toBe("context-aware");
  });
});

// ============================================================================
// Caching Tests
// ============================================================================

describe("ArgumentResolver - Caching", () => {
  let resolver: ArgumentResolver;

  beforeEach(() => {
    resolver = new ArgumentResolver({
      enableCache: true,
      defaultCacheTtl: 1000,
    });
  });

  afterEach(() => {
    resolver.dispose();
    resetDefaultResolver();
  });

  it("should cache resolved values", async () => {
    let callCount = 0;
    const countingFn: DynamicArgument<string> = () => {
      callCount++;
      return `call-${callCount}`;
    };

    const r1 = await resolver.resolve(countingFn, undefined, {
      cache: true,
      argumentId: "test-cache",
    });
    const r2 = await resolver.resolve(countingFn, undefined, {
      cache: true,
      argumentId: "test-cache",
    });

    expect(r1.value).toBe("call-1");
    expect(r1.fromCache).toBe(false);
    expect(r2.value).toBe("call-1");
    expect(r2.fromCache).toBe(true);
    expect(callCount).toBe(1);
  });

  it("should expire cached values after TTL", async () => {
    let callCount = 0;
    const countingFn: DynamicArgument<string> = () => {
      callCount++;
      return `call-${callCount}`;
    };

    const r1 = await resolver.resolve(countingFn, undefined, {
      cache: true,
      cacheTtl: 50,
      argumentId: "ttl-test",
    });

    await sleep(100);

    const r2 = await resolver.resolve(countingFn, undefined, {
      cache: true,
      cacheTtl: 50,
      argumentId: "ttl-test",
    });

    expect(r1.fromCache).toBe(false);
    expect(r2.fromCache).toBe(false);
    expect(callCount).toBe(2);
  });

  it("should track cache statistics", async () => {
    const fn: DynamicArgument<string> = () => "value";

    await resolver.resolve(fn, undefined, {
      cache: true,
      argumentId: "stats-test",
    });
    await resolver.resolve(fn, undefined, {
      cache: true,
      argumentId: "stats-test",
    });
    await resolver.resolve(fn, undefined, {
      cache: true,
      argumentId: "stats-test",
    });

    const stats = resolver.getCacheStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(66.67, 0);
  });
});

// ============================================================================
// Helper Utility Tests
// ============================================================================

describe("ArgumentResolver - Helper Utilities", () => {
  afterEach(() => {
    resetDefaultResolver();
  });

  it("should resolve withFallback chain", async () => {
    const fallbackChain = withFallback(
      () => undefined,
      () => null,
      () => "fallback-value",
    );

    const context = createTestContext();
    const result = await resolveDynamicArgument(fallbackChain, context);

    expect(result.value).toBe("fallback-value");
  });

  it("should resolve conditional based on condition", async () => {
    const conditionalModel = conditional(
      ({ requestContext }) => requestContext.tenant?.plan === "enterprise",
      "claude-3-opus",
      "gpt-4o-mini",
    );

    const enterpriseContext = createTestContext({
      tenant: { id: "t1", plan: "enterprise" },
    });
    const freeContext = createTestContext({
      tenant: { id: "t2", plan: "free" },
    });

    const r1 = await resolveDynamicArgument(
      conditionalModel,
      enterpriseContext,
    );
    const r2 = await resolveDynamicArgument(conditionalModel, freeContext);

    expect(r1.value).toBe("claude-3-opus");
    expect(r2.value).toBe("gpt-4o-mini");
  });

  it("should memoize expensive computations", async () => {
    let callCount = 0;
    const expensive = memoize(
      () => {
        callCount++;
        return `computed-${callCount}`;
      },
      { cacheTtl: 10000 },
    );

    const context = createTestContext();
    const r1 = await resolveDynamicArgument(expensive, context);
    const r2 = await resolveDynamicArgument(expensive, context);

    expect(r1.value).toBe("computed-1");
    expect(r2.value).toBe("computed-1");
    expect(callCount).toBe(1);
  });

  it("should transform resolved values", async () => {
    const uppercased = transform(
      () => "gpt-4o",
      (model) => model.toUpperCase(),
    );

    const context = createTestContext();
    const result = await resolveDynamicArgument(uppercased, context);

    expect(result.value).toBe("GPT-4O");
  });

  it("should check all conditions with 'all' helper", async () => {
    const isEnterprise: DynamicArgument<boolean> = ({ requestContext }) =>
      requestContext.tenant?.plan === "enterprise";
    const hasPermission: DynamicArgument<boolean> = ({ requestContext }) =>
      requestContext.user?.permissions?.includes("advanced_models") || false;

    const model = all(
      [isEnterprise, hasPermission],
      "claude-3-opus",
      "gpt-4o-mini",
    );

    const fullAccessContext = createTestContext({
      tenant: { id: "t1", plan: "enterprise" },
      user: { id: "u1", permissions: ["advanced_models"] },
    });
    const partialContext = createTestContext({
      tenant: { id: "t1", plan: "enterprise" },
      user: { id: "u1", permissions: [] },
    });

    const r1 = await resolveDynamicArgument(model, fullAccessContext);
    const r2 = await resolveDynamicArgument(model, partialContext);

    expect(r1.value).toBe("claude-3-opus");
    expect(r2.value).toBe("gpt-4o-mini");
  });

  it("should check any condition with 'any' helper", async () => {
    const isEnterprise: DynamicArgument<boolean> = ({ requestContext }) =>
      requestContext.tenant?.plan === "enterprise";
    const isPro: DynamicArgument<boolean> = ({ requestContext }) =>
      requestContext.tenant?.plan === "pro";

    const model = any([isEnterprise, isPro], "advanced-model", "basic-model");

    const proContext = createTestContext({ tenant: { id: "t1", plan: "pro" } });
    const freeContext = createTestContext({
      tenant: { id: "t1", plan: "free" },
    });

    const r1 = await resolveDynamicArgument(model, proContext);
    const r2 = await resolveDynamicArgument(model, freeContext);

    expect(r1.value).toBe("advanced-model");
    expect(r2.value).toBe("basic-model");
  });
});

// ============================================================================
// Config Resolution Tests
// ============================================================================

describe("ArgumentResolver - Config Resolution", () => {
  afterEach(() => {
    resetDefaultResolver();
  });

  it("should resolve entire config object", async () => {
    const config = {
      model: ({ requestContext }: DynamicResolutionContext) =>
        requestContext.tenant?.plan === "enterprise"
          ? "claude-3-opus"
          : "gpt-4o",
      temperature: 0.7,
      maxTokens: async () => 2000,
    };

    const context = createTestContext({
      tenant: { id: "t1", plan: "enterprise" },
    });
    const resolved = await resolveDynamicConfig(config, context);

    expect(resolved.model).toBe("claude-3-opus");
    expect(resolved.temperature).toBe(0.7);
    expect(resolved.maxTokens).toBe(2000);
  });

  it("should handle mixed static and dynamic values in config", async () => {
    const config = {
      model: "gpt-4o",
      temperature: () => Math.random() * 0.5 + 0.5,
      enabled: true,
    };

    const resolved = await resolveDynamicConfig(config);

    expect(resolved.model).toBe("gpt-4o");
    expect(resolved.temperature).toBeGreaterThanOrEqual(0.5);
    expect(resolved.temperature).toBeLessThanOrEqual(1.0);
    expect(resolved.enabled).toBe(true);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("ArgumentResolver - Error Handling", () => {
  afterEach(() => {
    resetDefaultResolver();
  });

  it("should include error in result when throwOnError is false", async () => {
    const failingFn: DynamicArgument<string> = () => {
      throw new Error("Intentional error");
    };

    const result = await resolveDynamicArgument(failingFn, undefined, {
      throwOnError: false,
      defaultValue: "default",
    });

    expect(result.value).toBe("default");
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("Intentional error");
  });

  it("should handle abort signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const fn: DynamicArgument<string> = async () => {
      await sleep(100);
      return "should-not-return";
    };

    await expect(
      resolveDynamicArgument(fn, undefined, { signal: controller.signal }),
    ).rejects.toThrow(/aborted/i);
  });
});

// ============================================================================
// Event Emission Tests
// ============================================================================

describe("ArgumentResolver - Events", () => {
  it("should emit resolution events", async () => {
    const resolver = new ArgumentResolver({ enableEvents: true });
    const events: string[] = [];

    resolver.on("resolution:start", () => events.push("start"));
    resolver.on("resolution:complete", () => events.push("complete"));

    await resolver.resolve("static-value");

    expect(events).toContain("start");
    expect(events).toContain("complete");

    resolver.dispose();
  });

  it("should emit error events", async () => {
    const resolver = new ArgumentResolver({ enableEvents: true });
    let errorEvent: unknown = null;

    resolver.on("resolution:error", (e) => {
      errorEvent = e;
    });

    const failingFn: DynamicArgument<string> = () => {
      throw new Error("Test error");
    };

    await resolver.resolve(failingFn, undefined, { throwOnError: false });

    expect(errorEvent).toBeDefined();

    resolver.dispose();
  });
});

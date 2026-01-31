/**
 * DynamicArgumentRegistry Tests
 *
 * Tests for resolver registration, lookup, and lifecycle management.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DynamicArgumentRegistry,
  getArgumentRegistry,
  registerResolver,
  resolveRegistered,
  resolverRef,
} from "../../src/lib/arguments/DynamicArgumentRegistry.js";
import { createRequestContext } from "../../src/lib/arguments/ArgumentValidators.js";
import type { DynamicResolutionContext } from "../../src/lib/arguments/types/argumentTypes.js";

// ============================================================================
// Test Helpers
// ============================================================================

function createTestContext(): DynamicResolutionContext {
  return {
    requestContext: createRequestContext({
      user: { id: "user1", roles: ["admin"] },
      tenant: { id: "tenant1", plan: "enterprise" },
    }),
  };
}

// ============================================================================
// Registry Tests
// ============================================================================

describe("DynamicArgumentRegistry", () => {
  beforeEach(() => {
    DynamicArgumentRegistry.resetInstance();
  });

  afterEach(() => {
    DynamicArgumentRegistry.resetInstance();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = DynamicArgumentRegistry.getInstance();
      const instance2 = DynamicArgumentRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should reset instance correctly", () => {
      const instance1 = DynamicArgumentRegistry.getInstance();
      DynamicArgumentRegistry.resetInstance();
      const instance2 = DynamicArgumentRegistry.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("Registration", () => {
    it("should register a static resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("test-static", "static-value");

      expect(registry.hasResolver("test-static")).toBe(true);
    });

    it("should register a sync function resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("test-sync", () => "sync-value");

      expect(registry.hasResolver("test-sync")).toBe(true);
    });

    it("should register an async function resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("test-async", async () => "async-value");

      expect(registry.hasResolver("test-async")).toBe(true);
    });

    it("should register a context-aware resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register(
        "test-context",
        ({ requestContext }) => requestContext.user?.id || "unknown",
      );

      expect(registry.hasResolver("test-context")).toBe(true);
    });

    it("should throw when registering duplicate without override", () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("duplicate", "value1");

      expect(() => registry.register("duplicate", "value2")).toThrow(
        /already registered/i,
      );
    });

    it("should allow override when specified", () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("override-test", "value1");
      registry.register("override-test", "value2", { override: true });

      expect(registry.hasResolver("override-test")).toBe(true);
    });

    it("should register with metadata", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("with-meta", () => "value", {
        description: "Test resolver",
        tags: ["test", "meta"],
        version: "1.0.0",
      });

      const metadata = await registry.getMetadata("with-meta");
      expect(metadata?.description).toBe("Test resolver");
      expect(metadata?.tags).toContain("test");
      expect(metadata?.tags).toContain("meta");
      expect(metadata?.version).toBe("1.0.0");
    });
  });

  describe("Resolution", () => {
    it("should resolve static resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("static-res", "static-value");

      const result = await registry.resolve<string>("static-res");
      expect(result.value).toBe("static-value");
    });

    it("should resolve sync function resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("sync-res", () => "sync-value");

      const result = await registry.resolve<string>("sync-res");
      expect(result.value).toBe("sync-value");
    });

    it("should resolve async function resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("async-res", async () => "async-value");

      const result = await registry.resolve<string>("async-res");
      expect(result.value).toBe("async-value");
    });

    it("should resolve context-aware resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register(
        "context-res",
        ({ requestContext }) => requestContext.user?.id || "unknown",
      );

      const context = createTestContext();
      const result = await registry.resolve<string>("context-res", context);
      expect(result.value).toBe("user1");
    });

    it("should throw for non-existent resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();

      await expect(registry.resolve("non-existent")).rejects.toThrow(
        /not found/i,
      );
    });

    it("should use default options", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("default-opts", () => "value", {
        defaultOptions: { cache: true },
      });

      const result = await registry.resolve<string>("default-opts");
      expect(result.value).toBe("value");
    });
  });

  describe("Unregistration", () => {
    it("should unregister resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("to-remove", "value");

      expect(registry.hasResolver("to-remove")).toBe(true);

      const removed = registry.unregister("to-remove");
      expect(removed).toBe(true);
      expect(registry.hasResolver("to-remove")).toBe(false);
    });

    it("should return false for non-existent resolver", () => {
      const registry = DynamicArgumentRegistry.getInstance();
      const removed = registry.unregister("non-existent");
      expect(removed).toBe(false);
    });
  });

  describe("Listing and Filtering", () => {
    beforeEach(async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      await registry.ensureInitialized();

      registry.register("sync-a", () => "a", { tags: ["sync", "alpha"] });
      registry.register("sync-b", () => "b", { tags: ["sync", "beta"] });
      registry.register("async-a", async () => "a", {
        tags: ["async", "alpha"],
      });
      registry.register(
        "context-a",
        ({ requestContext }) => requestContext.user?.id,
        { tags: ["context", "alpha"] },
      );
    });

    it("should list all resolvers", () => {
      const registry = DynamicArgumentRegistry.getInstance();
      const all = registry.listResolvers();

      // Includes built-ins + custom
      expect(all.length).toBeGreaterThanOrEqual(4);
    });

    it("should filter by tags", () => {
      const registry = DynamicArgumentRegistry.getInstance();
      const alphas = registry.listResolvers({ tags: ["alpha"] });

      expect(alphas.length).toBe(3);
      expect(alphas.every((r) => r.metadata.tags?.includes("alpha"))).toBe(
        true,
      );
    });

    it("should filter by async", () => {
      const registry = DynamicArgumentRegistry.getInstance();
      const asyncResolvers = registry.listResolvers({ isAsync: true });

      expect(asyncResolvers.every((r) => r.metadata.isAsync)).toBe(true);
    });

    it("should filter by context requirement", () => {
      const registry = DynamicArgumentRegistry.getInstance();
      const contextAware = registry.listResolvers({ requiresContext: true });

      expect(contextAware.every((r) => r.metadata.requiresContext)).toBe(true);
    });

    it("should filter by name pattern", () => {
      const registry = DynamicArgumentRegistry.getInstance();
      const syncs = registry.listResolvers({ namePattern: /^sync-/ });

      expect(syncs.length).toBe(2);
      expect(syncs.every((r) => r.id.startsWith("sync-"))).toBe(true);
    });

    it("should get by tag", () => {
      const registry = DynamicArgumentRegistry.getInstance();
      const betas = registry.getByTag("beta");

      expect(betas.length).toBe(1);
      expect(betas[0].id).toBe("sync-b");
    });
  });

  describe("Reference Creation", () => {
    it("should create resolver reference", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("ref-test", () => "ref-value");

      const ref = registry.createRef<string>("ref-test");
      expect(typeof ref).toBe("function");

      const context = createTestContext();
      const value = await ref(context);
      expect(value).toBe("ref-value");
    });
  });

  describe("Composition", () => {
    it("should compose multiple resolvers", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("comp-a", () => 1);
      registry.register("comp-b", () => 2);
      registry.register("comp-c", () => 3);

      const composed = registry.compose(
        ["comp-a", "comp-b", "comp-c"],
        (results) => results.reduce((a, b) => a + b, 0),
      );

      const context = createTestContext();
      const result = await composed(context);
      expect(result).toBe(6);
    });

    it("should chain resolvers with fallback", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      registry.register("chain-empty", () => undefined);
      registry.register("chain-null", () => null);
      registry.register("chain-value", () => "found-value");

      const chained = registry.chain<string>(
        "chain-empty",
        "chain-null",
        "chain-value",
      );

      const context = createTestContext();
      const result = await chained(context);
      expect(result).toBe("found-value");
    });
  });

  describe("Built-in Resolvers", () => {
    it("should have timestamp resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      await registry.ensureInitialized();

      const result = await registry.resolve<number>("timestamp");
      expect(typeof result.value).toBe("number");
      expect(result.value).toBeLessThanOrEqual(Date.now());
    });

    it("should have request-id resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      await registry.ensureInitialized();

      const context = createTestContext();
      const result = await registry.resolve<string>("request-id", context);
      expect(result.value).toBe(context.requestContext.requestId);
    });

    it("should have user-id resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      await registry.ensureInitialized();

      const context = createTestContext();
      const result = await registry.resolve<string>("user-id", context);
      expect(result.value).toBe("user1");
    });

    it("should have tenant-id resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      await registry.ensureInitialized();

      const context = createTestContext();
      const result = await registry.resolve<string>("tenant-id", context);
      expect(result.value).toBe("tenant1");
    });

    it("should have tenant-plan resolver", async () => {
      const registry = DynamicArgumentRegistry.getInstance();
      await registry.ensureInitialized();

      const context = createTestContext();
      const result = await registry.resolve<string>("tenant-plan", context);
      expect(result.value).toBe("enterprise");
    });
  });
});

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe("Registry Convenience Functions", () => {
  beforeEach(() => {
    DynamicArgumentRegistry.resetInstance();
  });

  afterEach(() => {
    DynamicArgumentRegistry.resetInstance();
  });

  describe("getArgumentRegistry", () => {
    it("should return the singleton registry", () => {
      const registry = getArgumentRegistry();
      expect(registry).toBe(DynamicArgumentRegistry.getInstance());
    });
  });

  describe("registerResolver", () => {
    it("should register in global registry", () => {
      registerResolver("global-test", "value");

      const registry = getArgumentRegistry();
      expect(registry.hasResolver("global-test")).toBe(true);
    });
  });

  describe("resolveRegistered", () => {
    it("should resolve from global registry", async () => {
      registerResolver("resolve-test", () => "resolved");

      const result = await resolveRegistered<string>("resolve-test");
      expect(result.value).toBe("resolved");
    });
  });

  describe("resolverRef", () => {
    it("should create reference from global registry", async () => {
      registerResolver("ref-global", () => "ref-value");

      const ref = resolverRef<string>("ref-global");
      const context = {
        requestContext: createRequestContext(),
      };

      const value = await ref(context);
      expect(value).toBe("ref-value");
    });
  });
});

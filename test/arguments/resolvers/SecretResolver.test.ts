/**
 * SecretResolver Tests
 *
 * Tests for secure secret resolution utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  SecretManager,
  envSecretProvider,
  createMockSecretProvider,
  createFileSecretProvider,
  fromSecret,
  fromSecretOptional,
  fromApiKey,
  fromTenantSecret,
  fromUserSecret,
  fromSecretChain,
  fromSecretWithTenantFallback,
  validateSecrets,
  assertSecrets,
  getSecretSync,
  requireSecretSync,
  configureSecrets,
} from "../../../src/lib/arguments/resolvers/SecretResolver.js";
import { resolveDynamicArgument } from "../../../src/lib/arguments/ArgumentResolver.js";
import { createRequestContext } from "../../../src/lib/arguments/ArgumentValidators.js";
import type { DynamicResolutionContext } from "../../../src/lib/arguments/types/argumentTypes.js";

// ============================================================================
// Test Setup
// ============================================================================

const originalEnv: Record<string, string | undefined> = {};

function setEnv(key: string, value: string): void {
  if (!(key in originalEnv)) {
    originalEnv[key] = process.env[key];
  }
  process.env[key] = value;
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function createTestContext(
  overrides: Partial<{
    userId: string;
    tenantId: string;
    tenantPlan: "free" | "starter" | "pro" | "enterprise";
  }> = {},
): DynamicResolutionContext {
  return {
    requestContext: createRequestContext({
      user: { id: overrides.userId || "user1" },
      tenant: {
        id: overrides.tenantId || "tenant1",
        plan: overrides.tenantPlan || "pro",
      },
    }),
  };
}

// ============================================================================
// Secret Provider Tests
// ============================================================================

describe("SecretResolver - Providers", () => {
  afterEach(() => {
    SecretManager.resetInstance();
    restoreEnv();
  });

  describe("envSecretProvider", () => {
    it("should get secret from environment", async () => {
      setEnv("ENV_SECRET", "secret-value");

      const value = await envSecretProvider.getSecret("ENV_SECRET");
      expect(value).toBe("secret-value");
    });

    it("should return undefined for missing", async () => {
      const value = await envSecretProvider.getSecret("MISSING_SECRET");
      expect(value).toBeUndefined();
    });

    it("should always be available", async () => {
      const available = await envSecretProvider.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe("createMockSecretProvider", () => {
    it("should provide mock secrets", async () => {
      const provider = createMockSecretProvider({
        API_KEY: "mock-api-key",
        DB_PASSWORD: "mock-password",
      });

      expect(await provider.getSecret("API_KEY")).toBe("mock-api-key");
      expect(await provider.getSecret("DB_PASSWORD")).toBe("mock-password");
      expect(await provider.getSecret("MISSING")).toBeUndefined();
    });

    it("should list available secrets", async () => {
      const provider = createMockSecretProvider({
        SECRET_1: "value1",
        SECRET_2: "value2",
      });

      const secrets = await provider.listSecrets?.();
      expect(secrets).toContain("SECRET_1");
      expect(secrets).toContain("SECRET_2");
    });
  });
});

// ============================================================================
// SecretManager Tests
// ============================================================================

describe("SecretResolver - SecretManager", () => {
  beforeEach(() => {
    SecretManager.resetInstance();
  });

  afterEach(() => {
    SecretManager.resetInstance();
    restoreEnv();
  });

  describe("Singleton Pattern", () => {
    it("should return same instance", () => {
      const instance1 = SecretManager.getInstance();
      const instance2 = SecretManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should reset instance correctly", () => {
      const instance1 = SecretManager.getInstance();
      SecretManager.resetInstance();
      const instance2 = SecretManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("Secret Resolution", () => {
    it("should resolve from environment by default", async () => {
      setEnv("MANAGER_SECRET", "manager-value");

      const manager = SecretManager.getInstance();
      const result = await manager.getSecret("MANAGER_SECRET");

      expect(result.value).toBe("manager-value");
      expect(result.provider).toBe("env");
    });

    it("should return undefined for missing secret", async () => {
      const manager = SecretManager.getInstance();
      const result = await manager.getSecret("MISSING");

      expect(result.value).toBeUndefined();
      expect(result.provider).toBe("none");
    });

    it("should require secret or throw", async () => {
      const manager = SecretManager.getInstance();

      await expect(manager.requireSecret("MISSING")).rejects.toThrow(
        /not found/i,
      );
    });

    it("should require and return existing secret", async () => {
      setEnv("REQUIRED_SECRET", "required-value");

      const manager = SecretManager.getInstance();
      const value = await manager.requireSecret("REQUIRED_SECRET");

      expect(value).toBe("required-value");
    });
  });

  describe("Provider Management", () => {
    it("should add provider with priority", async () => {
      const manager = SecretManager.getInstance();
      const mockProvider = createMockSecretProvider({
        MOCK_SECRET: "mock-value",
      });

      manager.addProvider(mockProvider, "first");

      const result = await manager.getSecret("MOCK_SECRET");
      expect(result.value).toBe("mock-value");
      expect(result.provider).toBe("mock");
    });

    it("should remove provider", () => {
      const manager = SecretManager.getInstance();
      const mockProvider = createMockSecretProvider({});

      manager.addProvider(mockProvider);
      expect(manager.getProviders()).toContain("mock");

      manager.removeProvider("mock");
      expect(manager.getProviders()).not.toContain("mock");
    });

    it("should try providers in order", async () => {
      setEnv("FALLBACK_SECRET", "env-value");

      const manager = SecretManager.getInstance();
      const emptyProvider = createMockSecretProvider({});

      manager.addProvider(emptyProvider, "first");

      const result = await manager.getSecret("FALLBACK_SECRET");
      expect(result.value).toBe("env-value");
      expect(result.provider).toBe("env");
    });
  });

  describe("Caching", () => {
    it("should cache resolved secrets", async () => {
      setEnv("CACHED_SECRET", "cached-value");

      const manager = SecretManager.getInstance({
        enableCache: true,
        cacheTtl: 10000,
      });

      const result1 = await manager.getSecret("CACHED_SECRET");
      const result2 = await manager.getSecret("CACHED_SECRET");

      expect(result1.fromCache).toBe(false);
      expect(result2.fromCache).toBe(true);
    });

    it("should invalidate cache entry", async () => {
      setEnv("INVALIDATE_SECRET", "value");

      const manager = SecretManager.getInstance({ enableCache: true });
      await manager.getSecret("INVALIDATE_SECRET");

      const invalidated = manager.invalidate("INVALIDATE_SECRET");
      expect(invalidated).toBe(true);

      const result = await manager.getSecret("INVALIDATE_SECRET");
      expect(result.fromCache).toBe(false);
    });

    it("should clear all cache", async () => {
      setEnv("CLEAR_SECRET", "value");

      const manager = SecretManager.getInstance({ enableCache: true });
      await manager.getSecret("CLEAR_SECRET");

      manager.clearCache();

      const result = await manager.getSecret("CLEAR_SECRET");
      expect(result.fromCache).toBe(false);
    });
  });
});

// ============================================================================
// Dynamic Argument Factory Tests
// ============================================================================

describe("SecretResolver - Dynamic Argument Factories", () => {
  afterEach(() => {
    SecretManager.resetInstance();
    restoreEnv();
  });

  describe("fromSecret", () => {
    it("should resolve required secret", async () => {
      setEnv("DA_SECRET", "da-secret-value");

      const arg = fromSecret("DA_SECRET");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("da-secret-value");
      expect(result.resolutionType).toBe("async-function");
    });

    it("should throw for missing secret", async () => {
      const arg = fromSecret("MISSING");

      await expect(resolveDynamicArgument(arg)).rejects.toThrow(/not found/i);
    });
  });

  describe("fromSecretOptional", () => {
    it("should resolve existing secret", async () => {
      setEnv("OPT_SECRET", "optional-value");

      const arg = fromSecretOptional("OPT_SECRET");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("optional-value");
    });

    it("should use default for missing", async () => {
      const arg = fromSecretOptional("MISSING", "default-secret");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("default-secret");
    });
  });

  describe("fromApiKey", () => {
    it("should resolve API key by provider name", async () => {
      setEnv("OPENAI_API_KEY", "sk-test-key");

      const arg = fromApiKey("openai");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("sk-test-key");
    });

    it("should throw for missing API key", async () => {
      const arg = fromApiKey("missing-provider");

      await expect(resolveDynamicArgument(arg)).rejects.toThrow();
    });
  });

  describe("fromTenantSecret", () => {
    it("should resolve tenant-specific secret", async () => {
      setEnv("TENANT_ACME_API_KEY", "acme-api-key");

      const context = createTestContext({ tenantId: "acme" });
      const arg = fromTenantSecret("API_KEY");
      const result = await resolveDynamicArgument(arg, context);

      expect(result.value).toBe("acme-api-key");
    });

    it("should throw without tenant ID", async () => {
      const context = {
        requestContext: createRequestContext({}),
      };

      const arg = fromTenantSecret("API_KEY");

      await expect(resolveDynamicArgument(arg, context)).rejects.toThrow(
        /tenant id required/i,
      );
    });
  });

  describe("fromUserSecret", () => {
    it("should resolve user-specific secret", async () => {
      setEnv("USER_JOHN_TOKEN", "john-token");

      const context = createTestContext({ userId: "john" });
      const arg = fromUserSecret("TOKEN");
      const result = await resolveDynamicArgument(arg, context);

      expect(result.value).toBe("john-token");
    });

    it("should throw without user ID", async () => {
      const context = {
        requestContext: createRequestContext({}),
      };

      const arg = fromUserSecret("TOKEN");

      await expect(resolveDynamicArgument(arg, context)).rejects.toThrow(
        /user id required/i,
      );
    });
  });

  describe("fromSecretChain", () => {
    it("should return first available secret", async () => {
      setEnv("CHAIN_KEY_2", "second-key");

      const arg = fromSecretChain([
        "CHAIN_KEY_1",
        "CHAIN_KEY_2",
        "CHAIN_KEY_3",
      ]);
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("second-key");
    });

    it("should throw when no secret found", async () => {
      const arg = fromSecretChain(["MISSING_1", "MISSING_2"]);

      await expect(resolveDynamicArgument(arg)).rejects.toThrow(
        /no secret found/i,
      );
    });
  });

  describe("fromSecretWithTenantFallback", () => {
    it("should prefer tenant-specific secret", async () => {
      setEnv("TENANT_CORP_API_KEY", "corp-key");
      setEnv("API_KEY", "global-key");

      const context = createTestContext({ tenantId: "corp" });
      const arg = fromSecretWithTenantFallback("API_KEY");
      const result = await resolveDynamicArgument(arg, context);

      expect(result.value).toBe("corp-key");
    });

    it("should fall back to global secret", async () => {
      setEnv("API_KEY", "global-key");

      const context = createTestContext({ tenantId: "no-specific" });
      const arg = fromSecretWithTenantFallback("API_KEY");
      const result = await resolveDynamicArgument(arg, context);

      expect(result.value).toBe("global-key");
    });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe("SecretResolver - Validation", () => {
  afterEach(() => {
    SecretManager.resetInstance();
    restoreEnv();
  });

  describe("validateSecrets", () => {
    it("should return valid for all present", async () => {
      setEnv("VAL_SECRET_1", "value1");
      setEnv("VAL_SECRET_2", "value2");

      const result = await validateSecrets(["VAL_SECRET_1", "VAL_SECRET_2"]);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should return invalid for missing", async () => {
      setEnv("VAL_SECRET_1", "value1");

      const result = await validateSecrets(["VAL_SECRET_1", "VAL_SECRET_2"]);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain("VAL_SECRET_2");
    });
  });

  describe("assertSecrets", () => {
    it("should not throw for all present", async () => {
      setEnv("ASSERT_SECRET", "value");

      await expect(assertSecrets(["ASSERT_SECRET"])).resolves.not.toThrow();
    });

    it("should throw for missing", async () => {
      await expect(assertSecrets(["MISSING"])).rejects.toThrow(
        /missing required secrets/i,
      );
    });
  });
});

// ============================================================================
// Sync Convenience Functions Tests
// ============================================================================

describe("SecretResolver - Sync Functions", () => {
  afterEach(restoreEnv);

  describe("getSecretSync", () => {
    it("should return environment variable", () => {
      setEnv("SYNC_SECRET", "sync-value");

      const value = getSecretSync("SYNC_SECRET");
      expect(value).toBe("sync-value");
    });

    it("should return undefined for missing", () => {
      const value = getSecretSync("MISSING");
      expect(value).toBeUndefined();
    });
  });

  describe("requireSecretSync", () => {
    it("should return existing secret", () => {
      setEnv("REQ_SYNC_SECRET", "required-sync");

      const value = requireSecretSync("REQ_SYNC_SECRET");
      expect(value).toBe("required-sync");
    });

    it("should throw for missing", () => {
      expect(() => requireSecretSync("MISSING")).toThrow(/not found/i);
    });
  });
});

// ============================================================================
// Configuration Tests
// ============================================================================

describe("SecretResolver - Configuration", () => {
  afterEach(() => {
    SecretManager.resetInstance();
    restoreEnv();
  });

  describe("configureSecrets", () => {
    it("should configure custom providers", async () => {
      const mockProvider = createMockSecretProvider({
        CUSTOM_SECRET: "custom-value",
      });

      configureSecrets({
        providers: [mockProvider],
      });

      const manager = SecretManager.getInstance();
      const result = await manager.getSecret("CUSTOM_SECRET");

      expect(result.value).toBe("custom-value");
      expect(result.provider).toBe("mock");
    });

    it("should configure cache settings", async () => {
      setEnv("CACHE_CONFIG_SECRET", "value");

      configureSecrets({
        enableCache: false,
      });

      const manager = SecretManager.getInstance();
      const result1 = await manager.getSecret("CACHE_CONFIG_SECRET");
      const result2 = await manager.getSecret("CACHE_CONFIG_SECRET");

      // Both should not be from cache
      expect(result1.fromCache).toBe(false);
      expect(result2.fromCache).toBe(false);
    });
  });
});

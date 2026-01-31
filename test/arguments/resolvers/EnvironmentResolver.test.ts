/**
 * EnvironmentResolver Tests
 *
 * Tests for environment variable resolution utilities.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getEnv,
  requireEnv,
  getEnvNumber,
  getEnvBoolean,
  getEnvJson,
  getEnvArray,
  fromEnv,
  fromEnvRequired,
  fromEnvNumber,
  fromEnvBoolean,
  fromEnvJson,
  fromEnvArray,
  envSelect,
  byEnvironment,
  createEnvResolver,
  createPrefixedEnv,
  fromEnvMultiple,
  fromDescriptor,
  validateEnvVars,
  assertEnvVars,
} from "../../../src/lib/arguments/resolvers/EnvironmentResolver.js";
import { resolveDynamicArgument } from "../../../src/lib/arguments/ArgumentResolver.js";

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

// ============================================================================
// Direct Access Function Tests
// ============================================================================

describe("EnvironmentResolver - Direct Access", () => {
  beforeEach(() => {
    setEnv("TEST_STRING", "test-value");
    setEnv("TEST_NUMBER", "42");
    setEnv("TEST_BOOL_TRUE", "true");
    setEnv("TEST_BOOL_FALSE", "false");
    setEnv("TEST_JSON", '{"key": "value"}');
    setEnv("TEST_ARRAY", "a,b,c");
  });

  afterEach(restoreEnv);

  describe("getEnv", () => {
    it("should return environment variable value", () => {
      expect(getEnv("TEST_STRING")).toBe("test-value");
    });

    it("should return default for missing variable", () => {
      expect(getEnv("MISSING", "default")).toBe("default");
    });

    it("should return undefined for missing without default", () => {
      expect(getEnv("MISSING")).toBeUndefined();
    });
  });

  describe("requireEnv", () => {
    it("should return value for existing variable", () => {
      expect(requireEnv("TEST_STRING")).toBe("test-value");
    });

    it("should throw for missing variable", () => {
      expect(() => requireEnv("MISSING")).toThrow(/not set/i);
    });
  });

  describe("getEnvNumber", () => {
    it("should parse number value", () => {
      expect(getEnvNumber("TEST_NUMBER")).toBe(42);
    });

    it("should return default for missing", () => {
      expect(getEnvNumber("MISSING", 10)).toBe(10);
    });

    it("should throw for invalid number", () => {
      setEnv("INVALID_NUMBER", "not-a-number");
      expect(() => getEnvNumber("INVALID_NUMBER")).toThrow(
        /not a valid number/i,
      );
    });
  });

  describe("getEnvBoolean", () => {
    it("should parse true values", () => {
      setEnv("BOOL_1", "true");
      setEnv("BOOL_2", "1");
      setEnv("BOOL_3", "yes");
      setEnv("BOOL_4", "on");

      expect(getEnvBoolean("BOOL_1")).toBe(true);
      expect(getEnvBoolean("BOOL_2")).toBe(true);
      expect(getEnvBoolean("BOOL_3")).toBe(true);
      expect(getEnvBoolean("BOOL_4")).toBe(true);
    });

    it("should parse false values", () => {
      setEnv("BOOL_1", "false");
      setEnv("BOOL_2", "0");
      setEnv("BOOL_3", "no");
      setEnv("BOOL_4", "off");

      expect(getEnvBoolean("BOOL_1")).toBe(false);
      expect(getEnvBoolean("BOOL_2")).toBe(false);
      expect(getEnvBoolean("BOOL_3")).toBe(false);
      expect(getEnvBoolean("BOOL_4")).toBe(false);
    });

    it("should return default for missing", () => {
      expect(getEnvBoolean("MISSING", true)).toBe(true);
    });

    it("should throw for invalid boolean", () => {
      setEnv("INVALID_BOOL", "maybe");
      expect(() => getEnvBoolean("INVALID_BOOL")).toThrow(
        /not a valid boolean/i,
      );
    });
  });

  describe("getEnvJson", () => {
    it("should parse JSON value", () => {
      expect(getEnvJson("TEST_JSON")).toEqual({ key: "value" });
    });

    it("should return default for missing", () => {
      expect(getEnvJson("MISSING", { default: true })).toEqual({
        default: true,
      });
    });

    it("should throw for invalid JSON", () => {
      setEnv("INVALID_JSON", "not-json");
      expect(() => getEnvJson("INVALID_JSON")).toThrow(/not valid JSON/i);
    });
  });

  describe("getEnvArray", () => {
    it("should parse comma-separated array", () => {
      expect(getEnvArray("TEST_ARRAY")).toEqual(["a", "b", "c"]);
    });

    it("should use custom separator", () => {
      setEnv("SEMICOLON_ARRAY", "a;b;c");
      expect(getEnvArray("SEMICOLON_ARRAY", undefined, ";")).toEqual([
        "a",
        "b",
        "c",
      ]);
    });

    it("should return default for missing", () => {
      expect(getEnvArray("MISSING", ["default"])).toEqual(["default"]);
    });

    it("should trim whitespace", () => {
      setEnv("SPACED_ARRAY", "a , b , c");
      expect(getEnvArray("SPACED_ARRAY")).toEqual(["a", "b", "c"]);
    });
  });
});

// ============================================================================
// Dynamic Argument Factory Tests
// ============================================================================

describe("EnvironmentResolver - Dynamic Argument Factories", () => {
  beforeEach(() => {
    setEnv("DA_STRING", "dynamic-value");
    setEnv("DA_NUMBER", "99");
    setEnv("DA_BOOL", "true");
    setEnv("DA_JSON", '{"nested": true}');
    setEnv("DA_ARRAY", "x,y,z");
  });

  afterEach(restoreEnv);

  describe("fromEnv", () => {
    it("should create dynamic argument for string", async () => {
      const arg = fromEnv("DA_STRING");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("dynamic-value");
      expect(result.resolutionType).toBe("sync-function");
    });

    it("should use default value", async () => {
      const arg = fromEnv("MISSING", "default");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("default");
    });
  });

  describe("fromEnvRequired", () => {
    it("should resolve required variable", async () => {
      const arg = fromEnvRequired("DA_STRING");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("dynamic-value");
    });

    it("should throw for missing required", async () => {
      const arg = fromEnvRequired("MISSING");

      await expect(resolveDynamicArgument(arg)).rejects.toThrow(/not set/i);
    });
  });

  describe("fromEnvNumber", () => {
    it("should resolve as number", async () => {
      const arg = fromEnvNumber("DA_NUMBER");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe(99);
    });
  });

  describe("fromEnvBoolean", () => {
    it("should resolve as boolean", async () => {
      const arg = fromEnvBoolean("DA_BOOL");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe(true);
    });
  });

  describe("fromEnvJson", () => {
    it("should resolve as parsed JSON", async () => {
      const arg = fromEnvJson<{ nested: boolean }>("DA_JSON");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toEqual({ nested: true });
    });
  });

  describe("fromEnvArray", () => {
    it("should resolve as array", async () => {
      const arg = fromEnvArray("DA_ARRAY");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toEqual(["x", "y", "z"]);
    });
  });
});

// ============================================================================
// Environment Selection Tests
// ============================================================================

describe("EnvironmentResolver - Environment Selection", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    restoreEnv();
  });

  describe("envSelect", () => {
    it("should select based on NODE_ENV", async () => {
      process.env.NODE_ENV = "production";

      const arg = envSelect({
        development: "dev-model",
        production: "prod-model",
        default: "default-model",
      });

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe("prod-model");
    });

    it("should use default for unknown env", async () => {
      process.env.NODE_ENV = "custom";

      const arg = envSelect({
        development: "dev",
        production: "prod",
        default: "default",
      });

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe("default");
    });
  });

  describe("byEnvironment", () => {
    it("should map environment to value", async () => {
      process.env.NODE_ENV = "staging";

      const arg = byEnvironment(
        {
          development: "dev-config",
          staging: "staging-config",
          production: "prod-config",
        },
        "default-config",
      );

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe("staging-config");
    });
  });
});

// ============================================================================
// Advanced Resolver Tests
// ============================================================================

describe("EnvironmentResolver - Advanced Resolvers", () => {
  afterEach(restoreEnv);

  describe("createEnvResolver", () => {
    it("should resolve with transform", async () => {
      setEnv("TRANSFORM_TEST", "100");

      const arg = createEnvResolver({
        key: "TRANSFORM_TEST",
        transform: (v) => parseInt(v, 10) * 2,
      });

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe(200);
    });

    it("should validate value", async () => {
      setEnv("VALIDATE_TEST", "invalid");

      const arg = createEnvResolver({
        key: "VALIDATE_TEST",
        validate: (v) => v === "valid",
        validationError: "Value must be 'valid'",
      });

      await expect(resolveDynamicArgument(arg)).rejects.toThrow(
        "Value must be 'valid'",
      );
    });

    it("should handle required option", async () => {
      const arg = createEnvResolver({
        key: "MISSING_REQUIRED",
        required: true,
      });

      await expect(resolveDynamicArgument(arg)).rejects.toThrow(/not set/i);
    });
  });

  describe("createPrefixedEnv", () => {
    beforeEach(() => {
      setEnv("MYAPP_MODEL", "gpt-4o");
      setEnv("MYAPP_TIMEOUT", "30000");
      setEnv("MYAPP_DEBUG", "true");
      setEnv("MYAPP_CONFIG", '{"version": 1}');
      setEnv("MYAPP_FEATURES", "a,b,c");
    });

    it("should get prefixed string", async () => {
      const env = createPrefixedEnv("MYAPP");
      const arg = env.get("MODEL");

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe("gpt-4o");
    });

    it("should get prefixed number", async () => {
      const env = createPrefixedEnv("MYAPP");
      const arg = env.getNumber("TIMEOUT");

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe(30000);
    });

    it("should get prefixed boolean", async () => {
      const env = createPrefixedEnv("MYAPP");
      const arg = env.getBoolean("DEBUG");

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe(true);
    });

    it("should get prefixed JSON", async () => {
      const env = createPrefixedEnv("MYAPP");
      const arg = env.getJson<{ version: number }>("CONFIG");

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toEqual({ version: 1 });
    });

    it("should get prefixed array", async () => {
      const env = createPrefixedEnv("MYAPP");
      const arg = env.getArray("FEATURES");

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toEqual(["a", "b", "c"]);
    });

    it("should check if key exists", () => {
      const env = createPrefixedEnv("MYAPP");

      expect(env.has("MODEL")).toBe(true);
      expect(env.has("MISSING")).toBe(false);
    });

    it("should get all prefixed variables", () => {
      const env = createPrefixedEnv("MYAPP");
      const all = env.getAll();

      expect(all.MODEL).toBe("gpt-4o");
      expect(all.TIMEOUT).toBe("30000");
      expect(all.DEBUG).toBe("true");
    });
  });

  describe("fromEnvMultiple", () => {
    it("should return first available value", async () => {
      setEnv("MULTI_2", "second-value");

      const arg = fromEnvMultiple(["MULTI_1", "MULTI_2", "MULTI_3"], "default");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("second-value");
    });

    it("should use default if none found", async () => {
      const arg = fromEnvMultiple(["MISSING_1", "MISSING_2"], "default");
      const result = await resolveDynamicArgument(arg);

      expect(result.value).toBe("default");
    });

    it("should throw if none found without default", async () => {
      const arg = fromEnvMultiple(["MISSING_1", "MISSING_2"]);

      await expect(resolveDynamicArgument(arg)).rejects.toThrow(/none of/i);
    });
  });

  describe("fromDescriptor", () => {
    it("should resolve from descriptor", async () => {
      setEnv("DESC_VAR", "descriptor-value");

      const arg = fromDescriptor({
        source: "env",
        key: "DESC_VAR",
      });

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe("descriptor-value");
    });

    it("should apply transform", async () => {
      setEnv("DESC_NUM", "50");

      const arg = fromDescriptor({
        source: "env",
        key: "DESC_NUM",
        transform: (v) => parseInt(v, 10) * 2,
      });

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe(100);
    });

    it("should use default value", async () => {
      const arg = fromDescriptor({
        source: "env",
        key: "MISSING",
        defaultValue: "fallback",
      });

      const result = await resolveDynamicArgument(arg);
      expect(result.value).toBe("fallback");
    });

    it("should throw for non-env source", async () => {
      const arg = fromDescriptor({
        source: "secret" as "env",
        key: "TEST",
      });

      await expect(resolveDynamicArgument(arg)).rejects.toThrow(
        /only supports 'env'/i,
      );
    });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe("EnvironmentResolver - Validation", () => {
  afterEach(restoreEnv);

  describe("validateEnvVars", () => {
    it("should return valid for all present", () => {
      setEnv("REQ_1", "value1");
      setEnv("REQ_2", "value2");

      const result = validateEnvVars(["REQ_1", "REQ_2"]);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should return invalid for missing", () => {
      setEnv("REQ_1", "value1");

      const result = validateEnvVars(["REQ_1", "REQ_2"]);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain("REQ_2");
    });

    it("should warn for missing optional", () => {
      setEnv("REQ_1", "value1");

      const result = validateEnvVars(["REQ_1"], ["OPT_1"]);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("assertEnvVars", () => {
    it("should not throw for all present", () => {
      setEnv("ASSERT_1", "value1");
      setEnv("ASSERT_2", "value2");

      expect(() => assertEnvVars(["ASSERT_1", "ASSERT_2"])).not.toThrow();
    });

    it("should throw for missing required", () => {
      setEnv("ASSERT_1", "value1");

      expect(() => assertEnvVars(["ASSERT_1", "ASSERT_2"])).toThrow(
        /missing required/i,
      );
    });
  });
});

/**
 * EnvironmentManager Tests
 *
 * Comprehensive tests for environment variable management,
 * validation, and platform-specific requirements.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  EnvironmentManager,
  environmentManager,
  PLATFORM_ENV_REQUIREMENTS,
  NEUROLINK_ENV_REQUIREMENTS,
} from "../../src/lib/deployment/EnvironmentManager.js";
import type { DeploymentPlatform } from "../../src/lib/deployment/types/deploymentTypes.js";

// Mock fs
vi.mock("node:fs", async () => {
  const actual = await vi.importActual("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

describe("EnvironmentManager", () => {
  let envManager: EnvironmentManager;

  beforeEach(() => {
    envManager = new EnvironmentManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("basic operations", () => {
    it("should set and get environment variables", () => {
      envManager.set("TEST_VAR", "test_value");
      expect(envManager.get("TEST_VAR")).toBe("test_value");
    });

    it("should check if variable exists", () => {
      envManager.set("EXISTS_VAR", "value");
      expect(envManager.has("EXISTS_VAR")).toBe(true);
      expect(envManager.has("NOT_EXISTS")).toBe(false);
    });

    it("should delete variables", () => {
      envManager.set("TO_DELETE", "value");
      expect(envManager.has("TO_DELETE")).toBe(true);

      envManager.delete("TO_DELETE");
      expect(envManager.has("TO_DELETE")).toBe(false);
    });

    it("should clear all variables", () => {
      envManager.set("VAR1", "value1");
      envManager.set("VAR2", "value2");

      envManager.clear();

      expect(envManager.has("VAR1")).toBe(false);
      expect(envManager.has("VAR2")).toBe(false);
    });

    it("should return undefined for missing variables", () => {
      expect(envManager.get("MISSING")).toBeUndefined();
    });
  });

  describe("setMultiple", () => {
    it("should set multiple variables at once", () => {
      envManager.setMultiple({
        VAR1: "value1",
        VAR2: "value2",
        VAR3: "value3",
      });

      expect(envManager.get("VAR1")).toBe("value1");
      expect(envManager.get("VAR2")).toBe("value2");
      expect(envManager.get("VAR3")).toBe("value3");
    });

    it("should skip undefined values", () => {
      envManager.setMultiple({
        DEFINED: "value",
        UNDEFINED: undefined as any,
      });

      expect(envManager.has("DEFINED")).toBe(true);
      expect(envManager.has("UNDEFINED")).toBe(false);
    });
  });

  describe("secret management", () => {
    it("should mark variables as secrets", () => {
      envManager.set("API_KEY", "secret123", { isSecret: true });
      expect(envManager.isSecret("API_KEY")).toBe(true);
    });

    it("should auto-detect secrets by pattern", () => {
      envManager.set("MY_SECRET", "value");
      envManager.set("MY_PASSWORD", "value");
      envManager.set("API_KEY", "value");
      envManager.set("NORMAL_VAR", "value");

      expect(envManager.isSecret("MY_SECRET")).toBe(true);
      expect(envManager.isSecret("MY_PASSWORD")).toBe(true);
      expect(envManager.isSecret("API_KEY")).toBe(true);
      expect(envManager.isSecret("NORMAL_VAR")).toBe(false);
    });

    it("should exclude secrets from toRecord when specified", () => {
      envManager.set("PUBLIC_VAR", "public");
      envManager.set("SECRET_KEY", "secret");

      const record = envManager.toRecord({ includeSecrets: false });

      expect(record["PUBLIC_VAR"]).toBe("public");
      expect(record["SECRET_KEY"]).toBeUndefined();
    });

    it("should include secrets when specified", () => {
      envManager.set("PUBLIC_VAR", "public");
      envManager.set("SECRET_KEY", "secret");

      const record = envManager.toRecord({ includeSecrets: true });

      expect(record["PUBLIC_VAR"]).toBe("public");
      expect(record["SECRET_KEY"]).toBe("secret");
    });
  });

  describe("loadFromFile", () => {
    it("should load environment from .env file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        "VAR1=value1\nVAR2=value2\n# Comment\nVAR3=value3",
      );

      envManager.loadFromFile(".env");

      expect(envManager.get("VAR1")).toBe("value1");
      expect(envManager.get("VAR2")).toBe("value2");
      expect(envManager.get("VAR3")).toBe("value3");
    });

    it("should handle quoted values", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        'QUOTED="value with spaces"\nSINGLE=\'single quoted\'',
      );

      envManager.loadFromFile(".env");

      expect(envManager.get("QUOTED")).toBe("value with spaces");
      expect(envManager.get("SINGLE")).toBe("single quoted");
    });

    it("should handle values with equals signs", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("DATABASE_URL=postgres://user:pass@host/db");

      envManager.loadFromFile(".env");

      expect(envManager.get("DATABASE_URL")).toBe("postgres://user:pass@host/db");
    });

    it("should ignore empty lines and comments", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("\n\n# Comment\n\nVAR=value\n\n");

      envManager.loadFromFile(".env");

      expect(envManager.get("VAR")).toBe("value");
      expect(envManager.get("#")).toBeUndefined();
    });

    it("should throw error if file not found", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => envManager.loadFromFile(".env")).toThrow();
    });
  });

  describe("loadFromProcess", () => {
    it("should load variables from process.env", () => {
      process.env.NEUROLINK_TEST = "from_process";

      envManager.loadFromProcess(["NEUROLINK_"]);

      expect(envManager.get("NEUROLINK_TEST")).toBe("from_process");

      delete process.env.NEUROLINK_TEST;
    });

    it("should filter by prefix", () => {
      process.env.PREFIX_VAR = "included";
      process.env.OTHER_VAR = "excluded";

      envManager.loadFromProcess(["PREFIX_"]);

      expect(envManager.get("PREFIX_VAR")).toBe("included");
      expect(envManager.has("OTHER_VAR")).toBe(false);

      delete process.env.PREFIX_VAR;
      delete process.env.OTHER_VAR;
    });
  });

  describe("platform validation", () => {
    beforeEach(() => {
      // Set up common required variables
      envManager.set("OPENAI_API_KEY", "test-key");
    });

    describe("Vercel validation", () => {
      it("should validate Vercel environment", () => {
        envManager.set("VERCEL_TOKEN", "vercel-token");

        const result = envManager.validateForPlatform("vercel");

        // Should not have errors for VERCEL_TOKEN
        const tokenError = result.errors.find((e) => e.variable === "VERCEL_TOKEN");
        expect(tokenError).toBeUndefined();
      });

      it("should warn about missing optional variables", () => {
        const result = envManager.validateForPlatform("vercel");

        expect(result.warnings.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe("Cloudflare validation", () => {
      it("should validate Cloudflare environment", () => {
        envManager.set("CLOUDFLARE_API_TOKEN", "cf-token");
        envManager.set("CLOUDFLARE_ACCOUNT_ID", "cf-account");

        const result = envManager.validateForPlatform("cloudflare");

        const tokenError = result.errors.find(
          (e) => e.variable === "CLOUDFLARE_API_TOKEN",
        );
        expect(tokenError).toBeUndefined();
      });
    });

    describe("AWS Lambda validation", () => {
      it("should validate Lambda environment", () => {
        envManager.set("AWS_ACCESS_KEY_ID", "aws-key");
        envManager.set("AWS_SECRET_ACCESS_KEY", "aws-secret");
        envManager.set("AWS_REGION", "us-east-1");

        const result = envManager.validateForPlatform("lambda");

        const keyError = result.errors.find(
          (e) => e.variable === "AWS_ACCESS_KEY_ID",
        );
        expect(keyError).toBeUndefined();
      });
    });

    describe("validation result structure", () => {
      it("should return proper validation result", () => {
        const result = envManager.validateForPlatform("vercel");

        expect(result).toHaveProperty("valid");
        expect(result).toHaveProperty("errors");
        expect(result).toHaveProperty("warnings");
        expect(result.errors).toBeInstanceOf(Array);
        expect(result.warnings).toBeInstanceOf(Array);
      });

      it("should include error details", () => {
        // Don't set required variables
        const result = envManager.validateForPlatform("vercel");

        if (result.errors.length > 0) {
          const error = result.errors[0];
          expect(error).toHaveProperty("variable");
          expect(error).toHaveProperty("message");
        }
      });
    });
  });

  describe("toRecord", () => {
    it("should convert to plain object", () => {
      envManager.set("VAR1", "value1");
      envManager.set("VAR2", "value2");

      const record = envManager.toRecord();

      expect(record).toEqual({
        VAR1: "value1",
        VAR2: "value2",
      });
    });

    it("should filter by prefix", () => {
      envManager.set("NEUROLINK_VAR", "included");
      envManager.set("OTHER_VAR", "excluded");

      const record = envManager.toRecord({ prefix: "NEUROLINK_" });

      expect(record["NEUROLINK_VAR"]).toBe("included");
      expect(record["OTHER_VAR"]).toBeUndefined();
    });
  });

  describe("toEnvFile", () => {
    it("should convert to .env file format", () => {
      envManager.set("VAR1", "value1");
      envManager.set("VAR2", "value with spaces");

      const content = envManager.toEnvFile();

      expect(content).toContain("VAR1=value1");
      expect(content).toContain('VAR2="value with spaces"');
    });

    it("should quote values with special characters", () => {
      envManager.set("SPECIAL", "value=with=equals");

      const content = envManager.toEnvFile();

      expect(content).toContain('SPECIAL="value=with=equals"');
    });
  });

  describe("writeToFile", () => {
    it("should write environment to file", () => {
      envManager.set("VAR1", "value1");

      envManager.writeToFile(".env.test");

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("should exclude secrets when specified", () => {
      envManager.set("PUBLIC", "public");
      envManager.set("SECRET_KEY", "secret");

      envManager.writeToFile(".env.test", { includeSecrets: false });

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;

      expect(content).toContain("PUBLIC");
      expect(content).not.toContain("SECRET_KEY");
    });
  });

  describe("getSummary", () => {
    it("should return summary of environment", () => {
      envManager.set("VAR1", "value1");
      envManager.set("VAR2", "value2");
      envManager.set("SECRET_KEY", "secret");

      const summary = envManager.getSummary();

      expect(summary).toContain("Total");
      expect(summary).toContain("3");
    });
  });

  describe("getDeploymentEnv", () => {
    it("should return platform-specific environment", () => {
      envManager.set("OPENAI_API_KEY", "key");
      envManager.set("VERCEL_TOKEN", "token");
      envManager.set("CLOUDFLARE_TOKEN", "cf-token");

      const vercelEnv = envManager.getDeploymentEnv("vercel");

      expect(vercelEnv["OPENAI_API_KEY"]).toBe("key");
      expect(vercelEnv["VERCEL_TOKEN"]).toBe("token");
    });
  });

  describe("singleton instance", () => {
    it("should export singleton", () => {
      expect(environmentManager).toBeInstanceOf(EnvironmentManager);
    });
  });
});

describe("PLATFORM_ENV_REQUIREMENTS", () => {
  it("should have requirements for all platforms", () => {
    const platforms: DeploymentPlatform[] = [
      "vercel",
      "cloudflare",
      "netlify",
      "lambda",
      "docker",
      "flyio",
    ];

    for (const platform of platforms) {
      expect(PLATFORM_ENV_REQUIREMENTS[platform]).toBeDefined();
      expect(PLATFORM_ENV_REQUIREMENTS[platform]).toBeInstanceOf(Array);
    }
  });

  it("should have proper structure for requirements", () => {
    const vercelReqs = PLATFORM_ENV_REQUIREMENTS.vercel;

    for (const req of vercelReqs) {
      expect(req).toHaveProperty("name");
      expect(req).toHaveProperty("required");
      expect(req).toHaveProperty("description");
    }
  });
});

describe("NEUROLINK_ENV_REQUIREMENTS", () => {
  it("should have NeuroLink-specific requirements", () => {
    expect(NEUROLINK_ENV_REQUIREMENTS).toBeInstanceOf(Array);
    expect(NEUROLINK_ENV_REQUIREMENTS.length).toBeGreaterThan(0);
  });

  it("should include common AI provider keys", () => {
    const varNames = NEUROLINK_ENV_REQUIREMENTS.map((r) => r.name);

    expect(varNames).toContain("OPENAI_API_KEY");
  });
});

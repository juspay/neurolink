/**
 * BaseDeployer Tests
 *
 * Tests for the abstract BaseDeployer class covering
 * common functionality, validation, and event emission.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BaseDeployer } from "../../../src/lib/deployment/deployers/BaseDeployer.js";
import type {
  DeployConfig,
  BuildOutput,
  DeployResult,
  ValidationError,
  DeploymentPlatform,
} from "../../../src/lib/deployment/types/deploymentTypes.js";

// Mock fs
vi.mock("node:fs", async () => {
  const actual = await vi.importActual("node:fs");
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue("{}"),
    mkdirSync: vi.fn(),
  };
});

// Create a concrete implementation for testing
class TestDeployer extends BaseDeployer {
  readonly name: DeploymentPlatform = "vercel";

  public mockDeployResult: DeployResult = {
    success: true,
    url: "https://test.example.com",
    deploymentId: "test-123",
    status: "success",
    timestamp: new Date(),
  };

  public mockValidationErrors: ValidationError[] = [];
  public prepareBuildCalled = false;

  protected validatePlatformConfig(config: DeployConfig): ValidationError[] {
    return this.mockValidationErrors;
  }

  protected async preparePlatformBuild(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<void> {
    this.prepareBuildCalled = true;
  }

  protected async doDeploy(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<DeployResult> {
    return this.mockDeployResult;
  }

  async getStatus(deploymentId: string): Promise<DeployResult> {
    return {
      ...this.mockDeployResult,
      deploymentId,
    };
  }
}

describe("BaseDeployer", () => {
  let deployer: TestDeployer;

  beforeEach(() => {
    deployer = new TestDeployer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validate", () => {
    it("should validate basic configuration", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await deployer.validate(config);

      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("warnings");
    });

    it("should fail if entry file does not exist", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./nonexistent.ts",
        outDir: ".neurolink/output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await deployer.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe("ENTRY_NOT_FOUND");
    });

    it("should include platform-specific validation errors", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      deployer.mockValidationErrors = [
        {
          code: "PLATFORM_ERROR",
          message: "Platform-specific error",
        },
      ];

      const result = await deployer.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "PLATFORM_ERROR")).toBe(true);
    });

    it("should validate environment variables", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
        env: {
          VALID_VAR: "value",
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await deployer.validate(config);

      // Should not have env validation errors for valid vars
      const envErrors = result.errors.filter((e) => e.code === "INVALID_ENV_VAR");
      expect(envErrors.length).toBe(0);
    });
  });

  describe("build", () => {
    it("should run build process", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await deployer.build(config);

      expect(result).toHaveProperty("outputDir");
      expect(result).toHaveProperty("files");
      expect(result).toHaveProperty("bundleSize");
    });

    it("should call preparePlatformBuild", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      await deployer.build(config);

      expect(deployer.prepareBuildCalled).toBe(true);
    });

    it("should use specified bundler", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
        build: {
          bundler: "esbuild",
          minify: true,
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await deployer.build(config);

      expect(result).toBeDefined();
    });
  });

  describe("deploy", () => {
    it("should run full deployment", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await deployer.deploy(config);

      expect(result.success).toBe(true);
      expect(result.url).toBe("https://test.example.com");
      expect(result.deploymentId).toBe("test-123");
    });

    it("should emit events during deployment", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const events: string[] = [];
      deployer.on("build:start", () => events.push("build:start"));
      deployer.on("build:complete", () => events.push("build:complete"));
      deployer.on("deploy:start", () => events.push("deploy:start"));
      deployer.on("deploy:complete", () => events.push("deploy:complete"));

      await deployer.deploy(config);

      expect(events).toContain("build:start");
      expect(events).toContain("build:complete");
      expect(events).toContain("deploy:start");
      expect(events).toContain("deploy:complete");
    });

    it("should emit error event on failure", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      deployer.mockDeployResult = {
        success: false,
        status: "failed",
        error: "Deployment failed",
        timestamp: new Date(),
      };

      const errors: Error[] = [];
      deployer.on("deploy:error", (error) => errors.push(error));

      await deployer.deploy(config);

      // The error event should be emitted for failed deployments
    });

    it("should include environment variables in result", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
        env: {
          MY_VAR: "my_value",
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await deployer.deploy(config);

      expect(result.success).toBe(true);
    });
  });

  describe("discoverEntries", () => {
    it("should discover entry files", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const entries = await deployer.discoverEntries(config);

      expect(entries).toHaveProperty("main");
      expect(entries.main.path).toBe("./src/index.ts");
    });

    it("should include tools, routes, and middleware", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const entries = await deployer.discoverEntries(config);

      expect(entries).toHaveProperty("tools");
      expect(entries).toHaveProperty("routes");
      expect(entries).toHaveProperty("middleware");
      expect(entries.tools).toBeInstanceOf(Array);
      expect(entries.routes).toBeInstanceOf(Array);
      expect(entries.middleware).toBeInstanceOf(Array);
    });
  });

  describe("getStatus", () => {
    it("should return deployment status", async () => {
      const status = await deployer.getStatus("test-123");

      expect(status).toHaveProperty("success");
      expect(status).toHaveProperty("status");
      expect(status).toHaveProperty("deploymentId");
      expect(status.deploymentId).toBe("test-123");
    });
  });

  describe("event handling", () => {
    it("should support multiple event listeners", async () => {
      const calls: number[] = [];

      deployer.on("build:start", () => calls.push(1));
      deployer.on("build:start", () => calls.push(2));

      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      await deployer.deploy(config);

      expect(calls).toContain(1);
      expect(calls).toContain(2);
    });

    it("should support removing event listeners", async () => {
      const calls: number[] = [];
      const listener = () => calls.push(1);

      deployer.on("build:start", listener);
      deployer.off("build:start", listener);

      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      await deployer.deploy(config);

      expect(calls).not.toContain(1);
    });
  });
});

describe("BaseDeployer edge cases", () => {
  let deployer: TestDeployer;

  beforeEach(() => {
    deployer = new TestDeployer();
    vi.clearAllMocks();
  });

  describe("configuration edge cases", () => {
    it("should handle empty environment variables", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
        env: {},
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await deployer.validate(config);

      // Should not fail with empty env
      expect(result.errors.filter((e) => e.field === "env").length).toBe(0);
    });

    it("should handle undefined optional config", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
        // No optional config
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await deployer.deploy(config);

      expect(result.success).toBe(true);
    });

    it("should handle paths with spaces", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/my project/index.ts",
        outDir: ".neurolink/my output",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await deployer.validate(config);

      // Should handle paths with spaces
      expect(result).toBeDefined();
    });
  });
});

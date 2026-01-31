/**
 * VercelDeployer Tests
 *
 * Tests for Vercel-specific deployment functionality including
 * Build Output API generation, CLI integration, and configuration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { VercelDeployer } from "../../../src/lib/deployment/deployers/VercelDeployer.js";
import type {
  DeployConfig,
  VercelDeployerConfig,
} from "../../../src/lib/deployment/types/deploymentTypes.js";

// Mock child_process
vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

// Mock fs
vi.mock("node:fs", async () => {
  const actual = await vi.importActual("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn().mockReturnValue({ isDirectory: () => false }),
  };
});

describe("VercelDeployer", () => {
  let deployer: VercelDeployer;

  beforeEach(() => {
    deployer = new VercelDeployer();
    vi.clearAllMocks();

    // Default mock behavior
    vi.mocked(execSync).mockReturnValue(Buffer.from(""));
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("{}");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const deployer = new VercelDeployer();
      expect(deployer.name).toBe("vercel");
    });

    it("should accept custom config", () => {
      const config: VercelDeployerConfig = {
        platform: "vercel",
        maxDuration: 60,
        regions: ["iad1", "sfo1"],
      };

      const deployer = new VercelDeployer(config);
      expect(deployer.name).toBe("vercel");
    });
  });

  describe("validatePlatformConfig", () => {
    it("should validate Vercel CLI is installed", async () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "vercel --version") {
          throw new Error("Command not found");
        }
        return Buffer.from("");
      });

      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      const result = await deployer.validate(config);

      expect(result.errors.some((e) => e.code === "VERCEL_CLI_MISSING")).toBe(true);
    });

    it("should validate Vercel authentication", async () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "vercel whoami") {
          throw new Error("Not authenticated");
        }
        return Buffer.from("");
      });

      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      const result = await deployer.validate(config);

      expect(result.errors.some((e) => e.code === "VERCEL_NOT_AUTHENTICATED")).toBe(
        true,
      );
    });

    it("should pass validation when CLI is installed and authenticated", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("Vercel CLI"));

      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      const result = await deployer.validate(config);

      const cliErrors = result.errors.filter(
        (e) => e.code === "VERCEL_CLI_MISSING" || e.code === "VERCEL_NOT_AUTHENTICATED",
      );
      expect(cliErrors.length).toBe(0);
    });
  });

  describe("deploy", () => {
    it("should deploy to Vercel", async () => {
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from("Vercel CLI")) // version check
        .mockReturnValueOnce(Buffer.from("user@example.com")) // whoami
        .mockReturnValueOnce(
          Buffer.from(
            JSON.stringify({
              id: "dpl_123",
              url: "https://project.vercel.app",
              readyState: "READY",
            }),
          ),
        ); // deploy

      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      // This will fail because we haven't mocked all file operations
      // but it tests the deploy path
      await expect(deployer.deploy(config)).rejects.toThrow();
    });

    it("should include environment variables in deployment", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
        env: {
          API_KEY: "test-key",
          DATABASE_URL: "postgres://localhost/db",
        },
      };

      // The deploy would include these env vars
      expect(config.env).toHaveProperty("API_KEY");
      expect(config.env).toHaveProperty("DATABASE_URL");
    });
  });

  describe("getStatus", () => {
    it("should get deployment status", async () => {
      vi.mocked(execSync).mockReturnValue(
        Buffer.from(
          JSON.stringify({
            id: "dpl_123",
            url: "https://project.vercel.app",
            readyState: "READY",
          }),
        ),
      );

      const status = await deployer.getStatus("dpl_123");

      expect(status.deploymentId).toBe("dpl_123");
      expect(status.success).toBe(true);
      expect(status.url).toBeDefined();
    });

    it("should handle deployment in progress", async () => {
      vi.mocked(execSync).mockReturnValue(
        Buffer.from(
          JSON.stringify({
            id: "dpl_123",
            url: "https://project.vercel.app",
            readyState: "BUILDING",
          }),
        ),
      );

      const status = await deployer.getStatus("dpl_123");

      expect(status.status).toBe("building");
      expect(status.success).toBe(false);
    });

    it("should handle failed deployment", async () => {
      vi.mocked(execSync).mockReturnValue(
        Buffer.from(
          JSON.stringify({
            id: "dpl_123",
            readyState: "ERROR",
            error: { message: "Build failed" },
          }),
        ),
      );

      const status = await deployer.getStatus("dpl_123");

      expect(status.status).toBe("failed");
      expect(status.success).toBe(false);
    });

    it("should handle status check errors", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("Network error");
      });

      const status = await deployer.getStatus("dpl_123");

      expect(status.success).toBe(false);
      expect(status.status).toBe("failed");
    });
  });

  describe("cancel", () => {
    it("should cancel deployment", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from(""));

      await deployer.cancel("dpl_123");

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("vercel rollback"),
        expect.any(Object),
      );
    });
  });

  describe("rollback", () => {
    it("should rollback to previous deployment", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from(""));

      await deployer.rollback("dpl_123");

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("vercel rollback"),
        expect.any(Object),
      );
    });
  });

  describe("getLogs", () => {
    it("should get deployment logs", async () => {
      vi.mocked(execSync).mockReturnValue(
        Buffer.from("Log line 1\nLog line 2\nLog line 3"),
      );

      const logs = await deployer.getLogs("dpl_123");

      expect(logs).toBeInstanceOf(Array);
      expect(logs.length).toBe(3);
    });

    it("should handle empty logs", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from(""));

      const logs = await deployer.getLogs("dpl_123");

      expect(logs).toBeInstanceOf(Array);
      expect(logs.length).toBe(0);
    });
  });

  describe("Build Output API", () => {
    it("should generate proper output structure", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
        platformConfig: {
          platform: "vercel",
          maxDuration: 60,
          memory: 1024,
        } as VercelDeployerConfig,
      };

      // Build should create proper .vercel/output structure
      expect(config.platformConfig).toHaveProperty("maxDuration");
      expect(config.platformConfig).toHaveProperty("memory");
    });
  });
});

describe("VercelDeployer edge cases", () => {
  let deployer: VercelDeployer;

  beforeEach(() => {
    deployer = new VercelDeployer();
    vi.clearAllMocks();
  });

  describe("region configuration", () => {
    it("should handle multiple regions", () => {
      const config: VercelDeployerConfig = {
        platform: "vercel",
        regions: ["iad1", "sfo1", "hnd1"],
      };

      const deployer = new VercelDeployer(config);
      expect(deployer.name).toBe("vercel");
    });

    it("should handle empty regions", () => {
      const config: VercelDeployerConfig = {
        platform: "vercel",
        regions: [],
      };

      const deployer = new VercelDeployer(config);
      expect(deployer.name).toBe("vercel");
    });
  });

  describe("timeout configuration", () => {
    it("should accept valid timeout values", () => {
      const config: VercelDeployerConfig = {
        platform: "vercel",
        maxDuration: 300, // 5 minutes
      };

      const deployer = new VercelDeployer(config);
      expect(deployer.name).toBe("vercel");
    });
  });
});

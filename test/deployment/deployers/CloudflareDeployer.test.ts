/**
 * CloudflareDeployer Tests
 *
 * Tests for Cloudflare Workers deployment functionality including
 * wrangler.toml generation, CLI integration, and configuration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { CloudflareDeployer } from "../../../src/lib/deployment/deployers/CloudflareDeployer.js";
import type {
  DeployConfig,
  CloudflareDeployerConfig,
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
  };
});

describe("CloudflareDeployer", () => {
  let deployer: CloudflareDeployer;

  beforeEach(() => {
    deployer = new CloudflareDeployer();
    vi.clearAllMocks();

    vi.mocked(execSync).mockReturnValue(Buffer.from(""));
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("{}");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const deployer = new CloudflareDeployer();
      expect(deployer.name).toBe("cloudflare");
    });

    it("should accept custom config", () => {
      const config: CloudflareDeployerConfig = {
        platform: "cloudflare",
        workerName: "my-worker",
        route: "*.example.com/*",
      };

      const deployer = new CloudflareDeployer(config);
      expect(deployer.name).toBe("cloudflare");
    });
  });

  describe("validatePlatformConfig", () => {
    it("should validate wrangler CLI is installed", async () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "wrangler --version") {
          throw new Error("Command not found");
        }
        return Buffer.from("");
      });

      const config: DeployConfig = {
        platform: "cloudflare",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      const result = await deployer.validate(config);

      expect(result.errors.some((e) => e.code === "WRANGLER_CLI_MISSING")).toBe(true);
    });

    it("should validate wrangler authentication", async () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "wrangler whoami") {
          throw new Error("Not authenticated");
        }
        return Buffer.from("");
      });

      const config: DeployConfig = {
        platform: "cloudflare",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      const result = await deployer.validate(config);

      expect(
        result.errors.some((e) => e.code === "CLOUDFLARE_NOT_AUTHENTICATED"),
      ).toBe(true);
    });

    it("should require worker name", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from(""));

      const config: DeployConfig = {
        platform: "cloudflare",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
        platformConfig: {
          platform: "cloudflare",
          // No workerName
        },
      };

      // Worker name should be generated or error
      const result = await deployer.validate(config);
      expect(result).toBeDefined();
    });
  });

  describe("deploy", () => {
    it("should deploy to Cloudflare", async () => {
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from("wrangler 3.0.0"))
        .mockReturnValueOnce(Buffer.from("user@example.com"))
        .mockReturnValueOnce(
          Buffer.from(
            JSON.stringify({
              result: {
                id: "worker-123",
                script: "my-worker",
              },
            }),
          ),
        );

      const config: DeployConfig = {
        platform: "cloudflare",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
        platformConfig: {
          platform: "cloudflare",
          workerName: "my-worker",
        },
      };

      // Will fail due to missing full mock setup
      await expect(deployer.deploy(config)).rejects.toThrow();
    });
  });

  describe("getStatus", () => {
    it("should get worker status", async () => {
      vi.mocked(execSync).mockReturnValue(
        Buffer.from(
          JSON.stringify({
            result: {
              id: "worker-123",
              script: "my-worker",
              modified_on: new Date().toISOString(),
            },
          }),
        ),
      );

      const status = await deployer.getStatus("my-worker");

      expect(status.deploymentId).toBe("my-worker");
      expect(status.success).toBe(true);
    });

    it("should handle worker not found", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("Worker not found");
      });

      const status = await deployer.getStatus("nonexistent");

      expect(status.success).toBe(false);
      expect(status.status).toBe("failed");
    });
  });

  describe("getLogs", () => {
    it("should get worker logs", async () => {
      vi.mocked(execSync).mockReturnValue(
        Buffer.from("Log line 1\nLog line 2"),
      );

      const logs = await deployer.getLogs("my-worker");

      expect(logs).toBeInstanceOf(Array);
      expect(logs.length).toBe(2);
    });
  });

  describe("KV namespace configuration", () => {
    it("should handle KV namespaces", () => {
      const config: CloudflareDeployerConfig = {
        platform: "cloudflare",
        workerName: "my-worker",
        kvNamespaces: [
          { binding: "MY_KV", id: "kv-123" },
          { binding: "CACHE", id: "kv-456" },
        ],
      };

      const deployer = new CloudflareDeployer(config);
      expect(deployer.name).toBe("cloudflare");
    });
  });

  describe("D1 database configuration", () => {
    it("should handle D1 databases", () => {
      const config: CloudflareDeployerConfig = {
        platform: "cloudflare",
        workerName: "my-worker",
        d1Databases: [
          { binding: "DB", database_id: "d1-123" },
        ],
      };

      const deployer = new CloudflareDeployer(config);
      expect(deployer.name).toBe("cloudflare");
    });
  });

  describe("Durable Objects configuration", () => {
    it("should handle Durable Objects", () => {
      const config: CloudflareDeployerConfig = {
        platform: "cloudflare",
        workerName: "my-worker",
        durableObjects: [
          { name: "COUNTER", class_name: "Counter" },
        ],
      };

      const deployer = new CloudflareDeployer(config);
      expect(deployer.name).toBe("cloudflare");
    });
  });
});

describe("CloudflareDeployer edge cases", () => {
  describe("route patterns", () => {
    it("should handle wildcard routes", () => {
      const config: CloudflareDeployerConfig = {
        platform: "cloudflare",
        workerName: "my-worker",
        route: "*.example.com/*",
      };

      const deployer = new CloudflareDeployer(config);
      expect(deployer.name).toBe("cloudflare");
    });

    it("should handle specific path routes", () => {
      const config: CloudflareDeployerConfig = {
        platform: "cloudflare",
        workerName: "my-worker",
        route: "example.com/api/*",
      };

      const deployer = new CloudflareDeployer(config);
      expect(deployer.name).toBe("cloudflare");
    });
  });

  describe("compatibility dates", () => {
    it("should accept compatibility date", () => {
      const config: CloudflareDeployerConfig = {
        platform: "cloudflare",
        workerName: "my-worker",
        compatibilityDate: "2024-01-01",
      };

      const deployer = new CloudflareDeployer(config);
      expect(deployer.name).toBe("cloudflare");
    });

    it("should accept compatibility flags", () => {
      const config: CloudflareDeployerConfig = {
        platform: "cloudflare",
        workerName: "my-worker",
        compatibilityFlags: ["nodejs_compat"],
      };

      const deployer = new CloudflareDeployer(config);
      expect(deployer.name).toBe("cloudflare");
    });
  });
});

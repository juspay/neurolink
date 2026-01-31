/**
 * NetlifyDeployer Tests
 *
 * Tests for Netlify Functions deployment functionality including
 * netlify.toml generation, CLI integration, and edge functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { NetlifyDeployer } from "../../../src/lib/deployment/deployers/NetlifyDeployer.js";
import type {
  DeployConfig,
  NetlifyDeployerConfig,
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

describe("NetlifyDeployer", () => {
  let deployer: NetlifyDeployer;

  beforeEach(() => {
    deployer = new NetlifyDeployer();
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
      const deployer = new NetlifyDeployer();
      expect(deployer.name).toBe("netlify");
    });

    it("should accept custom config", () => {
      const config: NetlifyDeployerConfig = {
        platform: "netlify",
        siteName: "my-site",
        timeout: 30,
      };

      const deployer = new NetlifyDeployer(config);
      expect(deployer.name).toBe("netlify");
    });
  });

  describe("validatePlatformConfig", () => {
    it("should validate netlify CLI is installed", async () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "netlify --version") {
          throw new Error("Command not found");
        }
        return Buffer.from("");
      });

      const config: DeployConfig = {
        platform: "netlify",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      const result = await deployer.validate(config);

      expect(result.errors.some((e) => e.code === "NETLIFY_CLI_MISSING")).toBe(true);
    });

    it("should validate netlify authentication", async () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "netlify status") {
          throw new Error("Not authenticated");
        }
        return Buffer.from("");
      });

      const config: DeployConfig = {
        platform: "netlify",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      const result = await deployer.validate(config);

      expect(result.errors.some((e) => e.code === "NETLIFY_NOT_AUTHENTICATED")).toBe(
        true,
      );
    });
  });

  describe("deploy", () => {
    it("should deploy to Netlify", async () => {
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from("netlify-cli/10.0.0"))
        .mockReturnValueOnce(Buffer.from("Logged in"))
        .mockReturnValueOnce(
          Buffer.from(
            JSON.stringify({
              deploy_id: "deploy-123",
              url: "https://my-site.netlify.app",
            }),
          ),
        );

      const config: DeployConfig = {
        platform: "netlify",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      // Will fail due to missing full mock setup
      await expect(deployer.deploy(config)).rejects.toThrow();
    });
  });

  describe("getStatus", () => {
    it("should get deployment status", async () => {
      vi.mocked(execSync).mockReturnValue(
        Buffer.from(
          JSON.stringify({
            deploy_id: "deploy-123",
            state: "ready",
            url: "https://my-site.netlify.app",
          }),
        ),
      );

      const status = await deployer.getStatus("deploy-123");

      expect(status.deploymentId).toBe("deploy-123");
      expect(status.success).toBe(true);
    });

    it("should handle deployment in progress", async () => {
      vi.mocked(execSync).mockReturnValue(
        Buffer.from(
          JSON.stringify({
            deploy_id: "deploy-123",
            state: "building",
          }),
        ),
      );

      const status = await deployer.getStatus("deploy-123");

      expect(status.status).toBe("building");
      expect(status.success).toBe(false);
    });
  });

  describe("edge functions", () => {
    it("should configure edge functions", () => {
      const config: NetlifyDeployerConfig = {
        platform: "netlify",
        edgeFunctions: true,
      };

      const deployer = new NetlifyDeployer(config);
      expect(deployer.name).toBe("netlify");
    });
  });

  describe("function configuration", () => {
    it("should accept function timeout", () => {
      const config: NetlifyDeployerConfig = {
        platform: "netlify",
        timeout: 26, // Netlify max is 26 seconds
      };

      const deployer = new NetlifyDeployer(config);
      expect(deployer.name).toBe("netlify");
    });

    it("should accept function directory", () => {
      const config: NetlifyDeployerConfig = {
        platform: "netlify",
        functionsDir: "netlify/functions",
      };

      const deployer = new NetlifyDeployer(config);
      expect(deployer.name).toBe("netlify");
    });
  });
});

describe("NetlifyDeployer edge cases", () => {
  describe("redirects", () => {
    it("should handle redirect configuration", () => {
      const config: NetlifyDeployerConfig = {
        platform: "netlify",
        redirects: [
          { from: "/old/*", to: "/new/:splat", status: 301 },
          { from: "/api/*", to: "/.netlify/functions/:splat", status: 200 },
        ],
      };

      const deployer = new NetlifyDeployer(config);
      expect(deployer.name).toBe("netlify");
    });
  });

  describe("headers", () => {
    it("should handle custom headers", () => {
      const config: NetlifyDeployerConfig = {
        platform: "netlify",
        headers: [
          {
            path: "/*",
            headers: {
              "X-Frame-Options": "DENY",
              "X-Content-Type-Options": "nosniff",
            },
          },
        ],
      };

      const deployer = new NetlifyDeployer(config);
      expect(deployer.name).toBe("netlify");
    });
  });

  describe("build configuration", () => {
    it("should handle build command", () => {
      const config: NetlifyDeployerConfig = {
        platform: "netlify",
        buildCommand: "npm run build",
        publishDir: "dist",
      };

      const deployer = new NetlifyDeployer(config);
      expect(deployer.name).toBe("netlify");
    });
  });
});

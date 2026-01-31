/**
 * DeploymentFactory Tests
 *
 * Comprehensive tests for the DeploymentFactory class covering
 * deployer and bundler creation, registration, and convenience methods.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DeploymentFactory,
  createDeployer,
  createBundler,
  deploy,
  deploymentFactory,
} from "../../src/lib/deployment/DeploymentFactory.js";
import { DeployerRegistry, BundlerRegistry } from "../../src/lib/deployment/DeploymentRegistry.js";
import type {
  DeploymentPlatform,
  BundlerType,
  DeployConfig,
} from "../../src/lib/deployment/types/deploymentTypes.js";

// Mock the deployers to avoid actual deployments
vi.mock("../../src/lib/deployment/deployers/VercelDeployer.js", () => ({
  VercelDeployer: vi.fn().mockImplementation(() => ({
    name: "vercel",
    validate: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
    deploy: vi.fn().mockResolvedValue({
      success: true,
      url: "https://test.vercel.app",
      deploymentId: "test-123",
      status: "success",
      timestamp: new Date(),
    }),
    getStatus: vi.fn().mockResolvedValue({
      success: true,
      status: "success",
      timestamp: new Date(),
    }),
  })),
}));

vi.mock("../../src/lib/deployment/deployers/CloudflareDeployer.js", () => ({
  CloudflareDeployer: vi.fn().mockImplementation(() => ({
    name: "cloudflare",
    validate: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
    deploy: vi.fn().mockResolvedValue({
      success: true,
      url: "https://test.workers.dev",
      deploymentId: "cf-123",
      status: "success",
      timestamp: new Date(),
    }),
  })),
}));

describe("DeploymentFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createDeployer", () => {
    it("should create a Vercel deployer", async () => {
      const deployer = await DeploymentFactory.createDeployer("vercel");
      expect(deployer).toBeDefined();
      expect(deployer.name).toBe("vercel");
    });

    it("should create a Cloudflare deployer", async () => {
      const deployer = await DeploymentFactory.createDeployer("cloudflare");
      expect(deployer).toBeDefined();
      expect(deployer.name).toBe("cloudflare");
    });

    it("should create a Netlify deployer", async () => {
      const deployer = await DeploymentFactory.createDeployer("netlify");
      expect(deployer).toBeDefined();
      expect(deployer.name).toBe("netlify");
    });

    it("should create a Lambda deployer", async () => {
      const deployer = await DeploymentFactory.createDeployer("lambda");
      expect(deployer).toBeDefined();
      expect(deployer.name).toBe("lambda");
    });

    it("should create a Docker deployer", async () => {
      const deployer = await DeploymentFactory.createDeployer("docker");
      expect(deployer).toBeDefined();
      expect(deployer.name).toBe("docker");
    });

    it("should create a Fly.io deployer", async () => {
      const deployer = await DeploymentFactory.createDeployer("flyio");
      expect(deployer).toBeDefined();
      expect(deployer.name).toBe("flyio");
    });

    it("should accept platform-specific config", async () => {
      const deployer = await DeploymentFactory.createDeployer("vercel", {
        platformConfig: {
          platform: "vercel",
          maxDuration: 60,
          regions: ["iad1"],
        },
      });
      expect(deployer).toBeDefined();
    });

    it("should throw for unsupported platform", async () => {
      await expect(
        DeploymentFactory.createDeployer("unsupported" as DeploymentPlatform),
      ).rejects.toThrow();
    });
  });

  describe("createBundler", () => {
    it("should create an ESBuild bundler", async () => {
      const bundler = await DeploymentFactory.createBundler("esbuild");
      expect(bundler).toBeDefined();
      expect(bundler.name).toBe("esbuild");
    });

    it("should create a Vite bundler", async () => {
      const bundler = await DeploymentFactory.createBundler("vite");
      expect(bundler).toBeDefined();
      expect(bundler.name).toBe("vite");
    });

    it("should throw for unsupported bundler", async () => {
      await expect(
        DeploymentFactory.createBundler("unsupported" as BundlerType),
      ).rejects.toThrow();
    });
  });

  describe("getSupportedPlatforms", () => {
    it("should return all supported platforms", async () => {
      const platforms = await DeploymentFactory.getSupportedPlatforms();
      expect(platforms).toBeInstanceOf(Array);
      expect(platforms.length).toBeGreaterThan(0);

      const platformNames = platforms.map((p) => p.platform);
      expect(platformNames).toContain("vercel");
      expect(platformNames).toContain("cloudflare");
      expect(platformNames).toContain("netlify");
      expect(platformNames).toContain("lambda");
      expect(platformNames).toContain("docker");
      expect(platformNames).toContain("flyio");
    });

    it("should return platform metadata", async () => {
      const platforms = await DeploymentFactory.getSupportedPlatforms();
      const vercel = platforms.find((p) => p.platform === "vercel");

      expect(vercel).toBeDefined();
      expect(vercel?.displayName).toBeDefined();
      expect(vercel?.description).toBeDefined();
      expect(vercel?.features).toBeInstanceOf(Array);
    });
  });

  describe("getSupportedBundlers", () => {
    it("should return all supported bundlers", async () => {
      const bundlers = await DeploymentFactory.getSupportedBundlers();
      expect(bundlers).toBeInstanceOf(Array);
      expect(bundlers.length).toBeGreaterThan(0);

      const bundlerTypes = bundlers.map((b) => b.type);
      expect(bundlerTypes).toContain("esbuild");
      expect(bundlerTypes).toContain("vite");
    });

    it("should return bundler metadata", async () => {
      const bundlers = await DeploymentFactory.getSupportedBundlers();
      const esbuild = bundlers.find((b) => b.type === "esbuild");

      expect(esbuild).toBeDefined();
      expect(esbuild?.displayName).toBeDefined();
      expect(esbuild?.description).toBeDefined();
      expect(esbuild?.supportedTargets).toBeInstanceOf(Array);
    });
  });

  describe("deploy convenience function", () => {
    it("should deploy using minimal config", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      // Mock the deployment result
      const mockResult = {
        success: true,
        url: "https://test.vercel.app",
        deploymentId: "test-123",
        status: "success" as const,
        timestamp: new Date(),
      };

      const deployerMock = {
        name: "vercel",
        deploy: vi.fn().mockResolvedValue(mockResult),
        validate: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
      };

      vi.spyOn(DeploymentFactory, "createDeployer").mockResolvedValue(deployerMock as any);

      const result = await deploy(config);
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
    });

    it("should handle deployment errors gracefully", async () => {
      const config: DeployConfig = {
        platform: "vercel",
        entry: "./src/index.ts",
        outDir: ".neurolink/output",
      };

      const deployerMock = {
        name: "vercel",
        deploy: vi.fn().mockRejectedValue(new Error("Deployment failed")),
        validate: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
      };

      vi.spyOn(DeploymentFactory, "createDeployer").mockResolvedValue(deployerMock as any);

      const result = await deploy(config);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("createDeployer helper function", () => {
    it("should work as a standalone function", async () => {
      const deployer = await createDeployer("vercel");
      expect(deployer).toBeDefined();
      expect(deployer.name).toBe("vercel");
    });
  });

  describe("createBundler helper function", () => {
    it("should work as a standalone function", async () => {
      const bundler = await createBundler("esbuild");
      expect(bundler).toBeDefined();
      expect(bundler.name).toBe("esbuild");
    });
  });

  describe("singleton instance", () => {
    it("should export a singleton factory instance", () => {
      expect(deploymentFactory).toBeDefined();
      expect(deploymentFactory).toBeInstanceOf(DeploymentFactory);
    });
  });
});

describe("DeployerRegistry", () => {
  describe("registration", () => {
    it("should have all deployers registered", async () => {
      const platforms = DeployerRegistry.listRegistered();
      expect(platforms).toContain("vercel");
      expect(platforms).toContain("cloudflare");
      expect(platforms).toContain("netlify");
      expect(platforms).toContain("lambda");
      expect(platforms).toContain("docker");
      expect(platforms).toContain("flyio");
    });

    it("should get deployer metadata", () => {
      const metadata = DeployerRegistry.getMetadata("vercel");
      expect(metadata).toBeDefined();
      expect(metadata?.displayName).toBeDefined();
    });

    it("should check if platform is registered", () => {
      expect(DeployerRegistry.isRegistered("vercel")).toBe(true);
      expect(DeployerRegistry.isRegistered("unknown")).toBe(false);
    });
  });
});

describe("BundlerRegistry", () => {
  describe("registration", () => {
    it("should have all bundlers registered", async () => {
      const bundlers = BundlerRegistry.listRegistered();
      expect(bundlers).toContain("esbuild");
      expect(bundlers).toContain("vite");
    });

    it("should get bundler metadata", () => {
      const metadata = BundlerRegistry.getMetadata("esbuild");
      expect(metadata).toBeDefined();
      expect(metadata?.displayName).toBeDefined();
    });

    it("should check if bundler is registered", () => {
      expect(BundlerRegistry.isRegistered("esbuild")).toBe(true);
      expect(BundlerRegistry.isRegistered("unknown")).toBe(false);
    });
  });
});

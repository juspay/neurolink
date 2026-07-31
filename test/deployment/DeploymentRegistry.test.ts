/**
 * DeploymentRegistry Tests
 *
 * Tests for DeployerRegistry and BundlerRegistry covering
 * registration, lookup, metadata, and lazy loading.
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  BundlerRegistry,
  bundlerRegistry,
  DeployerRegistry,
  deployerRegistry,
} from "../../src/lib/deployment/DeploymentRegistry.js";

describe("DeployerRegistry", () => {
  beforeAll(async () => {
    // Ensure registry is initialized before tests
    await deployerRegistry.ensureInitialized();
  });

  describe("registration", () => {
    it("should list all registered deployers", () => {
      const deployers = deployerRegistry.list();
      expect(deployers).toBeInstanceOf(Array);
      expect(deployers.length).toBeGreaterThanOrEqual(6);
    });

    it("should include all expected platforms", () => {
      const deployers = deployerRegistry.list();
      const platformIds = deployers.map((d) => d.id);
      const expectedPlatforms = ["vercel", "cloudflare", "netlify", "lambda", "docker", "flyio"];

      for (const platform of expectedPlatforms) {
        expect(platformIds).toContain(platform);
      }
    });

    it("should check if platform is registered", () => {
      expect(deployerRegistry.has("vercel")).toBe(true);
      expect(deployerRegistry.has("cloudflare")).toBe(true);
      expect(deployerRegistry.has("netlify")).toBe(true);
      expect(deployerRegistry.has("lambda")).toBe(true);
      expect(deployerRegistry.has("docker")).toBe(true);
      expect(deployerRegistry.has("flyio")).toBe(true);
    });

    it("should return false for unregistered platforms", () => {
      expect(deployerRegistry.has("unknown")).toBe(false);
      expect(deployerRegistry.has("azure")).toBe(false);
      expect(deployerRegistry.has("gcp")).toBe(false);
    });
  });

  describe("metadata", () => {
    it("should return metadata for registered deployers", () => {
      const deployers = deployerRegistry.list();
      const vercelEntry = deployers.find((d) => d.id === "vercel");
      expect(vercelEntry).toBeDefined();
      expect(vercelEntry?.metadata.displayName).toBe("Vercel");
      expect(vercelEntry?.metadata.description).toBeDefined();
      expect(vercelEntry?.metadata.features).toBeInstanceOf(Array);
    });

    it("should have proper metadata structure", () => {
      const deployers = deployerRegistry.list();

      for (const entry of deployers) {
        expect(entry.metadata).toBeDefined();
        expect(entry.metadata.displayName).toBeDefined();
        expect(entry.metadata.description).toBeDefined();
        expect(entry.metadata.features).toBeInstanceOf(Array);
        expect(entry.metadata.requiredConfig).toBeInstanceOf(Array);
      }
    });

    it("should have correct Vercel features", () => {
      const deployers = deployerRegistry.list();
      const vercelEntry = deployers.find((d) => d.id === "vercel");
      expect(vercelEntry?.metadata.features).toContain("serverless");
      expect(vercelEntry?.metadata.features).toContain("edge");
    });

    it("should have correct Cloudflare features", () => {
      const deployers = deployerRegistry.list();
      const cfEntry = deployers.find((d) => d.id === "cloudflare");
      expect(cfEntry?.metadata.features).toContain("edge");
      expect(cfEntry?.metadata.features).toContain("kv-storage");
    });

    it("should have correct Lambda features", () => {
      const deployers = deployerRegistry.list();
      const lambdaEntry = deployers.find((d) => d.id === "lambda");
      expect(lambdaEntry?.metadata.features).toContain("serverless");
      expect(lambdaEntry?.metadata.features).toContain("api-gateway");
    });
  });

  describe("factory creation", () => {
    it("should get deployer instance for registered platform", async () => {
      const deployer = await deployerRegistry.get("vercel");
      expect(deployer).toBeDefined();
    });

    it("should return undefined for unregistered deployer", async () => {
      const deployer = await deployerRegistry.get("unknown");
      expect(deployer).toBeUndefined();
    });

    it("should create deployer instance", async () => {
      const deployer = await deployerRegistry.get("vercel");
      expect(deployer).toBeDefined();
    });

    it("should cache deployer instance (same instance returned)", async () => {
      const deployer1 = await deployerRegistry.get("vercel");
      const deployer2 = await deployerRegistry.get("vercel");
      // BaseRegistry caches instances
      expect(deployer1).toBe(deployer2);
    });
  });

  describe("getSupportedPlatforms", () => {
    it("should return metadata for all registered deployers", () => {
      const allMetadata = deployerRegistry.getSupportedPlatforms();
      expect(allMetadata).toBeInstanceOf(Array);
      expect(allMetadata.length).toBeGreaterThanOrEqual(6);

      const platforms = allMetadata.map((m) => m.platform);
      expect(platforms).toContain("vercel");
      expect(platforms).toContain("cloudflare");
      expect(platforms).toContain("netlify");
    });
  });

  describe("singleton instance", () => {
    it("should export singleton instance", () => {
      expect(deployerRegistry).toBeDefined();
    });

    it("should be same instance from getInstance", () => {
      expect(DeployerRegistry.getInstance()).toBe(deployerRegistry);
    });
  });

  describe("isSupported helper", () => {
    it("should return true for supported platforms", () => {
      expect(deployerRegistry.isSupported("vercel")).toBe(true);
      expect(deployerRegistry.isSupported("cloudflare")).toBe(true);
    });

    it("should return false for unsupported platforms", () => {
      expect(deployerRegistry.isSupported("unknown")).toBe(false);
    });
  });

  describe("getDeployer helper", () => {
    it("should return deployer for valid platform", async () => {
      const deployer = await deployerRegistry.getDeployer("vercel");
      expect(deployer).toBeDefined();
    });

    it("should throw for invalid platform", async () => {
      await expect(deployerRegistry.getDeployer("unknown" as any)).rejects.toThrow(/Unknown deployment platform/);
    });
  });
});

describe("BundlerRegistry", () => {
  beforeAll(async () => {
    // Ensure registry is initialized before tests
    await bundlerRegistry.ensureInitialized();
  });

  describe("registration", () => {
    it("should list all registered bundlers", () => {
      const bundlers = bundlerRegistry.list();
      expect(bundlers).toBeInstanceOf(Array);
      expect(bundlers.length).toBeGreaterThanOrEqual(2);
    });

    it("should include all expected bundlers", () => {
      const bundlers = bundlerRegistry.list();
      const bundlerIds = bundlers.map((b) => b.id);
      expect(bundlerIds).toContain("esbuild");
      expect(bundlerIds).toContain("vite");
    });

    it("should check if bundler is registered", () => {
      expect(bundlerRegistry.has("esbuild")).toBe(true);
      expect(bundlerRegistry.has("vite")).toBe(true);
    });

    it("should return false for unregistered bundlers", () => {
      expect(bundlerRegistry.has("webpack")).toBe(false);
      expect(bundlerRegistry.has("rollup")).toBe(false);
      expect(bundlerRegistry.has("parcel")).toBe(false);
    });
  });

  describe("metadata", () => {
    it("should return metadata for registered bundlers", () => {
      const bundlers = bundlerRegistry.list();
      const esbuildEntry = bundlers.find((b) => b.id === "esbuild");
      expect(esbuildEntry).toBeDefined();
      expect(esbuildEntry?.metadata.displayName).toBe("ESBuild");
      expect(esbuildEntry?.metadata.description).toBeDefined();
      expect(esbuildEntry?.metadata.supportedTargets).toBeInstanceOf(Array);
    });

    it("should have proper metadata structure", () => {
      const bundlers = bundlerRegistry.list();

      for (const entry of bundlers) {
        expect(entry.metadata).toBeDefined();
        expect(entry.metadata.displayName).toBeDefined();
        expect(entry.metadata.description).toBeDefined();
        expect(entry.metadata.supportedTargets).toBeInstanceOf(Array);
      }
    });

    it("should have correct ESBuild targets", () => {
      const bundlers = bundlerRegistry.list();
      const esbuildEntry = bundlers.find((b) => b.id === "esbuild");
      expect(esbuildEntry?.metadata.supportedTargets).toContain("node");
      expect(esbuildEntry?.metadata.supportedTargets).toContain("browser");
    });

    it("should have correct Vite targets", () => {
      const bundlers = bundlerRegistry.list();
      const viteEntry = bundlers.find((b) => b.id === "vite");
      expect(viteEntry?.metadata.supportedTargets).toContain("node");
      expect(viteEntry?.metadata.supportedTargets).toContain("browser");
    });
  });

  describe("factory creation", () => {
    it("should get bundler instance for registered type", async () => {
      const bundler = await bundlerRegistry.get("esbuild");
      expect(bundler).toBeDefined();
    });

    it("should return undefined for unregistered bundler", async () => {
      const bundler = await bundlerRegistry.get("webpack");
      expect(bundler).toBeUndefined();
    });

    it("should create bundler instance", async () => {
      const bundler = await bundlerRegistry.get("esbuild");
      expect(bundler).toBeDefined();
    });

    it("should create Vite bundler instance", async () => {
      const bundler = await bundlerRegistry.get("vite");
      expect(bundler).toBeDefined();
    });

    it("should cache bundler instance (same instance returned)", async () => {
      const bundler1 = await bundlerRegistry.get("esbuild");
      const bundler2 = await bundlerRegistry.get("esbuild");
      // BaseRegistry caches instances
      expect(bundler1).toBe(bundler2);
    });
  });

  describe("getSupportedBundlers", () => {
    it("should return metadata for all registered bundlers", () => {
      const allMetadata = bundlerRegistry.getSupportedBundlers();
      expect(allMetadata).toBeInstanceOf(Array);
      expect(allMetadata.length).toBeGreaterThanOrEqual(2);

      const types = allMetadata.map((m) => m.type);
      expect(types).toContain("esbuild");
      expect(types).toContain("vite");
    });
  });

  describe("singleton instance", () => {
    it("should export singleton instance", () => {
      expect(bundlerRegistry).toBeDefined();
    });

    it("should be same instance from getInstance", () => {
      expect(BundlerRegistry.getInstance()).toBe(bundlerRegistry);
    });
  });

  describe("isSupported helper", () => {
    it("should return true for supported bundlers", () => {
      expect(bundlerRegistry.isSupported("esbuild")).toBe(true);
      expect(bundlerRegistry.isSupported("vite")).toBe(true);
    });

    it("should return false for unsupported bundlers", () => {
      expect(bundlerRegistry.isSupported("webpack")).toBe(false);
    });
  });

  describe("getBundler helper", () => {
    it("should return bundler for valid type", async () => {
      const bundler = await bundlerRegistry.getBundler("esbuild");
      expect(bundler).toBeDefined();
    });

    it("should throw for invalid bundler type", async () => {
      await expect(bundlerRegistry.getBundler("webpack" as any)).rejects.toThrow(/Unknown bundler type/);
    });
  });
});

describe("Registry Edge Cases", () => {
  describe("concurrent access", () => {
    it("should handle concurrent deployer retrieval", async () => {
      const promises = [
        deployerRegistry.get("vercel"),
        deployerRegistry.get("cloudflare"),
        deployerRegistry.get("netlify"),
        deployerRegistry.get("lambda"),
        deployerRegistry.get("docker"),
        deployerRegistry.get("flyio"),
      ];

      const deployers = await Promise.all(promises);
      expect(deployers.filter(Boolean).length).toBe(6);
    });

    it("should handle concurrent bundler retrieval", async () => {
      const promises = [bundlerRegistry.get("esbuild"), bundlerRegistry.get("vite")];

      const bundlers = await Promise.all(promises);
      expect(bundlers.filter(Boolean).length).toBe(2);
    });
  });

  describe("type safety", () => {
    it("should only accept valid platform names", () => {
      // These should work
      expect(deployerRegistry.has("vercel")).toBe(true);

      // These should not match (case-sensitive)
      expect(deployerRegistry.has("VERCEL")).toBe(false);
      expect(deployerRegistry.has("Vercel")).toBe(false);
      expect(deployerRegistry.has(" vercel")).toBe(false);
    });

    it("should only accept valid bundler names", () => {
      // These should work
      expect(bundlerRegistry.has("esbuild")).toBe(true);

      // These should not match (case-sensitive)
      expect(bundlerRegistry.has("ESBUILD")).toBe(false);
      expect(bundlerRegistry.has("EsBuild")).toBe(false);
    });
  });

  describe("initialization", () => {
    it("should be initialized after ensureInitialized", async () => {
      await deployerRegistry.ensureInitialized();
      expect(deployerRegistry.isInitialized()).toBe(true);
    });

    it("should handle multiple ensureInitialized calls", async () => {
      await deployerRegistry.ensureInitialized();
      await deployerRegistry.ensureInitialized();
      await deployerRegistry.ensureInitialized();
      expect(deployerRegistry.isInitialized()).toBe(true);
    });
  });
});

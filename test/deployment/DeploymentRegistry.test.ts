/**
 * DeploymentRegistry Tests
 *
 * Tests for DeployerRegistry and BundlerRegistry covering
 * registration, lookup, metadata, and lazy loading.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DeployerRegistry,
  BundlerRegistry,
  deployerRegistry,
  bundlerRegistry,
} from "../../src/lib/deployment/DeploymentRegistry.js";

describe("DeployerRegistry", () => {
  describe("registration", () => {
    it("should list all registered deployers", () => {
      const deployers = DeployerRegistry.listRegistered();
      expect(deployers).toBeInstanceOf(Array);
      expect(deployers.length).toBeGreaterThanOrEqual(6);
    });

    it("should include all expected platforms", () => {
      const deployers = DeployerRegistry.listRegistered();
      const expectedPlatforms = [
        "vercel",
        "cloudflare",
        "netlify",
        "lambda",
        "docker",
        "flyio",
      ];

      for (const platform of expectedPlatforms) {
        expect(deployers).toContain(platform);
      }
    });

    it("should check if platform is registered", () => {
      expect(DeployerRegistry.isRegistered("vercel")).toBe(true);
      expect(DeployerRegistry.isRegistered("cloudflare")).toBe(true);
      expect(DeployerRegistry.isRegistered("netlify")).toBe(true);
      expect(DeployerRegistry.isRegistered("lambda")).toBe(true);
      expect(DeployerRegistry.isRegistered("docker")).toBe(true);
      expect(DeployerRegistry.isRegistered("flyio")).toBe(true);
    });

    it("should return false for unregistered platforms", () => {
      expect(DeployerRegistry.isRegistered("unknown")).toBe(false);
      expect(DeployerRegistry.isRegistered("azure")).toBe(false);
      expect(DeployerRegistry.isRegistered("gcp")).toBe(false);
    });
  });

  describe("metadata", () => {
    it("should return metadata for registered deployers", () => {
      const vercelMeta = DeployerRegistry.getMetadata("vercel");
      expect(vercelMeta).toBeDefined();
      expect(vercelMeta?.displayName).toBe("Vercel");
      expect(vercelMeta?.description).toBeDefined();
      expect(vercelMeta?.features).toBeInstanceOf(Array);
    });

    it("should have proper metadata structure", () => {
      const platforms = DeployerRegistry.listRegistered();

      for (const platform of platforms) {
        const metadata = DeployerRegistry.getMetadata(platform);
        expect(metadata).toBeDefined();
        expect(metadata?.displayName).toBeDefined();
        expect(metadata?.description).toBeDefined();
        expect(metadata?.features).toBeInstanceOf(Array);
        expect(metadata?.requiredConfig).toBeInstanceOf(Array);
      }
    });

    it("should return undefined for unregistered platform metadata", () => {
      const metadata = DeployerRegistry.getMetadata("unknown");
      expect(metadata).toBeUndefined();
    });

    it("should have correct Vercel features", () => {
      const metadata = DeployerRegistry.getMetadata("vercel");
      expect(metadata?.features).toContain("Serverless Functions");
      expect(metadata?.features).toContain("Edge Functions");
    });

    it("should have correct Cloudflare features", () => {
      const metadata = DeployerRegistry.getMetadata("cloudflare");
      expect(metadata?.features).toContain("Workers");
      expect(metadata?.features).toContain("KV Storage");
    });

    it("should have correct Lambda features", () => {
      const metadata = DeployerRegistry.getMetadata("lambda");
      expect(metadata?.features).toContain("Lambda Functions");
      expect(metadata?.features).toContain("API Gateway");
    });
  });

  describe("factory creation", () => {
    it("should get factory function for registered deployer", async () => {
      const factory = DeployerRegistry.get("vercel");
      expect(factory).toBeDefined();
      expect(typeof factory).toBe("function");
    });

    it("should return undefined for unregistered deployer", () => {
      const factory = DeployerRegistry.get("unknown");
      expect(factory).toBeUndefined();
    });

    it("should create deployer instance via factory", async () => {
      const factory = DeployerRegistry.get("vercel");
      expect(factory).toBeDefined();

      if (factory) {
        const deployer = await factory();
        expect(deployer).toBeDefined();
        expect(deployer.name).toBe("vercel");
      }
    });

    it("should create different deployer instances each time", async () => {
      const factory = DeployerRegistry.get("vercel");
      if (factory) {
        const deployer1 = await factory();
        const deployer2 = await factory();
        expect(deployer1).not.toBe(deployer2);
      }
    });
  });

  describe("getAllMetadata", () => {
    it("should return metadata for all registered deployers", () => {
      const allMetadata = DeployerRegistry.getAllMetadata();
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
  });
});

describe("BundlerRegistry", () => {
  describe("registration", () => {
    it("should list all registered bundlers", () => {
      const bundlers = BundlerRegistry.listRegistered();
      expect(bundlers).toBeInstanceOf(Array);
      expect(bundlers.length).toBeGreaterThanOrEqual(2);
    });

    it("should include all expected bundlers", () => {
      const bundlers = BundlerRegistry.listRegistered();
      expect(bundlers).toContain("esbuild");
      expect(bundlers).toContain("vite");
    });

    it("should check if bundler is registered", () => {
      expect(BundlerRegistry.isRegistered("esbuild")).toBe(true);
      expect(BundlerRegistry.isRegistered("vite")).toBe(true);
    });

    it("should return false for unregistered bundlers", () => {
      expect(BundlerRegistry.isRegistered("webpack")).toBe(false);
      expect(BundlerRegistry.isRegistered("rollup")).toBe(false);
      expect(BundlerRegistry.isRegistered("parcel")).toBe(false);
    });
  });

  describe("metadata", () => {
    it("should return metadata for registered bundlers", () => {
      const esbuildMeta = BundlerRegistry.getMetadata("esbuild");
      expect(esbuildMeta).toBeDefined();
      expect(esbuildMeta?.displayName).toBe("ESBuild");
      expect(esbuildMeta?.description).toBeDefined();
      expect(esbuildMeta?.supportedTargets).toBeInstanceOf(Array);
    });

    it("should have proper metadata structure", () => {
      const bundlers = BundlerRegistry.listRegistered();

      for (const bundler of bundlers) {
        const metadata = BundlerRegistry.getMetadata(bundler);
        expect(metadata).toBeDefined();
        expect(metadata?.displayName).toBeDefined();
        expect(metadata?.description).toBeDefined();
        expect(metadata?.supportedTargets).toBeInstanceOf(Array);
      }
    });

    it("should return undefined for unregistered bundler metadata", () => {
      const metadata = BundlerRegistry.getMetadata("webpack");
      expect(metadata).toBeUndefined();
    });

    it("should have correct ESBuild targets", () => {
      const metadata = BundlerRegistry.getMetadata("esbuild");
      expect(metadata?.supportedTargets).toContain("node");
      expect(metadata?.supportedTargets).toContain("browser");
    });

    it("should have correct Vite targets", () => {
      const metadata = BundlerRegistry.getMetadata("vite");
      expect(metadata?.supportedTargets).toContain("node");
      expect(metadata?.supportedTargets).toContain("browser");
    });
  });

  describe("factory creation", () => {
    it("should get factory function for registered bundler", async () => {
      const factory = BundlerRegistry.get("esbuild");
      expect(factory).toBeDefined();
      expect(typeof factory).toBe("function");
    });

    it("should return undefined for unregistered bundler", () => {
      const factory = BundlerRegistry.get("webpack");
      expect(factory).toBeUndefined();
    });

    it("should create bundler instance via factory", async () => {
      const factory = BundlerRegistry.get("esbuild");
      expect(factory).toBeDefined();

      if (factory) {
        const bundler = await factory();
        expect(bundler).toBeDefined();
        expect(bundler.name).toBe("esbuild");
      }
    });

    it("should create Vite bundler instance", async () => {
      const factory = BundlerRegistry.get("vite");
      if (factory) {
        const bundler = await factory();
        expect(bundler).toBeDefined();
        expect(bundler.name).toBe("vite");
      }
    });
  });

  describe("getAllMetadata", () => {
    it("should return metadata for all registered bundlers", () => {
      const allMetadata = BundlerRegistry.getAllMetadata();
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
  });
});

describe("Registry Edge Cases", () => {
  describe("concurrent access", () => {
    it("should handle concurrent deployer creation", async () => {
      const promises = [
        DeployerRegistry.get("vercel")?.(),
        DeployerRegistry.get("cloudflare")?.(),
        DeployerRegistry.get("netlify")?.(),
        DeployerRegistry.get("lambda")?.(),
        DeployerRegistry.get("docker")?.(),
        DeployerRegistry.get("flyio")?.(),
      ];

      const deployers = await Promise.all(promises.filter(Boolean));
      expect(deployers.length).toBe(6);
    });

    it("should handle concurrent bundler creation", async () => {
      const promises = [
        BundlerRegistry.get("esbuild")?.(),
        BundlerRegistry.get("vite")?.(),
      ];

      const bundlers = await Promise.all(promises.filter(Boolean));
      expect(bundlers.length).toBe(2);
    });
  });

  describe("type safety", () => {
    it("should only accept valid platform names", () => {
      // These should work
      expect(DeployerRegistry.isRegistered("vercel")).toBe(true);

      // These should not match
      expect(DeployerRegistry.isRegistered("VERCEL")).toBe(false);
      expect(DeployerRegistry.isRegistered("Vercel")).toBe(false);
      expect(DeployerRegistry.isRegistered(" vercel")).toBe(false);
    });

    it("should only accept valid bundler names", () => {
      // These should work
      expect(BundlerRegistry.isRegistered("esbuild")).toBe(true);

      // These should not match
      expect(BundlerRegistry.isRegistered("ESBUILD")).toBe(false);
      expect(BundlerRegistry.isRegistered("EsBuild")).toBe(false);
    });
  });
});

/**
 * Bundler Factory
 *
 * Factory for creating bundler instances with configuration.
 * Supports ESBuild and Vite bundlers.
 *
 * @packageDocumentation
 * @module @neurolink/deployment
 */

import { bundlerRegistry } from "../DeploymentRegistry.js";
import { ConfigurationError } from "../DeploymentErrors.js";
import { logger } from "../../utils/logger.js";
import type {
  BundlerType,
  IBundler,
  BuildConfig,
  BundlerMetadata,
} from "../types/deploymentTypes.js";

/**
 * Bundler Factory
 *
 * Creates bundler instances for different bundler types.
 *
 * @example
 * ```typescript
 * // Create ESBuild bundler (default)
 * const esbuild = await BundlerFactory.create('esbuild');
 *
 * // Create Vite bundler
 * const vite = await BundlerFactory.create('vite');
 * ```
 */
export class BundlerFactory {
  private static defaultBundler: BundlerType = "esbuild";

  /**
   * Create a bundler instance
   */
  static async create(type: BundlerType = "esbuild"): Promise<IBundler> {
    await bundlerRegistry.ensureInitialized();

    if (!bundlerRegistry.isSupported(type)) {
      const available = bundlerRegistry
        .getSupportedBundlers()
        .map((b) => b.type);
      throw new ConfigurationError(`Unknown bundler type: ${type}`, "bundler", {
        suggestion: `Supported bundlers: ${available.join(", ")}`,
      });
    }

    const bundler = await bundlerRegistry.getBundler(type);
    logger.debug(`Created ${type} bundler`);
    return bundler;
  }

  /**
   * Get the best bundler for a given configuration
   */
  static async getBestBundler(config?: BuildConfig): Promise<IBundler> {
    const type = config?.bundler || this.defaultBundler;
    return this.create(type);
  }

  /**
   * Get all supported bundlers
   */
  static async getSupportedBundlers(): Promise<BundlerMetadata[]> {
    await bundlerRegistry.ensureInitialized();
    return bundlerRegistry.getSupportedBundlers();
  }

  /**
   * Check if a bundler type is supported
   */
  static async isSupported(type: string): Promise<boolean> {
    await bundlerRegistry.ensureInitialized();
    return bundlerRegistry.isSupported(type);
  }

  /**
   * Set the default bundler type
   */
  static setDefaultBundler(type: BundlerType): void {
    this.defaultBundler = type;
  }

  /**
   * Get the default bundler type
   */
  static getDefaultBundler(): BundlerType {
    return this.defaultBundler;
  }
}

/**
 * Helper function to detect optimal bundler for target
 */
export function detectOptimalBundler(
  target: "node" | "browser" | "edge" | "worker",
): BundlerType {
  // ESBuild is faster for Node.js and edge targets
  // Vite provides better browser support and HMR
  switch (target) {
    case "browser":
      return "vite";
    case "node":
    case "edge":
    case "worker":
    default:
      return "esbuild";
  }
}

/**
 * Get recommended build configuration for a target
 */
export function getRecommendedBuildConfig(
  target: "node" | "browser" | "edge" | "worker",
): Partial<BuildConfig> {
  const baseConfig: Partial<BuildConfig> = {
    sourceMaps: true,
    treeShake: true,
    minify: false,
  };

  switch (target) {
    case "node":
      return {
        ...baseConfig,
        target: "node",
        bundler: "esbuild",
        external: [
          // Common Node.js native modules
          "fs",
          "path",
          "os",
          "crypto",
          "http",
          "https",
          "net",
          "stream",
          "util",
          "events",
          "child_process",
          // Common packages with native bindings
          "sharp",
          "sqlite3",
          "bcrypt",
          "canvas",
        ],
      };

    case "browser":
      return {
        ...baseConfig,
        target: "browser",
        bundler: "vite",
        minify: true,
        noExternal: [],
      };

    case "edge":
      return {
        ...baseConfig,
        target: "edge",
        bundler: "esbuild",
        external: [],
        noExternal: ["*"], // Bundle everything for edge
      };

    case "worker":
      return {
        ...baseConfig,
        target: "worker",
        bundler: "esbuild",
        external: [],
        noExternal: ["*"], // Bundle everything for workers
      };

    default:
      return baseConfig;
  }
}

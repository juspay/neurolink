/**
 * Deployment Factory
 *
 * Factory for creating deployer and bundler instances.
 * Follows NeuroLink's factory pattern with dynamic imports.
 *
 * @packageDocumentation
 * @module @neurolink/deployment
 */

import { BaseFactory } from "../core/infrastructure/index.js";
import { logger } from "../utils/logger.js";
import {
  deployerRegistry,
  bundlerRegistry,
} from "./DeploymentRegistry.js";
import { ConfigurationError } from "./DeploymentErrors.js";
import type {
  DeploymentPlatform,
  BundlerType,
  IDeployer,
  IBundler,
  DeployConfig,
  BuildConfig,
  PlatformConfig,
  VercelDeployerConfig,
  CloudflareDeployerConfig,
  NetlifyDeployerConfig,
  LambdaDeployerConfig,
  DockerDeployerConfig,
  FlyioDeployerConfig,
  DeployerMetadata,
  BundlerMetadata,
} from "./types/deploymentTypes.js";

/**
 * Platform-specific configuration type mapping
 */
export type PlatformConfigMap = {
  vercel: VercelDeployerConfig;
  cloudflare: CloudflareDeployerConfig;
  netlify: NetlifyDeployerConfig;
  lambda: LambdaDeployerConfig;
  docker: DockerDeployerConfig;
  flyio: FlyioDeployerConfig;
};

/**
 * Deployer Factory Configuration
 */
export interface DeployerFactoryConfig {
  /** Platform-specific configuration */
  platformConfig?: PlatformConfig;
}

/**
 * Deployment Factory
 *
 * Creates deployer and bundler instances for different platforms.
 * Uses the registry pattern for lazy loading and extensibility.
 *
 * @example
 * ```typescript
 * // Create a Vercel deployer
 * const vercelDeployer = await DeploymentFactory.createDeployer('vercel', {
 *   platformConfig: {
 *     platform: 'vercel',
 *     maxDuration: 60,
 *     regions: ['iad1', 'sfo1']
 *   }
 * });
 *
 * // Create an ESBuild bundler
 * const bundler = await DeploymentFactory.createBundler('esbuild');
 * ```
 */
export class DeploymentFactory extends BaseFactory<
  IDeployer,
  DeployerFactoryConfig
> {
  private static instance: DeploymentFactory;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DeploymentFactory {
    if (!DeploymentFactory.instance) {
      DeploymentFactory.instance = new DeploymentFactory();
    }
    return DeploymentFactory.instance;
  }

  /**
   * Register all deployers
   */
  protected async registerAll(): Promise<void> {
    // Ensure registry is initialized
    await deployerRegistry.ensureInitialized();

    // Register each platform from the registry
    const platforms = deployerRegistry.getSupportedPlatforms();
    for (const platform of platforms) {
      this.register(
        platform.platform,
        async () => deployerRegistry.getDeployer(platform.platform),
        this.getPlatformAliases(platform.platform),
        { platform: platform.platform },
      );
    }
  }

  /**
   * Get platform aliases
   */
  private getPlatformAliases(platform: DeploymentPlatform): string[] {
    const aliasMap: Record<DeploymentPlatform, string[]> = {
      vercel: ["vcel", "vcl"],
      cloudflare: ["cf", "cfworkers", "workers"],
      netlify: ["ntl"],
      lambda: ["aws", "awslambda", "aws-lambda"],
      docker: ["container", "dkr"],
      flyio: ["fly", "fly.io"],
    };
    return aliasMap[platform] || [];
  }

  /**
   * Create a deployer for the specified platform
   */
  static async createDeployer<P extends DeploymentPlatform>(
    platform: P,
    config?: DeployerFactoryConfig,
  ): Promise<IDeployer> {
    const factory = DeploymentFactory.getInstance();
    await factory.ensureInitialized();

    if (!factory.has(platform)) {
      const available = factory.getAvailable();
      throw new ConfigurationError(
        `Unknown deployment platform: ${platform}`,
        "platform",
        {
          suggestion: `Supported platforms: ${available.join(", ")}`,
        },
      );
    }

    const deployer = await factory.create(platform, config);
    logger.debug(`Created ${platform} deployer`);
    return deployer;
  }

  /**
   * Create a bundler for the specified type
   */
  static async createBundler(type: BundlerType = "esbuild"): Promise<IBundler> {
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
   * Get all supported platforms
   */
  static async getSupportedPlatforms(): Promise<DeployerMetadata[]> {
    await deployerRegistry.ensureInitialized();
    return deployerRegistry.getSupportedPlatforms();
  }

  /**
   * Get all supported bundlers
   */
  static async getSupportedBundlers(): Promise<BundlerMetadata[]> {
    await bundlerRegistry.ensureInitialized();
    return bundlerRegistry.getSupportedBundlers();
  }

  /**
   * Check if a platform is supported
   */
  static async isPlatformSupported(platform: string): Promise<boolean> {
    await deployerRegistry.ensureInitialized();
    return deployerRegistry.isSupported(platform);
  }

  /**
   * Check if a bundler type is supported
   */
  static async isBundlerSupported(type: string): Promise<boolean> {
    await bundlerRegistry.ensureInitialized();
    return bundlerRegistry.isSupported(type);
  }
}

/**
 * Convenience function to create a deployer
 */
export async function createDeployer<P extends DeploymentPlatform>(
  platform: P,
  config?: DeployerFactoryConfig,
): Promise<IDeployer> {
  return DeploymentFactory.createDeployer(platform, config);
}

/**
 * Convenience function to create a bundler
 */
export async function createBundler(
  type: BundlerType = "esbuild",
): Promise<IBundler> {
  return DeploymentFactory.createBundler(type);
}

/**
 * Quick deploy helper function
 *
 * @example
 * ```typescript
 * const result = await deploy({
 *   platform: 'vercel',
 *   entry: './src/index.ts',
 *   outDir: './dist',
 *   env: { API_KEY: process.env.API_KEY }
 * });
 * console.log(`Deployed to: ${result.url}`);
 * ```
 */
export async function deploy(config: DeployConfig) {
  const deployer = await createDeployer(config.platform, {
    platformConfig: config.platformConfig,
  });

  // Validate configuration
  const validation = await deployer.validate(config);
  if (!validation.valid) {
    const errors = validation.errors.map((e) => e.message).join(", ");
    throw new ConfigurationError(`Validation failed: ${errors}`);
  }

  // Build the application
  logger.info(`Building for ${config.platform}...`);
  const buildOutput = await deployer.build(config);
  logger.info(`Build complete in ${buildOutput.duration}ms`);

  // Deploy
  logger.info(`Deploying to ${config.platform}...`);
  const result = await deployer.deploy(config);

  if (result.success) {
    logger.info(`Deployed successfully to: ${result.url}`);
  } else {
    logger.error(`Deployment failed: ${result.error}`);
  }

  return result;
}

// Export singleton for direct access
export const deploymentFactory = DeploymentFactory.getInstance();

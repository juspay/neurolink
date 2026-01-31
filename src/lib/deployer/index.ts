/**
 * NeuroLink Deployment System
 *
 * Comprehensive deployment system supporting multiple platforms:
 * - Vercel Serverless Functions
 * - Cloudflare Workers
 * - Netlify Functions
 * - AWS Lambda (SAM and Docker)
 *
 * @example
 * ```typescript
 * import {
 *   DeployerFactory,
 *   Bundler,
 *   ServerGenerator
 * } from '@juspay/neurolink/deployer';
 *
 * // Build and deploy to Vercel
 * const deployer = DeployerFactory.create('vercel', {
 *   maxDuration: 60,
 *   memory: 1024
 * });
 *
 * const config = {
 *   platform: 'vercel',
 *   entry: './src/index.ts',
 *   outDir: './dist'
 * };
 *
 * await deployer.build(config);
 * const result = await deployer.deploy(config);
 * console.log(`Deployed to: ${result.url}`);
 * ```
 *
 * @packageDocumentation
 * @module @juspay/neurolink/deployer
 * @category Deployment
 */

// Types
export * from "./types.js";

// Bundler components
export {
  EntryDiscovery,
  ToolAggregator,
  DependencyAnalyzer,
  Bundler,
} from "./bundler/index.js";

// Server generator
export { ServerGenerator } from "./server/index.js";

// Platform deployers
export {
  VercelDeployer,
  CloudflareDeployer,
  NetlifyDeployer,
  LambdaDeployer,
} from "./deployers/index.js";

// Import deployers for factory
import { VercelDeployer } from "./deployers/vercelDeployer.js";
import { CloudflareDeployer } from "./deployers/cloudflareDeployer.js";
import { NetlifyDeployer } from "./deployers/netlifyDeployer.js";
import { LambdaDeployer } from "./deployers/lambdaDeployer.js";
import type {
  Deployer,
  DeploymentPlatform,
  VercelDeployerConfig,
  CloudflareDeployerConfig,
  NetlifyDeployerConfig,
  LambdaDeployerConfig,
} from "./types.js";

/**
 * Platform-specific configuration type mapping
 */
export type PlatformConfigMap = {
  vercel: VercelDeployerConfig;
  cloudflare: CloudflareDeployerConfig;
  netlify: NetlifyDeployerConfig;
  lambda: LambdaDeployerConfig;
};

/**
 * Deployer Factory - Create deployer instances for different platforms
 *
 * @example
 * ```typescript
 * // Create a Vercel deployer
 * const vercelDeployer = DeployerFactory.create('vercel', {
 *   maxDuration: 60,
 *   regions: ['iad1', 'sfo1']
 * });
 *
 * // Create a Cloudflare Workers deployer
 * const cfDeployer = DeployerFactory.create('cloudflare', {
 *   workerName: 'my-worker',
 *   routes: [{ pattern: 'api.example.com/*' }]
 * });
 *
 * // Create a Lambda deployer with Docker
 * const lambdaDeployer = DeployerFactory.create('lambda', {
 *   functionName: 'my-api',
 *   useDocker: true,
 *   ecrRepository: 'my-repo'
 * });
 * ```
 */
export class DeployerFactory {
  private static deployers: Map<
    DeploymentPlatform,
    (config?: unknown) => Deployer
  > = new Map();

  /**
   * Register all built-in deployers
   */
  static {
    DeployerFactory.deployers.set(
      "vercel",
      (config?: unknown) => new VercelDeployer(config as VercelDeployerConfig)
    );
    DeployerFactory.deployers.set(
      "cloudflare",
      (config?: unknown) =>
        new CloudflareDeployer(config as CloudflareDeployerConfig)
    );
    DeployerFactory.deployers.set(
      "netlify",
      (config?: unknown) => new NetlifyDeployer(config as NetlifyDeployerConfig)
    );
    DeployerFactory.deployers.set(
      "lambda",
      (config?: unknown) => new LambdaDeployer(config as LambdaDeployerConfig)
    );
  }

  /**
   * Create a deployer for the specified platform
   *
   * @param platform - Target deployment platform
   * @param config - Platform-specific configuration
   * @returns Deployer instance
   * @throws Error if platform is not supported
   */
  static create<P extends DeploymentPlatform>(
    platform: P,
    config?: PlatformConfigMap[P]
  ): Deployer {
    const factory = DeployerFactory.deployers.get(platform);
    if (!factory) {
      throw new Error(
        `Unsupported deployment platform: ${platform}. ` +
          `Supported platforms: ${Array.from(
            DeployerFactory.deployers.keys()
          ).join(", ")}`
      );
    }
    return factory(config);
  }

  /**
   * Get list of supported platforms
   */
  static getSupportedPlatforms(): DeploymentPlatform[] {
    return Array.from(DeployerFactory.deployers.keys());
  }

  /**
   * Check if a platform is supported
   */
  static isSupported(platform: string): platform is DeploymentPlatform {
    return DeployerFactory.deployers.has(platform as DeploymentPlatform);
  }

  /**
   * Register a custom deployer
   *
   * @param platform - Platform name
   * @param factory - Factory function to create deployer instances
   */
  static register(
    platform: DeploymentPlatform,
    factory: (config?: unknown) => Deployer
  ): void {
    DeployerFactory.deployers.set(platform, factory);
  }
}

/**
 * Convenience function to create a deployer
 *
 * @param platform - Target deployment platform
 * @param config - Platform-specific configuration
 * @returns Deployer instance
 */
export function createDeployer<P extends DeploymentPlatform>(
  platform: P,
  config?: PlatformConfigMap[P]
): Deployer {
  return DeployerFactory.create(platform, config);
}

// Default export for convenience
export default DeployerFactory;

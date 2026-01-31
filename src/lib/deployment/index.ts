/**
 * NeuroLink Deployment System
 *
 * Comprehensive deployment system supporting multiple platforms:
 * - Vercel Serverless Functions
 * - Cloudflare Workers
 * - Netlify Functions
 * - AWS Lambda
 * - Docker Containers
 * - Fly.io
 *
 * @example
 * ```typescript
 * import {
 *   DeploymentFactory,
 *   deploy,
 *   createDeployer,
 *   createBundler
 * } from '@neurolink/deployment';
 *
 * // Quick deploy
 * const result = await deploy({
 *   platform: 'vercel',
 *   entry: './src/index.ts',
 *   outDir: './dist',
 *   env: { API_KEY: process.env.API_KEY }
 * });
 * console.log(`Deployed to: ${result.url}`);
 *
 * // Or use the factory for more control
 * const deployer = await DeploymentFactory.createDeployer('vercel', {
 *   platformConfig: {
 *     platform: 'vercel',
 *     maxDuration: 60,
 *     regions: ['iad1', 'sfo1']
 *   }
 * });
 *
 * await deployer.deploy(config);
 * ```
 *
 * @packageDocumentation
 * @module @neurolink/deployment
 */

// Types
export * from "./types/deploymentTypes.js";

// Errors
export {
  DeploymentError,
  DeploymentErrorCodes,
  DeploymentErrors,
  BuildError,
  BundlerError,
  PlatformDeploymentError,
  ConfigurationError,
  ValidationError,
  EnvironmentError,
  DeploymentNetworkError,
  DeploymentTimeoutError,
  RateLimitError,
  AuthorizationError,
  isDeploymentError,
  isRetryableDeploymentError,
  createPlatformError,
  type DeploymentErrorCode,
} from "./DeploymentErrors.js";

// Factory and Registry
export {
  DeploymentFactory,
  createDeployer,
  createBundler,
  deploy,
  deploymentFactory,
  type PlatformConfigMap,
  type DeployerFactoryConfig,
} from "./DeploymentFactory.js";

export {
  DeployerRegistry,
  BundlerRegistry,
  deployerRegistry,
  bundlerRegistry,
} from "./DeploymentRegistry.js";

// Environment Manager
export {
  EnvironmentManager,
  environmentManager,
  PLATFORM_ENV_REQUIREMENTS,
  NEUROLINK_ENV_REQUIREMENTS,
  type ValidationRule,
} from "./EnvironmentManager.js";

// Bundlers
export {
  BundlerFactory,
  detectOptimalBundler,
  getRecommendedBuildConfig,
} from "./bundlers/BundlerFactory.js";
export { ESBuildBundler } from "./bundlers/ESBuildBundler.js";
export { ViteBundler } from "./bundlers/ViteBundler.js";

// Deployers
export { BaseDeployer, type BaseDeployerConfig } from "./deployers/BaseDeployer.js";
export { VercelDeployer } from "./deployers/VercelDeployer.js";
export { CloudflareDeployer } from "./deployers/CloudflareDeployer.js";
export { NetlifyDeployer } from "./deployers/NetlifyDeployer.js";
export { AWSLambdaDeployer } from "./deployers/AWSLambdaDeployer.js";
export { DockerDeployer } from "./deployers/DockerDeployer.js";
export { FlyioDeployer } from "./deployers/FlyioDeployer.js";

// Server Generator
export { ServerGenerator, type GeneratedServer } from "./server/index.js";

// Default export
export { DeploymentFactory as default } from "./DeploymentFactory.js";

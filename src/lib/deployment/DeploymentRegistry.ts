/**
 * Deployment Registry
 *
 * Central registry for deployment platforms and bundlers.
 * Uses dynamic imports to avoid circular dependencies and enable
 * lazy loading of deployer implementations.
 *
 * @packageDocumentation
 * @module @neurolink/deployment
 */

import { BaseRegistry } from "../core/infrastructure/index.js";
import { logger } from "../utils/logger.js";
import type {
  DeploymentPlatform,
  BundlerType,
  IDeployer,
  IBundler,
  DeployerMetadata,
  BundlerMetadata,
} from "./types/deploymentTypes.js";

/**
 * Deployer Registry
 *
 * Manages registration and retrieval of platform deployers.
 * Uses dynamic imports for lazy loading.
 */
export class DeployerRegistry extends BaseRegistry<IDeployer, DeployerMetadata> {
  private static instance: DeployerRegistry;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DeployerRegistry {
    if (!DeployerRegistry.instance) {
      DeployerRegistry.instance = new DeployerRegistry();
    }
    return DeployerRegistry.instance;
  }

  /**
   * Register all built-in deployers
   */
  protected async registerAll(): Promise<void> {
    logger.debug("Registering deployment platforms...");

    // Vercel Deployer
    this.register(
      "vercel",
      async () => {
        const { VercelDeployer } = await import("./deployers/VercelDeployer.js");
        return new VercelDeployer();
      },
      {
        platform: "vercel",
        displayName: "Vercel",
        description: "Deploy to Vercel Serverless Functions and Edge Runtime",
        features: [
          "serverless",
          "edge",
          "automatic-https",
          "preview-deployments",
          "rollback",
        ],
        requiredConfig: [],
        docsUrl: "https://vercel.com/docs",
      },
    );

    // Cloudflare Workers Deployer
    this.register(
      "cloudflare",
      async () => {
        const { CloudflareDeployer } = await import(
          "./deployers/CloudflareDeployer.js"
        );
        return new CloudflareDeployer();
      },
      {
        platform: "cloudflare",
        displayName: "Cloudflare Workers",
        description: "Deploy to Cloudflare Workers edge network",
        features: [
          "edge",
          "kv-storage",
          "durable-objects",
          "d1-database",
          "global-network",
        ],
        requiredConfig: ["accountId"],
        docsUrl: "https://developers.cloudflare.com/workers",
      },
    );

    // Netlify Functions Deployer
    this.register(
      "netlify",
      async () => {
        const { NetlifyDeployer } = await import(
          "./deployers/NetlifyDeployer.js"
        );
        return new NetlifyDeployer();
      },
      {
        platform: "netlify",
        displayName: "Netlify Functions",
        description: "Deploy to Netlify Functions with edge support",
        features: [
          "serverless",
          "edge-functions",
          "background-functions",
          "scheduled-functions",
        ],
        requiredConfig: [],
        docsUrl: "https://docs.netlify.com/functions/overview",
      },
    );

    // AWS Lambda Deployer
    this.register(
      "lambda",
      async () => {
        const { AWSLambdaDeployer } = await import(
          "./deployers/AWSLambdaDeployer.js"
        );
        return new AWSLambdaDeployer();
      },
      {
        platform: "lambda",
        displayName: "AWS Lambda",
        description: "Deploy to AWS Lambda with API Gateway integration",
        features: [
          "serverless",
          "vpc",
          "provisioned-concurrency",
          "api-gateway",
          "docker",
        ],
        requiredConfig: ["functionName"],
        docsUrl: "https://docs.aws.amazon.com/lambda",
      },
    );

    // Docker Deployer
    this.register(
      "docker",
      async () => {
        const { DockerDeployer } = await import("./deployers/DockerDeployer.js");
        return new DockerDeployer();
      },
      {
        platform: "docker",
        displayName: "Docker",
        description: "Build and push Docker containers",
        features: [
          "containerization",
          "multi-stage",
          "registry-push",
          "health-checks",
        ],
        requiredConfig: ["imageName"],
        docsUrl: "https://docs.docker.com",
      },
    );

    // Fly.io Deployer
    this.register(
      "flyio",
      async () => {
        const { FlyioDeployer } = await import("./deployers/FlyioDeployer.js");
        return new FlyioDeployer();
      },
      {
        platform: "flyio",
        displayName: "Fly.io",
        description: "Deploy to Fly.io global application platform",
        features: [
          "global-deployment",
          "auto-scaling",
          "volumes",
          "private-networking",
        ],
        requiredConfig: ["appName"],
        docsUrl: "https://fly.io/docs",
      },
    );

    logger.debug("Deployment platforms registered successfully");
  }

  /**
   * Get deployer by platform name
   */
  async getDeployer(platform: DeploymentPlatform): Promise<IDeployer> {
    const deployer = await this.get(platform);
    if (!deployer) {
      const available = this.list().map((d) => d.id);
      throw new Error(
        `Unknown deployment platform: ${platform}. Available: ${available.join(", ")}`,
      );
    }
    return deployer;
  }

  /**
   * Check if a platform is supported
   */
  isSupported(platform: string): platform is DeploymentPlatform {
    return this.has(platform);
  }

  /**
   * Get all supported platforms
   */
  getSupportedPlatforms(): DeployerMetadata[] {
    return this.list().map((entry) => entry.metadata);
  }
}

/**
 * Bundler Registry
 *
 * Manages registration and retrieval of bundler implementations.
 */
export class BundlerRegistry extends BaseRegistry<IBundler, BundlerMetadata> {
  private static instance: BundlerRegistry;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BundlerRegistry {
    if (!BundlerRegistry.instance) {
      BundlerRegistry.instance = new BundlerRegistry();
    }
    return BundlerRegistry.instance;
  }

  /**
   * Register all built-in bundlers
   */
  protected async registerAll(): Promise<void> {
    logger.debug("Registering bundlers...");

    // ESBuild Bundler
    this.register(
      "esbuild",
      async () => {
        const { ESBuildBundler } = await import("./bundlers/ESBuildBundler.js");
        return new ESBuildBundler();
      },
      {
        type: "esbuild",
        displayName: "ESBuild",
        description: "Ultra-fast JavaScript/TypeScript bundler",
        supportedTargets: ["node", "browser", "worker"],
        defaultOptions: {
          format: "esm",
          platform: "node",
          target: "node18",
          bundle: true,
          minify: false,
          sourcemap: true,
        },
      },
    );

    // Vite Bundler
    this.register(
      "vite",
      async () => {
        const { ViteBundler } = await import("./bundlers/ViteBundler.js");
        return new ViteBundler();
      },
      {
        type: "vite",
        displayName: "Vite",
        description: "Next-generation frontend build tool",
        supportedTargets: ["node", "browser", "edge"],
        defaultOptions: {
          mode: "production",
          ssr: true,
          target: "esnext",
        },
      },
    );

    logger.debug("Bundlers registered successfully");
  }

  /**
   * Get bundler by type
   */
  async getBundler(type: BundlerType): Promise<IBundler> {
    const bundler = await this.get(type);
    if (!bundler) {
      const available = this.list().map((b) => b.id);
      throw new Error(
        `Unknown bundler type: ${type}. Available: ${available.join(", ")}`,
      );
    }
    return bundler;
  }

  /**
   * Check if a bundler type is supported
   */
  isSupported(type: string): type is BundlerType {
    return this.has(type);
  }

  /**
   * Get all supported bundlers
   */
  getSupportedBundlers(): BundlerMetadata[] {
    return this.list().map((entry) => entry.metadata);
  }
}

// Export singleton instances
export const deployerRegistry = DeployerRegistry.getInstance();
export const bundlerRegistry = BundlerRegistry.getInstance();

/**
 * Cloudflare Workers Deployer
 *
 * Deploy NeuroLink applications to Cloudflare Workers edge network.
 *
 * @packageDocumentation
 * @module @neurolink/deployment
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { logger } from "../../utils/logger.js";
import { BaseDeployer } from "./BaseDeployer.js";
import { PlatformDeploymentError } from "../DeploymentErrors.js";
import type {
  DeploymentPlatform,
  DeployConfig,
  BuildOutput,
  DeployResult,
  ValidationError,
  CloudflareDeployerConfig,
} from "../types/deploymentTypes.js";

/**
 * Cloudflare Workers Deployer
 *
 * Deploys to Cloudflare's global edge network using Wrangler CLI.
 *
 * @example
 * ```typescript
 * const deployer = new CloudflareDeployer();
 *
 * const config: DeployConfig = {
 *   platform: 'cloudflare',
 *   entry: './src/index.ts',
 *   outDir: './dist',
 *   platformConfig: {
 *     platform: 'cloudflare',
 *     workerName: 'my-neurolink-worker',
 *     accountId: 'your-account-id'
 *   }
 * };
 *
 * const result = await deployer.deploy(config);
 * ```
 */
export class CloudflareDeployer extends BaseDeployer {
  readonly name: DeploymentPlatform = "cloudflare";

  private cfConfig: CloudflareDeployerConfig;

  constructor(config?: CloudflareDeployerConfig) {
    super();
    this.cfConfig = config || { platform: "cloudflare" };
  }

  /**
   * Validate Cloudflare-specific configuration
   */
  protected validatePlatformConfig(config: DeployConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for Wrangler CLI
    try {
      execSync("wrangler --version", { stdio: "pipe" });
    } catch {
      errors.push({
        code: "WRANGLER_CLI_MISSING",
        message: "Wrangler CLI is not installed",
        suggestion: "Install with: npm install -g wrangler",
      });
    }

    const platformConfig = config.platformConfig as CloudflareDeployerConfig | undefined;

    // Account ID is recommended
    if (!platformConfig?.accountId && !this.cfConfig.accountId && !process.env.CLOUDFLARE_ACCOUNT_ID) {
      errors.push({
        code: "MISSING_ACCOUNT_ID",
        message: "Cloudflare account ID is required",
        field: "platformConfig.accountId",
        suggestion: "Set CLOUDFLARE_ACCOUNT_ID environment variable or provide in config",
      });
    }

    return errors;
  }

  /**
   * Prepare Cloudflare-specific build output
   */
  protected async preparePlatformBuild(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<void> {
    logger.info("Preparing Cloudflare Workers build...");

    const platformConfig = (config.platformConfig as CloudflareDeployerConfig) || {};
    const workerName = platformConfig.workerName || this.cfConfig.workerName || "neurolink-worker";

    // Generate wrangler.toml
    const wranglerConfig = this.generateWranglerConfig(config, buildOutput);
    fs.writeFileSync(
      path.join(buildOutput.outputDir, "wrangler.toml"),
      wranglerConfig,
    );

    // Generate worker entry point
    const workerEntry = this.generateWorkerEntry(buildOutput);
    fs.writeFileSync(
      path.join(buildOutput.outputDir, "worker.mjs"),
      workerEntry,
    );

    logger.info("Cloudflare Workers build prepared");
  }

  /**
   * Deploy to Cloudflare Workers
   */
  protected async doDeploy(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<DeployResult> {
    logger.info("Deploying to Cloudflare Workers...");

    try {
      const platformConfig = (config.platformConfig as CloudflareDeployerConfig) || {};
      const args = ["deploy", "--minify"];

      // Use the generated worker entry
      args.push("worker.mjs");

      // Build environment
      const deployEnv: Record<string, string> = {
        ...process.env as Record<string, string>,
      };

      if (platformConfig.apiToken || this.cfConfig.apiToken) {
        deployEnv.CLOUDFLARE_API_TOKEN = platformConfig.apiToken || this.cfConfig.apiToken!;
      }

      if (platformConfig.accountId || this.cfConfig.accountId) {
        deployEnv.CLOUDFLARE_ACCOUNT_ID = platformConfig.accountId || this.cfConfig.accountId!;
      }

      // Add environment variables as secrets
      const env = this.getEnvironmentVariables(config);
      const secrets: string[] = [];
      for (const [key, value] of Object.entries(env)) {
        if (!key.startsWith("CLOUDFLARE_") && value) {
          secrets.push(key);
          deployEnv[key] = value;
        }
      }

      // Execute deployment
      const output = execSync(`wrangler ${args.join(" ")}`, {
        encoding: "utf-8",
        cwd: buildOutput.outputDir,
        env: deployEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Extract URL from output
      const urlMatch = output.match(/https:\/\/[^\s]+\.workers\.dev/);
      const url = urlMatch ? urlMatch[0] : undefined;

      // Upload secrets if any
      if (secrets.length > 0) {
        logger.info(`Setting ${secrets.length} secrets...`);
        for (const secret of secrets) {
          try {
            execSync(`echo "${env[secret]}" | wrangler secret put ${secret}`, {
              cwd: buildOutput.outputDir,
              env: deployEnv,
              stdio: ["pipe", "pipe", "pipe"],
            });
          } catch (error) {
            logger.warn(`Could not set secret ${secret}: ${(error as Error).message}`);
          }
        }
      }

      logger.info(`Cloudflare Workers deployment complete: ${url}`);

      return {
        success: true,
        url,
        status: "success",
        timestamp: new Date(),
        logs: output.split("\n").filter((line) => line.trim()),
        metadata: {
          platform: "cloudflare",
          workerName: platformConfig.workerName || this.cfConfig.workerName,
        },
      };
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr || "";
      const message = stderr || (error as Error).message;

      throw new PlatformDeploymentError("cloudflare", `Cloudflare deployment failed: ${message}`, {
        details: { stderr },
        cause: error as Error,
      });
    }
  }

  /**
   * Get deployment status
   */
  async getStatus(deploymentId: string): Promise<DeployResult> {
    try {
      const output = execSync(`wrangler deployments list --json`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const deployments = JSON.parse(output);
      const deployment = deployments.find((d: { id: string }) => d.id === deploymentId);

      if (!deployment) {
        return {
          success: false,
          deploymentId,
          status: "failed",
          error: "Deployment not found",
          timestamp: new Date(),
        };
      }

      return {
        success: deployment.status === "active",
        deploymentId,
        status: deployment.status === "active" ? "success" : "pending",
        timestamp: new Date(deployment.created_on),
      };
    } catch (error) {
      return {
        success: false,
        deploymentId,
        status: "failed",
        error: (error as Error).message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Rollback to a previous deployment
   */
  async rollback(deploymentId: string): Promise<DeployResult> {
    try {
      const output = execSync(`wrangler rollback ${deploymentId}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      return {
        success: true,
        deploymentId,
        status: "success",
        timestamp: new Date(),
        metadata: {
          rollbackTo: deploymentId,
        },
      };
    } catch (error) {
      throw new PlatformDeploymentError("cloudflare", `Rollback failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get deployment logs
   */
  async getLogs(deploymentId: string): Promise<string[]> {
    try {
      const output = execSync(`wrangler tail --format=json`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 5000,
      });

      return output.split("\n").filter((line) => line.trim());
    } catch (error) {
      logger.warn(`Could not fetch logs: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Generate wrangler.toml configuration
   */
  private generateWranglerConfig(config: DeployConfig, buildOutput: BuildOutput): string {
    const platformConfig = (config.platformConfig as CloudflareDeployerConfig) || {};
    const workerName = platformConfig.workerName || this.cfConfig.workerName || "neurolink-worker";

    let toml = `# Generated by NeuroLink Deployment System
name = "${workerName}"
main = "worker.mjs"
compatibility_date = "${platformConfig.compatibilityDate || this.cfConfig.compatibilityDate || new Date().toISOString().split("T")[0]}"
`;

    // Add account ID if specified
    if (platformConfig.accountId || this.cfConfig.accountId) {
      toml += `account_id = "${platformConfig.accountId || this.cfConfig.accountId}"\n`;
    }

    // Add compatibility flags
    const flags = platformConfig.compatibilityFlags || this.cfConfig.compatibilityFlags || [];
    if (flags.length > 0) {
      toml += `compatibility_flags = [${flags.map((f) => `"${f}"`).join(", ")}]\n`;
    }

    // Add routes
    const routes = platformConfig.routes || this.cfConfig.routes || [];
    if (routes.length > 0) {
      toml += "\n[[routes]]\n";
      for (const route of routes) {
        toml += `pattern = "${route.pattern}"\n`;
        if (route.zone_id) {
          toml += `zone_id = "${route.zone_id}"\n`;
        }
        if (route.zone_name) {
          toml += `zone_name = "${route.zone_name}"\n`;
        }
      }
    }

    // Add KV namespaces
    const kvNamespaces = platformConfig.kvNamespaces || this.cfConfig.kvNamespaces || [];
    for (const kv of kvNamespaces) {
      toml += `\n[[kv_namespaces]]\n`;
      toml += `binding = "${kv.binding}"\n`;
      toml += `id = "${kv.id}"\n`;
      if (kv.preview_id) {
        toml += `preview_id = "${kv.preview_id}"\n`;
      }
    }

    // Add D1 databases
    const d1Databases = platformConfig.d1Databases || this.cfConfig.d1Databases || [];
    for (const d1 of d1Databases) {
      toml += `\n[[d1_databases]]\n`;
      toml += `binding = "${d1.binding}"\n`;
      toml += `database_id = "${d1.database_id}"\n`;
      toml += `database_name = "${d1.database_name}"\n`;
    }

    // Add Durable Objects
    const durableObjects = platformConfig.durableObjects || this.cfConfig.durableObjects || [];
    if (durableObjects.length > 0) {
      toml += "\n[durable_objects]\n";
      toml += "bindings = [\n";
      for (const obj of durableObjects) {
        toml += `  { name = "${obj.name}", class_name = "${obj.class_name}"`;
        if (obj.script_name) {
          toml += `, script_name = "${obj.script_name}"`;
        }
        toml += " },\n";
      }
      toml += "]\n";
    }

    return toml;
  }

  /**
   * Generate worker entry point
   */
  private generateWorkerEntry(buildOutput: BuildOutput): string {
    return `// Generated by NeuroLink Deployment System
import { Hono } from 'hono';

const app = new Hono();

// Health check
app.get('/health', (c) => c.json({ status: 'ok', platform: 'cloudflare-workers' }));

// Import and mount application
import * as neurolink from './index.mjs';

// Mount NeuroLink routes
if (neurolink.default && typeof neurolink.default.fetch === 'function') {
  app.route('/', neurolink.default);
} else if (neurolink.app && typeof neurolink.app.fetch === 'function') {
  app.route('/', neurolink.app);
}

export default app;
`;
  }
}

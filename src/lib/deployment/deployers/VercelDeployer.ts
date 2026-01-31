/**
 * Vercel Deployer
 *
 * Deploy NeuroLink applications to Vercel Serverless Functions
 * and Edge Runtime.
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
  VercelDeployerConfig,
} from "../types/deploymentTypes.js";

/**
 * Vercel Deployer
 *
 * Generates Vercel Build Output API compliant structure and deploys
 * to Vercel using their CLI or API.
 *
 * @example
 * ```typescript
 * const deployer = new VercelDeployer();
 *
 * const config: DeployConfig = {
 *   platform: 'vercel',
 *   entry: './src/index.ts',
 *   outDir: './dist',
 *   platformConfig: {
 *     platform: 'vercel',
 *     maxDuration: 60,
 *     regions: ['iad1', 'sfo1']
 *   }
 * };
 *
 * const result = await deployer.deploy(config);
 * console.log(`Deployed to: ${result.url}`);
 * ```
 */
export class VercelDeployer extends BaseDeployer {
  readonly name: DeploymentPlatform = "vercel";

  private vercelConfig: VercelDeployerConfig;

  constructor(config?: VercelDeployerConfig) {
    super();
    this.vercelConfig = config || { platform: "vercel" };
  }

  /**
   * Validate Vercel-specific configuration
   */
  protected validatePlatformConfig(config: DeployConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for Vercel CLI
    try {
      execSync("vercel --version", { stdio: "pipe" });
    } catch {
      errors.push({
        code: "VERCEL_CLI_MISSING",
        message: "Vercel CLI is not installed",
        suggestion: "Install with: npm install -g vercel",
      });
    }

    // Validate regions if specified
    const platformConfig = config.platformConfig as VercelDeployerConfig | undefined;
    if (platformConfig?.regions) {
      const validRegions = [
        "arn1", "bom1", "cdg1", "cle1", "cpt1", "dub1", "fra1",
        "gru1", "hkg1", "hnd1", "iad1", "icn1", "kix1", "lhr1",
        "pdx1", "sfo1", "sin1", "syd1",
      ];
      for (const region of platformConfig.regions) {
        if (!validRegions.includes(region)) {
          errors.push({
            code: "INVALID_REGION",
            message: `Invalid Vercel region: ${region}`,
            field: "platformConfig.regions",
            suggestion: `Valid regions: ${validRegions.join(", ")}`,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Prepare Vercel-specific build output
   */
  protected async preparePlatformBuild(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<void> {
    logger.info("Preparing Vercel Build Output API structure...");

    const projectDir = process.cwd();
    const vercelOutputDir = path.join(projectDir, ".vercel", "output");
    const functionsDir = path.join(vercelOutputDir, "functions", "api.func");

    // Create directory structure
    fs.mkdirSync(functionsDir, { recursive: true });

    // Copy build output to functions directory
    this.copyBuildOutput(buildOutput.outputDir, functionsDir);

    // Generate Vercel config
    const platformConfig = (config.platformConfig as VercelDeployerConfig) || {};

    const vercelConfig = {
      version: 3,
      routes: [
        {
          src: "/api/(.*)",
          dest: "/api",
        },
        {
          src: "/(.*)",
          dest: "/api",
        },
      ],
    };

    fs.writeFileSync(
      path.join(vercelOutputDir, "config.json"),
      JSON.stringify(vercelConfig, null, 2),
    );

    // Generate function config
    const funcConfig: Record<string, unknown> = {
      runtime: "nodejs20.x",
      handler: "index.handler",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
      maxDuration: platformConfig.maxDuration || this.vercelConfig.maxDuration || 60,
      memory: platformConfig.memory || this.vercelConfig.memory || 1024,
    };

    if (platformConfig.regions || this.vercelConfig.regions) {
      funcConfig.regions = platformConfig.regions || this.vercelConfig.regions;
    }

    if (platformConfig.edge || this.vercelConfig.edge) {
      funcConfig.runtime = "edge";
    }

    fs.writeFileSync(
      path.join(functionsDir, ".vc-config.json"),
      JSON.stringify(funcConfig, null, 2),
    );

    // Create handler wrapper
    const handlerContent = this.generateHandler(buildOutput);
    fs.writeFileSync(
      path.join(functionsDir, "index.mjs"),
      handlerContent,
    );

    logger.info("Vercel build output prepared");
  }

  /**
   * Deploy to Vercel
   */
  protected async doDeploy(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<DeployResult> {
    logger.info("Deploying to Vercel...");

    try {
      const args = ["--prebuilt", "--yes"];
      const platformConfig = (config.platformConfig as VercelDeployerConfig) || {};

      // Add project name if specified
      if (platformConfig.projectName || this.vercelConfig.projectName) {
        args.push("--name", platformConfig.projectName || this.vercelConfig.projectName!);
      }

      // Add team if specified
      if (platformConfig.teamId || this.vercelConfig.teamId) {
        args.push("--scope", platformConfig.teamId || this.vercelConfig.teamId!);
      }

      // Add environment variables
      const env = this.getEnvironmentVariables(config);
      for (const [key, value] of Object.entries(env)) {
        if (!key.startsWith("VERCEL_")) {
          args.push("-e", `${key}=${value}`);
        }
      }

      // Build deploy command
      const command = `vercel ${args.join(" ")}`;

      // Set up environment for deployment
      const deployEnv: Record<string, string> = {
        ...process.env as Record<string, string>,
      };

      if (platformConfig.token || this.vercelConfig.token) {
        deployEnv.VERCEL_TOKEN = platformConfig.token || this.vercelConfig.token!;
      }

      // Execute deployment
      const output = execSync(command, {
        encoding: "utf-8",
        cwd: process.cwd(),
        env: deployEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Extract URL from output
      const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app/);
      const url = urlMatch ? urlMatch[0] : undefined;

      // Extract deployment ID
      const deploymentIdMatch = output.match(/([a-z0-9]+-[a-z0-9]+-[a-z0-9]+)/i);
      const deploymentId = deploymentIdMatch ? deploymentIdMatch[1] : undefined;

      logger.info(`Vercel deployment complete: ${url}`);

      return {
        success: true,
        url,
        deploymentId,
        status: "success",
        timestamp: new Date(),
        logs: output.split("\n").filter((line) => line.trim()),
        metadata: {
          platform: "vercel",
          regions: platformConfig.regions || this.vercelConfig.regions,
        },
      };
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr || "";
      const message = stderr || (error as Error).message;

      throw new PlatformDeploymentError("vercel", `Vercel deployment failed: ${message}`, {
        details: {
          stderr,
          command: "vercel --prebuilt",
        },
        cause: error as Error,
      });
    }
  }

  /**
   * Get deployment status
   */
  async getStatus(deploymentId: string): Promise<DeployResult> {
    try {
      const output = execSync(`vercel inspect ${deploymentId}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Parse status from output
      const statusMatch = output.match(/Status:\s+(\w+)/i);
      const status = statusMatch ? statusMatch[1].toLowerCase() : "pending";

      const urlMatch = output.match(/URL:\s+(https:\/\/[^\s]+)/i);
      const url = urlMatch ? urlMatch[1] : undefined;

      return {
        success: status === "ready",
        url,
        deploymentId,
        status: status === "ready" ? "success" : status === "error" ? "failed" : "pending",
        timestamp: new Date(),
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
   * Cancel a deployment
   */
  async cancel(deploymentId: string): Promise<void> {
    try {
      execSync(`vercel remove ${deploymentId} --yes`, {
        stdio: ["pipe", "pipe", "pipe"],
      });
      logger.info(`Cancelled deployment: ${deploymentId}`);
    } catch (error) {
      throw new PlatformDeploymentError("vercel", `Failed to cancel deployment: ${(error as Error).message}`);
    }
  }

  /**
   * Rollback to a previous deployment
   */
  async rollback(deploymentId: string): Promise<DeployResult> {
    try {
      const output = execSync(`vercel rollback ${deploymentId} --yes`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app/);

      return {
        success: true,
        url: urlMatch ? urlMatch[0] : undefined,
        deploymentId,
        status: "success",
        timestamp: new Date(),
        metadata: {
          rollbackFrom: deploymentId,
        },
      };
    } catch (error) {
      throw new PlatformDeploymentError("vercel", `Rollback failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get deployment logs
   */
  async getLogs(deploymentId: string): Promise<string[]> {
    try {
      const output = execSync(`vercel logs ${deploymentId}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      return output.split("\n").filter((line) => line.trim());
    } catch (error) {
      logger.warn(`Could not fetch logs: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Copy build output to functions directory
   */
  private copyBuildOutput(sourceDir: string, destDir: string): void {
    if (!fs.existsSync(sourceDir)) {
      return;
    }

    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyBuildOutput(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  /**
   * Generate Vercel function handler
   */
  private generateHandler(buildOutput: BuildOutput): string {
    return `// Generated by NeuroLink Deployment System
import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono().basePath('/api');

// Health check
app.get('/health', (c) => c.json({ status: 'ok', platform: 'vercel' }));

// Import and mount application
import * as neurolink from './index.mjs';

// Mount NeuroLink routes
if (neurolink.default && typeof neurolink.default.fetch === 'function') {
  app.mount('/', neurolink.default);
} else if (neurolink.app && typeof neurolink.app.fetch === 'function') {
  app.mount('/', neurolink.app);
}

export default handle(app);
`;
  }
}

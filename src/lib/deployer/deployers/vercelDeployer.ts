/**
 * Vercel Deployer - Deploy NeuroLink to Vercel Serverless Functions
 *
 * Generates Vercel Build Output API compliant structure:
 * .vercel/
 * └── output/
 *     ├── config.json
 *     └── functions/
 *         └── index.func/
 *             ├── .vc-config.json
 *             └── index.mjs
 *
 * @packageDocumentation
 * @module @juspay/neurolink/deployer
 * @category Deployment
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { logger } from "../../utils/logger.js";
import type {
  Deployer,
  DeployConfig,
  DeployResult,
  VercelDeployerConfig,
  DeploymentPlatform,
} from "../types.js";

/**
 * Vercel Deployer - Deploy to Vercel Serverless Functions
 *
 * @example
 * ```typescript
 * const deployer = new VercelDeployer({
 *   maxDuration: 60,
 *   memory: 1024,
 *   regions: ['iad1', 'sfo1']
 * });
 *
 * await deployer.build(config);
 * const result = await deployer.deploy(config);
 * console.log(`Deployed to: ${result.url}`);
 * ```
 */
export class VercelDeployer implements Deployer {
  readonly name: DeploymentPlatform = "vercel";
  private vercelConfig: VercelDeployerConfig;

  constructor(config?: VercelDeployerConfig) {
    this.vercelConfig = config || {};
  }

  /**
   * Build the application for Vercel deployment
   */
  async build(config: DeployConfig): Promise<void> {
    logger.info("Building for Vercel deployment...");

    const vercelOutputDir = path.join(process.cwd(), ".vercel", "output");
    const functionsDir = path.join(vercelOutputDir, "functions", "index.func");

    // Create directory structure
    fs.mkdirSync(functionsDir, { recursive: true });

    // Copy build output to functions directory
    if (fs.existsSync(config.outDir)) {
      this.copyDirectory(config.outDir, functionsDir);
    }

    // Generate Vercel config
    const vercelConfig = {
      version: 3,
      routes: [
        {
          src: "/api/(.*)",
          dest: "/index",
        },
        {
          src: "/(.*)",
          dest: "/index",
        },
      ],
    };

    fs.writeFileSync(
      path.join(vercelOutputDir, "config.json"),
      JSON.stringify(vercelConfig, null, 2)
    );

    // Generate function config
    const funcConfig = {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
      maxDuration: this.vercelConfig.maxDuration || 60,
      memory: this.vercelConfig.memory || 1024,
      regions: this.vercelConfig.regions || ["iad1"],
    };

    fs.writeFileSync(
      path.join(functionsDir, ".vc-config.json"),
      JSON.stringify(funcConfig, null, 2)
    );

    logger.info("Vercel build complete", { functionsDir });
  }

  /**
   * Deploy to Vercel
   */
  async deploy(config: DeployConfig): Promise<DeployResult> {
    // Validate Vercel CLI
    const validation = await this.validate();
    if (!validation.valid) {
      return {
        url: "",
        deploymentId: "",
        status: "failed",
        logs: validation.errors,
      };
    }

    try {
      const args = ["--prebuilt"];

      if (this.vercelConfig.projectName) {
        args.push("--name", this.vercelConfig.projectName);
      }

      if (this.vercelConfig.teamId) {
        args.push("--scope", this.vercelConfig.teamId);
      }

      // Add environment variables
      if (config.env) {
        for (const [key, value] of Object.entries(config.env)) {
          args.push("-e", `${key}=${value}`);
        }
      }

      // Execute deployment
      const output = execSync(`vercel ${args.join(" ")}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Extract URL from output
      const urlMatch = output.match(/https:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : "";

      return {
        url,
        deploymentId: `vercel-${Date.now()}`,
        status: "success",
        logs: [output],
      };
    } catch (error) {
      return {
        url: "",
        deploymentId: "",
        status: "failed",
        logs: [(error as Error).message],
      };
    }
  }

  /**
   * Get deployment status
   */
  async getStatus(deploymentId: string): Promise<DeployResult> {
    // Vercel doesn't have a simple status check via CLI
    // Would need to use the Vercel API for proper status checking
    return {
      url: "",
      deploymentId,
      status: "pending",
      logs: ["Status check not implemented for Vercel CLI deployments"],
    };
  }

  /**
   * Validate Vercel deployment requirements
   */
  private async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for Vercel CLI
    try {
      execSync("vercel --version", { stdio: "ignore" });
    } catch {
      errors.push("Vercel CLI not found. Install with: npm i -g vercel");
    }

    // Check for Vercel token (optional for local dev)
    if (!process.env.VERCEL_TOKEN && process.env.CI) {
      errors.push("VERCEL_TOKEN not set (required for CI deployment)");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Copy directory recursively
   */
  private copyDirectory(src: string, dest: string): void {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

export default VercelDeployer;

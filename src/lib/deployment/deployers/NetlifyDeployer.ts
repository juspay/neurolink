/**
 * Netlify Deployer
 *
 * Deploy NeuroLink applications to Netlify Functions.
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
  NetlifyDeployerConfig,
} from "../types/deploymentTypes.js";

/**
 * Netlify Functions Deployer
 *
 * Deploys to Netlify Functions with support for Edge Functions.
 *
 * @example
 * ```typescript
 * const deployer = new NetlifyDeployer();
 *
 * const config: DeployConfig = {
 *   platform: 'netlify',
 *   entry: './src/index.ts',
 *   outDir: './dist',
 *   platformConfig: {
 *     platform: 'netlify',
 *     siteId: 'your-site-id'
 *   }
 * };
 *
 * const result = await deployer.deploy(config);
 * ```
 */
export class NetlifyDeployer extends BaseDeployer {
  readonly name: DeploymentPlatform = "netlify";

  private netlifyConfig: NetlifyDeployerConfig;

  constructor(config?: NetlifyDeployerConfig) {
    super();
    this.netlifyConfig = config || { platform: "netlify" };
  }

  /**
   * Validate Netlify-specific configuration
   */
  protected validatePlatformConfig(config: DeployConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for Netlify CLI
    try {
      execSync("netlify --version", { stdio: "pipe" });
    } catch {
      errors.push({
        code: "NETLIFY_CLI_MISSING",
        message: "Netlify CLI is not installed",
        suggestion: "Install with: npm install -g netlify-cli",
      });
    }

    return errors;
  }

  /**
   * Prepare Netlify-specific build output
   */
  protected async preparePlatformBuild(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<void> {
    logger.info("Preparing Netlify Functions build...");

    const platformConfig = (config.platformConfig as NetlifyDeployerConfig) || {};
    const functionsDir = platformConfig.functionsDir || "netlify/functions";
    const publishDir = platformConfig.publishDir || "public";

    const projectDir = process.cwd();
    const netlifyFunctionsDir = path.join(projectDir, functionsDir);
    const netlifyPublishDir = path.join(projectDir, publishDir);

    // Create directory structure
    fs.mkdirSync(netlifyFunctionsDir, { recursive: true });
    fs.mkdirSync(netlifyPublishDir, { recursive: true });

    // Copy build output to functions directory
    this.copyBuildOutput(buildOutput.outputDir, netlifyFunctionsDir);

    // Generate netlify.toml
    const netlifyToml = this.generateNetlifyToml(config, buildOutput);
    fs.writeFileSync(path.join(projectDir, "netlify.toml"), netlifyToml);

    // Generate function handler
    const handlerContent = this.generateHandler(buildOutput, platformConfig.edge);
    const handlerPath = platformConfig.edge
      ? path.join(projectDir, "netlify", "edge-functions", "handler.ts")
      : path.join(netlifyFunctionsDir, "handler.mts");

    if (platformConfig.edge) {
      fs.mkdirSync(path.dirname(handlerPath), { recursive: true });
    }

    fs.writeFileSync(handlerPath, handlerContent);

    // Create a simple index.html for the publish directory
    fs.writeFileSync(
      path.join(netlifyPublishDir, "index.html"),
      `<!DOCTYPE html>
<html>
<head><title>NeuroLink API</title></head>
<body>
<h1>NeuroLink API</h1>
<p>API is running. Use /api/* endpoints.</p>
</body>
</html>`,
    );

    logger.info("Netlify Functions build prepared");
  }

  /**
   * Deploy to Netlify
   */
  protected async doDeploy(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<DeployResult> {
    logger.info("Deploying to Netlify...");

    try {
      const platformConfig = (config.platformConfig as NetlifyDeployerConfig) || {};
      const args = ["deploy", "--prod"];

      // Add site ID if specified
      if (platformConfig.siteId || this.netlifyConfig.siteId) {
        args.push("--site", platformConfig.siteId || this.netlifyConfig.siteId!);
      }

      // Build environment
      const deployEnv: Record<string, string> = {
        ...process.env as Record<string, string>,
      };

      if (platformConfig.authToken || this.netlifyConfig.authToken) {
        deployEnv.NETLIFY_AUTH_TOKEN = platformConfig.authToken || this.netlifyConfig.authToken!;
      }

      // Execute deployment
      const output = execSync(`netlify ${args.join(" ")}`, {
        encoding: "utf-8",
        cwd: process.cwd(),
        env: deployEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Extract URL from output
      const urlMatch = output.match(/https:\/\/[^\s]+\.netlify\.app/);
      const url = urlMatch ? urlMatch[0] : undefined;

      // Extract deploy ID
      const deployIdMatch = output.match(/Deploy ID:\s+([a-z0-9]+)/i);
      const deploymentId = deployIdMatch ? deployIdMatch[1] : undefined;

      // Set environment variables
      const env = this.getEnvironmentVariables(config);
      for (const [key, value] of Object.entries(env)) {
        if (!key.startsWith("NETLIFY_") && value) {
          try {
            execSync(`netlify env:set ${key} "${value}"`, {
              cwd: process.cwd(),
              env: deployEnv,
              stdio: ["pipe", "pipe", "pipe"],
            });
          } catch (error) {
            logger.warn(`Could not set env ${key}: ${(error as Error).message}`);
          }
        }
      }

      logger.info(`Netlify deployment complete: ${url}`);

      return {
        success: true,
        url,
        deploymentId,
        status: "success",
        timestamp: new Date(),
        logs: output.split("\n").filter((line) => line.trim()),
        metadata: {
          platform: "netlify",
          siteId: platformConfig.siteId || this.netlifyConfig.siteId,
        },
      };
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr || "";
      const message = stderr || (error as Error).message;

      throw new PlatformDeploymentError("netlify", `Netlify deployment failed: ${message}`, {
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
      const output = execSync(`netlify api getDeploy --data '{"deploy_id": "${deploymentId}"}'`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const deploy = JSON.parse(output);

      return {
        success: deploy.state === "ready",
        url: deploy.ssl_url || deploy.url,
        deploymentId,
        status: deploy.state === "ready" ? "success" : deploy.state === "error" ? "failed" : "pending",
        timestamp: new Date(deploy.created_at),
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
      const output = execSync(`netlify api restoreSiteDeploy --data '{"deploy_id": "${deploymentId}"}'`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const deploy = JSON.parse(output);

      return {
        success: true,
        url: deploy.ssl_url || deploy.url,
        deploymentId,
        status: "success",
        timestamp: new Date(),
        metadata: {
          rollbackTo: deploymentId,
        },
      };
    } catch (error) {
      throw new PlatformDeploymentError("netlify", `Rollback failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get deployment logs
   */
  async getLogs(deploymentId: string): Promise<string[]> {
    try {
      const output = execSync(`netlify api getDeploy --data '{"deploy_id": "${deploymentId}"}'`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const deploy = JSON.parse(output);
      return deploy.log_access_attributes?.url
        ? [`Log URL: ${deploy.log_access_attributes.url}`]
        : [];
    } catch (error) {
      logger.warn(`Could not fetch logs: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Copy build output to destination
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
   * Generate netlify.toml configuration
   */
  private generateNetlifyToml(config: DeployConfig, buildOutput: BuildOutput): string {
    const platformConfig = (config.platformConfig as NetlifyDeployerConfig) || {};

    let toml = `# Generated by NeuroLink Deployment System
[build]
  publish = "${platformConfig.publishDir || "public"}"
  functions = "${platformConfig.functionsDir || "netlify/functions"}"
`;

    if (platformConfig.buildCommand) {
      toml += `  command = "${platformConfig.buildCommand}"\n`;
    }

    // Add function settings
    toml += `
[functions]
  node_bundler = "esbuild"
`;

    if (platformConfig.timeout) {
      toml += `  timeout = ${platformConfig.timeout}\n`;
    }

    // Add redirects for API
    toml += `
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/handler/:splat"
  status = 200
`;

    // Edge functions if enabled
    if (platformConfig.edge) {
      toml += `
[[edge_functions]]
  path = "/api/*"
  function = "handler"
`;
    }

    return toml;
  }

  /**
   * Generate function handler
   */
  private generateHandler(buildOutput: BuildOutput, isEdge?: boolean): string {
    if (isEdge) {
      return `// Generated by NeuroLink Deployment System
import { Context } from "@netlify/edge-functions";

export default async function handler(request: Request, context: Context) {
  // Import NeuroLink application
  const { default: app } = await import("../functions/index.mjs");

  if (app && typeof app.fetch === 'function') {
    return app.fetch(request, {
      ...context,
      waitUntil: context.waitUntil.bind(context),
    });
  }

  return new Response(JSON.stringify({ status: 'ok', platform: 'netlify-edge' }), {
    headers: { 'content-type': 'application/json' },
  });
}

export const config = {
  path: "/api/*",
};
`;
    }

    return `// Generated by NeuroLink Deployment System
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// Import NeuroLink application
import * as neurolink from "./index.mjs";

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    // Convert Netlify event to Request
    const url = new URL(event.rawUrl);
    const request = new Request(url.toString(), {
      method: event.httpMethod,
      headers: event.headers as HeadersInit,
      body: event.body || undefined,
    });

    // Call NeuroLink app
    if (neurolink.default && typeof neurolink.default.fetch === 'function') {
      const response = await neurolink.default.fetch(request);
      const body = await response.text();

      return {
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body,
      };
    }

    // Health check fallback
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'ok', platform: 'netlify-functions' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};
`;
  }
}

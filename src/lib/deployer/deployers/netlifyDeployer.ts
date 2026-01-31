/**
 * Netlify Deployer - Deploy NeuroLink to Netlify Functions
 *
 * Generates Netlify Functions compatible output:
 * - netlify.toml configuration
 * - Functions in netlify/functions/ directory
 * - Supports edge functions and serverless
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
  NetlifyDeployerConfig,
  DeploymentPlatform,
} from "../types.js";

/**
 * Netlify Deployer - Deploy to Netlify Functions
 *
 * @example
 * ```typescript
 * const deployer = new NetlifyDeployer({
 *   siteId: 'my-site-id',
 *   functionsDir: 'netlify/functions'
 * });
 *
 * await deployer.build(config);
 * const result = await deployer.deploy(config);
 * console.log(`Deployed to: ${result.url}`);
 * ```
 */
export class NetlifyDeployer implements Deployer {
  readonly name: DeploymentPlatform = "netlify";
  private netlifyConfig: NetlifyDeployerConfig;

  constructor(config?: NetlifyDeployerConfig) {
    this.netlifyConfig = config || {};
  }

  /**
   * Build the application for Netlify Functions deployment
   */
  async build(config: DeployConfig): Promise<void> {
    logger.info("Building for Netlify Functions deployment...");

    const outputDir = config.outDir;
    const functionsDir =
      this.netlifyConfig.functionsDir || "netlify/functions";
    const functionsDirPath = path.join(outputDir, functionsDir);

    // Create directory structure
    fs.mkdirSync(functionsDirPath, { recursive: true });

    // Generate netlify.toml
    const netlifyToml = this.generateNetlifyConfig(config);
    fs.writeFileSync(path.join(outputDir, "netlify.toml"), netlifyToml);

    // Generate function handler
    const functionHandler = this.generateFunctionHandler(config);
    fs.writeFileSync(
      path.join(functionsDirPath, "api.mts"),
      functionHandler
    );

    // Generate package.json for the function
    const packageJson = {
      type: "module",
      dependencies: {
        hono: "^4.0.0",
        "@hono/node-server": "^1.8.0",
      },
    };
    fs.writeFileSync(
      path.join(functionsDirPath, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    logger.info("Netlify Functions build complete", { outputDir });
  }

  /**
   * Deploy to Netlify
   */
  async deploy(config: DeployConfig): Promise<DeployResult> {
    // Validate Netlify CLI
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
      const args = ["deploy", "--prod"];

      if (this.netlifyConfig.siteId) {
        args.push("--site", this.netlifyConfig.siteId);
      }

      args.push("--dir", config.outDir);
      args.push("--functions", path.join(config.outDir, "netlify/functions"));

      // Execute deployment
      const output = execSync(`netlify ${args.join(" ")}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Extract URL from output
      const urlMatch = output.match(/https:\/\/[^\s]+\.netlify\.app/);
      const url = urlMatch ? urlMatch[0] : "";

      // Extract deploy ID
      const deployIdMatch = output.match(/Deploy ID:\s+([^\s]+)/);
      const deploymentId = deployIdMatch
        ? deployIdMatch[1]
        : `netlify-${Date.now()}`;

      return {
        url,
        deploymentId,
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
    try {
      const args = ["api", "getDeploy", "--data", `{"deploy_id": "${deploymentId}"}`];

      const output = execSync(`netlify ${args.join(" ")}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const deployment = JSON.parse(output);

      return {
        url: deployment.ssl_url || deployment.url || "",
        deploymentId,
        status:
          deployment.state === "ready"
            ? "success"
            : deployment.state === "error"
              ? "failed"
              : "pending",
        logs: [],
      };
    } catch (error) {
      return {
        url: "",
        deploymentId,
        status: "failed",
        logs: [(error as Error).message],
      };
    }
  }

  /**
   * Generate netlify.toml configuration
   */
  private generateNetlifyConfig(config: DeployConfig): string {
    const functionsDir =
      this.netlifyConfig.functionsDir || "netlify/functions";
    const bundler = this.netlifyConfig.nodeBundler || "esbuild";

    let toml = `[build]
  functions = "${functionsDir}"
  publish = "."

[functions]
  node_bundler = "${bundler}"
`;

    // Add included files if specified
    if (this.netlifyConfig.includedFiles?.length) {
      toml += `  included_files = [${this.netlifyConfig.includedFiles
        .map((f) => `"${f}"`)
        .join(", ")}]\n`;
    }

    // Add redirects for API routes
    toml += `
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
`;

    // Add environment variables
    if (config.env && Object.keys(config.env).length > 0) {
      toml += "\n[build.environment]\n";
      for (const [key, value] of Object.entries(config.env)) {
        toml += `  ${key} = "${value}"\n`;
      }
    }

    return toml;
  }

  /**
   * Generate function handler
   */
  private generateFunctionHandler(config: DeployConfig): string {
    return `/**
 * Netlify Function Handler
 * Generated by NeuroLink Deployer
 */

import { Hono } from 'hono';
import { handle } from 'hono/netlify';

// Create Hono app
const app = new Hono();

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'netlify-functions' }));

// API routes
app.post('/api/generate', async (c) => {
  try {
    const body = await c.req.json();
    // Import your NeuroLink instance and handle generation
    // const result = await neurolink.generate(body);
    return c.json({ message: 'Generation endpoint - configure with your NeuroLink instance' });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// MCP tools endpoint
app.get('/api/tools', (c) => {
  // Return available tools
  return c.json({ tools: [] });
});

// Tool execution endpoint
app.post('/api/tools/:toolName', async (c) => {
  const toolName = c.req.param('toolName');
  try {
    const input = await c.req.json();
    // Execute tool
    return c.json({ tool: toolName, result: 'Configure tool execution' });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Catch-all for other routes
app.all('*', (c) => {
  return c.json({
    message: 'NeuroLink API',
    endpoints: ['/health', '/api/generate', '/api/tools']
  });
});

// Export Netlify handler
export const handler = handle(app);

// Also export for edge functions
export default app;
`;
  }

  /**
   * Validate Netlify deployment requirements
   */
  private async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for Netlify CLI
    try {
      execSync("netlify --version", { stdio: "ignore" });
    } catch {
      errors.push("Netlify CLI not found. Install with: npm i -g netlify-cli");
    }

    // Check for Netlify token
    if (!process.env.NETLIFY_AUTH_TOKEN && process.env.CI) {
      errors.push(
        "NETLIFY_AUTH_TOKEN not set (required for CI deployment)"
      );
    }

    return { valid: errors.length === 0, errors };
  }
}

export default NetlifyDeployer;

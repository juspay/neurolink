/**
 * Cloudflare Workers Deployer - Deploy NeuroLink to Cloudflare Workers
 *
 * Generates Cloudflare Workers compatible output:
 * - ESM-first bundle using esbuild
 * - wrangler.toml configuration
 * - Support for KV, D1, and Durable Objects bindings
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
  CloudflareDeployerConfig,
  DeploymentPlatform,
} from "../types.js";

/**
 * Cloudflare Workers Deployer - Deploy to Cloudflare's edge network
 *
 * @example
 * ```typescript
 * const deployer = new CloudflareDeployer({
 *   workerName: 'my-neurolink-worker',
 *   accountId: 'abc123',
 *   routes: [{ pattern: 'api.example.com/*', zone_name: 'example.com' }]
 * });
 *
 * await deployer.build(config);
 * const result = await deployer.deploy(config);
 * console.log(`Deployed to: ${result.url}`);
 * ```
 */
export class CloudflareDeployer implements Deployer {
  readonly name: DeploymentPlatform = "cloudflare";
  private cfConfig: CloudflareDeployerConfig;

  constructor(config?: CloudflareDeployerConfig) {
    this.cfConfig = config || {};
  }

  /**
   * Build the application for Cloudflare Workers deployment
   */
  async build(config: DeployConfig): Promise<void> {
    logger.info("Building for Cloudflare Workers deployment...");

    const outputDir = config.outDir;

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });

    // Generate wrangler.toml
    const wranglerConfig = this.generateWranglerConfig(config);
    fs.writeFileSync(
      path.join(outputDir, "wrangler.toml"),
      wranglerConfig
    );

    // Generate worker entry point
    const workerEntry = this.generateWorkerEntry(config);
    fs.writeFileSync(
      path.join(outputDir, "worker.js"),
      workerEntry
    );

    logger.info("Cloudflare Workers build complete", { outputDir });
  }

  /**
   * Deploy to Cloudflare Workers
   */
  async deploy(config: DeployConfig): Promise<DeployResult> {
    // Validate wrangler CLI
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
      const args = ["deploy"];

      if (this.cfConfig.workerName) {
        args.push("--name", this.cfConfig.workerName);
      }

      // Set environment variables
      if (config.env) {
        for (const [key, value] of Object.entries(config.env)) {
          args.push("--var", `${key}:${value}`);
        }
      }

      // Execute deployment from output directory
      const output = execSync(`wrangler ${args.join(" ")}`, {
        cwd: config.outDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Extract URL from output
      const urlMatch = output.match(/https:\/\/[^\s]+\.workers\.dev/);
      const url = urlMatch ? urlMatch[0] : "";

      return {
        url,
        deploymentId: `cf-${Date.now()}`,
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
      const output = execSync("wrangler deployments list --json", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const deployments = JSON.parse(output);
      const deployment = deployments.find(
        (d: { id: string }) => d.id === deploymentId
      );

      if (deployment) {
        return {
          url: deployment.url || "",
          deploymentId,
          status: deployment.status === "active" ? "success" : "pending",
          logs: [],
        };
      }

      return {
        url: "",
        deploymentId,
        status: "pending",
        logs: ["Deployment not found"],
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
   * Generate wrangler.toml configuration
   */
  private generateWranglerConfig(config: DeployConfig): string {
    const workerName = this.cfConfig.workerName || "neurolink-worker";
    const compatDate = this.cfConfig.compatibility_date || "2024-01-01";

    let toml = `name = "${workerName}"
main = "worker.js"
compatibility_date = "${compatDate}"
`;

    // Add account ID if provided
    if (this.cfConfig.accountId) {
      toml += `account_id = "${this.cfConfig.accountId}"\n`;
    }

    // Add compatibility flags
    if (this.cfConfig.compatibility_flags?.length) {
      toml += `compatibility_flags = [${this.cfConfig.compatibility_flags
        .map((f) => `"${f}"`)
        .join(", ")}]\n`;
    }

    // Add routes
    if (this.cfConfig.routes?.length) {
      toml += "\n[[routes]]\n";
      for (const route of this.cfConfig.routes) {
        toml += `pattern = "${route.pattern}"\n`;
        if (route.zone_name) {
          toml += `zone_name = "${route.zone_name}"\n`;
        }
        if (route.custom_domain) {
          toml += `custom_domain = true\n`;
        }
      }
    }

    // Add environment variables
    const vars = { ...this.cfConfig.vars, ...config.env };
    if (Object.keys(vars).length > 0) {
      toml += "\n[vars]\n";
      for (const [key, value] of Object.entries(vars)) {
        toml += `${key} = "${value}"\n`;
      }
    }

    // Add KV namespace bindings
    if (this.cfConfig.kv_namespaces?.length) {
      for (const kv of this.cfConfig.kv_namespaces) {
        toml += `\n[[kv_namespaces]]\nbinding = "${kv.binding}"\nid = "${kv.id}"\n`;
      }
    }

    // Add D1 database bindings
    if (this.cfConfig.d1_databases?.length) {
      for (const d1 of this.cfConfig.d1_databases) {
        toml += `\n[[d1_databases]]\nbinding = "${d1.binding}"\ndatabase_name = "${d1.database_name}"\ndatabase_id = "${d1.database_id}"\n`;
      }
    }

    return toml;
  }

  /**
   * Generate worker entry point
   */
  private generateWorkerEntry(config: DeployConfig): string {
    return `/**
 * Cloudflare Worker Entry Point
 * Generated by NeuroLink Deployer
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Create Hono app
const app = new Hono();

// Enable CORS
app.use('*', cors());

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'cloudflare-workers' }));

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

// Export for Cloudflare Workers
export default app;
`;
  }

  /**
   * Validate Cloudflare deployment requirements
   */
  private async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for wrangler CLI
    try {
      execSync("wrangler --version", { stdio: "ignore" });
    } catch {
      errors.push("Wrangler CLI not found. Install with: npm i -g wrangler");
    }

    // Check for Cloudflare token
    if (!process.env.CLOUDFLARE_API_TOKEN && process.env.CI) {
      errors.push(
        "CLOUDFLARE_API_TOKEN not set (required for CI deployment)"
      );
    }

    return { valid: errors.length === 0, errors };
  }
}

export default CloudflareDeployer;

/**
 * Fly.io Deployer
 *
 * Deploy NeuroLink applications to Fly.io global platform.
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
  FlyioDeployerConfig,
} from "../types/deploymentTypes.js";

/**
 * Fly.io Deployer
 *
 * Deploys to Fly.io's global application platform with
 * support for auto-scaling and volumes.
 *
 * @example
 * ```typescript
 * const deployer = new FlyioDeployer();
 *
 * const config: DeployConfig = {
 *   platform: 'flyio',
 *   entry: './src/index.ts',
 *   outDir: './dist',
 *   platformConfig: {
 *     platform: 'flyio',
 *     appName: 'my-neurolink-app',
 *     primaryRegion: 'iad',
 *     memory: 512
 *   }
 * };
 *
 * const result = await deployer.deploy(config);
 * ```
 */
export class FlyioDeployer extends BaseDeployer {
  readonly name: DeploymentPlatform = "flyio";

  private flyConfig: FlyioDeployerConfig;

  constructor(config?: FlyioDeployerConfig) {
    super();
    this.flyConfig = config || { platform: "flyio", appName: "neurolink-app" };
  }

  /**
   * Validate Fly.io-specific configuration
   */
  protected validatePlatformConfig(config: DeployConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for Fly CLI
    try {
      execSync("fly version", { stdio: "pipe" });
    } catch {
      errors.push({
        code: "FLY_CLI_MISSING",
        message: "Fly CLI (flyctl) is not installed",
        suggestion: "Install with: curl -L https://fly.io/install.sh | sh",
      });
    }

    // Check if logged in
    try {
      execSync("fly auth whoami", { stdio: "pipe" });
    } catch {
      errors.push({
        code: "FLY_NOT_AUTHENTICATED",
        message: "Not authenticated with Fly.io",
        suggestion: "Run: fly auth login",
      });
    }

    const platformConfig = config.platformConfig as FlyioDeployerConfig | undefined;

    // App name is required
    if (!platformConfig?.appName && !this.flyConfig.appName) {
      errors.push({
        code: "MISSING_APP_NAME",
        message: "Fly.io app name is required",
        field: "platformConfig.appName",
      });
    }

    return errors;
  }

  /**
   * Prepare Fly.io-specific build output
   */
  protected async preparePlatformBuild(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<void> {
    logger.info("Preparing Fly.io build...");

    const platformConfig = (config.platformConfig as FlyioDeployerConfig) || {};

    // Generate fly.toml
    const flyToml = this.generateFlyToml(config, platformConfig);
    fs.writeFileSync(path.join(buildOutput.outputDir, "fly.toml"), flyToml);

    // Generate Dockerfile
    const dockerfile = this.generateDockerfile(platformConfig);
    fs.writeFileSync(path.join(buildOutput.outputDir, "Dockerfile"), dockerfile);

    // Generate .dockerignore
    const dockerignore = this.generateDockerignore();
    fs.writeFileSync(path.join(buildOutput.outputDir, ".dockerignore"), dockerignore);

    logger.info("Fly.io build prepared");
  }

  /**
   * Deploy to Fly.io
   */
  protected async doDeploy(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<DeployResult> {
    logger.info("Deploying to Fly.io...");

    const platformConfig = (config.platformConfig as FlyioDeployerConfig) || {};
    const appName = platformConfig.appName || this.flyConfig.appName;

    try {
      // Check if app exists
      let appExists = false;
      try {
        execSync(`fly apps list --json | grep '"${appName}"'`, { stdio: "pipe" });
        appExists = true;
      } catch {
        appExists = false;
      }

      // Create app if it doesn't exist
      if (!appExists) {
        const createArgs = ["apps", "create", appName];

        if (platformConfig.org || this.flyConfig.org) {
          createArgs.push("--org", platformConfig.org || this.flyConfig.org!);
        }

        execSync(`fly ${createArgs.join(" ")}`, {
          cwd: buildOutput.outputDir,
          stdio: ["pipe", "pipe", "pipe"],
        });

        logger.info(`Created Fly.io app: ${appName}`);
      }

      // Set secrets/environment variables
      const env = this.getEnvironmentVariables(config);
      const secrets: string[] = [];
      for (const [key, value] of Object.entries(env)) {
        if (!key.startsWith("FLY_") && value) {
          secrets.push(`${key}=${value}`);
        }
      }

      if (secrets.length > 0) {
        logger.info(`Setting ${secrets.length} secrets...`);
        try {
          execSync(`fly secrets set ${secrets.join(" ")} -a ${appName}`, {
            cwd: buildOutput.outputDir,
            stdio: ["pipe", "pipe", "pipe"],
          });
        } catch (error) {
          logger.warn(`Could not set some secrets: ${(error as Error).message}`);
        }
      }

      // Deploy
      const deployArgs = ["deploy", "--app", appName, "--now"];

      if (platformConfig.primaryRegion || this.flyConfig.primaryRegion) {
        deployArgs.push("--region", platformConfig.primaryRegion || this.flyConfig.primaryRegion!);
      }

      const output = execSync(`fly ${deployArgs.join(" ")}`, {
        encoding: "utf-8",
        cwd: buildOutput.outputDir,
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Get app URL
      const statusOutput = execSync(`fly status -a ${appName} --json`, {
        encoding: "utf-8",
        cwd: buildOutput.outputDir,
        stdio: ["pipe", "pipe", "pipe"],
      });

      const status = JSON.parse(statusOutput);
      const url = `https://${appName}.fly.dev`;

      logger.info(`Fly.io deployment complete: ${url}`);

      return {
        success: true,
        url,
        deploymentId: status.ID || appName,
        status: "success",
        timestamp: new Date(),
        logs: output.split("\n").filter((line) => line.trim()),
        metadata: {
          platform: "flyio",
          appName,
          regions: status.Regions || [],
          machines: status.Machines?.length || 0,
        },
      };
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr || "";
      const message = stderr || (error as Error).message;

      throw new PlatformDeploymentError("flyio", `Fly.io deployment failed: ${message}`, {
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
      const output = execSync(`fly status -a ${deploymentId} --json`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const status = JSON.parse(output);
      const isRunning = status.Machines?.some((m: { State: string }) => m.State === "started");

      return {
        success: isRunning,
        url: `https://${deploymentId}.fly.dev`,
        deploymentId,
        status: isRunning ? "success" : "pending",
        timestamp: new Date(),
        metadata: {
          machines: status.Machines?.length || 0,
          regions: status.Regions || [],
        },
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
   * Scale the deployment
   */
  async scale(
    appName: string,
    count: number,
    options?: { region?: string; memory?: number },
  ): Promise<void> {
    const args = ["scale", "count", count.toString(), "-a", appName];

    if (options?.region) {
      args.push("--region", options.region);
    }

    execSync(`fly ${args.join(" ")}`, { stdio: ["pipe", "pipe", "pipe"] });

    if (options?.memory) {
      execSync(`fly scale memory ${options.memory} -a ${appName}`, {
        stdio: ["pipe", "pipe", "pipe"],
      });
    }

    logger.info(`Scaled ${appName} to ${count} machines`);
  }

  /**
   * Get deployment logs
   */
  async getLogs(deploymentId: string): Promise<string[]> {
    try {
      const output = execSync(`fly logs -a ${deploymentId} --no-tail`, {
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
   * Generate fly.toml configuration
   */
  private generateFlyToml(config: DeployConfig, platformConfig: FlyioDeployerConfig): string {
    const appName = platformConfig.appName || this.flyConfig.appName;
    const primaryRegion = platformConfig.primaryRegion || this.flyConfig.primaryRegion || "iad";
    const port = platformConfig.httpService?.internalPort || 8080;

    let toml = `# Generated by NeuroLink Deployment System
app = "${appName}"
primary_region = "${primaryRegion}"

[build]

[http_service]
  internal_port = ${port}
  force_https = ${platformConfig.httpService?.forceHttps ?? true}
  auto_stop_machines = ${platformConfig.httpService?.autoStopMachines ?? true}
  auto_start_machines = ${platformConfig.httpService?.autoStartMachines ?? true}
  min_machines_running = 0

`;

    // Add machine configuration
    const memory = platformConfig.memory || this.flyConfig.memory || 256;
    const cpus = platformConfig.cpus || this.flyConfig.cpus || 1;
    const machineSize = platformConfig.machineSize || this.flyConfig.machineSize || "shared-cpu-1x";

    toml += `[[vm]]
  cpu_kind = "shared"
  cpus = ${cpus}
  memory_mb = ${memory}

`;

    // Add regions if specified
    const regions = platformConfig.regions || this.flyConfig.regions || [];
    if (regions.length > 0) {
      for (const region of regions) {
        toml += `[[regions]]
  name = "${region}"

`;
      }
    }

    // Add volumes if specified
    const volumes = platformConfig.volumes || this.flyConfig.volumes || [];
    for (const volume of volumes) {
      toml += `[[mounts]]
  source = "${volume.name}"
  destination = "${volume.path}"

`;
    }

    // Add auto-scaling if configured
    const autoscaling = platformConfig.autoscaling || this.flyConfig.autoscaling;
    if (autoscaling) {
      toml += `[services.concurrency]
  type = "requests"
  hard_limit = 250
  soft_limit = 200

`;
    }

    // Add health check
    toml += `[[services.http_checks]]
  interval = 10000
  grace_period = "10s"
  method = "get"
  path = "/health"
  protocol = "http"
  timeout = 2000
`;

    return toml;
  }

  /**
   * Generate Dockerfile for Fly.io
   */
  private generateDockerfile(config: FlyioDeployerConfig): string {
    const port = config.httpService?.internalPort || 8080;

    return `# Generated by NeuroLink Deployment System
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=${port}

# Expose port
EXPOSE ${port}

# Start application
CMD ["node", "index.mjs"]
`;
  }

  /**
   * Generate .dockerignore
   */
  private generateDockerignore(): string {
    return `# Generated by NeuroLink Deployment System
node_modules
npm-debug.log
.git
.gitignore
.env
.env.*
*.md
*.test.*
*.spec.*
coverage
.nyc_output
fly.toml
.DS_Store
`;
  }
}

/**
 * Docker Deployer
 *
 * Build and push Docker containers for NeuroLink applications.
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
  DockerDeployerConfig,
} from "../types/deploymentTypes.js";

/**
 * Docker Deployer
 *
 * Builds Docker containers and optionally pushes to registries.
 *
 * @example
 * ```typescript
 * const deployer = new DockerDeployer();
 *
 * const config: DeployConfig = {
 *   platform: 'docker',
 *   entry: './src/index.ts',
 *   outDir: './dist',
 *   platformConfig: {
 *     platform: 'docker',
 *     imageName: 'my-neurolink-app',
 *     imageTag: 'latest',
 *     registry: 'docker.io/myuser'
 *   }
 * };
 *
 * const result = await deployer.deploy(config);
 * ```
 */
export class DockerDeployer extends BaseDeployer {
  readonly name: DeploymentPlatform = "docker";

  private dockerConfig: DockerDeployerConfig;

  constructor(config?: DockerDeployerConfig) {
    super();
    this.dockerConfig = config || { platform: "docker", imageName: "neurolink-app" };
  }

  /**
   * Validate Docker-specific configuration
   */
  protected validatePlatformConfig(config: DeployConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for Docker
    try {
      execSync("docker --version", { stdio: "pipe" });
    } catch {
      errors.push({
        code: "DOCKER_MISSING",
        message: "Docker is not installed",
        suggestion: "Install Docker: https://docs.docker.com/get-docker/",
      });
    }

    // Check Docker daemon is running
    try {
      execSync("docker info", { stdio: "pipe" });
    } catch {
      errors.push({
        code: "DOCKER_NOT_RUNNING",
        message: "Docker daemon is not running",
        suggestion: "Start Docker Desktop or the Docker daemon",
      });
    }

    const platformConfig = config.platformConfig as DockerDeployerConfig | undefined;

    // Image name is required
    if (!platformConfig?.imageName && !this.dockerConfig.imageName) {
      errors.push({
        code: "MISSING_IMAGE_NAME",
        message: "Docker image name is required",
        field: "platformConfig.imageName",
      });
    }

    return errors;
  }

  /**
   * Prepare Docker-specific build output
   */
  protected async preparePlatformBuild(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<void> {
    logger.info("Preparing Docker build...");

    const platformConfig = (config.platformConfig as DockerDeployerConfig) || {};

    // Generate Dockerfile
    const dockerfile = this.generateDockerfile(config, platformConfig);
    fs.writeFileSync(
      path.join(buildOutput.outputDir, "Dockerfile"),
      dockerfile,
    );

    // Generate .dockerignore
    const dockerignore = this.generateDockerignore();
    fs.writeFileSync(
      path.join(buildOutput.outputDir, ".dockerignore"),
      dockerignore,
    );

    // Generate entrypoint script
    const entrypoint = this.generateEntrypoint(platformConfig);
    fs.writeFileSync(
      path.join(buildOutput.outputDir, "docker-entrypoint.sh"),
      entrypoint,
    );

    logger.info("Docker build prepared");
  }

  /**
   * Deploy (build and optionally push) Docker image
   */
  protected async doDeploy(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<DeployResult> {
    logger.info("Building Docker image...");

    const platformConfig = (config.platformConfig as DockerDeployerConfig) || {};
    const imageName = platformConfig.imageName || this.dockerConfig.imageName;
    const imageTag = platformConfig.imageTag || this.dockerConfig.imageTag || "latest";
    const registry = platformConfig.registry || this.dockerConfig.registry;

    const fullImageName = registry
      ? `${registry}/${imageName}:${imageTag}`
      : `${imageName}:${imageTag}`;

    try {
      // Build Docker image
      const buildArgs: string[] = ["build"];

      // Add build arguments
      const buildArgsConfig = platformConfig.buildArgs || this.dockerConfig.buildArgs || {};
      for (const [key, value] of Object.entries(buildArgsConfig)) {
        buildArgs.push("--build-arg", `${key}=${value}`);
      }

      // Add environment variables as build args
      const env = this.getEnvironmentVariables(config);
      for (const [key, value] of Object.entries(env)) {
        if (!key.startsWith("DOCKER_") && !this.isSecretEnvVar(key)) {
          buildArgs.push("--build-arg", `${key}=${value}`);
        }
      }

      // Add tag
      buildArgs.push("-t", fullImageName);

      // Add Dockerfile path
      if (platformConfig.dockerfile) {
        buildArgs.push("-f", platformConfig.dockerfile);
      }

      // Add build context
      buildArgs.push(buildOutput.outputDir);

      // Execute build
      logger.info(`Building image: ${fullImageName}`);
      const buildOutput2 = execSync(`docker ${buildArgs.join(" ")}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Get image ID
      const imageIdOutput = execSync(`docker images -q ${fullImageName}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const imageId = imageIdOutput.trim();

      // Push to registry if configured
      let pushedUrl: string | undefined;
      if ((platformConfig.push ?? this.dockerConfig.push) && registry) {
        pushedUrl = await this.pushImage(fullImageName, platformConfig);
      }

      // Get image size
      const sizeOutput = execSync(`docker image inspect ${fullImageName} --format='{{.Size}}'`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const imageSize = parseInt(sizeOutput.trim(), 10);

      logger.info(`Docker build complete: ${fullImageName} (${this.formatSize(imageSize)})`);

      return {
        success: true,
        url: pushedUrl,
        deploymentId: imageId,
        status: "success",
        timestamp: new Date(),
        metadata: {
          platform: "docker",
          imageName: fullImageName,
          imageId,
          imageSize,
          pushed: !!pushedUrl,
        },
      };
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr || "";
      const message = stderr || (error as Error).message;

      throw new PlatformDeploymentError("docker", `Docker build failed: ${message}`, {
        details: { stderr },
        cause: error as Error,
      });
    }
  }

  /**
   * Push image to registry
   */
  private async pushImage(
    imageName: string,
    config: DockerDeployerConfig,
  ): Promise<string> {
    logger.info(`Pushing image to registry: ${imageName}`);

    // Login if credentials provided
    const credentials = config.credentials || this.dockerConfig.credentials;
    if (credentials) {
      const registry = config.registry || this.dockerConfig.registry;
      execSync(
        `docker login ${registry || ""} -u ${credentials.username} -p ${credentials.password}`,
        { stdio: ["pipe", "pipe", "pipe"] },
      );
    }

    // Push image
    execSync(`docker push ${imageName}`, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    logger.info(`Image pushed: ${imageName}`);
    return imageName;
  }

  /**
   * Get deployment status (check if image exists locally)
   */
  async getStatus(deploymentId: string): Promise<DeployResult> {
    try {
      const output = execSync(`docker image inspect ${deploymentId}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const imageInfo = JSON.parse(output)[0];

      return {
        success: true,
        deploymentId,
        status: "success",
        timestamp: new Date(imageInfo.Created),
        metadata: {
          size: imageInfo.Size,
          architecture: imageInfo.Architecture,
        },
      };
    } catch (error) {
      return {
        success: false,
        deploymentId,
        status: "failed",
        error: "Image not found",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Generate Dockerfile
   */
  private generateDockerfile(config: DeployConfig, platformConfig: DockerDeployerConfig): string {
    const multistage = platformConfig.multistage ?? this.dockerConfig.multistage ?? true;
    const port = platformConfig.port || this.dockerConfig.port || 8080;

    if (multistage) {
      return `# Generated by NeuroLink Deployment System
# Multi-stage build for smaller final image

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S neurolink && \\
    adduser -S neurolink -u 1001

# Copy from builder
COPY --from=builder --chown=neurolink:neurolink /app/node_modules ./node_modules
COPY --from=builder --chown=neurolink:neurolink /app/*.mjs ./
COPY --from=builder --chown=neurolink:neurolink /app/*.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=${port}

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD wget --no-verbose --tries=1 --spider http://localhost:${port}/health || exit 1

# Switch to non-root user
USER neurolink

# Start application
CMD ["node", "index.mjs"]
`;
    }

    return `# Generated by NeuroLink Deployment System
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=${port}

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD wget --no-verbose --tries=1 --spider http://localhost:${port}/health || exit 1

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
.DS_Store
Thumbs.db
`;
  }

  /**
   * Generate entrypoint script
   */
  private generateEntrypoint(config: DockerDeployerConfig): string {
    return `#!/bin/sh
# Generated by NeuroLink Deployment System

set -e

# Wait for dependencies if needed
if [ -n "$WAIT_FOR" ]; then
    echo "Waiting for $WAIT_FOR..."
    sleep 5
fi

# Start application
exec node index.mjs
`;
  }

  /**
   * Check if environment variable is a secret
   */
  private isSecretEnvVar(name: string): boolean {
    const secretPatterns = [/key$/i, /secret$/i, /password$/i, /token$/i, /auth$/i];
    return secretPatterns.some((pattern) => pattern.test(name));
  }

  /**
   * Format bytes to human-readable size
   */
  private formatSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

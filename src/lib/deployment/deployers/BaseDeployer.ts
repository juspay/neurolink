/**
 * Base Deployer
 *
 * Abstract base class for all platform deployers.
 * Provides common functionality and enforces the deployer interface.
 *
 * @packageDocumentation
 * @module @neurolink/deployment
 */

import fs from "node:fs";
import path from "node:path";
import { TypedEventEmitter } from "../../core/infrastructure/index.js";
import { logger } from "../../utils/logger.js";
import { BundlerFactory } from "../bundlers/BundlerFactory.js";
import { EnvironmentManager } from "../EnvironmentManager.js";
import {
  DeploymentError,
  BuildError,
  ValidationError,
} from "../DeploymentErrors.js";
import type {
  IDeployer,
  DeploymentPlatform,
  DeployConfig,
  BuildConfig,
  BuildOutput,
  DeployResult,
  ValidationResult,
  ValidationError as ValidationErrorType,
  ValidationWarning,
  DeploymentEvents,
  DiscoveredEntries,
  EntryFile,
} from "../types/deploymentTypes.js";

/**
 * Base Deployer Configuration
 */
export interface BaseDeployerConfig {
  /** Custom environment manager */
  environmentManager?: EnvironmentManager;
}

/**
 * Abstract Base Deployer
 *
 * Provides common deployment functionality that all platform
 * deployers inherit from.
 *
 * @example
 * ```typescript
 * class MyPlatformDeployer extends BaseDeployer {
 *   readonly name = 'myplatform';
 *
 *   protected async doDeploy(config: DeployConfig, buildOutput: BuildOutput): Promise<DeployResult> {
 *     // Platform-specific deployment logic
 *   }
 *
 *   protected validatePlatformConfig(config: DeployConfig): ValidationErrorType[] {
 *     // Platform-specific validation
 *   }
 * }
 * ```
 */
export abstract class BaseDeployer
  extends TypedEventEmitter<DeploymentEvents>
  implements IDeployer
{
  /** Platform name */
  abstract readonly name: DeploymentPlatform;

  /** Environment manager */
  protected envManager: EnvironmentManager;

  /** Build output directory */
  protected outputDir: string = ".neurolink/output";

  constructor(config?: BaseDeployerConfig) {
    super();
    this.envManager = config?.environmentManager || new EnvironmentManager();
  }

  /**
   * Validate deployment configuration
   */
  async validate(config: DeployConfig): Promise<ValidationResult> {
    const errors: ValidationErrorType[] = [];
    const warnings: ValidationWarning[] = [];

    this.emit("validation:start", undefined);

    // Validate entry file exists
    if (!config.entry) {
      errors.push({
        code: "MISSING_ENTRY",
        message: "Entry file is required",
        field: "entry",
        suggestion: "Specify the entry file path in the configuration",
      });
    } else if (!fs.existsSync(path.resolve(process.cwd(), config.entry))) {
      errors.push({
        code: "ENTRY_NOT_FOUND",
        message: `Entry file not found: ${config.entry}`,
        field: "entry",
        suggestion: "Check that the entry file path is correct",
      });
    }

    // Validate output directory
    if (!config.outDir) {
      warnings.push({
        code: "DEFAULT_OUTDIR",
        message: "Using default output directory: .neurolink/output",
        field: "outDir",
      });
    }

    // Validate environment
    const envValidation = this.envManager.validateForPlatform(this.name);
    for (const error of envValidation.errors) {
      errors.push({
        code: "ENV_ERROR",
        message: error.message,
        field: `env.${error.variable}`,
      });
    }
    for (const warning of envValidation.warnings) {
      warnings.push({
        code: "ENV_WARNING",
        message: warning.message,
        field: `env.${warning.variable}`,
      });
    }

    // Platform-specific validation
    const platformErrors = this.validatePlatformConfig(config);
    errors.push(...platformErrors);

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
    };

    this.emit("validation:complete", { result });
    return result;
  }

  /**
   * Build the application for deployment
   */
  async build(config: DeployConfig): Promise<BuildOutput> {
    const startTime = Date.now();

    this.emit("build:start", { config });
    this.emit("build:progress", {
      phase: "initialization",
      progress: 0,
      message: "Initializing build...",
    });

    try {
      // Discover entry files
      this.emit("build:progress", {
        phase: "discovery",
        progress: 10,
        message: "Discovering entry files...",
      });
      const entries = await this.discoverEntries(config);

      // Create bundler
      this.emit("build:progress", {
        phase: "bundling",
        progress: 30,
        message: "Creating bundler...",
      });
      const bundler = await BundlerFactory.getBestBundler(config.build);

      // Run bundler
      this.emit("build:progress", {
        phase: "bundling",
        progress: 50,
        message: `Bundling with ${bundler.name}...`,
      });
      const buildOutput = await bundler.bundle(
        config.build || {},
        entries,
      );

      // Platform-specific build preparation
      this.emit("build:progress", {
        phase: "preparation",
        progress: 80,
        message: `Preparing for ${this.name}...`,
      });
      await this.preparePlatformBuild(config, buildOutput);

      // Finalize
      this.emit("build:progress", {
        phase: "finalization",
        progress: 100,
        message: "Build complete",
      });

      const duration = Date.now() - startTime;
      const output: BuildOutput = {
        ...buildOutput,
        duration,
      };

      this.emit("build:complete", { output });
      logger.info(`Build complete in ${duration}ms`);

      return output;
    } catch (error) {
      const buildError =
        error instanceof BuildError
          ? error
          : new BuildError((error as Error).message, {
              cause: error as Error,
            });

      this.emit("build:error", { error: buildError });
      throw buildError;
    }
  }

  /**
   * Deploy the application
   */
  async deploy(config: DeployConfig): Promise<DeployResult> {
    const startTime = Date.now();

    this.emit("deploy:start", { platform: this.name });
    this.emit("deploy:progress", {
      phase: "validation",
      progress: 0,
      message: "Validating configuration...",
    });

    try {
      // Validate first
      const validation = await this.validate(config);
      if (!validation.valid) {
        const errorMessages = validation.errors.map((e) => e.message).join(", ");
        // Map ValidationErrorType to ValidationError's expected format
        const mappedErrors = validation.errors.map((e) => ({
          field: e.field || "unknown",
          message: e.message,
          code: e.code,
        }));
        throw new ValidationError("Validation failed", mappedErrors);
      }

      // Build
      this.emit("deploy:progress", {
        phase: "build",
        progress: 10,
        message: "Building application...",
      });
      const buildOutput = await this.build(config);

      // Platform-specific deployment
      this.emit("deploy:progress", {
        phase: "deploy",
        progress: 50,
        message: `Deploying to ${this.name}...`,
      });
      const result = await this.doDeploy(config, buildOutput);

      // Finalize result
      const finalResult: DeployResult = {
        ...result,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };

      this.emit("deploy:progress", {
        phase: "complete",
        progress: 100,
        message: "Deployment complete",
      });

      this.emit("deploy:complete", { result: finalResult });

      if (finalResult.success) {
        logger.info(`Deployed successfully to: ${finalResult.url}`);
      } else {
        logger.error(`Deployment failed: ${finalResult.error}`);
      }

      return finalResult;
    } catch (error) {
      const deployError =
        error instanceof DeploymentError
          ? error
          : new DeploymentError(
              (error as Error).message,
              "DEPLOYMENT_DEPLOY_FAILED",
              { cause: error as Error },
            );

      this.emit("deploy:error", { error: deployError });

      return {
        success: false,
        status: "failed",
        error: deployError.message,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get deployment status
   */
  async getStatus(deploymentId: string): Promise<DeployResult> {
    // Default implementation - subclasses should override
    return {
      success: false,
      status: "pending",
      deploymentId,
      timestamp: new Date(),
      error: "Status check not implemented for this platform",
    };
  }

  /**
   * Discover entry files in the project
   */
  protected async discoverEntries(config: DeployConfig): Promise<DiscoveredEntries> {
    const entries: DiscoveredEntries = {
      tools: [],
      routes: [],
      middleware: [],
    };

    const projectDir = path.resolve(process.cwd());

    // Find main entry
    const entryPath = path.resolve(projectDir, config.entry);
    if (fs.existsSync(entryPath)) {
      entries.main = {
        path: entryPath,
        type: "main",
        exports: await this.extractExports(entryPath),
      };
    }

    // Find tools directory
    const toolsDir = path.join(projectDir, "src", "tools");
    if (fs.existsSync(toolsDir)) {
      entries.tools = await this.discoverFilesInDir(toolsDir, "tools");
    }

    // Find routes directory
    const routesDir = path.join(projectDir, "src", "routes");
    if (fs.existsSync(routesDir)) {
      entries.routes = await this.discoverFilesInDir(routesDir, "routes");
    }

    // Find config file
    const configPaths = [
      "neurolink.config.ts",
      "neurolink.config.js",
      "neurolink.config.mjs",
    ];
    for (const configFile of configPaths) {
      const configPath = path.join(projectDir, configFile);
      if (fs.existsSync(configPath)) {
        entries.config = {
          path: configPath,
          type: "config",
          exports: await this.extractExports(configPath),
        };
        break;
      }
    }

    return entries;
  }

  /**
   * Discover files in a directory
   */
  protected async discoverFilesInDir(
    dir: string,
    type: EntryFile["type"],
  ): Promise<EntryFile[]> {
    const files: EntryFile[] = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively discover
        const subFiles = await this.discoverFilesInDir(fullPath, type);
        files.push(...subFiles);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".spec.ts") &&
        !entry.name.endsWith(".d.ts")
      ) {
        files.push({
          path: fullPath,
          type,
          exports: await this.extractExports(fullPath),
        });
      }
    }

    return files;
  }

  /**
   * Extract exports from a file
   */
  protected async extractExports(filePath: string): Promise<string[]> {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const exports: string[] = [];

      // Simple regex-based export detection
      // Named exports: export const/function/class name
      const namedExportRegex =
        /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
      let match;
      while ((match = namedExportRegex.exec(content)) !== null) {
        exports.push(match[1]);
      }

      // Export { name } or export { name as alias }
      const exportBraceRegex = /export\s*\{([^}]+)\}/g;
      while ((match = exportBraceRegex.exec(content)) !== null) {
        const names = match[1].split(",").map((n) => {
          const parts = n.trim().split(/\s+as\s+/);
          return parts[parts.length - 1].trim();
        });
        exports.push(...names.filter((n) => n));
      }

      // Default export
      if (/export\s+default\s/.test(content)) {
        exports.push("default");
      }

      return [...new Set(exports)]; // Remove duplicates
    } catch (error) {
      logger.warn(`Could not extract exports from ${filePath}: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get environment variables for deployment
   */
  protected getEnvironmentVariables(config: DeployConfig): Record<string, string> {
    return this.envManager.getDeploymentEnv(this.name, config.env);
  }

  /**
   * Platform-specific build preparation
   * Override in subclasses for platform-specific setup
   */
  protected async preparePlatformBuild(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<void> {
    // Default: no-op - subclasses override as needed
  }

  /**
   * Platform-specific deployment
   * Must be implemented by subclasses
   */
  protected abstract doDeploy(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<DeployResult>;

  /**
   * Platform-specific configuration validation
   * Must be implemented by subclasses
   */
  protected abstract validatePlatformConfig(
    config: DeployConfig,
  ): ValidationErrorType[];
}

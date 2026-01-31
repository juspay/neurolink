/**
 * Deploy CLI Commands for NeuroLink
 *
 * Implements comprehensive deployment commands for building and
 * deploying NeuroLink applications to various platforms.
 *
 * @packageDocumentation
 */

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import type { Argv, CommandModule } from "yargs";
import { BundlerFactory, DeploymentFactory, deploy, EnvironmentManager } from "../../lib/deployment/index.js";
import type {
  BuildConfig,
  BundlerType,
  DeployConfig,
  DeploymentPlatform,
  PlatformConfig,
} from "../../lib/deployment/types/deploymentTypes.js";
import { logger } from "../../lib/utils/logger.js";

/**
 * Deploy command arguments
 */
interface DeployCommandArgs {
  platform?: string;
  entry?: string;
  outDir?: string;
  env?: string[];
  region?: string;
  bundler?: string;
  minify?: boolean;
  sourceMaps?: boolean;
  external?: string[];
  noExternal?: string[];
  production?: boolean;
  dryRun?: boolean;
  watch?: boolean;
  format?: "text" | "json";
  quiet?: boolean;
  // Platform-specific options
  functionName?: string;
  memory?: number;
  timeout?: number;
  regions?: string[];
  workerName?: string;
  imageName?: string;
  appName?: string;
  push?: boolean;
}

/**
 * Deploy CLI command factory
 */
export class DeployCommandFactory {
  /**
   * Create the main deploy command with subcommands
   */
  static createDeployCommands(): CommandModule {
    return {
      command: "deploy [subcommand]",
      describe: "Build and deploy NeuroLink applications",
      builder: (yargs) => {
        return yargs
          .command(
            "build",
            "Build the application for deployment",
            (yargs: Argv) => DeployCommandFactory.buildBuildOptions(yargs) as Argv,
            DeployCommandFactory.executeBuild as (args: unknown) => Promise<void>,
          )
          .command(
            "push [platform]",
            "Deploy to a cloud platform",
            (yargs: Argv) => DeployCommandFactory.buildPushOptions(yargs) as Argv,
            DeployCommandFactory.executePush as (args: unknown) => Promise<void>,
          )
          .command(
            "status [deploymentId]",
            "Check deployment status",
            (yargs: Argv) => DeployCommandFactory.buildStatusOptions(yargs) as Argv,
            DeployCommandFactory.executeStatus as (args: unknown) => Promise<void>,
          )
          .command(
            "platforms",
            "List supported deployment platforms",
            (yargs: Argv) => yargs as Argv,
            DeployCommandFactory.executePlatforms as (args: unknown) => Promise<void>,
          )
          .command(
            "bundlers",
            "List supported bundlers",
            (yargs: Argv) => yargs as Argv,
            DeployCommandFactory.executeBundlers as (args: unknown) => Promise<void>,
          )
          .command(
            "env",
            "Manage deployment environment variables",
            (yargs: Argv) => DeployCommandFactory.buildEnvOptions(yargs) as Argv,
            DeployCommandFactory.executeEnv as (args: unknown) => Promise<void>,
          )
          .option("format", {
            choices: ["text", "json"] as const,
            default: "text" as const,
            description: "Output format",
          })
          .option("quiet", {
            type: "boolean",
            alias: "q",
            default: false,
            description: "Suppress non-essential output",
          })
          .option("config", {
            type: "string",
            description: "Path to neurolink.config.ts",
          })
          .example("neurolink deploy build", "Build the application for deployment")
          .example("neurolink deploy push vercel", "Deploy to Vercel")
          .example("neurolink deploy push cloudflare --worker-name my-worker", "Deploy to Cloudflare Workers")
          .example("neurolink deploy status abc123", "Check deployment status")
          .help();
      },
      handler: async (argv) => {
        // Default action: show help
        if (!argv._.includes("build") && !argv._.includes("push")) {
          logger.always(chalk.yellow("Use a subcommand: build, push, status, platforms, bundlers, or env"));
          logger.always("Run 'neurolink deploy --help' for more information.");
        }
      },
    };
  }

  /**
   * Build options for build command
   */
  private static buildBuildOptions(yargs: Argv): Argv {
    return yargs
      .option("entry", {
        type: "string",
        alias: "e",
        default: "./src/index.ts",
        description: "Entry file path",
      })
      .option("outDir", {
        type: "string",
        alias: "o",
        default: ".neurolink/output",
        description: "Output directory",
      })
      .option("bundler", {
        type: "string",
        choices: ["esbuild", "vite"],
        default: "esbuild",
        description: "Bundler to use",
      })
      .option("minify", {
        type: "boolean",
        default: false,
        description: "Minify output",
      })
      .option("sourceMaps", {
        type: "boolean",
        default: true,
        description: "Generate source maps",
      })
      .option("external", {
        type: "array",
        description: "Packages to externalize",
      })
      .option("noExternal", {
        type: "array",
        description: "Packages to bundle (override external)",
      })
      .option("watch", {
        type: "boolean",
        alias: "w",
        default: false,
        description: "Watch mode for development",
      })
      .option("production", {
        type: "boolean",
        default: false,
        description: "Production build (enables minification)",
      })
      .example("neurolink deploy build", "Build with default settings")
      .example("neurolink deploy build --bundler vite --minify", "Build with Vite and minification")
      .example("neurolink deploy build --watch", "Watch mode for development");
  }

  /**
   * Build options for push command
   */
  private static buildPushOptions(yargs: Argv): Argv {
    return (
      yargs
        .positional("platform", {
          type: "string",
          choices: ["vercel", "cloudflare", "netlify", "lambda", "docker", "flyio"],
          description: "Target deployment platform",
          demandOption: true,
        })
        .option("entry", {
          type: "string",
          alias: "e",
          default: "./src/index.ts",
          description: "Entry file path",
        })
        .option("outDir", {
          type: "string",
          alias: "o",
          default: ".neurolink/output",
          description: "Output directory",
        })
        .option("env", {
          type: "array",
          description: "Environment variables (KEY=value)",
        })
        .option("region", {
          type: "string",
          description: "Deployment region",
        })
        .option("dryRun", {
          type: "boolean",
          default: false,
          description: "Validate without deploying",
        })
        // Vercel-specific
        .option("regions", {
          type: "array",
          description: "(Vercel) Deployment regions",
        })
        .option("memory", {
          type: "number",
          description: "(Vercel/Lambda) Memory allocation in MB",
        })
        .option("timeout", {
          type: "number",
          description: "(Lambda/Netlify) Timeout in seconds",
        })
        // Cloudflare-specific
        .option("workerName", {
          type: "string",
          description: "(Cloudflare) Worker name",
        })
        // Lambda-specific
        .option("functionName", {
          type: "string",
          description: "(Lambda) Function name",
        })
        // Docker-specific
        .option("imageName", {
          type: "string",
          description: "(Docker) Image name",
        })
        .option("push", {
          type: "boolean",
          description: "(Docker) Push to registry",
        })
        // Fly.io-specific
        .option("appName", {
          type: "string",
          description: "(Fly.io) Application name",
        })
        .example("neurolink deploy push vercel", "Deploy to Vercel")
        .example("neurolink deploy push cloudflare --worker-name my-api", "Deploy to Cloudflare Workers")
        .example("neurolink deploy push lambda --function-name neurolink-api --memory 1024", "Deploy to AWS Lambda")
    );
  }

  /**
   * Build options for status command
   */
  private static buildStatusOptions(yargs: Argv): Argv {
    return yargs
      .positional("deploymentId", {
        type: "string",
        description: "Deployment ID to check",
      })
      .option("platform", {
        type: "string",
        choices: ["vercel", "cloudflare", "netlify", "lambda", "docker", "flyio"],
        description: "Platform to check status on",
      })
      .example("neurolink deploy status abc123", "Check deployment status");
  }

  /**
   * Build options for env command
   */
  private static buildEnvOptions(yargs: Argv): Argv {
    return yargs
      .option("platform", {
        type: "string",
        choices: ["vercel", "cloudflare", "netlify", "lambda", "docker", "flyio"],
        description: "Platform to validate for",
      })
      .option("file", {
        type: "string",
        description: "Environment file to load",
      })
      .option("export", {
        type: "string",
        description: "Export environment to file",
      })
      .example("neurolink deploy env --platform vercel", "Show environment for Vercel")
      .example("neurolink deploy env --file .env.production", "Load and show environment from file");
  }

  /**
   * Execute build command
   */
  private static async executeBuild(argv: DeployCommandArgs): Promise<void> {
    const spinner = argv.quiet ? null : ora("Building application...").start();

    try {
      // Create build configuration
      const buildConfig: BuildConfig = {
        bundler: (argv.bundler as BundlerType) || "esbuild",
        minify: argv.production || argv.minify || false,
        sourceMaps: argv.sourceMaps ?? true,
        treeShake: true,
        external: argv.external as string[] | undefined,
        noExternal: argv.noExternal as string[] | undefined,
        target: "node",
      };

      // Create bundler
      const bundler = await BundlerFactory.create(buildConfig.bundler);

      if (spinner) {
        spinner.text = `Building with ${bundler.name}...`;
      }

      // Discover entries
      const projectDir = process.cwd();
      const entryPath = path.resolve(projectDir, argv.entry || "./src/index.ts");

      if (!fs.existsSync(entryPath)) {
        throw new Error(`Entry file not found: ${entryPath}`);
      }

      const entries = {
        main: {
          path: entryPath,
          type: "main" as const,
          exports: [],
        },
        tools: [],
        routes: [],
        middleware: [],
      };

      // Run build
      const output = await bundler.bundle(buildConfig, entries);

      if (spinner) {
        spinner.succeed(
          `Build complete in ${output.duration}ms (${output.files.length} files, ${formatSize(output.bundleSize.total)})`,
        );
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              success: true,
              outputDir: output.outputDir,
              files: output.files,
              duration: output.duration,
              bundleSize: output.bundleSize,
              warnings: output.warnings,
            },
            null,
            2,
          ),
        );
      } else if (!argv.quiet) {
        logger.always(chalk.bold("\nBuild Output:"));
        logger.always(`  Directory: ${chalk.cyan(output.outputDir)}`);
        logger.always(`  Files: ${output.files.length}`);
        logger.always(
          `  Size: ${formatSize(output.bundleSize.total)} (${formatSize(output.bundleSize.gzipped)} gzipped)`,
        );

        if (output.warnings.length > 0) {
          logger.always(chalk.yellow(`\nWarnings (${output.warnings.length}):`));
          output.warnings.slice(0, 5).forEach((w) => {
            logger.always(`  - ${w}`);
          });
        }
      }
    } catch (error) {
      if (spinner) {
        spinner.fail(`Build failed: ${(error as Error).message}`);
      }
      logger.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }

  /**
   * Execute push command
   */
  private static async executePush(argv: DeployCommandArgs): Promise<void> {
    const platform = argv.platform as DeploymentPlatform;

    if (!platform) {
      logger.error(chalk.red("Platform is required. Use: vercel, cloudflare, netlify, lambda, docker, or flyio"));
      process.exit(1);
    }

    const spinner = argv.quiet ? null : ora(`Deploying to ${platform}...`).start();

    try {
      // Parse environment variables
      const envVars: Record<string, string> = {};
      if (argv.env) {
        for (const env of argv.env) {
          const [key, ...valueParts] = env.split("=");
          if (key && valueParts.length > 0) {
            envVars[key] = valueParts.join("=");
          }
        }
      }

      // Build platform-specific config
      const platformConfig = buildPlatformConfig(platform, argv) as unknown as PlatformConfig | undefined;

      // Create deploy configuration
      const config: DeployConfig = {
        platform,
        entry: argv.entry || "./src/index.ts",
        outDir: argv.outDir || ".neurolink/output",
        env: envVars,
        region: argv.region,
        platformConfig,
      };

      if (argv.dryRun) {
        if (spinner) {
          spinner.text = "Validating configuration...";
        }

        const deployer = await DeploymentFactory.createDeployer(platform);
        const validation = await deployer.validate(config);

        if (spinner) {
          if (validation.valid) {
            spinner.succeed("Configuration is valid");
          } else {
            spinner.fail("Configuration has errors");
          }
        }

        if (argv.format === "json") {
          logger.always(JSON.stringify(validation, null, 2));
        } else {
          if (validation.errors.length > 0) {
            logger.always(chalk.red("\nErrors:"));
            validation.errors.forEach((e) => {
              logger.always(`  - ${e.message}${e.suggestion ? ` (${e.suggestion})` : ""}`);
            });
          }
          if (validation.warnings.length > 0) {
            logger.always(chalk.yellow("\nWarnings:"));
            validation.warnings.forEach((w) => {
              logger.always(`  - ${w.message}`);
            });
          }
        }

        process.exit(validation.valid ? 0 : 1);
      }

      // Deploy
      const result = await deploy(config);

      if (spinner) {
        if (result.success) {
          spinner.succeed(`Deployed to ${platform}`);
        } else {
          spinner.fail(`Deployment failed: ${result.error}`);
        }
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(result, null, 2));
      } else if (result.success) {
        logger.always(chalk.bold("\nDeployment Details:"));
        if (result.url) {
          logger.always(`  URL: ${chalk.cyan(result.url)}`);
        }
        if (result.deploymentId) {
          logger.always(`  Deployment ID: ${result.deploymentId}`);
        }
        if (result.duration) {
          logger.always(`  Duration: ${result.duration}ms`);
        }
      }

      process.exit(result.success ? 0 : 1);
    } catch (error) {
      if (spinner) {
        spinner.fail(`Deployment failed: ${(error as Error).message}`);
      }
      logger.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }

  /**
   * Execute status command
   */
  private static async executeStatus(argv: DeployCommandArgs): Promise<void> {
    const deploymentId = (argv as { deploymentId?: string }).deploymentId;
    const platform = argv.platform as DeploymentPlatform | undefined;

    if (!deploymentId) {
      logger.error(chalk.red("Deployment ID is required"));
      process.exit(1);
    }

    if (!platform) {
      logger.error(chalk.red("Platform is required for status check"));
      process.exit(1);
    }

    const spinner = argv.quiet ? null : ora("Checking deployment status...").start();

    try {
      const deployer = await DeploymentFactory.createDeployer(platform);
      const status = await deployer.getStatus(deploymentId);

      if (spinner) {
        spinner.succeed("Status retrieved");
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(status, null, 2));
      } else {
        logger.always(chalk.bold("\nDeployment Status:"));
        logger.always(`  ID: ${deploymentId}`);
        logger.always(`  Status: ${getStatusBadge(status.status)}`);
        if (status.url) {
          logger.always(`  URL: ${chalk.cyan(status.url)}`);
        }
        logger.always(`  Timestamp: ${status.timestamp.toISOString()}`);
      }
    } catch (error) {
      if (spinner) {
        spinner.fail(`Status check failed: ${(error as Error).message}`);
      }
      logger.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }

  /**
   * Execute platforms command
   */
  private static async executePlatforms(argv: DeployCommandArgs): Promise<void> {
    const platforms = await DeploymentFactory.getSupportedPlatforms();

    if (argv.format === "json") {
      logger.always(JSON.stringify(platforms, null, 2));
    } else {
      logger.always(chalk.bold("\nSupported Deployment Platforms:\n"));

      for (const platform of platforms) {
        logger.always(`${chalk.cyan(platform.platform)} - ${platform.displayName}`);
        logger.always(`  ${chalk.gray(platform.description)}`);
        logger.always(`  Features: ${platform.features.join(", ")}`);
        if (platform.requiredConfig.length > 0) {
          logger.always(`  Required: ${platform.requiredConfig.join(", ")}`);
        }
        if (platform.docsUrl) {
          logger.always(`  Docs: ${chalk.blue(platform.docsUrl)}`);
        }
        logger.always();
      }
    }
  }

  /**
   * Execute bundlers command
   */
  private static async executeBundlers(argv: DeployCommandArgs): Promise<void> {
    const bundlers = await DeploymentFactory.getSupportedBundlers();

    if (argv.format === "json") {
      logger.always(JSON.stringify(bundlers, null, 2));
    } else {
      logger.always(chalk.bold("\nSupported Bundlers:\n"));

      for (const bundler of bundlers) {
        logger.always(`${chalk.cyan(bundler.type)} - ${bundler.displayName}`);
        logger.always(`  ${chalk.gray(bundler.description)}`);
        logger.always(`  Targets: ${bundler.supportedTargets.join(", ")}`);
        logger.always();
      }
    }
  }

  /**
   * Execute env command
   */
  private static async executeEnv(argv: DeployCommandArgs): Promise<void> {
    const envManager = new EnvironmentManager();

    // Load from file if specified
    const file = (argv as { file?: string }).file;
    if (file) {
      envManager.loadFromFile(file);
    }

    const platform = argv.platform as DeploymentPlatform | undefined;
    const exportPath = (argv as { export?: string }).export;

    // Validate for platform if specified
    if (platform) {
      const validation = envManager.validateForPlatform(platform);

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              validation,
              summary: envManager.getSummary(),
              variables: envManager.toRecord({ includeSecrets: false }),
            },
            null,
            2,
          ),
        );
      } else {
        logger.always(chalk.bold(`\nEnvironment for ${platform}:\n`));
        logger.always(envManager.getSummary());

        if (validation.errors.length > 0) {
          logger.always(chalk.red("\nErrors:"));
          validation.errors.forEach((e) => {
            logger.always(`  - ${e.variable}: ${e.message}`);
          });
        }

        if (validation.warnings.length > 0) {
          logger.always(chalk.yellow("\nWarnings:"));
          validation.warnings.forEach((w) => {
            logger.always(`  - ${w.variable}: ${w.message}`);
          });
        }

        if (validation.valid) {
          logger.always(chalk.green("\nEnvironment is valid for " + platform));
        }
      }
    } else if (exportPath) {
      // Export environment to file
      envManager.writeToFile(exportPath, { includeSecrets: false });
      logger.always(chalk.green(`Environment exported to ${exportPath}`));
    } else {
      // Just show summary
      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              summary: envManager.getSummary(),
              variables: envManager.toRecord({ includeSecrets: false }),
            },
            null,
            2,
          ),
        );
      } else {
        logger.always(chalk.bold("\nEnvironment Summary:\n"));
        logger.always(envManager.getSummary());
      }
    }
  }
}

/**
 * Build platform-specific configuration
 */
function buildPlatformConfig(platform: DeploymentPlatform, argv: DeployCommandArgs): Record<string, unknown> {
  const config: Record<string, unknown> = { platform };

  switch (platform) {
    case "vercel":
      if (argv.memory) config.memory = argv.memory;
      if (argv.timeout) config.maxDuration = argv.timeout;
      if (argv.regions) config.regions = argv.regions;
      break;

    case "cloudflare":
      if (argv.workerName) config.workerName = argv.workerName;
      break;

    case "netlify":
      if (argv.timeout) config.timeout = argv.timeout;
      break;

    case "lambda":
      if (argv.functionName) config.functionName = argv.functionName;
      if (argv.memory) config.memorySize = argv.memory;
      if (argv.timeout) config.timeout = argv.timeout;
      if (argv.region) config.region = argv.region;
      break;

    case "docker":
      if (argv.imageName) config.imageName = argv.imageName;
      if (argv.push !== undefined) config.push = argv.push;
      break;

    case "flyio":
      if (argv.appName) config.appName = argv.appName;
      if (argv.memory) config.memory = argv.memory;
      if (argv.region) config.primaryRegion = argv.region;
      break;
  }

  return config;
}

/**
 * Format size in bytes to human-readable string
 */
function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Get status badge for display
 */
function getStatusBadge(status: string): string {
  switch (status) {
    case "success":
      return chalk.green("SUCCESS");
    case "failed":
      return chalk.red("FAILED");
    case "pending":
      return chalk.yellow("PENDING");
    case "building":
      return chalk.blue("BUILDING");
    case "deploying":
      return chalk.blue("DEPLOYING");
    case "cancelled":
      return chalk.gray("CANCELLED");
    default:
      return status;
  }
}

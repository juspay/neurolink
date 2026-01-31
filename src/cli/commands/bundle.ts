/**
 * Bundle CLI Commands for NeuroLink
 *
 * Provides standalone bundling commands for NeuroLink applications
 * without deploying to any platform.
 *
 * @packageDocumentation
 */

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import type { Argv, CommandModule } from "yargs";
import {
  BundlerFactory,
  detectOptimalBundler,
  getRecommendedBuildConfig,
} from "../../lib/deployment/bundlers/BundlerFactory.js";
import type { BuildConfig, BundlerType } from "../../lib/deployment/types/deploymentTypes.js";
import { logger } from "../../lib/utils/logger.js";

/**
 * Bundle command arguments
 */
interface BundleCommandArgs {
  entry?: string;
  outDir?: string;
  bundler?: string;
  minify?: boolean;
  sourceMaps?: boolean;
  treeShake?: boolean;
  external?: string[];
  noExternal?: string[];
  target?: string;
  platform?: string;
  production?: boolean;
  watch?: boolean;
  analyze?: boolean;
  format?: "text" | "json";
  quiet?: boolean;
}

/**
 * Bundle CLI command factory
 */
export class BundleCommandFactory {
  /**
   * Create the bundle command
   */
  static createBundleCommands(): CommandModule {
    return {
      command: "bundle [subcommand]",
      describe: "Bundle NeuroLink applications",
      builder: (yargs) => {
        return yargs
          .command(
            "build",
            "Build/bundle the application",
            (yargs: Argv) => BundleCommandFactory.buildBuildOptions(yargs) as Argv,
            BundleCommandFactory.executeBuild as (args: unknown) => Promise<void>,
          )
          .command(
            "watch",
            "Watch mode for development",
            (yargs: Argv) => BundleCommandFactory.buildWatchOptions(yargs) as Argv,
            BundleCommandFactory.executeWatch as (args: unknown) => Promise<void>,
          )
          .command(
            "analyze",
            "Analyze bundle size",
            (yargs: Argv) => BundleCommandFactory.buildAnalyzeOptions(yargs) as Argv,
            BundleCommandFactory.executeAnalyze as (args: unknown) => Promise<void>,
          )
          .command(
            "detect",
            "Detect optimal bundler for project",
            (yargs: Argv) => BundleCommandFactory.buildDetectOptions(yargs) as Argv,
            BundleCommandFactory.executeDetect as (args: unknown) => Promise<void>,
          )
          .command(
            "recommend",
            "Get recommended build configuration",
            (yargs: Argv) => BundleCommandFactory.buildRecommendOptions(yargs) as Argv,
            BundleCommandFactory.executeRecommend as (args: unknown) => Promise<void>,
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
          .example("neurolink bundle build", "Bundle the application")
          .example("neurolink bundle watch", "Watch mode for development")
          .example("neurolink bundle analyze", "Analyze bundle size")
          .example("neurolink bundle detect", "Detect optimal bundler")
          .help();
      },
      handler: async (argv) => {
        // Default action: run build
        if (
          !argv._.includes("build") &&
          !argv._.includes("watch") &&
          !argv._.includes("analyze") &&
          !argv._.includes("detect") &&
          !argv._.includes("recommend")
        ) {
          await BundleCommandFactory.executeBuild(argv as unknown as BundleCommandArgs);
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
        choices: ["esbuild", "vite", "auto"],
        default: "auto",
        description: "Bundler to use (auto detects optimal)",
      })
      .option("minify", {
        type: "boolean",
        alias: "m",
        default: false,
        description: "Minify output",
      })
      .option("sourceMaps", {
        type: "boolean",
        default: true,
        description: "Generate source maps",
      })
      .option("treeShake", {
        type: "boolean",
        default: true,
        description: "Enable tree shaking",
      })
      .option("external", {
        type: "array",
        description: "Packages to externalize",
      })
      .option("noExternal", {
        type: "array",
        description: "Packages to bundle (override external)",
      })
      .option("target", {
        type: "string",
        choices: ["node", "browser", "edge"],
        default: "node",
        description: "Build target",
      })
      .option("platform", {
        type: "string",
        description: "Target platform (affects build config)",
      })
      .option("production", {
        type: "boolean",
        alias: "p",
        default: false,
        description: "Production build (enables minification, disables sourcemaps)",
      })
      .example("neurolink bundle build", "Build with default settings")
      .example("neurolink bundle build --bundler vite", "Build with Vite")
      .example("neurolink bundle build --production", "Production build")
      .example("neurolink bundle build --external lodash axios", "Externalize packages");
  }

  /**
   * Build options for watch command
   */
  private static buildWatchOptions(yargs: Argv): Argv {
    return BundleCommandFactory.buildBuildOptions(yargs)
      .option("clear", {
        type: "boolean",
        default: true,
        description: "Clear screen on rebuild",
      })
      .example("neurolink bundle watch", "Watch with default settings")
      .example("neurolink bundle watch --no-clear", "Watch without clearing screen");
  }

  /**
   * Build options for analyze command
   */
  private static buildAnalyzeOptions(yargs: Argv): Argv {
    return yargs
      .option("entry", {
        type: "string",
        alias: "e",
        default: "./src/index.ts",
        description: "Entry file path",
      })
      .option("bundler", {
        type: "string",
        choices: ["esbuild", "vite"],
        default: "esbuild",
        description: "Bundler to use",
      })
      .option("detailed", {
        type: "boolean",
        alias: "d",
        default: false,
        description: "Show detailed breakdown",
      })
      .example("neurolink bundle analyze", "Analyze bundle size")
      .example("neurolink bundle analyze --detailed", "Detailed analysis");
  }

  /**
   * Build options for detect command
   */
  private static buildDetectOptions(yargs: Argv): Argv {
    return yargs
      .option("path", {
        type: "string",
        default: ".",
        description: "Project path to analyze",
      })
      .example("neurolink bundle detect", "Detect optimal bundler")
      .example("neurolink bundle detect --path ./my-project", "Detect for specific project");
  }

  /**
   * Build options for recommend command
   */
  private static buildRecommendOptions(yargs: Argv): Argv {
    return yargs
      .option("platform", {
        type: "string",
        choices: ["vercel", "cloudflare", "netlify", "lambda", "docker", "flyio"],
        description: "Target deployment platform",
      })
      .option("target", {
        type: "string",
        choices: ["node", "browser", "edge"],
        default: "node",
        description: "Build target",
      })
      .example("neurolink bundle recommend", "Get recommended config")
      .example("neurolink bundle recommend --platform vercel", "Config for Vercel");
  }

  /**
   * Execute build command
   */
  private static async executeBuild(argv: BundleCommandArgs): Promise<void> {
    const spinner = argv.quiet ? null : ora("Bundling application...").start();

    try {
      // Determine bundler
      let bundlerType: BundlerType = "esbuild";
      const target = (argv.target || "node") as "node" | "browser" | "edge" | "worker";
      if (argv.bundler === "auto" || !argv.bundler) {
        bundlerType = detectOptimalBundler(target);
        if (!argv.quiet && spinner) {
          spinner.text = `Detected optimal bundler: ${bundlerType}`;
        }
      } else {
        bundlerType = argv.bundler as BundlerType;
      }

      // Create build configuration
      const buildConfig: BuildConfig = {
        bundler: bundlerType,
        minify: argv.production || argv.minify || false,
        sourceMaps: argv.production ? false : (argv.sourceMaps ?? true),
        treeShake: argv.treeShake ?? true,
        external: argv.external as string[] | undefined,
        noExternal: argv.noExternal as string[] | undefined,
        target: (argv.target as "node" | "browser" | "edge") || "node",
      };

      // Create bundler
      const bundler = await BundlerFactory.create(bundlerType);

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
              bundler: bundlerType,
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
        logger.always(chalk.bold("\nBundle Output:"));
        logger.always(`  Bundler: ${chalk.cyan(bundler.name)}`);
        logger.always(`  Directory: ${chalk.cyan(output.outputDir)}`);
        logger.always(`  Files: ${output.files.length}`);
        logger.always(
          `  Size: ${formatSize(output.bundleSize.total)} (${formatSize(output.bundleSize.gzipped)} gzipped)`,
        );
        logger.always(`  Duration: ${output.duration}ms`);

        if (output.warnings.length > 0) {
          logger.always(chalk.yellow(`\nWarnings (${output.warnings.length}):`));
          output.warnings.slice(0, 5).forEach((w) => {
            logger.always(`  - ${w}`);
          });
          if (output.warnings.length > 5) {
            logger.always(`  ... and ${output.warnings.length - 5} more`);
          }
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
   * Execute watch command
   */
  private static async executeWatch(argv: BundleCommandArgs): Promise<void> {
    const shouldClear = (argv as { clear?: boolean }).clear ?? true;

    logger.always(chalk.cyan("Starting watch mode..."));

    try {
      // Determine bundler
      let bundlerType: BundlerType = "esbuild";
      const watchTarget = (argv.target || "node") as "node" | "browser" | "edge" | "worker";
      if (argv.bundler === "auto" || !argv.bundler) {
        bundlerType = detectOptimalBundler(watchTarget);
        logger.always(`Detected optimal bundler: ${chalk.cyan(bundlerType)}`);
      } else {
        bundlerType = argv.bundler as BundlerType;
      }

      // Create build configuration
      const buildConfig: BuildConfig = {
        bundler: bundlerType,
        minify: false, // Never minify in watch mode
        sourceMaps: true,
        treeShake: true,
        external: argv.external as string[] | undefined,
        noExternal: argv.noExternal as string[] | undefined,
        target: (argv.target as "node" | "browser" | "edge") || "node",
      };

      // Create bundler
      const bundler = await BundlerFactory.create(bundlerType);

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

      // Start watch mode
      if (!bundler.watch) {
        throw new Error(`Bundler ${bundlerType} does not support watch mode`);
      }
      const watchResult = await bundler.watch(buildConfig, entries, (result) => {
        if (shouldClear) {
          console.clear();
        }

        const timestamp = new Date().toLocaleTimeString();

        if ((result as { success?: boolean }).success) {
          logger.always(
            `${chalk.gray(`[${timestamp}]`)} ${chalk.green("Build successful")} - ${(result as { duration?: number }).duration || 0}ms`,
          );
        } else {
          logger.always(`${chalk.gray(`[${timestamp}]`)} ${chalk.red("Build failed")}`);
          const errors = (result as { errors?: string[] }).errors;
          if (errors) {
            errors.forEach((e: string) => {
              logger.error(`  ${e}`);
            });
          }
        }
      });

      logger.always(chalk.gray("Watching for changes. Press Ctrl+C to stop."));

      // Handle graceful shutdown
      process.on("SIGINT", () => {
        logger.always("\nStopping watch mode...");
        if (watchResult && typeof watchResult === "object" && "close" in watchResult) {
          (watchResult as { close: () => void }).close();
        }
        process.exit(0);
      });

      // Keep the process running
      await new Promise(() => {});
    } catch (error) {
      logger.error(chalk.red(`Watch mode failed: ${(error as Error).message}`));
      process.exit(1);
    }
  }

  /**
   * Execute analyze command
   */
  private static async executeAnalyze(argv: BundleCommandArgs): Promise<void> {
    const spinner = argv.quiet ? null : ora("Analyzing bundle...").start();
    const detailed = (argv as { detailed?: boolean }).detailed ?? false;

    try {
      const bundlerType = (argv.bundler as BundlerType) || "esbuild";
      const bundler = await BundlerFactory.create(bundlerType);

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

      // Estimate size
      if (!bundler.estimateSize) {
        throw new Error(`Bundler ${bundlerType} does not support size estimation`);
      }
      const estimate = await bundler.estimateSize(entries);

      if (spinner) {
        spinner.succeed("Analysis complete");
      }

      // Type assertion for estimate properties
      const estimateData = estimate as {
        raw?: number;
        minified?: number;
        gzipped?: number;
        breakdown?: Array<{ path: string; size: number }>;
      };

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              entry: entryPath,
              bundler: bundlerType,
              estimate,
            },
            null,
            2,
          ),
        );
      } else {
        logger.always(chalk.bold("\nBundle Analysis:"));
        logger.always(`  Entry: ${chalk.cyan(entryPath)}`);
        logger.always(`  Bundler: ${chalk.cyan(bundlerType)}`);
        logger.always(chalk.bold("\nSize Estimate:"));
        logger.always(`  Raw: ${formatSize(estimateData.raw || 0)}`);
        logger.always(`  Minified: ${formatSize(estimateData.minified || 0)}`);
        logger.always(`  Gzipped: ${formatSize(estimateData.gzipped || 0)}`);

        if (detailed && estimateData.breakdown) {
          logger.always(chalk.bold("\nBreakdown by file:"));
          const sorted = [...estimateData.breakdown].sort((a, b) => b.size - a.size);
          sorted.slice(0, 20).forEach((file) => {
            const percentage = ((file.size / (estimateData.raw || 1)) * 100).toFixed(1);
            logger.always(
              `  ${chalk.gray(percentage.padStart(5))}%  ${formatSize(file.size).padEnd(10)}  ${file.path}`,
            );
          });
          if (sorted.length > 20) {
            logger.always(`  ... and ${sorted.length - 20} more files`);
          }
        }
      }
    } catch (error) {
      if (spinner) {
        spinner.fail(`Analysis failed: ${(error as Error).message}`);
      }
      logger.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }

  /**
   * Execute detect command
   */
  private static async executeDetect(argv: BundleCommandArgs): Promise<void> {
    const projectPath = (argv as { path?: string }).path || ".";
    const fullPath = path.resolve(process.cwd(), projectPath);

    const spinner = argv.quiet ? null : ora("Detecting optimal bundler...").start();

    try {
      // Default to node target for detection
      const bundler = detectOptimalBundler("node");

      if (spinner) {
        spinner.succeed(`Detected optimal bundler: ${bundler}`);
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              projectPath: fullPath,
              recommendedBundler: bundler,
              reason: getBundlerReason(bundler),
            },
            null,
            2,
          ),
        );
      } else if (!argv.quiet) {
        logger.always(chalk.bold("\nBundler Detection:"));
        logger.always(`  Project: ${chalk.cyan(fullPath)}`);
        logger.always(`  Recommended: ${chalk.green(bundler)}`);
        logger.always(`  Reason: ${getBundlerReason(bundler)}`);
      }
    } catch (error) {
      if (spinner) {
        spinner.fail(`Detection failed: ${(error as Error).message}`);
      }
      logger.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }

  /**
   * Execute recommend command
   */
  private static async executeRecommend(argv: BundleCommandArgs): Promise<void> {
    const platform = argv.platform;
    const target = (argv.target as "node" | "browser" | "edge" | "worker") || "node";

    const spinner = argv.quiet ? null : ora("Generating recommended configuration...").start();

    try {
      const config = getRecommendedBuildConfig(target);

      if (spinner) {
        spinner.succeed("Configuration generated");
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(config, null, 2));
      } else {
        logger.always(chalk.bold("\nRecommended Build Configuration:"));
        logger.always(`  Target: ${chalk.cyan(target)}`);
        if (platform) {
          logger.always(`  Platform: ${chalk.cyan(platform)}`);
        }
        logger.always(chalk.bold("\nConfiguration:"));
        logger.always(`  Bundler: ${chalk.cyan(config.bundler)}`);
        logger.always(`  Minify: ${config.minify}`);
        logger.always(`  Source Maps: ${config.sourceMaps}`);
        logger.always(`  Tree Shake: ${config.treeShake}`);
        if (config.external && config.external.length > 0) {
          logger.always(`  External: ${config.external.join(", ")}`);
        }

        logger.always(chalk.bold("\nUsage:"));
        logger.always(
          chalk.gray(
            `  neurolink bundle build --bundler ${config.bundler}${config.minify ? " --minify" : ""}${!config.sourceMaps ? " --no-sourceMaps" : ""}`,
          ),
        );
      }
    } catch (error) {
      if (spinner) {
        spinner.fail(`Failed to generate configuration: ${(error as Error).message}`);
      }
      logger.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }
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
 * Get reason for bundler recommendation
 */
function getBundlerReason(bundler: BundlerType): string {
  switch (bundler) {
    case "esbuild":
      return "Fast compilation, good for Node.js projects";
    case "vite":
      return "Best for browser targets, React/Vue projects";
    default:
      return "Default bundler choice";
  }
}

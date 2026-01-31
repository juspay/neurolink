/**
 * Preview CLI Commands for NeuroLink
 *
 * Provides local preview/development server for testing deployments
 * before pushing to production.
 *
 * @packageDocumentation
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import type { Argv, CommandModule } from "yargs";
import { BundlerFactory, detectOptimalBundler } from "../../lib/deployment/bundlers/BundlerFactory.js";
import { EnvironmentManager } from "../../lib/deployment/EnvironmentManager.js";
import type { BuildConfig, BundlerType, DeploymentPlatform } from "../../lib/deployment/types/deploymentTypes.js";
import { logger } from "../../lib/utils/logger.js";

/**
 * Preview command arguments
 */
interface PreviewCommandArgs {
  entry?: string;
  port?: number;
  host?: string;
  platform?: string;
  env?: string[];
  envFile?: string;
  open?: boolean;
  watch?: boolean;
  bundler?: string;
  format?: "text" | "json";
  quiet?: boolean;
}

/**
 * Preview CLI command factory
 */
export class PreviewCommandFactory {
  /**
   * Create the preview command
   */
  static createPreviewCommands(): CommandModule {
    return {
      command: "preview [subcommand]",
      describe: "Preview NeuroLink deployments locally",
      builder: (yargs) => {
        return yargs
          .command(
            "start",
            "Start local preview server",
            (yargs: Argv) => PreviewCommandFactory.buildStartOptions(yargs) as Argv,
            PreviewCommandFactory.executeStart as (args: unknown) => Promise<void>,
          )
          .command(
            "vercel",
            "Preview as Vercel function",
            (yargs: Argv) => PreviewCommandFactory.buildPlatformOptions(yargs) as Argv,
            (argv) => PreviewCommandFactory.executePlatformPreview(argv as PreviewCommandArgs, "vercel"),
          )
          .command(
            "cloudflare",
            "Preview as Cloudflare Worker",
            (yargs: Argv) => PreviewCommandFactory.buildPlatformOptions(yargs) as Argv,
            (argv) => PreviewCommandFactory.executePlatformPreview(argv as PreviewCommandArgs, "cloudflare"),
          )
          .command(
            "netlify",
            "Preview as Netlify Function",
            (yargs: Argv) => PreviewCommandFactory.buildPlatformOptions(yargs) as Argv,
            (argv) => PreviewCommandFactory.executePlatformPreview(argv as PreviewCommandArgs, "netlify"),
          )
          .command(
            "lambda",
            "Preview as AWS Lambda",
            (yargs: Argv) => PreviewCommandFactory.buildPlatformOptions(yargs) as Argv,
            (argv) => PreviewCommandFactory.executePlatformPreview(argv as PreviewCommandArgs, "lambda"),
          )
          .command(
            "docker",
            "Preview in Docker container",
            (yargs: Argv) => PreviewCommandFactory.buildDockerOptions(yargs) as Argv,
            PreviewCommandFactory.executeDockerPreview as (args: unknown) => Promise<void>,
          )
          .command(
            "check",
            "Check preview readiness",
            (yargs: Argv) => PreviewCommandFactory.buildCheckOptions(yargs) as Argv,
            PreviewCommandFactory.executeCheck as (args: unknown) => Promise<void>,
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
          .example("neurolink preview start", "Start local preview server")
          .example("neurolink preview vercel", "Preview as Vercel function")
          .example("neurolink preview cloudflare", "Preview as Cloudflare Worker")
          .help();
      },
      handler: async (argv) => {
        // Default action: start preview
        if (
          !argv._.includes("start") &&
          !argv._.includes("vercel") &&
          !argv._.includes("cloudflare") &&
          !argv._.includes("netlify") &&
          !argv._.includes("lambda") &&
          !argv._.includes("docker") &&
          !argv._.includes("check")
        ) {
          await PreviewCommandFactory.executeStart(argv as unknown as PreviewCommandArgs);
        }
      },
    };
  }

  /**
   * Build options for start command
   */
  private static buildStartOptions(yargs: Argv): Argv {
    return yargs
      .option("entry", {
        type: "string",
        alias: "e",
        default: "./src/index.ts",
        description: "Entry file path",
      })
      .option("port", {
        type: "number",
        alias: "p",
        default: 3000,
        description: "Server port",
      })
      .option("host", {
        type: "string",
        alias: "h",
        default: "localhost",
        description: "Server host",
      })
      .option("watch", {
        type: "boolean",
        alias: "w",
        default: true,
        description: "Watch for file changes",
      })
      .option("open", {
        type: "boolean",
        alias: "o",
        default: false,
        description: "Open browser on start",
      })
      .option("bundler", {
        type: "string",
        choices: ["esbuild", "vite", "auto"],
        default: "auto",
        description: "Bundler to use",
      })
      .option("env", {
        type: "array",
        description: "Environment variables (KEY=value)",
      })
      .option("envFile", {
        type: "string",
        description: "Environment file to load",
      })
      .example("neurolink preview start", "Start on default port 3000")
      .example("neurolink preview start --port 8080", "Start on port 8080")
      .example("neurolink preview start --open", "Start and open browser");
  }

  /**
   * Build options for platform-specific commands
   */
  private static buildPlatformOptions(yargs: Argv): Argv {
    return yargs
      .option("entry", {
        type: "string",
        alias: "e",
        default: "./src/index.ts",
        description: "Entry file path",
      })
      .option("port", {
        type: "number",
        alias: "p",
        default: 3000,
        description: "Server port",
      })
      .option("env", {
        type: "array",
        description: "Environment variables (KEY=value)",
      })
      .option("envFile", {
        type: "string",
        description: "Environment file to load",
      })
      .option("watch", {
        type: "boolean",
        alias: "w",
        default: true,
        description: "Watch for file changes",
      });
  }

  /**
   * Build options for docker command
   */
  private static buildDockerOptions(yargs: Argv): Argv {
    return yargs
      .option("entry", {
        type: "string",
        alias: "e",
        default: "./src/index.ts",
        description: "Entry file path",
      })
      .option("port", {
        type: "number",
        alias: "p",
        default: 3000,
        description: "Container port to expose",
      })
      .option("env", {
        type: "array",
        description: "Environment variables (KEY=value)",
      })
      .option("envFile", {
        type: "string",
        description: "Environment file to load",
      })
      .option("rebuild", {
        type: "boolean",
        default: false,
        description: "Force rebuild the container",
      })
      .example("neurolink preview docker", "Preview in Docker")
      .example("neurolink preview docker --rebuild", "Rebuild and preview");
  }

  /**
   * Build options for check command
   */
  private static buildCheckOptions(yargs: Argv): Argv {
    return yargs
      .option("entry", {
        type: "string",
        alias: "e",
        default: "./src/index.ts",
        description: "Entry file path",
      })
      .option("platform", {
        type: "string",
        choices: ["vercel", "cloudflare", "netlify", "lambda", "docker", "flyio"],
        description: "Target platform to check",
      })
      .example("neurolink preview check", "Check preview readiness")
      .example("neurolink preview check --platform vercel", "Check Vercel compatibility");
  }

  /**
   * Execute start command
   */
  private static async executeStart(argv: PreviewCommandArgs): Promise<void> {
    const port = argv.port || 3000;
    const host = argv.host || "localhost";
    const entryPath = path.resolve(process.cwd(), argv.entry || "./src/index.ts");

    const spinner = argv.quiet ? null : ora("Starting preview server...").start();

    try {
      // Check entry file
      if (!fs.existsSync(entryPath)) {
        throw new Error(`Entry file not found: ${entryPath}`);
      }

      // Load environment
      const envManager = new EnvironmentManager();
      if (argv.envFile) {
        envManager.loadFromFile(argv.envFile);
      }
      if (argv.env) {
        for (const env of argv.env) {
          const [key, ...valueParts] = env.split("=");
          if (key && valueParts.length > 0) {
            envManager.set(key, valueParts.join("="));
          }
        }
      }

      // Set environment variables
      const envVars = envManager.toRecord();
      Object.entries(envVars).forEach(([key, value]) => {
        if (value) {
          process.env[key] = value;
        }
      });

      // Determine bundler
      let bundlerType: BundlerType = "esbuild";
      const previewTarget = "node" as "node" | "browser" | "edge" | "worker";
      if (argv.bundler === "auto" || !argv.bundler) {
        bundlerType = detectOptimalBundler(previewTarget);
      } else {
        bundlerType = argv.bundler as BundlerType;
      }

      // Build first
      const buildConfig: BuildConfig = {
        bundler: bundlerType,
        minify: false,
        sourceMaps: true,
        treeShake: true,
        target: "node",
      };

      const bundler = await BundlerFactory.create(bundlerType);

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

      const output = await bundler.bundle(buildConfig, entries);

      // Find the output file - files are OutputFile objects with path property
      const outputFiles = output.files as Array<{ path: string } | string>;
      const outputFile = outputFiles.find((f) => {
        const filePath = typeof f === "string" ? f : f.path;
        return filePath.endsWith(".mjs") || filePath.endsWith(".js");
      });
      if (!outputFile) {
        throw new Error("No output file found after bundling");
      }

      const outputFilePath = typeof outputFile === "string" ? outputFile : outputFile.path;
      const outputPath = path.join(output.outputDir, outputFilePath);

      // Create simple HTTP server
      const server = http.createServer(async (req, res) => {
        try {
          // Dynamic import of the module
          const mod = await import(outputPath);
          const handler = mod.default || mod.handler || mod;

          if (typeof handler === "function") {
            await handler(req, res);
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok", module: Object.keys(mod) }));
          }
        } catch (error) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: (error as Error).message }));
        }
      });

      server.listen(port, host, () => {
        if (spinner) {
          spinner.succeed(`Preview server running`);
        }

        const url = `http://${host}:${port}`;
        logger.always(chalk.bold("\nPreview Server:"));
        logger.always(`  URL: ${chalk.cyan(url)}`);
        logger.always(`  Entry: ${chalk.gray(entryPath)}`);
        logger.always(`  Bundler: ${chalk.gray(bundlerType)}`);
        logger.always(chalk.gray("\nPress Ctrl+C to stop."));

        if (argv.open) {
          openBrowser(url);
        }
      });

      // Watch mode
      if (argv.watch) {
        if (!bundler.watch) {
          logger.error("Bundler does not support watch mode");
        } else {
          await bundler.watch(buildConfig, entries, (result) => {
            const timestamp = new Date().toLocaleTimeString();
            const watchResult = result as {
              success?: boolean;
              duration?: number;
            };
            if (watchResult.success) {
              logger.always(
                `${chalk.gray(`[${timestamp}]`)} ${chalk.green("Rebuilt")} - ${watchResult.duration || 0}ms`,
              );
            } else {
              logger.always(`${chalk.gray(`[${timestamp}]`)} ${chalk.red("Build failed")}`);
            }
          });
        }
      }

      // Handle shutdown
      process.on("SIGINT", () => {
        logger.always("\nStopping preview server...");
        server.close();
        process.exit(0);
      });

      // Keep process running
      await new Promise(() => {});
    } catch (error) {
      if (spinner) {
        spinner.fail(`Preview failed: ${(error as Error).message}`);
      }
      logger.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }

  /**
   * Execute platform-specific preview
   */
  private static async executePlatformPreview(argv: PreviewCommandArgs, platform: DeploymentPlatform): Promise<void> {
    const port = argv.port || 3000;
    const spinner = argv.quiet ? null : ora(`Starting ${platform} preview...`).start();

    try {
      // Check for platform-specific CLI tools
      const cliCheck = checkPlatformCli(platform);
      if (!cliCheck.installed) {
        throw new Error(`${platform} CLI is not installed. ${cliCheck.installCommand}`);
      }

      // Load environment
      const envManager = new EnvironmentManager();
      if (argv.envFile) {
        envManager.loadFromFile(argv.envFile);
      }
      if (argv.env) {
        for (const env of argv.env) {
          const [key, ...valueParts] = env.split("=");
          if (key && valueParts.length > 0) {
            envManager.set(key, valueParts.join("="));
          }
        }
      }

      // Build environment string for CLI
      const envVars = envManager.toRecord();
      const envString = Object.entries(envVars)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join(" ");

      if (spinner) {
        spinner.text = `Building for ${platform}...`;
      }

      // Platform-specific dev commands
      let command: string;
      switch (platform) {
        case "vercel":
          command = `vercel dev --listen ${port}`;
          break;
        case "cloudflare":
          command = `wrangler dev --port ${port}`;
          break;
        case "netlify":
          command = `netlify dev --port ${port}`;
          break;
        case "lambda":
          command = `sam local start-api --port ${port}`;
          break;
        default:
          throw new Error(`Preview not supported for platform: ${platform}`);
      }

      if (spinner) {
        spinner.succeed(`Starting ${platform} dev server`);
      }

      logger.always(chalk.bold(`\n${platform} Preview:`));
      logger.always(`  Port: ${chalk.cyan(port)}`);
      logger.always(`  Command: ${chalk.gray(command)}`);
      logger.always(chalk.gray("\nPress Ctrl+C to stop."));

      // Execute the platform dev command
      const fullCommand = envString ? `${envString} ${command}` : command;
      execSync(fullCommand, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      if (spinner) {
        spinner.fail(`Preview failed: ${(error as Error).message}`);
      }
      logger.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }

  /**
   * Execute Docker preview
   */
  private static async executeDockerPreview(argv: PreviewCommandArgs): Promise<void> {
    const port = argv.port || 3000;
    const rebuild = (argv as { rebuild?: boolean }).rebuild ?? false;
    const spinner = argv.quiet ? null : ora("Starting Docker preview...").start();

    try {
      // Check Docker
      try {
        execSync("docker --version", { stdio: "pipe" });
      } catch {
        throw new Error("Docker is not installed. Install from: https://docker.com");
      }

      // Build image name from project
      const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
      const imageName = `neurolink-preview-${packageJson.name || "app"}`.replace(/[^a-z0-9-]/gi, "-");

      if (spinner) {
        spinner.text = "Building Docker image...";
      }

      // Build if needed
      if (rebuild || !imageExists(imageName)) {
        execSync(`docker build -t ${imageName} .`, {
          stdio: argv.quiet ? "pipe" : "inherit",
          cwd: process.cwd(),
        });
      }

      if (spinner) {
        spinner.succeed("Docker image ready");
      }

      // Build environment args
      const envArgs: string[] = [];
      if (argv.envFile && fs.existsSync(argv.envFile)) {
        envArgs.push(`--env-file ${argv.envFile}`);
      }
      if (argv.env) {
        for (const env of argv.env) {
          envArgs.push(`-e ${env}`);
        }
      }

      logger.always(chalk.bold("\nDocker Preview:"));
      logger.always(`  Image: ${chalk.cyan(imageName)}`);
      logger.always(`  Port: ${chalk.cyan(`${port}:${port}`)}`);
      logger.always(chalk.gray("\nPress Ctrl+C to stop."));

      // Run container
      const runCommand = `docker run --rm -p ${port}:${port} ${envArgs.join(" ")} ${imageName}`;
      execSync(runCommand, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      if (spinner) {
        spinner.fail(`Docker preview failed: ${(error as Error).message}`);
      }
      logger.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }

  /**
   * Execute check command
   */
  private static async executeCheck(argv: PreviewCommandArgs): Promise<void> {
    const entryPath = path.resolve(process.cwd(), argv.entry || "./src/index.ts");
    const platform = argv.platform as DeploymentPlatform | undefined;

    const spinner = argv.quiet ? null : ora("Checking preview readiness...").start();

    try {
      const checks: {
        name: string;
        status: "pass" | "fail" | "warn";
        message: string;
      }[] = [];

      // Check entry file
      if (fs.existsSync(entryPath)) {
        checks.push({
          name: "Entry file",
          status: "pass",
          message: `Found: ${entryPath}`,
        });
      } else {
        checks.push({
          name: "Entry file",
          status: "fail",
          message: `Not found: ${entryPath}`,
        });
      }

      // Check package.json
      const packageJsonPath = path.join(process.cwd(), "package.json");
      if (fs.existsSync(packageJsonPath)) {
        checks.push({
          name: "package.json",
          status: "pass",
          message: "Found",
        });
      } else {
        checks.push({
          name: "package.json",
          status: "fail",
          message: "Not found",
        });
      }

      // Check node_modules
      const nodeModulesPath = path.join(process.cwd(), "node_modules");
      if (fs.existsSync(nodeModulesPath)) {
        checks.push({
          name: "Dependencies",
          status: "pass",
          message: "node_modules found",
        });
      } else {
        checks.push({
          name: "Dependencies",
          status: "warn",
          message: "Run npm install",
        });
      }

      // Platform-specific checks
      if (platform) {
        const cliCheck = checkPlatformCli(platform);
        checks.push({
          name: `${platform} CLI`,
          status: cliCheck.installed ? "pass" : "warn",
          message: cliCheck.installed ? `Installed: ${cliCheck.version}` : cliCheck.installCommand,
        });

        // Check platform config files
        const configCheck = checkPlatformConfig(platform);
        checks.push({
          name: `${platform} config`,
          status: configCheck.exists ? "pass" : "warn",
          message: configCheck.exists ? `Found: ${configCheck.file}` : `Missing: ${configCheck.file}`,
        });
      }

      if (spinner) {
        const hasFailures = checks.some((c) => c.status === "fail");
        if (hasFailures) {
          spinner.fail("Some checks failed");
        } else {
          spinner.succeed("All checks passed");
        }
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              checks,
              ready: !checks.some((c) => c.status === "fail"),
            },
            null,
            2,
          ),
        );
      } else {
        logger.always(chalk.bold("\nPreview Readiness Check:"));
        checks.forEach((check) => {
          const icon =
            check.status === "pass"
              ? chalk.green("[PASS]")
              : check.status === "fail"
                ? chalk.red("[FAIL]")
                : chalk.yellow("[WARN]");
          logger.always(`  ${icon} ${check.name}: ${check.message}`);
        });

        const hasFailures = checks.some((c) => c.status === "fail");
        if (hasFailures) {
          logger.always(chalk.red("\nFix the failing checks before previewing."));
          process.exit(1);
        } else {
          logger.always(chalk.green("\nReady for preview!"));
        }
      }
    } catch (error) {
      if (spinner) {
        spinner.fail(`Check failed: ${(error as Error).message}`);
      }
      logger.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }
}

/**
 * Check if platform CLI is installed
 */
function checkPlatformCli(platform: DeploymentPlatform): {
  installed: boolean;
  version?: string;
  installCommand: string;
} {
  const cliCommands: Record<DeploymentPlatform, { check: string; install: string }> = {
    vercel: {
      check: "vercel --version",
      install: "npm install -g vercel",
    },
    cloudflare: {
      check: "wrangler --version",
      install: "npm install -g wrangler",
    },
    netlify: {
      check: "netlify --version",
      install: "npm install -g netlify-cli",
    },
    lambda: {
      check: "sam --version",
      install: "pip install aws-sam-cli",
    },
    docker: {
      check: "docker --version",
      install: "Install from https://docker.com",
    },
    flyio: {
      check: "fly version",
      install: "curl -L https://fly.io/install.sh | sh",
    },
  };

  const cli = cliCommands[platform];
  if (!cli) {
    return { installed: false, installCommand: "Unknown platform" };
  }

  try {
    const version = execSync(cli.check, {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    return { installed: true, version, installCommand: cli.install };
  } catch {
    return { installed: false, installCommand: cli.install };
  }
}

/**
 * Check if platform config file exists
 */
function checkPlatformConfig(platform: DeploymentPlatform): {
  exists: boolean;
  file: string;
} {
  const configFiles: Record<DeploymentPlatform, string> = {
    vercel: "vercel.json",
    cloudflare: "wrangler.toml",
    netlify: "netlify.toml",
    lambda: "template.yaml",
    docker: "Dockerfile",
    flyio: "fly.toml",
  };

  const file = configFiles[platform];
  const filePath = path.join(process.cwd(), file);

  return {
    exists: fs.existsSync(filePath),
    file,
  };
}

/**
 * Check if Docker image exists
 */
function imageExists(imageName: string): boolean {
  try {
    execSync(`docker image inspect ${imageName}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Open URL in browser
 */
function openBrowser(url: string): void {
  const platform = process.platform;
  let command: string;

  switch (platform) {
    case "darwin":
      command = `open ${url}`;
      break;
    case "win32":
      command = `start ${url}`;
      break;
    default:
      command = `xdg-open ${url}`;
  }

  try {
    execSync(command, { stdio: "pipe" });
  } catch {
    // Ignore errors opening browser
  }
}

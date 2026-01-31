/**
 * Deploy Command Factory
 *
 * Factory for creating deployment-related CLI commands.
 *
 * @packageDocumentation
 * @module @juspay/neurolink/cli
 * @category CLI
 */

import type { CommandModule, Argv } from "yargs";
import * as fs from "node:fs";
import * as path from "node:path";
import { logger } from "../../lib/utils/logger.js";
import { DeployerFactory } from "../../lib/deployer/index.js";
import type {
  DeploymentPlatform,
  DeployConfig,
} from "../../lib/deployer/types.js";

// Supported platforms
const SUPPORTED_PLATFORMS: DeploymentPlatform[] = [
  "vercel",
  "cloudflare",
  "netlify",
  "lambda",
];

/**
 * Deploy command arguments
 */
type DeployArgs = {
  platform: DeploymentPlatform;
  config?: string;
  outDir?: string;
  env?: string;
  region?: string;
  verbose?: boolean;
};

/**
 * Build command arguments
 */
type BuildArgs = {
  platform: DeploymentPlatform;
  entry?: string;
  outDir?: string;
};

/**
 * Status command arguments
 */
type StatusArgs = {
  platform: DeploymentPlatform;
  "deployment-id": string;
  config?: string;
};

/**
 * Factory for creating deployment CLI commands
 */
export class DeployCommandFactory {
  /**
   * Create the deploy command group
   */
  static createDeployCommands(): CommandModule {
    return {
      command: "deploy",
      describe: "Deployment commands for NeuroLink applications",
      builder: (yargs: Argv) =>
        yargs
          .command(DeployCommandFactory.createBuildCommand())
          .command(DeployCommandFactory.createRunDeployCommand())
          .command(DeployCommandFactory.createStatusCommand())
          .command(DeployCommandFactory.createPlatformsCommand())
          .demandCommand(1, "Please specify a deploy subcommand"),
      handler: () => {
        // Group command - no direct handler
      },
    };
  }

  /**
   * Create the build subcommand
   */
  private static createBuildCommand(): CommandModule<object, BuildArgs> {
    return {
      command: "build",
      describe: "Build NeuroLink application for deployment",
      builder: (yargs: Argv) =>
        yargs
          .option("platform", {
            alias: "p",
            describe: "Target deployment platform",
            choices: SUPPORTED_PLATFORMS,
            demandOption: true,
          })
          .option("entry", {
            alias: "e",
            describe: "Entry file path",
            type: "string",
            default: "./src/index.ts",
          })
          .option("outDir", {
            alias: "o",
            describe: "Output directory",
            type: "string",
            default: "./dist",
          })
          .example(
            "$0 deploy build --platform vercel",
            "Build for Vercel deployment"
          )
          .example(
            "$0 deploy build --platform lambda --outDir ./lambda-dist",
            "Build for AWS Lambda"
          ) as Argv<BuildArgs>,

      handler: async (argv) => {
        const startTime = Date.now();
        logger.info(`Building for ${argv.platform}...`);

        try {
          // Create output directory
          const outDir = path.resolve(process.cwd(), argv.outDir || "./dist");
          fs.mkdirSync(outDir, { recursive: true });

          // Create deployer and build
          const deployer = DeployerFactory.create(argv.platform);
          await deployer.build({
            platform: argv.platform,
            entry: argv.entry || "./src/index.ts",
            outDir,
          });

          const duration = Date.now() - startTime;
          logger.info(`Build complete in ${duration}ms`, { outDir });

          console.log("\n Build successful!");
          console.log(`   Platform: ${argv.platform}`);
          console.log(`   Output: ${outDir}`);
          console.log(`   Duration: ${duration}ms`);
          console.log(
            `\nNext step: neurolink deploy run --platform ${argv.platform}`
          );
        } catch (error) {
          logger.error("Build failed", { error: (error as Error).message });
          console.error("\n Build failed:", (error as Error).message);
          process.exit(1);
        }
      },
    };
  }

  /**
   * Create the run deploy subcommand
   */
  private static createRunDeployCommand(): CommandModule<object, DeployArgs> {
    return {
      command: "run",
      describe: "Deploy NeuroLink application to a serverless platform",
      builder: (yargs: Argv) =>
        yargs
          .option("platform", {
            alias: "p",
            describe: "Target deployment platform",
            choices: SUPPORTED_PLATFORMS,
            demandOption: true,
          })
          .option("config", {
            alias: "c",
            describe: "Path to deployment config file (JSON)",
            type: "string",
          })
          .option("outDir", {
            alias: "o",
            describe: "Build output directory",
            type: "string",
            default: "./dist",
          })
          .option("env", {
            alias: "e",
            describe: "Environment variables (KEY=VALUE, comma-separated)",
            type: "string",
          })
          .option("region", {
            alias: "r",
            describe: "Deployment region",
            type: "string",
          })
          .option("verbose", {
            alias: "v",
            describe: "Enable verbose output",
            type: "boolean",
            default: false,
          })
          .example("$0 deploy run --platform vercel", "Deploy to Vercel")
          .example(
            "$0 deploy run --platform lambda --region us-west-2",
            "Deploy to AWS Lambda"
          ) as Argv<DeployArgs>,

      handler: async (argv) => {
        const startTime = Date.now();
        logger.info(`Deploying to ${argv.platform}...`);

        try {
          // Load config file if provided
          let platformConfig: Record<string, unknown> = {};
          if (argv.config) {
            const configPath = path.resolve(process.cwd(), argv.config);
            if (fs.existsSync(configPath)) {
              platformConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
              logger.info(`Loaded config from ${configPath}`);
            } else {
              logger.warn(`Config file not found: ${configPath}`);
            }
          }

          // Parse environment variables
          const env: Record<string, string> = {};
          if (argv.env) {
            const pairs = argv.env.split(",");
            for (const pair of pairs) {
              const [key, value] = pair.split("=").map((s) => s.trim());
              if (key && value) {
                env[key] = value;
              }
            }
          }

          // Create deploy config
          const deployConfig: DeployConfig = {
            platform: argv.platform,
            entry: "./src/index.ts",
            outDir: path.resolve(process.cwd(), argv.outDir || "./dist"),
            env,
            region: argv.region,
          };

          // Create deployer with platform-specific config
          const deployer = DeployerFactory.create(argv.platform, platformConfig);

          // Deploy
          console.log(`\n Deploying to ${argv.platform}...`);
          const result = await deployer.deploy(deployConfig);

          const duration = Date.now() - startTime;

          if (result.status === "success") {
            logger.info("Deployment successful", { url: result.url, duration });
            console.log("\n Deployment successful!");
            console.log(`   URL: ${result.url}`);
            console.log(`   Deployment ID: ${result.deploymentId}`);
            console.log(`   Duration: ${duration}ms`);

            if (argv.verbose && result.logs?.length) {
              console.log("\n Deployment logs:");
              result.logs.forEach((log) => console.log(`   ${log}`));
            }
          } else {
            logger.error("Deployment failed", { logs: result.logs });
            console.error("\n Deployment failed!");
            if (result.logs?.length) {
              console.error("\nError logs:");
              result.logs.forEach((log) => console.error(`   ${log}`));
            }
            process.exit(1);
          }
        } catch (error) {
          logger.error("Deployment error", { error: (error as Error).message });
          console.error("\n Deployment error:", (error as Error).message);
          process.exit(1);
        }
      },
    };
  }

  /**
   * Create the status subcommand
   */
  private static createStatusCommand(): CommandModule<object, StatusArgs> {
    return {
      command: "status",
      describe: "Check deployment status",
      builder: (yargs: Argv) =>
        yargs
          .option("deployment-id", {
            alias: "d",
            describe: "Deployment ID to check",
            type: "string",
            demandOption: true,
          })
          .option("platform", {
            alias: "p",
            describe: "Deployment platform",
            choices: SUPPORTED_PLATFORMS,
            demandOption: true,
          })
          .option("config", {
            alias: "c",
            describe: "Path to deployment config file (JSON)",
            type: "string",
          })
          .example(
            "$0 deploy status --platform vercel --deployment-id abc123",
            "Check Vercel deployment status"
          ) as Argv<StatusArgs>,

      handler: async (argv) => {
        try {
          // Load config if provided
          let platformConfig: Record<string, unknown> = {};
          if (argv.config) {
            const configPath = path.resolve(process.cwd(), argv.config);
            if (fs.existsSync(configPath)) {
              platformConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            }
          }

          const deployer = DeployerFactory.create(argv.platform, platformConfig);
          const result = await deployer.getStatus(argv["deployment-id"]);

          console.log("\n Deployment Status:");
          console.log(`   Deployment ID: ${result.deploymentId}`);
          console.log(
            `   Status: ${result.status === "success" ? " Active" : result.status === "failed" ? " Failed" : " Pending"}`
          );
          if (result.url) {
            console.log(`   URL: ${result.url}`);
          }
          if (result.logs?.length) {
            console.log("\n   Logs:");
            result.logs.forEach((log) => console.log(`   ${log}`));
          }
        } catch (error) {
          console.error("\n Failed to get status:", (error as Error).message);
          process.exit(1);
        }
      },
    };
  }

  /**
   * Create the platforms subcommand
   */
  private static createPlatformsCommand(): CommandModule {
    return {
      command: "platforms",
      describe: "List supported deployment platforms",
      handler: () => {
        console.log("\n Supported Deployment Platforms:\n");
        console.log("   vercel      - Vercel Serverless Functions");
        console.log("   cloudflare  - Cloudflare Workers");
        console.log("   netlify     - Netlify Functions");
        console.log("   lambda      - AWS Lambda (SAM/Docker)");
        console.log("\nUsage:");
        console.log("   neurolink deploy build --platform <name>");
        console.log("   neurolink deploy run --platform <name>");
        console.log(
          "   neurolink deploy status --platform <name> --deployment-id <id>"
        );
      },
    };
  }
}

export default DeployCommandFactory;

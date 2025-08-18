#!/usr/bin/env node
/**
 * NeuroLink CLI: Heartbeat Command
 *
 * This command performs real-time health checks on configured AI providers
 * to ensure they are reachable and properly configured.
 */

import { configManager } from "./config.js";
import { logger } from "../../lib/utils/logger.js";
import chalk from "chalk";
import ora from "ora";
import { NeuroLink } from "../../lib/neurolink.js";
import type { Argv } from "yargs";
import type { BaseCommandArgs } from "../../lib/types/cli.js";

// Type definitions - properly typed interface extending BaseCommandArgs
interface HeartbeatArgs extends BaseCommandArgs {
  provider?: string;
  dryRun?: boolean;
  // Note: debug is inherited from BaseCommandArgs
  noColor?: boolean;
  configFile?: string;
}

interface MockResult {
  provider: string;
  status: "working" | "failed" | "not-configured";
  responseTime?: number;
  model?: string;
  error?: string;
}

// Define the command and its handler
export const command = "heartbeat";
export const description = "Check the status of configured AI providers";

export const builder = (yargs: Argv): Argv<HeartbeatArgs> => {
  return (yargs as Argv<HeartbeatArgs>)
    .option("provider", {
      alias: "p",
      type: "string",
      description: "Check a specific provider",
    })
    .option("dry-run", {
      type: "boolean",
      default: false,
      description: "Simulate checks without calling providers",
    });
};

export const handler = async (argv: HeartbeatArgs) => {
  const spinner = ora("Running provider heartbeat checks...").start();
  try {
    if (argv.dryRun) {
      spinner.succeed("Simulating heartbeat checks (dry run)...");
      const mockResults: MockResult[] = [
        {
          provider: "openai",
          status: "working",
          responseTime: 150,
          model: "gpt-4",
        },
        {
          provider: "bedrock",
          status: "failed",
          error: "Invalid credentials",
          responseTime: 2300,
        },
        { provider: "vertex", status: "not-configured" },
        {
          provider: "anthropic",
          status: "working",
          responseTime: 220,
          model: "claude-3-sonnet",
        },
        {
          provider: "azure",
          status: "failed",
          error: "Authentication timeout",
          responseTime: 5000,
        },
      ];

      const results = argv.provider
        ? mockResults.filter((r: MockResult) => r.provider === argv.provider)
        : mockResults;

      if (results.length === 0 && argv.provider) {
        logger.always(
          chalk.yellow(
            `⚠️  Provider '${argv.provider}' not found in mock data`,
          ),
        );
        return;
      }

      let workingCount = 0;
      logger.always(
        chalk.blue("\n📋 Provider Health Check Results (Dry Run):"),
      );

      for (const result of results) {
        const status =
          result.status === "working"
            ? chalk.green("✅ Healthy")
            : result.status === "failed"
              ? chalk.red("❌ Unhealthy")
              : chalk.gray("⚪ Not configured");

        const time = result.responseTime ? ` (${result.responseTime}ms)` : "";
        const model = result.model ? ` [${result.model}]` : "";

        if (result.status === "working") {
          workingCount++;
        }

        logger.always(`${result.provider}: ${status}${time}${model}`);

        if (result.status === "failed" && argv.debug && result.error) {
          logger.always(`  ${chalk.red("Error:")} ${result.error}`);
        }

        if (result.status === "not-configured" && argv.debug) {
          logger.always(
            `  ${chalk.yellow("Note:")} Provider not configured. Run 'neurolink config init' to set up.`,
          );
        }
      }

      logger.always(
        chalk.blue(
          `\n📊 Summary: ${workingCount}/${results.length} providers healthy (dry run)`,
        ),
      );
      return;
    }

    const config = configManager.getConfig();
    const configuredProviders = Object.keys(config.providers).filter(
      (providerKey) => {
        const providerConfig =
          config.providers[providerKey as keyof typeof config.providers];
        return providerConfig && Object.keys(providerConfig).length > 0;
      },
    );

    // Only add defaultProvider if it's actually configured
    if (
      config.defaultProvider &&
      config.defaultProvider !== "auto" &&
      !configuredProviders.includes(config.defaultProvider)
    ) {
      // Verify the default provider is actually configured before adding
      const defaultProviderConfig =
        config.providers[
          config.defaultProvider as keyof typeof config.providers
        ];
      if (
        defaultProviderConfig &&
        Object.keys(defaultProviderConfig).length > 0
      ) {
        configuredProviders.push(config.defaultProvider);
      }
    }

    const providersToCheck = argv.provider
      ? [argv.provider]
      : configuredProviders;

    if (providersToCheck.length === 0) {
      spinner.fail(
        'No providers configured. Run "neurolink config init" to set up providers.',
      );
      return;
    }

    // Validate specific provider exists if requested
    if (argv.provider && !configuredProviders.includes(argv.provider)) {
      spinner.warn(
        `Provider '${argv.provider}' not configured, but will attempt to check...`,
      );
    }

    spinner.info(
      `Checking ${providersToCheck.length} configured provider(s)...`,
    );

    const sdk = new NeuroLink();
    const results = [];
    let workingCount = 0;
    const startTime = Date.now();

    // Use parallel checking for better performance
    const healthCheckPromises = providersToCheck.map(async (providerName) => {
      const providerStartTime = Date.now();
      try {
        const health = await sdk.checkProviderHealth(providerName, {
          includeConnectivityTest: true,
          timeout: 10000,
          cacheResults: false, // Force fresh check for heartbeat
        });

        const responseTime = Date.now() - providerStartTime;
        return {
          provider: providerName,
          health,
          responseTime,
          success: true,
        };
      } catch (error) {
        const responseTime = Date.now() - providerStartTime;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return {
          provider: providerName,
          error: errorMessage,
          responseTime,
          success: false,
        };
      }
    });

    // Wait for all checks to complete
    const checkResults = await Promise.all(healthCheckPromises);

    logger.always(chalk.blue("\n📋 Provider Health Check Results:"));

    for (const result of checkResults) {
      if (result.success && result.health) {
        const health = result.health;
        if (health.isHealthy) {
          const statusLine = `${result.provider}: ${chalk.green("✅ Healthy")} (${result.responseTime}ms)`;
          logger.always(statusLine);
          workingCount++;
        } else {
          const statusLine = `${result.provider}: ${chalk.red("❌ Unhealthy")} (${result.responseTime}ms)`;
          logger.always(statusLine);

          if (argv.debug) {
            if (health.error) {
              logger.always(`  ${chalk.red("Error:")} ${health.error}`);
            }
            if (health.configurationIssues?.length > 0) {
              logger.always(
                `  ${chalk.yellow("Issues:")} ${health.configurationIssues.join(", ")}`,
              );
            }
            if (health.recommendations?.length > 0) {
              logger.always(
                `  ${chalk.blue("Recommendations:")} ${health.recommendations.join(", ")}`,
              );
            }
          }
        }
        results.push(health);
      } else {
        const statusLine = `${result.provider}: ${chalk.red("❌ Failed")} (${result.responseTime}ms)`;
        logger.always(statusLine);

        if (argv.debug && result.error) {
          logger.always(`  ${chalk.red("Error:")} ${result.error}`);
        }

        results.push({
          provider: result.provider,
          isHealthy: false,
          error: result.error,
          isConfigured: false,
          hasApiKey: false,
          lastChecked: new Date(),
          configurationIssues: [result.error || "Unknown error"],
          recommendations: [],
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const avgTime = Math.round(totalTime / providersToCheck.length);

    spinner.succeed(
      `Provider check complete: ${workingCount}/${providersToCheck.length} providers healthy (${totalTime}ms total, ${avgTime}ms avg)`,
    );

    // Show summary if debug mode enabled
    if (argv.debug) {
      logger.always(chalk.blue("\n📊 Health Check Summary:"));
      logger.always(`Total providers checked: ${providersToCheck.length}`);
      logger.always(`Healthy providers: ${workingCount}`);
      logger.always(
        `Unhealthy providers: ${providersToCheck.length - workingCount}`,
      );
      logger.always(`Total time: ${totalTime}ms`);
      logger.always(`Average response time: ${avgTime}ms`);
    }
  } catch (error) {
    spinner.fail("An error occurred during heartbeat checks.");

    if (error instanceof Error) {
      logger.error(chalk.red(`Error: ${error.message}`));

      if (argv.debug) {
        logger.error(chalk.gray(`Stack trace: ${error.stack}`));
      }
    } else {
      logger.error(chalk.red(`Unknown error: ${String(error)}`));
    }

    // Provide helpful suggestions
    logger.always(chalk.yellow("\n💡 Troubleshooting suggestions:"));
    logger.always("• Check your internet connection");
    logger.always(
      "• Verify provider configurations with: neurolink config list",
    );
    logger.always("• Try running with --debug for more details");
    logger.always("• Re-run with --dry-run to test the command structure");

    process.exit(1);
  } finally {
    // Cleanup: Clear any cached health data to ensure fresh checks next time
    try {
      const sdk = new NeuroLink();
      await sdk.clearProviderHealthCache();
    } catch (cleanupError) {
      // Ignore cleanup errors - they shouldn't affect the main operation
      if (argv.debug) {
        logger.debug(chalk.gray("Note: Cache cleanup failed (non-critical)"));
      }
    }
  }
};

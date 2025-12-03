/**
 * Complete Setup Integration for NeuroLink CLI
 *
 * Orchestrates the entire setup process: interactive wizard, environment management,
 * provider testing, and summary display.
 */

import {
  runInteractiveSetup,
  testProviderConnectivity,
  displaySetupSummary,
  type SetupResult,
} from "./interactiveSetup.js";
import { updateEnvFile, displayEnvUpdateSummary } from "./envManager.js";
import chalk from "chalk";

import { logger } from "../../lib/utils/logger.js";
/**
 * Run the complete interactive setup process
 */
export async function runCompleteSetup(
  quiet: boolean = false,
): Promise<SetupResult> {
  try {
    // Step 1: Run interactive setup wizard
    if (!quiet) {
      logger.always(
        chalk.blue("🚀 Starting NeuroLink Configuration Setup...\n"),
      );
    }

    const setupResult = await runInteractiveSetup(quiet);

    // If no providers selected, exit early
    if (setupResult.selectedProviders.length === 0) {
      if (!quiet) {
        logger.always(
          chalk.yellow("⚠️  No providers selected. Setup cancelled."),
        );
      }
      return setupResult;
    }

    // Step 2: Update environment file with credentials
    if (Object.keys(setupResult.credentials).length > 0) {
      if (!quiet) {
        logger.always(
          chalk.blue("\n💾 Updating environment configuration...\n"),
        );
      }

      try {
        const envResult = updateEnvFile(setupResult.credentials, ".env", true);
        setupResult.envFileBackup = envResult.backup.backupPath;

        if (!quiet) {
          displayEnvUpdateSummary(envResult, false);
        }

        // Update process.env for immediate testing
        for (const [key, value] of Object.entries(setupResult.credentials)) {
          process.env[key] = value;
        }
      } catch (error) {
        if (!quiet) {
          logger.error(
            chalk.red(
              `❌ Failed to update environment file: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
        }
        throw error;
      }
    }

    // Step 3: Test provider connectivity
    if (!quiet) {
      logger.always(chalk.blue("\n🧪 Testing configured providers...\n"));
    }

    setupResult.testResults = await testProviderConnectivity(
      setupResult.selectedProviders,
      quiet,
    );

    // Step 4: Display summary
    displaySetupSummary(setupResult, quiet);

    return setupResult;
  } catch (error) {
    if (!quiet) {
      logger.error(
        chalk.red(
          `❌ Setup failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      logger.always(
        chalk.yellow("💡 You can retry setup with: neurolink config setup"),
      );
    }
    throw error;
  }
}

/**
 * Wrapper for config setup command
 */
export async function configSetup(quiet: boolean = false): Promise<void> {
  await runCompleteSetup(quiet);
}

/**
 * Wrapper for config init command (alias for setup)
 */
export async function configInit(quiet: boolean = false): Promise<void> {
  if (!quiet) {
    logger.always(chalk.gray("📝 config init is an alias for config setup\n"));
  }
  await runCompleteSetup(quiet);
}

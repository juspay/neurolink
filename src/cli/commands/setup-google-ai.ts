#!/usr/bin/env node

/**
 * Google AI Studio Setup Command
 *
 * Simple setup for Google AI Studio (Google AI) integration:
 * - GOOGLE_AI_API_KEY (required)
 * - GOOGLE_AI_MODEL (optional, with recommended choices)
 *
 * Follows the same UX patterns as setup-openai and setup-gcp
 */

import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { GoogleAIModels } from "../../lib/constants/enums.js";
import {
  updateEnvFile as updateEnvFileManager,
  displayEnvUpdateSummary,
} from "../utils/envManager.js";
import { getTopModelChoices } from "../../lib/utils/modelChoices.js";
import { AIProviderName } from "../../lib/types/index.js";

type GoogleAISetupOptions = {
  checkOnly?: boolean;
  interactive?: boolean;
};

type GoogleAISetupArgv = {
  check?: boolean;
  nonInteractive?: boolean;
};

type GoogleAIConfig = {
  apiKey?: string;
  model?: string;
  isReconfiguring?: boolean;
};

/**
 * Get the runtime default model that matches the provider implementation
 */
function getRuntimeDefaultModel(): string {
  return process.env.GOOGLE_AI_MODEL || GoogleAIModels.GEMINI_2_5_FLASH;
}

export async function handleGoogleAISetup(
  argv: GoogleAISetupArgv,
): Promise<void> {
  try {
    const options: GoogleAISetupOptions = {
      checkOnly: argv.check || false,
      interactive: !argv.nonInteractive,
    };

    logger.always(chalk.blue("🔍 Checking Google AI Studio configuration..."));

    // Step 1: Check for existing configuration
    const hasApiKey = !!(
      process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    );
    const hasModel = !!process.env.GOOGLE_AI_MODEL;
    const currentApiKey =
      process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // Display current status
    displayCurrentStatus(hasApiKey, hasModel);

    // Check-only mode - show status and exit
    if (options.checkOnly) {
      if (hasApiKey && currentApiKey) {
        logger.always(chalk.green("✅ Google AI Studio setup complete"));
        logger.always(`   API Key: ${maskCredential(currentApiKey)}`);
        if (hasModel) {
          logger.always(`   Model: ${process.env.GOOGLE_AI_MODEL}`);
        } else {
          logger.always(`   Model: ${getRuntimeDefaultModel()} (default)`);
        }
      } else {
        logger.always(chalk.yellow("⚠️  Google AI Studio setup incomplete"));
      }
      return;
    }

    const config: GoogleAIConfig = {};

    // Step 2: Handle existing configuration
    if (hasApiKey && currentApiKey) {
      logger.always(
        chalk.green("✅ Google AI Studio API key found in environment"),
      );
      logger.always(`   API Key: ${maskCredential(currentApiKey)}`);
      if (hasModel) {
        logger.always(`   Model: ${process.env.GOOGLE_AI_MODEL}`);
      } else {
        logger.always(`   Model: ${getRuntimeDefaultModel()} (default)`);
      }

      if (options.interactive) {
        const { reconfigure } = await inquirer.prompt([
          {
            type: "confirm",
            name: "reconfigure",
            message:
              "Google AI Studio is already configured. Do you want to reconfigure?",
            default: false,
          },
        ]);

        if (!reconfigure) {
          // Still offer model selection if no model is set
          if (!hasModel) {
            const { wantsCustomModel } = await inquirer.prompt([
              {
                type: "confirm",
                name: "wantsCustomModel",
                message: "Do you want to specify a Google AI model? (optional)",
                default: false,
              },
            ]);

            if (wantsCustomModel) {
              config.model = await promptForModel();
            }
          } else {
            // Offer to change existing model
            const { wantsChangeModel } = await inquirer.prompt([
              {
                type: "confirm",
                name: "wantsChangeModel",
                message: `Do you want to change the Google AI model? (current: ${process.env.GOOGLE_AI_MODEL})`,
                default: false,
              },
            ]);

            if (wantsChangeModel) {
              config.model = await promptForModel();
            }
          }

          if (config.model) {
            await updateEnvFile(config);
            logger.always(chalk.green("✅ Model configuration updated!"));
            logger.always(`   GOOGLE_AI_MODEL=${config.model}`);
          } else {
            logger.always(chalk.blue("👍 Keeping existing configuration."));
          }

          // Show usage example
          showUsageExample();
          return;
        } else {
          // User chose to reconfigure - mark this for proper handling
          logger.always(
            chalk.blue("📝 Reconfiguring Google AI Studio setup..."),
          );
          config.isReconfiguring = true;
        }
      } else {
        // Non-interactive mode - just use existing credentials
        logger.always(
          chalk.green(
            "✅ Setup complete! Using existing Google AI Studio configuration.",
          ),
        );
        return;
      }
    }

    // Step 3: Interactive setup for missing or reconfiguring credentials
    if (options.interactive) {
      const isReconfiguring = config.isReconfiguring === true;

      // Handle API key setup/reconfiguration
      if (!hasApiKey) {
        // No API key exists - prompt for it
        logger.always("");
        logger.always(chalk.yellow("📋 To get your Google AI Studio API key:"));
        logger.always("1. Visit: https://aistudio.google.com/app/apikey");
        logger.always("2. Sign in with your Google account");
        logger.always("3. Click 'Create API key' (free tier available)");
        logger.always("4. Copy the API key (starts with AIza...)");
        logger.always("");

        const { apiKey } = await inquirer.prompt([
          {
            type: "password",
            name: "apiKey",
            message: "Enter your Google AI Studio API key:",
            validate: validateApiKey,
          },
        ]);

        config.apiKey = apiKey.trim();
      } else if (isReconfiguring) {
        // API key exists and user is reconfiguring - ask if they want to change it
        const { wantsChangeApiKey } = await inquirer.prompt([
          {
            type: "confirm",
            name: "wantsChangeApiKey",
            message: `Do you want to change the Google AI Studio API key? (current: ${currentApiKey ? maskCredential(currentApiKey) : "****"})`,
            default: false,
          },
        ]);

        if (wantsChangeApiKey) {
          logger.always("");
          logger.always(
            chalk.yellow("📋 To get your Google AI Studio API key:"),
          );
          logger.always("1. Visit: https://aistudio.google.com/app/apikey");
          logger.always("2. Sign in with your Google account");
          logger.always("3. Click 'Create API key' (free tier available)");
          logger.always("4. Copy the API key (starts with AIza...)");
          logger.always("");

          const { apiKey } = await inquirer.prompt([
            {
              type: "password",
              name: "apiKey",
              message:
                "Enter your new Google AI Studio API key (replacing existing):",
              validate: validateApiKey,
            },
          ]);

          config.apiKey = apiKey.trim();
        }
      }

      // Prompt for model selection
      const { wantsCustomModel } = await inquirer.prompt([
        {
          type: "confirm",
          name: "wantsCustomModel",
          message: hasModel
            ? `Do you want to change the Google AI model? (current: ${process.env.GOOGLE_AI_MODEL})`
            : "Do you want to specify a Google AI model? (optional)",
          default: false,
        },
      ]);

      if (wantsCustomModel) {
        config.model = await promptForModel();
      }
    } else {
      // Non-interactive mode
      logger.always(chalk.yellow("⚠️  Non-interactive mode: setup incomplete"));
      logger.always(
        chalk.yellow(
          "💡 Run without --non-interactive to configure Google AI Studio",
        ),
      );
      return;
    }

    // Step 4: Update .env file
    if (config.apiKey || config.model) {
      await updateEnvFile(config);

      logger.always(chalk.green("✅ Google AI Studio setup complete!"));
      if (config.apiKey) {
        logger.always(`   API Key: ${maskCredential(config.apiKey)}`);
      }
      if (config.model) {
        logger.always(`   Model: ${config.model}`);
      }

      // Show usage example
      showUsageExample();
    } else if (options.interactive && !options.checkOnly) {
      logger.always(chalk.green("✅ Setup complete!"));
      showUsageExample();
    }
  } catch (error) {
    logger.error(chalk.red("❌ Google AI Studio setup failed:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

/**
 * Display current configuration status
 */
function displayCurrentStatus(hasApiKey: boolean, hasModel: boolean): void {
  if (hasApiKey) {
    logger.always(
      chalk.green("✔ Google AI Studio API key found in environment"),
    );
  } else {
    logger.always(chalk.red("✘ Google AI Studio API key not found"));
  }

  if (hasModel) {
    logger.always(
      chalk.green(`✔ GOOGLE_AI_MODEL found: ${process.env.GOOGLE_AI_MODEL}`),
    );
  } else {
    logger.always(
      chalk.yellow(
        `⚠ GOOGLE_AI_MODEL not set (will use ${getRuntimeDefaultModel()} default)`,
      ),
    );
  }
}

/**
 * Validate Google AI Studio API key format
 */
function validateApiKey(input: string): boolean | string {
  if (!input.trim()) {
    return "Google AI Studio API key is required";
  }

  const trimmed = input.trim();

  if (!trimmed.startsWith("AIza")) {
    return "Google AI Studio API key should start with 'AIza'";
  }

  if (trimmed.length < 20) {
    return "Google AI Studio API key seems too short";
  }

  // Basic format check: AIza[32+ char random string]
  if (!/^AIza[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return "Invalid Google AI Studio API key format";
  }

  return true;
}

/**
 * Prompt user for model selection
 */
async function promptForModel(): Promise<string> {
  const { modelChoice } = await inquirer.prompt([
    {
      type: "list",
      name: "modelChoice",
      message: "Select a Google AI model:",
      choices: getTopModelChoices(AIProviderName.GOOGLE_AI, 5),
    },
  ]);

  if (modelChoice === "custom") {
    const { customModel } = await inquirer.prompt([
      {
        type: "input",
        name: "customModel",
        message: "Enter your custom Google AI model name:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Model name is required";
          }
          // Basic validation - Google AI models typically follow certain patterns
          const trimmed = input.trim();
          if (!/^[a-z0-9-._]+$/i.test(trimmed)) {
            return "Model name should contain only letters, numbers, hyphens, dots, and underscores";
          }
          return true;
        },
      },
    ]);
    return customModel.trim();
  }

  return modelChoice;
}

/**
 * Update .env file with Google AI Studio configuration
 */
async function updateEnvFile(config: GoogleAIConfig): Promise<void> {
  const envPath = path.join(process.cwd(), ".env");
  const spinner = ora("💾 Updating .env file...").start();

  try {
    // Prepare environment variables to update
    const envVars: Record<string, string> = {};
    const keysToDelete: string[] = [];

    if (config.apiKey) {
      // Use GOOGLE_AI_API_KEY as the primary key
      envVars.GOOGLE_AI_API_KEY = config.apiKey;
      // Remove alternative key if it exists
      keysToDelete.push("GOOGLE_GENERATIVE_AI_API_KEY");
    }
    if (config.model) {
      envVars.GOOGLE_AI_MODEL = config.model;
    }

    // Update .env file using centralized envManager
    const result = updateEnvFileManager(envVars, envPath, true, keysToDelete);

    spinner.succeed(chalk.green("✔ .env file updated successfully"));

    // Display summary of changes (quietly, since we have our own success message)
    displayEnvUpdateSummary(result, true);
  } catch (error) {
    spinner.fail(chalk.red("❌ Failed to update .env file"));
    logger.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    throw error;
  }
}

/**
 * Mask API key for display
 */
function maskCredential(credential: string): string {
  if (!credential || credential.length < 8) {
    return "****";
  }

  const start = credential.slice(0, 7); // Show 'AIza' plus a few chars
  const end = credential.slice(-4);
  const middle = "*".repeat(Math.max(4, credential.length - 11));

  return `${start}${middle}${end}`;
}

/**
 * Show usage example
 */
function showUsageExample(): void {
  logger.always("");
  logger.always(
    chalk.green("🚀 You can now use Google AI Studio with the NeuroLink CLI:"),
  );
  logger.always(
    chalk.cyan(
      "   pnpm cli generate 'Hello from Google AI!' --provider google-ai",
    ),
  );
  logger.always(
    chalk.cyan(
      "   pnpm cli generate 'Explain quantum computing' --provider google-ai",
    ),
  );
  logger.always(
    chalk.cyan(
      "   pnpm cli generate 'Analyze this data' --provider google-ai --enable-analytics",
    ),
  );
}

#!/usr/bin/env node

/**
 * Azure OpenAI Setup Command
 *
 * Setup for Azure OpenAI integration:
 * - AZURE_OPENAI_API_KEY (required)
 * - AZURE_OPENAI_ENDPOINT (required)
 * - AZURE_OPENAI_MODEL (optional)
 *
 * Follows the same UX patterns as other setup commands
 */

import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import {
  updateEnvFile as updateEnvFileShared,
  displayEnvUpdateSummary,
} from "../utils/envManager.js";
import { getTopModelChoices } from "../../lib/utils/modelChoices.js";
import { AIProviderName } from "../../lib/types/index.js";

type AzureSetupOptions = {
  checkOnly?: boolean;
  interactive?: boolean;
};

type AzureSetupArgv = {
  check?: boolean;
  nonInteractive?: boolean;
};

type AzureConfig = {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  isReconfiguring?: boolean;
};

export async function handleAzureSetup(argv: AzureSetupArgv): Promise<void> {
  try {
    const options: AzureSetupOptions = {
      checkOnly: argv.check || false,
      interactive: !argv.nonInteractive,
    };

    logger.always(chalk.blue("🔍 Checking Azure OpenAI configuration..."));

    // Step 1: Check for existing configuration
    const hasApiKey = !!process.env.AZURE_OPENAI_API_KEY;
    const hasEndpoint = !!process.env.AZURE_OPENAI_ENDPOINT;
    const hasModel = !!process.env.AZURE_OPENAI_MODEL;

    // Display current status
    displayCurrentStatus(hasApiKey, hasEndpoint, hasModel);

    // Check-only mode - show status and exit
    if (options.checkOnly) {
      if (hasApiKey && hasEndpoint) {
        logger.always(chalk.green("✅ Azure OpenAI setup complete"));
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        if (apiKey) {
          logger.always(`   API Key: ${maskCredential(apiKey)}`);
        }
        logger.always(`   Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
        if (hasModel) {
          logger.always(`   Model: ${process.env.AZURE_OPENAI_MODEL}`);
        } else {
          logger.always("   Model: (using deployment default)");
        }
      } else {
        logger.always(chalk.yellow("⚠️  Azure OpenAI setup incomplete"));
      }
      return;
    }

    const config: AzureConfig = {};

    // Step 2: Handle existing configuration
    if (hasApiKey && hasEndpoint) {
      logger.always(
        chalk.green("✅ Azure OpenAI credentials found in environment"),
      );
      const apiKey = process.env.AZURE_OPENAI_API_KEY;
      if (apiKey) {
        logger.always(`   API Key: ${maskCredential(apiKey)}`);
      }
      logger.always(`   Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
      if (hasModel) {
        logger.always(`   Model: ${process.env.AZURE_OPENAI_MODEL}`);
      } else {
        logger.always("   Model: (using deployment default)");
      }

      if (options.interactive) {
        const { reconfigure } = await inquirer.prompt([
          {
            type: "confirm",
            name: "reconfigure",
            message:
              "Azure OpenAI is already configured. Do you want to reconfigure?",
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
                message:
                  "Do you want to specify an Azure OpenAI model? (optional)",
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
                message: `Do you want to change the Azure OpenAI model? (current: ${process.env.AZURE_OPENAI_MODEL})`,
                default: false,
              },
            ]);

            if (wantsChangeModel) {
              config.model = await promptForModel();
            }
          }

          if (config.model) {
            await updateEnvFileWithConfig(config);
            logger.always(chalk.green("✅ Model configuration updated!"));
            logger.always(`   AZURE_OPENAI_MODEL=${config.model}`);
          } else {
            logger.always(chalk.blue("👍 Keeping existing configuration."));
          }

          // Show usage example
          showUsageExample();
          return;
        } else {
          // User chose to reconfigure - mark this for proper handling
          logger.always(chalk.blue("📝 Reconfiguring Azure OpenAI setup..."));
          config.isReconfiguring = true;
        }
      } else {
        // Non-interactive mode - just use existing credentials
        logger.always(
          chalk.green(
            "✅ Setup complete! Using existing Azure OpenAI configuration.",
          ),
        );
        return;
      }
    }

    // Step 3: Interactive setup for missing or reconfiguring credentials
    if (options.interactive) {
      const isReconfiguring = config.isReconfiguring === true;

      // Handle API key setup/reconfiguration
      if (!hasApiKey || isReconfiguring) {
        if (!hasApiKey) {
          // No API key exists - prompt for it
          logger.always("");
          logger.always(
            chalk.yellow("📋 To get your Azure OpenAI credentials:"),
          );
          logger.always("1. Visit: https://portal.azure.com/");
          logger.always("2. Navigate to your Azure OpenAI resource");
          logger.always("3. Go to 'Keys and Endpoint' section");
          logger.always("4. Copy the API key and endpoint URL");
          logger.always("");
        } else if (isReconfiguring) {
          // Ask if they want to change the API key
          const apiKey = process.env.AZURE_OPENAI_API_KEY;
          const { wantsChangeApiKey } = await inquirer.prompt([
            {
              type: "confirm",
              name: "wantsChangeApiKey",
              message: `Do you want to change the Azure OpenAI API key? (current: ${apiKey ? maskCredential(apiKey) : "****"})`,
              default: false,
            },
          ]);

          if (!wantsChangeApiKey) {
            config.apiKey = undefined; // Don't update the API key
          }
        }

        if (!hasApiKey || (isReconfiguring && config.apiKey !== undefined)) {
          const { apiKey } = await inquirer.prompt([
            {
              type: "password",
              name: "apiKey",
              message: isReconfiguring
                ? "Enter your new Azure OpenAI API key:"
                : "Enter your Azure OpenAI API key:",
              validate: validateApiKey,
            },
          ]);

          config.apiKey = apiKey.trim();
        }
      }

      // Handle endpoint setup/reconfiguration
      if (!hasEndpoint || isReconfiguring) {
        if (isReconfiguring && hasEndpoint) {
          const { wantsChangeEndpoint } = await inquirer.prompt([
            {
              type: "confirm",
              name: "wantsChangeEndpoint",
              message: `Do you want to change the Azure OpenAI endpoint? (current: ${process.env.AZURE_OPENAI_ENDPOINT})`,
              default: false,
            },
          ]);

          if (!wantsChangeEndpoint) {
            config.endpoint = undefined; // Don't update the endpoint
          }
        }

        if (
          !hasEndpoint ||
          (isReconfiguring && config.endpoint !== undefined)
        ) {
          const { endpoint } = await inquirer.prompt([
            {
              type: "input",
              name: "endpoint",
              message: isReconfiguring
                ? "Enter your new Azure OpenAI endpoint URL:"
                : "Enter your Azure OpenAI endpoint URL:",
              validate: validateEndpoint,
            },
          ]);

          config.endpoint = endpoint.trim();
        }
      }

      // Prompt for model selection
      const { wantsCustomModel } = await inquirer.prompt([
        {
          type: "confirm",
          name: "wantsCustomModel",
          message: hasModel
            ? `Do you want to change the Azure OpenAI model? (current: ${process.env.AZURE_OPENAI_MODEL})`
            : "Do you want to specify an Azure OpenAI model? (optional)",
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
          "💡 Run without --non-interactive to configure Azure OpenAI",
        ),
      );
      return;
    }

    // Step 4: Update .env file
    if (config.apiKey || config.endpoint || config.model) {
      await updateEnvFileWithConfig(config);

      logger.always(chalk.green("✅ Azure OpenAI setup complete!"));
      if (config.apiKey) {
        logger.always(`   API Key: ${maskCredential(config.apiKey)}`);
      }
      if (config.endpoint) {
        logger.always(`   Endpoint: ${config.endpoint}`);
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
    logger.error(chalk.red("❌ Azure OpenAI setup failed:"));
    logger.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
    process.exit(1);
  }
}

/**
 * Display current configuration status
 */
function displayCurrentStatus(
  hasApiKey: boolean,
  hasEndpoint: boolean,
  hasModel: boolean,
): void {
  if (hasApiKey) {
    logger.always(chalk.green("✔ AZURE_OPENAI_API_KEY found in environment"));
  } else {
    logger.always(chalk.red("✘ AZURE_OPENAI_API_KEY not found"));
  }

  if (hasEndpoint) {
    logger.always(
      chalk.green(
        `✔ AZURE_OPENAI_ENDPOINT found: ${process.env.AZURE_OPENAI_ENDPOINT}`,
      ),
    );
  } else {
    logger.always(chalk.red("✘ AZURE_OPENAI_ENDPOINT not found"));
  }

  if (hasModel) {
    logger.always(
      chalk.green(
        `✔ AZURE_OPENAI_MODEL found: ${process.env.AZURE_OPENAI_MODEL}`,
      ),
    );
  } else {
    logger.always(
      chalk.yellow(
        "⚠ AZURE_OPENAI_MODEL not set (will use deployment default)",
      ),
    );
  }
}

/**
 * Validate Azure OpenAI API key format
 */
function validateApiKey(input: string): boolean | string {
  if (!input.trim()) {
    return "Azure OpenAI API key is required";
  }

  const trimmed = input.trim();

  if (trimmed.length < 20) {
    return "Azure OpenAI API key seems too short";
  }

  // Azure OpenAI keys are typically 32 character hex strings
  if (!/^[a-f0-9]{32}$/i.test(trimmed)) {
    return "Azure OpenAI API key should be a 32-character hexadecimal string";
  }

  return true;
}

/**
 * Validate Azure OpenAI endpoint URL
 */
function validateEndpoint(input: string): boolean | string {
  if (!input.trim()) {
    return "Azure OpenAI endpoint URL is required";
  }

  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);
    if (!url.hostname.includes("openai.azure.com")) {
      return "Endpoint should be an Azure OpenAI URL (*.openai.azure.com)";
    }
    return true;
  } catch {
    return "Invalid URL format. Should be like: https://your-resource.openai.azure.com/";
  }
}

/**
 * Prompt user for model selection
 */
async function promptForModel(): Promise<string> {
  const { modelChoice } = await inquirer.prompt([
    {
      type: "list",
      name: "modelChoice",
      message: "Select an Azure OpenAI model:",
      choices: getTopModelChoices(AIProviderName.AZURE, 5),
    },
  ]);

  if (modelChoice === "custom") {
    const { customModel } = await inquirer.prompt([
      {
        type: "input",
        name: "customModel",
        message: "Enter your Azure OpenAI deployment name:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Deployment name is required";
          }
          // Basic validation - Azure deployment names are alphanumeric with hyphens
          const trimmed = input.trim();
          if (!/^[a-z0-9-]+$/i.test(trimmed)) {
            return "Deployment name should contain only letters, numbers, and hyphens";
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
 * Update .env file with Azure OpenAI configuration using shared utilities
 */
async function updateEnvFileWithConfig(config: AzureConfig): Promise<void> {
  const spinner = ora("💾 Updating .env file...").start();

  try {
    // Prepare environment variables for the shared utility
    const newVars: Record<string, string> = {};

    if (config.apiKey) {
      newVars.AZURE_OPENAI_API_KEY = config.apiKey;
    }
    if (config.endpoint) {
      newVars.AZURE_OPENAI_ENDPOINT = config.endpoint;
    }
    if (config.model) {
      newVars.AZURE_OPENAI_MODEL = config.model;
    }

    // Use shared envManager utility with backup enabled
    const result = updateEnvFileShared(newVars, ".env", true);

    spinner.succeed(chalk.green("✔ .env file updated successfully"));

    // Display summary using shared utility
    displayEnvUpdateSummary(result, false);
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

  const start = credential.slice(0, 4);
  const end = credential.slice(-4);
  const middle = "*".repeat(Math.max(4, credential.length - 8));

  return `${start}${middle}${end}`;
}

/**
 * Show usage example
 */
function showUsageExample(): void {
  logger.always("");
  logger.always(
    chalk.green("🚀 You can now use Azure OpenAI with the NeuroLink CLI:"),
  );
  logger.always(
    chalk.cyan(
      "   pnpm cli generate 'Hello from Azure OpenAI!' --provider azure",
    ),
  );
  logger.always(
    chalk.cyan(
      "   pnpm cli generate 'Explain quantum computing' --provider azure",
    ),
  );
  logger.always(
    chalk.cyan(
      "   pnpm cli generate 'Analyze this data' --provider azure --enable-analytics",
    ),
  );
}

#!/usr/bin/env node

/**
 * OpenAI Setup Command
 *
 * Simple setup for OpenAI API integration:
 * - OPENAI_API_KEY (required)
 * - OPENAI_MODEL (optional, with popular choices)
 *
 * Follows the same UX patterns as setup-gcp and setup-bedrock
 */

import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { getTopModelChoices } from "../../lib/utils/modelChoices.js";
import { AIProviderName } from "../../lib/types/index.js";

type OpenAISetupOptions = {
  checkOnly?: boolean;
  interactive?: boolean;
};

type OpenAISetupArgv = {
  check?: boolean;
  nonInteractive?: boolean;
};

type OpenAIConfig = {
  apiKey?: string;
  model?: string;
  isReconfiguring?: boolean;
};

export async function handleOpenAISetup(argv: OpenAISetupArgv): Promise<void> {
  try {
    const options: OpenAISetupOptions = {
      checkOnly: argv.check || false,
      interactive: !argv.nonInteractive,
    };

    logger.always(chalk.blue("🔍 Checking OpenAI configuration..."));

    // Step 1: Check for existing configuration
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    const hasModel = !!process.env.OPENAI_MODEL;

    // Display current status
    displayCurrentStatus(hasApiKey, hasModel);

    // Check-only mode - show status and exit
    if (options.checkOnly) {
      if (hasApiKey && process.env.OPENAI_API_KEY) {
        logger.always(chalk.green("✅ OpenAI setup complete"));
        logger.always(
          `   API Key: ${maskCredential(process.env.OPENAI_API_KEY)}`,
        );
        if (hasModel) {
          logger.always(`   Model: ${process.env.OPENAI_MODEL}`);
        } else {
          logger.always("   Model: (using provider default)");
        }
      } else {
        logger.always(chalk.yellow("⚠️  OpenAI setup incomplete"));
      }
      return;
    }

    const config: OpenAIConfig = {};

    // Step 2: Handle existing configuration
    if (hasApiKey && process.env.OPENAI_API_KEY) {
      logger.always(chalk.green("✅ OpenAI API key found in environment"));
      logger.always(
        `   API Key: ${maskCredential(process.env.OPENAI_API_KEY)}`,
      );
      if (hasModel) {
        logger.always(`   Model: ${process.env.OPENAI_MODEL}`);
      } else {
        logger.always("   Model: (using provider default)");
      }

      if (options.interactive) {
        const { reconfigure } = await inquirer.prompt([
          {
            type: "confirm",
            name: "reconfigure",
            message:
              "OpenAI is already configured. Do you want to reconfigure?",
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
                  "Do you want to specify a custom OpenAI model? (optional)",
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
                message: `Do you want to change the OpenAI model? (current: ${process.env.OPENAI_MODEL})`,
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
            logger.always(`   OPENAI_MODEL=${config.model}`);
          } else {
            logger.always(chalk.blue("👍 Keeping existing configuration."));
          }

          // Show usage example
          showUsageExample();
          return;
        } else {
          // User chose to reconfigure - mark this for proper handling
          logger.always(chalk.blue("📝 Reconfiguring OpenAI setup..."));
          config.isReconfiguring = true;
        }
      } else {
        // Non-interactive mode - just use existing credentials
        logger.always(
          chalk.green(
            "✅ Setup complete! Using existing OpenAI configuration.",
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
        logger.always(chalk.yellow("📋 To get your OpenAI API key:"));
        logger.always("1. Visit: https://platform.openai.com/api-keys");
        logger.always("2. Log in to your OpenAI account");
        logger.always("3. Click 'Create new secret key'");
        logger.always("4. Copy the API key (starts with sk-)");
        logger.always("");

        const { apiKey } = await inquirer.prompt([
          {
            type: "password",
            name: "apiKey",
            message: "Enter your OpenAI API key:",
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
            message: `Do you want to change the OpenAI API key? (current: ${process.env.OPENAI_API_KEY ? maskCredential(process.env.OPENAI_API_KEY) : "****"})`,
            default: false,
          },
        ]);

        if (wantsChangeApiKey) {
          logger.always("");
          logger.always(chalk.yellow("📋 To get your OpenAI API key:"));
          logger.always("1. Visit: https://platform.openai.com/api-keys");
          logger.always("2. Log in to your OpenAI account");
          logger.always("3. Click 'Create new secret key'");
          logger.always("4. Copy the API key (starts with sk-)");
          logger.always("");

          const { apiKey } = await inquirer.prompt([
            {
              type: "password",
              name: "apiKey",
              message: "Enter your new OpenAI API key (replacing existing):",
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
            ? `Do you want to change the OpenAI model? (current: ${process.env.OPENAI_MODEL})`
            : "Do you want to specify a custom OpenAI model? (optional - will use default if not specified)",
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
        chalk.yellow("💡 Run without --non-interactive to configure OpenAI"),
      );
      return;
    }

    // Step 4: Update .env file
    if (config.apiKey || config.model) {
      await updateEnvFile(config);

      logger.always(chalk.green("✅ OpenAI setup complete!"));
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
    logger.error(chalk.red("❌ OpenAI setup failed:"));
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
    logger.always(chalk.green("✔ OPENAI_API_KEY found in environment"));
  } else {
    logger.always(chalk.red("✘ OPENAI_API_KEY not found"));
  }

  if (hasModel) {
    logger.always(
      chalk.green(`✔ OPENAI_MODEL found: ${process.env.OPENAI_MODEL}`),
    );
  } else {
    logger.always(
      chalk.yellow("⚠ OPENAI_MODEL not set (will use provider default)"),
    );
  }
}

/**
 * Validate OpenAI API key format
 */
function validateApiKey(input: string): boolean | string {
  if (!input.trim()) {
    return "OpenAI API key is required";
  }

  const trimmed = input.trim();

  if (!trimmed.startsWith("sk-")) {
    return "OpenAI API key should start with 'sk-'";
  }

  if (trimmed.length < 20) {
    return "OpenAI API key seems too short";
  }

  // Basic format check: sk-[project id or old format][32+ char random string]
  if (!/^sk-[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return "Invalid OpenAI API key format";
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
      message: "Select an OpenAI model:",
      choices: getTopModelChoices(AIProviderName.OPENAI, 5),
    },
  ]);

  if (modelChoice === "custom") {
    const { customModel } = await inquirer.prompt([
      {
        type: "input",
        name: "customModel",
        message: "Enter your custom OpenAI model name:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Model name is required";
          }
          // Basic validation - OpenAI models typically follow certain patterns
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
 * Update .env file with OpenAI configuration
 */
async function updateEnvFile(config: OpenAIConfig): Promise<void> {
  const envPath = path.join(process.cwd(), ".env");
  const spinner = ora("💾 Updating .env file...").start();

  try {
    let envContent = "";

    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    // Parse existing environment variables
    const envLines = envContent.split("\n");
    const existingVars = new Map<string, string>();
    const otherLines: string[] = [];

    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const equalsIndex = trimmed.indexOf("=");
        if (equalsIndex > 0) {
          const key = trimmed.substring(0, equalsIndex);
          const value = trimmed.substring(equalsIndex + 1);
          existingVars.set(key, value);
        } else {
          otherLines.push(line);
        }
      } else {
        otherLines.push(line);
      }
    }

    // Update OpenAI variables
    if (config.apiKey) {
      existingVars.set("OPENAI_API_KEY", config.apiKey);
    }
    if (config.model) {
      existingVars.set("OPENAI_MODEL", config.model);
    }

    // Reconstruct .env content preserving structure
    const newEnvLines: string[] = [];

    // Add non-variable lines first (comments, empty lines)
    for (const line of otherLines) {
      newEnvLines.push(line);
    }

    // Add separator comment for OpenAI if needed
    if (
      (config.apiKey || config.model) &&
      !envContent.includes("OPENAI CONFIGURATION") &&
      !envContent.includes("# OpenAI")
    ) {
      if (
        newEnvLines.length > 0 &&
        newEnvLines[newEnvLines.length - 1].trim()
      ) {
        newEnvLines.push("");
      }
      newEnvLines.push("# OpenAI Configuration");
    }

    // Add all environment variables
    for (const [key, value] of existingVars.entries()) {
      newEnvLines.push(`${key}=${value}`);
    }

    // Write updated content
    const finalContent =
      newEnvLines.join("\n") + (newEnvLines.length > 0 ? "\n" : "");
    fs.writeFileSync(envPath, finalContent, "utf8");

    spinner.succeed(chalk.green("✔ .env file updated successfully"));
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
  const knownPrefixes = ["sk-"];
  const prefix =
    knownPrefixes.find((p) => credential.startsWith(p)) ??
    credential.slice(0, 3);
  const end = credential.slice(-4);
  const stars = "*".repeat(Math.max(4, credential.length - prefix.length - 4));
  return `${prefix}${stars}${end}`;
}

/**
 * Show usage example
 */
function showUsageExample(): void {
  logger.always("");
  logger.always(
    chalk.green("🚀 You can now use OpenAI with the NeuroLink CLI:"),
  );
  logger.always(
    chalk.cyan("   pnpm cli generate 'Hello from OpenAI!' --provider openai"),
  );
  logger.always(
    chalk.cyan(
      "   pnpm cli generate 'Explain quantum computing' --provider openai",
    ),
  );
}

#!/usr/bin/env node

/**
 * Anthropic Setup Command
 *
 * Simple setup for Anthropic Claude integration:
 * - ANTHROPIC_API_KEY (required)
 * - ANTHROPIC_MODEL (optional, with Claude model choices)
 *
 * Follows the same UX patterns as setup-openai and setup-google-ai
 */

import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { getTopModelChoices } from "../../lib/utils/modelChoices.js";
import { AIProviderName } from "../../lib/types/index.js";

interface AnthropicSetupOptions {
  checkOnly?: boolean;
  interactive?: boolean;
}

interface AnthropicSetupArgv {
  check?: boolean;
  nonInteractive?: boolean;
}

interface AnthropicConfig {
  apiKey?: string;
  model?: string;
  isReconfiguring?: boolean;
}

export async function handleAnthropicSetup(
  argv: AnthropicSetupArgv,
): Promise<void> {
  try {
    const options: AnthropicSetupOptions = {
      checkOnly: argv.check || false,
      interactive: !argv.nonInteractive,
    };

    logger.always(chalk.blue("🔍 Checking Anthropic configuration..."));

    // Step 1: Check for existing configuration
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
    const hasModel = !!process.env.ANTHROPIC_MODEL;

    // Display current status
    displayCurrentStatus(hasApiKey, hasModel);

    // Check-only mode - show status and exit
    if (options.checkOnly) {
      if (hasApiKey) {
        logger.always(chalk.green("✅ Anthropic setup complete"));
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (apiKey) {
          logger.always(`   API Key: ${maskCredential(apiKey)}`);
        }
        if (hasModel) {
          logger.always(`   Model: ${process.env.ANTHROPIC_MODEL}`);
        } else {
          logger.always("   Model: claude-3-5-sonnet-20241022 (default)");
        }
      } else {
        logger.always(chalk.yellow("⚠️  Anthropic setup incomplete"));
      }
      return;
    }

    const config: AnthropicConfig = {};

    // Step 2: Handle existing configuration
    if (hasApiKey) {
      logger.always(chalk.green("✅ Anthropic API key found in environment"));
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        logger.always(`   API Key: ${maskCredential(apiKey)}`);
      }
      if (hasModel) {
        logger.always(`   Model: ${process.env.ANTHROPIC_MODEL}`);
      } else {
        logger.always("   Model: claude-3-5-sonnet-20241022 (default)");
      }

      if (options.interactive) {
        const { reconfigure } = await inquirer.prompt([
          {
            type: "confirm",
            name: "reconfigure",
            message:
              "Anthropic is already configured. Do you want to reconfigure?",
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
                  "Do you want to specify an Anthropic model? (optional)",
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
                message: `Do you want to change the Anthropic model? (current: ${process.env.ANTHROPIC_MODEL})`,
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
            logger.always(`   ANTHROPIC_MODEL=${config.model}`);
          } else {
            logger.always(chalk.blue("👍 Keeping existing configuration."));
          }

          // Show usage example
          showUsageExample();
          return;
        } else {
          // User chose to reconfigure - mark this for proper handling
          logger.always(chalk.blue("📝 Reconfiguring Anthropic setup..."));
          config.isReconfiguring = true;
        }
      } else {
        // Non-interactive mode - just use existing credentials
        logger.always(
          chalk.green(
            "✅ Setup complete! Using existing Anthropic configuration.",
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
        logger.always(chalk.yellow("📋 To get your Anthropic API key:"));
        logger.always("1. Visit: https://console.anthropic.com/");
        logger.always("2. Sign in to your Anthropic account");
        logger.always("3. Go to 'API Keys' section");
        logger.always(
          "4. Click 'Create Key' and copy the API key (starts with sk-ant-)",
        );
        logger.always("");

        const { apiKey } = await inquirer.prompt([
          {
            type: "password",
            name: "apiKey",
            message: "Enter your Anthropic API key:",
            validate: validateApiKey,
          },
        ]);

        config.apiKey = apiKey.trim();
      } else if (isReconfiguring) {
        // API key exists and user is reconfiguring - ask if they want to change it
        const apiKey = process.env.ANTHROPIC_API_KEY;
        const { wantsChangeApiKey } = await inquirer.prompt([
          {
            type: "confirm",
            name: "wantsChangeApiKey",
            message: `Do you want to change the Anthropic API key? (current: ${apiKey ? maskCredential(apiKey) : "****"})`,
            default: false,
          },
        ]);

        if (wantsChangeApiKey) {
          logger.always("");
          logger.always(chalk.yellow("📋 To get your Anthropic API key:"));
          logger.always("1. Visit: https://console.anthropic.com/");
          logger.always("2. Sign in to your Anthropic account");
          logger.always("3. Go to 'API Keys' section");
          logger.always(
            "4. Click 'Create Key' and copy the API key (starts with sk-ant-)",
          );
          logger.always("");

          const { apiKey } = await inquirer.prompt([
            {
              type: "password",
              name: "apiKey",
              message: "Enter your new Anthropic API key (replacing existing):",
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
            ? `Do you want to change the Anthropic model? (current: ${process.env.ANTHROPIC_MODEL})`
            : "Do you want to specify an Anthropic model? (optional)",
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
        chalk.yellow("💡 Run without --non-interactive to configure Anthropic"),
      );
      return;
    }

    // Step 4: Update .env file
    if (config.apiKey || config.model) {
      await updateEnvFile(config);

      logger.always(chalk.green("✅ Anthropic setup complete!"));
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
    logger.error(chalk.red("❌ Anthropic setup failed:"));
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
    logger.always(chalk.green("✔ ANTHROPIC_API_KEY found in environment"));
  } else {
    logger.always(chalk.red("✘ ANTHROPIC_API_KEY not found"));
  }

  if (hasModel) {
    logger.always(
      chalk.green(`✔ ANTHROPIC_MODEL found: ${process.env.ANTHROPIC_MODEL}`),
    );
  } else {
    logger.always(
      chalk.yellow(
        "⚠ ANTHROPIC_MODEL not set (will use claude-3-5-sonnet-20241022 default)",
      ),
    );
  }
}

/**
 * Validate Anthropic API key format
 */
function validateApiKey(input: string): boolean | string {
  if (!input.trim()) {
    return "Anthropic API key is required";
  }

  const trimmed = input.trim();

  if (!trimmed.startsWith("sk-ant-")) {
    return "Anthropic API key should start with 'sk-ant-'";
  }

  if (trimmed.length < 20) {
    return "Anthropic API key seems too short";
  }

  // Basic format check: sk-ant-[random string]
  if (!/^sk-ant-[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return "Invalid Anthropic API key format";
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
      message: "Select an Anthropic Claude model:",
      choices: getTopModelChoices(AIProviderName.ANTHROPIC, 5),
    },
  ]);

  if (modelChoice === "custom") {
    const { customModel } = await inquirer.prompt([
      {
        type: "input",
        name: "customModel",
        message: "Enter your custom Anthropic model name:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Model name is required";
          }
          // Basic validation - Anthropic models typically follow certain patterns
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
 * Update .env file with Anthropic configuration
 */
async function updateEnvFile(config: AnthropicConfig): Promise<void> {
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

    // Update Anthropic variables
    if (config.apiKey) {
      existingVars.set("ANTHROPIC_API_KEY", config.apiKey);
    }
    if (config.model) {
      existingVars.set("ANTHROPIC_MODEL", config.model);
    }

    // Reconstruct .env content preserving structure
    const newEnvLines: string[] = [];

    // Add non-variable lines first (comments, empty lines)
    for (const line of otherLines) {
      newEnvLines.push(line);
    }

    // Add separator comment for Anthropic if needed
    if (
      (config.apiKey || config.model) &&
      !envContent.includes("ANTHROPIC CONFIGURATION") &&
      !envContent.includes("# Anthropic")
    ) {
      if (
        newEnvLines.length > 0 &&
        newEnvLines[newEnvLines.length - 1].trim()
      ) {
        newEnvLines.push("");
      }
      newEnvLines.push("# Anthropic Configuration");
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
  const knownPrefixes = ["sk-ant-"];
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
    chalk.green("🚀 You can now use Anthropic Claude with the NeuroLink CLI:"),
  );
  logger.always(
    chalk.cyan(
      "   pnpm cli generate 'Hello from Claude!' --provider anthropic",
    ),
  );
  logger.always(
    chalk.cyan(
      "   pnpm cli generate 'Explain quantum computing' --provider anthropic",
    ),
  );
  logger.always(
    chalk.cyan(
      "   pnpm cli generate 'Analyze this data' --provider anthropic --enable-analytics",
    ),
  );
}

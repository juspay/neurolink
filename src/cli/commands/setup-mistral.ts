import type { Arguments, CommandBuilder } from "yargs";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import { logger } from "../../lib/utils/logger.js";
import { getTopModelChoices } from "../../lib/utils/modelChoices.js";
import { AIProviderName } from "../../lib/types/index.js";

interface SetupMistralArgs {
  check?: boolean;
  "non-interactive"?: boolean;
}

/**
 * Validates Mistral API key format
 * Mistral keys typically start with "sk-" and contain base62 plus "-" or "_".
 */
function validateMistralApiKey(apiKey: string): boolean {
  const key = apiKey.trim();
  return /^sk-[A-Za-z0-9_-]{20,}$/.test(key);
}

/**
 * Safely parse and reconstruct .env file content
 */
function updateEnvFile(updates: Record<string, string>): void {
  const envPath = path.resolve(process.cwd(), ".env");
  let envContent = "";

  // Read existing .env if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  // Parse existing environment variables
  const envLines: string[] = envContent.split("\n");
  const envVars = new Map<string, { value: string; lineIndex: number }>();

  // Track which variables we found and their positions
  envLines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const equalIndex = trimmed.indexOf("=");
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex);
        const value = trimmed.substring(equalIndex + 1);
        envVars.set(key, { value, lineIndex: index });
      }
    }
  });

  // Update existing variables or add new ones
  for (const [key, newValue] of Object.entries(updates)) {
    const existing = envVars.get(key);
    if (existing) {
      // Update existing variable
      envLines[existing.lineIndex] = `${key}=${newValue}`;
    } else {
      // Add new variable
      envLines.push(`${key}=${newValue}`);
    }
  }

  // Write updated content
  fs.writeFileSync(envPath, envLines.join("\n"));
}

/**
 * Check current Mistral AI configuration
 */
function checkMistralConfig(): {
  hasApiKey: boolean;
  hasModel: boolean;
  apiKey?: string;
  model?: string;
  isValid: boolean;
} {
  const apiKey = process.env.MISTRAL_API_KEY;
  const model = process.env.MISTRAL_MODEL;

  const hasApiKey = !!apiKey;
  const hasModel = !!model;
  const isValid = typeof apiKey === "string" && validateMistralApiKey(apiKey);

  return {
    hasApiKey,
    hasModel,
    apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : undefined,
    model,
    isValid,
  };
}

export const handleMistralSetup = async (
  argv: Arguments<SetupMistralArgs>,
): Promise<void> => {
  const spinner = ora();

  try {
    spinner.start("Checking Mistral AI configuration...");
    const config = checkMistralConfig();
    spinner.stop();

    // Display current status
    logger.always(chalk.bold.blue("\n🧠 Mistral AI Configuration Status\n"));

    logger.always(
      `${config.hasApiKey ? "✅" : "❌"} API Key: ${
        config.apiKey || "Not set"
      }`,
    );
    logger.always(
      `${config.hasModel ? "✅" : "⚠️"} Model: ${
        config.model || "Not set (will use default)"
      }`,
    );

    if (config.isValid) {
      logger.always(chalk.green("\n✅ Mistral AI is properly configured!"));

      if (argv.check) {
        return;
      }

      const { shouldReconfigure } = await inquirer.prompt([
        {
          type: "confirm",
          name: "shouldReconfigure",
          message:
            "Configuration looks good. Do you want to reconfigure anyway?",
          default: false,
        },
      ]);

      if (!shouldReconfigure) {
        logger.always(chalk.green("✅ Keeping existing configuration."));
        return;
      }
    } else {
      logger.always(chalk.yellow("\n⚠️ Mistral AI configuration needs setup."));

      if (argv.check) {
        process.exit(1);
      }
    }

    if (argv["non-interactive"]) {
      logger.always(
        chalk.yellow("Non-interactive mode: Skipping configuration setup."),
      );
      logger.always(chalk.blue("Please set MISTRAL_API_KEY manually."));
      return;
    }

    // Interactive setup
    logger.always(chalk.blue("\n🛠️ Let's configure Mistral AI!\n"));

    // Show instructions for getting API key
    logger.always(chalk.yellow("📋 To get your Mistral AI API key:"));
    logger.always("1. Visit: https://console.mistral.ai/");
    logger.always("2. Sign up or sign in to your account");
    logger.always("3. Go to 'API Keys' section");
    logger.always("4. Create a new API key");
    logger.always("5. Copy the API key\n");

    // Step 1: API Key
    const { apiKey } = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "Enter your Mistral AI API key:",
        mask: "*",
        validate: (input: string) => {
          if (!input.trim()) {
            return "API key is required";
          }
          if (!validateMistralApiKey(input.trim())) {
            return "Invalid API key format. Should be alphanumeric and at least 20 characters";
          }
          return true;
        },
      },
    ]);

    // Step 2: Model Selection
    const { modelChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "modelChoice",
        message: "Select a Mistral model:",
        choices: getTopModelChoices(AIProviderName.MISTRAL, 5),
      },
    ]);

    let selectedModel = modelChoice;
    if (modelChoice === "custom") {
      const { customModel } = await inquirer.prompt([
        {
          type: "input",
          name: "customModel",
          message: "Enter custom Mistral model name:",
          validate: (input: string) => {
            const trimmed = input.trim();
            if (!trimmed) {
              return "Model name is required";
            }
            return true;
          },
        },
      ]);
      selectedModel = customModel.trim();
    }

    // Save configuration
    spinner.start("Saving configuration...");

    const updates: Record<string, string> = {
      MISTRAL_API_KEY: apiKey.trim(),
      MISTRAL_MODEL: selectedModel,
    };

    updateEnvFile(updates);
    spinner.stop();

    logger.always(
      chalk.green("\n✅ Mistral AI configuration saved successfully!"),
    );
    logger.always(chalk.blue("\n📖 Usage examples:"));
    logger.always(
      chalk.gray(
        '   neurolink generate "Hello, how are you?" --provider mistral',
      ),
    );
    logger.always(
      chalk.gray(
        `   neurolink generate "Explain quantum physics" --provider mistral --model ${selectedModel}`,
      ),
    );
    logger.always(chalk.blue("\n🔗 Resources:"));
    logger.always(
      chalk.gray("   • Mistral AI Console: https://console.mistral.ai/"),
    );
    logger.always(
      chalk.gray("   • API Documentation: https://docs.mistral.ai/"),
    );
    logger.always(
      chalk.gray(
        "   • Model Information: https://docs.mistral.ai/getting-started/models/",
      ),
    );
    logger.always(chalk.blue("\n💡 Features:"));
    logger.always(chalk.gray("   • European GDPR-compliant AI"));
    logger.always(chalk.gray("   • Multilingual support"));
    logger.always(chalk.gray("   • Fast inference speeds"));
  } catch (error) {
    spinner.stop();
    logger.error("Mistral AI setup failed", error as Error);
    throw error;
  }
};

export const setupMistralBuilder: CommandBuilder = {
  check: {
    type: "boolean",
    describe: "Only check existing configuration without prompting",
    default: false,
  },
  "non-interactive": {
    type: "boolean",
    describe: "Skip interactive prompts",
    default: false,
  },
};

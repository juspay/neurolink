import type { Arguments, CommandBuilder } from "yargs";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { logger } from "../../lib/utils/logger.js";
import {
  updateEnvFile as writeEnvFile,
  displayEnvUpdateSummary,
} from "../utils/envManager.js";

type SetupHuggingFaceArgs = {
  check?: boolean;
  "non-interactive"?: boolean;
};

/**
 * Validates Hugging Face API key format
 * Must start with "hf_" prefix
 */
function validateHuggingFaceApiKey(apiKey: string): boolean {
  return (
    typeof apiKey === "string" && apiKey.startsWith("hf_") && apiKey.length > 10
  );
}

/**
 * Check current Hugging Face configuration
 */
function checkHuggingFaceConfig(): {
  hasApiKey: boolean;
  hasModel: boolean;
  apiKey?: string;
  model?: string;
  isValid: boolean;
} {
  const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  const model = process.env.HUGGINGFACE_MODEL;

  const hasApiKey = !!apiKey;
  const hasModel = !!model;
  const isValid = hasApiKey && validateHuggingFaceApiKey(apiKey);

  return {
    hasApiKey,
    hasModel,
    apiKey: apiKey ? `hf_${"*".repeat(6)}` : undefined,
    model,
    isValid,
  };
}

export const handleHuggingFaceSetup = async (
  argv: Arguments<SetupHuggingFaceArgs>,
): Promise<void> => {
  const spinner = ora();

  try {
    spinner.start("Checking Hugging Face configuration...");
    const config = checkHuggingFaceConfig();
    spinner.stop();

    // Display current status
    logger.always(chalk.bold.blue("\n🤗 Hugging Face Configuration Status\n"));

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
      logger.always(chalk.green("\n✅ Hugging Face is properly configured!"));

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
      logger.always(
        chalk.yellow("\n⚠️ Hugging Face configuration needs setup."),
      );

      if (argv.check) {
        throw new Error("Hugging Face configuration is incomplete");
      }
    }

    if (argv["non-interactive"]) {
      logger.always(
        chalk.yellow("Non-interactive mode: Skipping configuration setup."),
      );
      logger.always(chalk.blue("Please set HUGGINGFACE_API_KEY manually."));
      return;
    }

    // Interactive setup
    logger.always(chalk.blue("\n🛠️ Let's configure Hugging Face!\n"));

    // Step 1: API Key
    const { apiKey } = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "Enter your Hugging Face API token:",
        mask: "*",
        validate: (input: string) => {
          if (!input.trim()) {
            return "API token is required";
          }
          if (!validateHuggingFaceApiKey(input.trim())) {
            return "Invalid API token format. Must start with 'hf_'";
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
        message: "Select a Hugging Face model:",
        choices: [
          {
            name: "Skip - use default (microsoft/DialoGPT-large)",
            value: "default",
          },
          {
            name: "microsoft/DialoGPT-large (Conversational AI - Recommended)",
            value: "microsoft/DialoGPT-large",
          },
          {
            name: "microsoft/DialoGPT-medium (Faster, smaller)",
            value: "microsoft/DialoGPT-medium",
          },
          {
            name: "facebook/blenderbot-400M-distill (General purpose)",
            value: "facebook/blenderbot-400M-distill",
          },
          {
            name: "microsoft/DialoGPT-small (Fastest)",
            value: "microsoft/DialoGPT-small",
          },
          {
            name: "Custom model name",
            value: "custom",
          },
        ],
        default: "default",
      },
    ]);

    let selectedModel: string | undefined;
    if (modelChoice === "custom") {
      const { customModel } = await inquirer.prompt([
        {
          type: "input",
          name: "customModel",
          message: "Enter custom model name:",
          validate: (input: string) => {
            const trimmed = input.trim();
            if (!trimmed) {
              return "Model name is required";
            }
            if (!trimmed.includes("/")) {
              return "Model name should include organization (e.g., 'microsoft/DialoGPT-large')";
            }
            return true;
          },
        },
      ]);
      selectedModel = customModel.trim();
    } else if (modelChoice !== "default") {
      selectedModel = modelChoice;
    }
    // If modelChoice === "default", selectedModel remains undefined

    // Save configuration
    spinner.start("Saving configuration...");

    const updates: Record<string, string> = {
      HUGGINGFACE_API_KEY: apiKey.trim(),
    };

    // Only set model if user didn't choose default
    if (selectedModel) {
      updates.HUGGINGFACE_MODEL = selectedModel;
    }

    try {
      const result = writeEnvFile(updates);
      spinner.stop();

      // Display update summary
      displayEnvUpdateSummary(result, false);

      logger.always(
        chalk.green("\n✅ Hugging Face configuration saved successfully!"),
      );
    } catch (envError) {
      spinner.stop();
      throw new Error(
        `Failed to save configuration: ${envError instanceof Error ? envError.message : String(envError)}`,
      );
    }
    logger.always(chalk.blue("\n📖 Usage examples:"));
    logger.always(
      chalk.gray(
        '   neurolink generate "Hello, how are you?" --provider huggingface',
      ),
    );
    if (selectedModel) {
      logger.always(
        chalk.gray(
          `   neurolink generate "Tell me a story" --provider huggingface --model ${selectedModel}`,
        ),
      );
    } else {
      logger.always(
        chalk.gray(
          '   neurolink generate "Tell me a story" --provider huggingface',
        ),
      );
      logger.always(
        chalk.gray(
          '   neurolink generate "Explain AI" --provider huggingface --model microsoft/DialoGPT-medium',
        ),
      );
    }
    logger.always(chalk.blue("\n🔗 Resources:"));
    logger.always(
      chalk.gray("   • Hugging Face Models: https://huggingface.co/models"),
    );
    logger.always(
      chalk.gray(
        "   • API Documentation: https://huggingface.co/docs/api-inference",
      ),
    );
    logger.always(
      chalk.gray("   • Get API Token: https://huggingface.co/settings/tokens"),
    );
  } catch (error) {
    spinner.stop();
    logger.error("Hugging Face setup failed", error as Error);
    throw error;
  }
};

export const setupHuggingFaceBuilder: CommandBuilder = {
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

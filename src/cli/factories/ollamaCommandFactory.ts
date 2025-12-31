import type { Argv, CommandModule } from "yargs";
import {
  spawnSync,
  type SpawnSyncReturns,
  type SpawnSyncOptions,
  type SpawnSyncOptionsWithStringEncoding,
} from "child_process";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

import { logger } from "../../lib/utils/logger.js";
import { OllamaUtils } from "../utils/ollamaUtils.js";
import { getTopModelChoices } from "../../lib/utils/modelChoices.js";
import { AIProviderName } from "../../lib/types/index.js";

// Allowed commands for security
type AllowedCommand =
  | "ollama"
  | "curl"
  | "systemctl"
  | "pkill"
  | "killall"
  | "open"
  | "taskkill"
  | "start";

/**
 * Factory for creating Ollama CLI commands using the Factory Pattern
 */
export class OllamaCommandFactory {
  /**
   * Secure wrapper around spawnSync to prevent command injection.
   */
  private static safeSpawn(
    command: AllowedCommand,
    args: string[],
    options: SpawnSyncOptions = {},
  ): SpawnSyncReturns<string> {
    // Command validation is now handled by TypeScript with AllowedCommand type
    const defaultOptions: SpawnSyncOptionsWithStringEncoding = {
      ...options,
      encoding: "utf8", // Always enforce utf8 encoding
    };
    return spawnSync(command, args, defaultOptions);
  }

  /**
   * Create the Ollama command group
   */
  public static createOllamaCommands(): CommandModule {
    return {
      command: "ollama <command>",
      describe: "Manage Ollama local AI models",
      builder: (yargs: Argv) => {
        return yargs
          .command(
            "list-models",
            "List installed Ollama models",
            {},
            this.listModelsHandler,
          )
          .command(
            "pull <model>",
            "Download an Ollama model",
            {
              model: {
                describe: "Model name to download",
                type: "string",
                demandOption: true,
              },
            },
            this.pullModelHandler,
          )
          .command(
            "remove <model>",
            "Remove an Ollama model",
            {
              model: {
                describe: "Model name to remove",
                type: "string",
                demandOption: true,
              },
            },
            this.removeModelHandler,
          )
          .command(
            "status",
            "Check Ollama service status",
            {},
            this.statusHandler,
          )
          .command("start", "Start Ollama service", {}, this.startHandler)
          .command("stop", "Stop Ollama service", {}, this.stopHandler)
          .command("setup", "Interactive Ollama setup", {}, this.setupHandler)
          .demandCommand(1, "Please specify a command");
      },
      handler: () => {}, // No-op handler as subcommands handle everything
    };
  }

  /**
   * Handler for listing installed models
   */
  private static async listModelsHandler() {
    const spinner = ora("Fetching installed models...").start();
    try {
      const res = this.safeSpawn("ollama", ["list"]);
      if (res.error || res.status !== 0) {
        throw res.error || new Error(res.stderr);
      }

      spinner.succeed("Installed models:");
      const output = res.stdout.trim();

      if (output) {
        logger.always(output);
      } else {
        logger.always(
          chalk.yellow(
            'No models installed. Use "neurolink ollama pull <model>" to download a model.',
          ),
        );
      }
    } catch (error: unknown) {
      spinner.fail("Failed to list models. Is Ollama installed?");
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(chalk.red("Error:", errorMessage));
      logger.always(chalk.blue("\nTip: Install Ollama from https://ollama.ai"));
      process.exit(1);
    }
  }

  /**
   * Handler for pulling/downloading models
   */
  private static async pullModelHandler(argv: { model: string }) {
    const { model } = argv;
    logger.always(chalk.blue(`Downloading model: ${model}`));
    logger.always(chalk.gray("This may take several minutes..."));

    try {
      const res = this.safeSpawn("ollama", ["pull", model], {
        stdio: "inherit",
      });
      if (res.error || res.status !== 0) {
        throw res.error || new Error("pull failed");
      }

      logger.always(chalk.green(`\n✅ Successfully downloaded ${model}`));
      logger.always(
        chalk.blue(
          `\nTest it with: npx @juspay/neurolink generate "Hello!" --provider ollama --model ${model}`,
        ),
      );
    } catch (error: unknown) {
      logger.error(chalk.red(`\n❌ Failed to download ${model}`));
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(chalk.red("Error:", errorMessage));
      process.exit(1);
    }
  }

  /**
   * Handler for removing models
   */
  private static async removeModelHandler(argv: { model: string }) {
    const { model } = argv;

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `Are you sure you want to remove model "${model}"?`,
        default: false,
      },
    ]);

    if (!confirm) {
      logger.always(chalk.yellow("Removal cancelled."));
      return;
    }

    const spinner = ora(`Removing model ${model}...`).start();
    try {
      const res = this.safeSpawn("ollama", ["rm", model]);
      if (res.error || res.status !== 0) {
        throw res.error || new Error(res.stderr);
      }

      spinner.succeed(`Successfully removed ${model}`);
    } catch (error: unknown) {
      spinner.fail(`Failed to remove ${model}`);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(chalk.red("Error:", errorMessage));
      process.exit(1);
    }
  }

  /**
   * Handler for checking Ollama service status
   */
  private static async statusHandler() {
    const spinner = ora("Checking Ollama service status...").start();

    try {
      const res = this.safeSpawn("ollama", ["list"]);
      if (res.error || res.status !== 0) {
        throw res.error || new Error(res.stderr);
      }

      spinner.succeed("Ollama service is running");

      // Attempt to get model list with retry logic for JSON parsing
      let modelsData: { models?: { name: string }[] } | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const curlRes = this.safeSpawn("curl", [
            "-s",
            "http://localhost:11434/api/tags",
          ]);
          if (!curlRes.error && curlRes.status === 0 && curlRes.stdout.trim()) {
            try {
              modelsData = JSON.parse(curlRes.stdout);
              break; // Success, exit retry loop
            } catch (jsonError) {
              logger.debug(
                `JSON parse failed on attempt ${attempt}: ${jsonError}`,
              );
              if (attempt < 3) {
                // Brief delay before retry
                await new Promise((resolve) => setTimeout(resolve, 500));
                continue;
              }
              // Final attempt failed, log warning but don't throw
              logger.debug(
                "Failed to parse Ollama API response after 3 attempts",
              );
            }
          }
        } catch (curlError) {
          logger.debug(`Curl failed on attempt ${attempt}: ${curlError}`);
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      // Display model count if we got valid data
      if (modelsData?.models && modelsData.models.length > 0) {
        logger.always(
          chalk.green(`\n${modelsData.models.length} models available`),
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.debug("Error:", errorMessage);
      spinner.fail("Ollama service is not running");
      logger.always(chalk.yellow("\nStart Ollama with: ollama serve"));
      logger.always(
        chalk.blue("Or restart the Ollama app if using the desktop version"),
      );
      process.exit(1);
    }
  }

  /**
   * Handler for starting Ollama service
   */
  private static async startHandler() {
    try {
      await OllamaUtils.startOllamaService();
    } catch (error) {
      logger.error("Failed to start Ollama service:", error);
      throw error;
    }
  }

  /**
   * Handler for stopping Ollama service
   */
  private static async stopHandler() {
    const spinner = ora("Stopping Ollama service...").start();

    try {
      if (process.platform === "darwin") {
        try {
          this.safeSpawn("pkill", ["ollama"]);
        } catch {
          this.safeSpawn("killall", ["Ollama"]);
        }
      } else if (process.platform === "linux") {
        try {
          this.safeSpawn("systemctl", ["stop", "ollama"]);
        } catch {
          this.safeSpawn("pkill", ["ollama"]);
        }
      } else {
        this.safeSpawn("taskkill", ["/F", "/IM", "ollama.exe"]);
      }

      spinner.succeed("Ollama service stopped");
    } catch (err) {
      spinner.fail("Failed to stop Ollama service");
      logger.error(chalk.red("It may not be running or requires manual stop"));
      logger.error(chalk.red(`Error details: ${err}`));
    }
  }

  /**
   * Handler for interactive Ollama setup
   */
  private static async setupHandler() {
    logger.always(chalk.blue("🦙 Welcome to Ollama Setup!\n"));

    const checkSpinner = ora("Checking Ollama installation...").start();
    let isInstalled = false;

    try {
      const res = this.safeSpawn("ollama", ["--version"]);
      if (!res.error && res.status === 0) {
        isInstalled = true;
        checkSpinner.succeed("Ollama is installed");
      } else {
        throw new Error(res.stderr);
      }
    } catch {
      checkSpinner.fail("Ollama is not installed");
    }

    if (!isInstalled) {
      logger.always(chalk.yellow("\nOllama needs to be installed first."));
      logger.always(chalk.blue("\nInstallation instructions:"));

      if (process.platform === "darwin") {
        logger.always("\nFor macOS:");
        logger.always(chalk.gray("  brew install ollama"));
        logger.always(chalk.gray("  # or download from https://ollama.ai"));
      } else if (process.platform === "linux") {
        logger.always("\nFor Linux:");
        logger.always(
          chalk.gray("  curl -fsSL https://ollama.ai/install.sh | sh"),
        );
      } else {
        logger.always("\nFor Windows:");
        logger.always(chalk.gray("  Download from https://ollama.ai"));
      }

      const { proceedAnyway } = await inquirer.prompt([
        {
          type: "confirm",
          name: "proceedAnyway",
          message: "Would you like to continue with setup anyway?",
          default: false,
        },
      ]);

      if (!proceedAnyway) {
        logger.always(chalk.blue("\nInstall Ollama and run setup again!"));
        return;
      }
    }

    let serviceRunning = false;
    try {
      const res = this.safeSpawn("ollama", ["list"]);
      if (!res.error && res.status === 0) {
        serviceRunning = true;
        logger.always(chalk.green("\n✅ Ollama service is running"));
      }
    } catch {
      logger.always(chalk.yellow("\n⚠️  Ollama service is not running"));

      const { startService } = await inquirer.prompt([
        {
          type: "confirm",
          name: "startService",
          message: "Would you like to start the Ollama service?",
          default: true,
        },
      ]);

      if (startService) {
        await this.startHandler();
        serviceRunning = true;
      }
    }

    if (serviceRunning) {
      logger.always(chalk.blue("\n📦 Popular Ollama models:"));
      logger.always("  • llama2 (7B) - General purpose");
      logger.always("  • codellama (7B) - Code generation");
      logger.always("  • mistral (7B) - Fast and efficient");
      logger.always("  • tinyllama (1B) - Lightweight");
      logger.always("  • phi (2.7B) - Microsoft's compact model");

      const { downloadModel } = await inquirer.prompt([
        {
          type: "confirm",
          name: "downloadModel",
          message: "Would you like to download a model?",
          default: true,
        },
      ]);

      if (downloadModel) {
        const { selectedModel } = await inquirer.prompt([
          {
            type: "list",
            name: "selectedModel",
            message: "Select a model to download:",
            choices: getTopModelChoices(AIProviderName.OLLAMA, 5).map(
              (choice) =>
                choice.value === "custom"
                  ? { name: "Other (enter manually)", value: "other" }
                  : choice,
            ),
          },
        ]);

        let modelToDownload = selectedModel;

        if (selectedModel === "other") {
          const { customModel } = await inquirer.prompt([
            {
              type: "input",
              name: "customModel",
              message: "Enter the model name:",
              validate: (input) =>
                input.trim().length > 0 || "Model name is required",
            },
          ]);
          modelToDownload = customModel;
        }

        await this.pullModelHandler({ model: modelToDownload });
      }
    }

    logger.always(chalk.green("\n✅ Setup complete!\n"));
    logger.always(chalk.blue("Next steps:"));
    logger.always(
      "1. List models: " + chalk.gray("neurolink ollama list-models"),
    );
    logger.always(
      "2. Generate text: " +
        chalk.gray('neurolink generate "Hello!" --provider ollama'),
    );
    logger.always(
      "3. Use specific model: " +
        chalk.gray(
          'neurolink generate "Hello!" --provider ollama --model codellama',
        ),
    );
    logger.always(
      chalk.gray(
        "\nFor more information, see: https://docs.neurolink.ai/providers/ollama",
      ),
    );
  }
}

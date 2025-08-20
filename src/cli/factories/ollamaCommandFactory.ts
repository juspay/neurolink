import type { Argv, CommandModule } from "yargs";
import { execSync } from "child_process";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

import { logger } from "../../lib/utils/logger.js";

/**
 * Factory for creating Ollama CLI commands using the Factory Pattern
 */
export class OllamaCommandFactory {
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
      const output = execSync("ollama list", { encoding: "utf8" });
      spinner.succeed("Installed models:");

      if (output.trim()) {
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
      execSync(`ollama pull ${model}`, { stdio: "inherit" });
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

    // Confirm removal
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
      execSync(`ollama rm ${model}`, { encoding: "utf8" });
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
      // Try to run a simple command
      execSync("ollama list", { encoding: "utf8" });
      spinner.succeed("Ollama service is running");

      // Get additional info
      try {
        const response = execSync("curl -s http://localhost:11434/api/tags", {
          encoding: "utf8",
        });
        const data = JSON.parse(response);
        if (data.models && data.models.length > 0) {
          logger.always(
            chalk.green(`\n${data.models.length} models available`),
          );
        }
      } catch (error) {
        // Curl might not be available, that's ok. Error is ignored.
        logger.debug &&
          logger.debug("Optional curl command failed in statusHandler:", error);
      }
    } catch (error: unknown) {
      spinner.fail("Ollama service is not running");
      logger.debug && logger.debug("Ollama status check failed:", error);
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
    logger.always(chalk.blue("Starting Ollama service..."));

    try {
      // Check if already running
      try {
        execSync("ollama list", { encoding: "utf8" });
        logger.always(chalk.yellow("Ollama service is already running!"));
        return;
      } catch {
        // Not running, continue to start
      }

      // Different approaches for different platforms
      if (process.platform === "darwin") {
        // macOS
        logger.always(chalk.gray("Starting Ollama on macOS..."));
        try {
          execSync("open -a Ollama");
          logger.always(chalk.green("✅ Ollama app started"));
        } catch {
          // Try service command
          execSync("ollama serve > /dev/null 2>&1 &", { stdio: "ignore" });
          logger.always(chalk.green("✅ Ollama service started"));
        }
      } else if (process.platform === "linux") {
        // Linux
        logger.always(chalk.gray("Starting Ollama service on Linux..."));
        try {
          execSync("systemctl start ollama", { encoding: "utf8" });
          logger.always(chalk.green("✅ Ollama service started"));
        } catch {
          // Try direct command
          execSync("ollama serve > /dev/null 2>&1 &", { stdio: "ignore" });
          logger.always(chalk.green("✅ Ollama service started"));
        }
      } else {
        // Windows
        logger.always(chalk.gray("Starting Ollama on Windows..."));
        execSync("start ollama serve", { stdio: "ignore" });
        logger.always(chalk.green("✅ Ollama service started"));
      }

      logger.always(
        chalk.blue("\nWait a few seconds for the service to initialize..."),
      );
    } catch (error: unknown) {
      logger.error(chalk.red("Failed to start Ollama service"));
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(chalk.red("Error:", errorMessage));
      logger.always(
        chalk.blue("\nTry starting Ollama manually or check installation"),
      );
      process.exit(1);
    }
  }

  /**
   * Handler for stopping Ollama service
   */
  private static async stopHandler() {
    const spinner = ora("Stopping Ollama service...").start();

    try {
      if (process.platform === "darwin") {
        // macOS
        try {
          execSync("pkill ollama", { encoding: "utf8" });
        } catch {
          execSync("killall Ollama", { encoding: "utf8" });
        }
      } else if (process.platform === "linux") {
        // Linux
        try {
          execSync("systemctl stop ollama", { encoding: "utf8" });
        } catch {
          execSync("pkill ollama", { encoding: "utf8" });
        }
      } else {
        // Windows
        execSync("taskkill /F /IM ollama.exe", { encoding: "utf8" });
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

    // Check if Ollama is installed
    const checkSpinner = ora("Checking Ollama installation...").start();
    let isInstalled = false;

    try {
      execSync("ollama --version", { encoding: "utf8" });
      isInstalled = true;
      checkSpinner.succeed("Ollama is installed");
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

    // Check if service is running
    let serviceRunning = false;
    try {
      execSync("ollama list", { encoding: "utf8" });
      serviceRunning = true;
      logger.always(chalk.green("\n✅ Ollama service is running"));
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
      // List available models
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
            choices: [
              {
                name: "llama2 (7B) - Recommended for general use",
                value: "llama2",
              },
              {
                name: "codellama (7B) - Best for code generation",
                value: "codellama",
              },
              { name: "mistral (7B) - Fast and efficient", value: "mistral" },
              {
                name: "tinyllama (1B) - Lightweight, fast",
                value: "tinyllama",
              },
              { name: "phi (2.7B) - Microsoft's compact model", value: "phi" },
              { name: "Other (enter manually)", value: "other" },
            ],
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

    // Final instructions
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

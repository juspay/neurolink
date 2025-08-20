import type { Argv, CommandModule } from "yargs";
import { spawnSync } from "child_process";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

import { logger } from "../../lib/utils/logger.js";

/**
 * Factory for creating Ollama CLI commands using the Factory Pattern
 */
export class OllamaCommandFactory {
  /**
   * Secure wrapper around spawnSync to prevent command injection.
   */
  private static safeSpawn(command: string, args: string[], options: any = {}) {
    const allowedCommands = [
      "ollama",
      "curl",
      "systemctl",
      "pkill",
      "killall",
      "open",
      "taskkill",
      "start",
    ];
    if (!allowedCommands.includes(command)) {
      throw new Error(`[SECURE] Command not allowed: ${command}`);
    }
    return spawnSync(command, args, { encoding: "utf8", ...options });
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
      if (res.error || res.status !== 0) throw res.error || new Error(res.stderr);

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
      const res = this.safeSpawn("ollama", ["pull", model], { stdio: "inherit" });
      if (res.error || res.status !== 0) throw res.error || new Error("pull failed");

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
      if (res.error || res.status !== 0) throw res.error || new Error(res.stderr);

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
      if (res.error || res.status !== 0) throw res.error || new Error(res.stderr);

      spinner.succeed("Ollama service is running");

      try {
        const curlRes = this.safeSpawn("curl", ["-s", "http://localhost:11434/api/tags"]);
        if (!curlRes.error && curlRes.status === 0) {
          const data = JSON.parse(curlRes.stdout);
          if (data.models && data.models.length > 0) {
            logger.always(chalk.green(`\n${data.models.length} models available`));
          }
        }
      } catch {
        // Ignore curl errors
      }
    } catch (error: unknown) {
      spinner.fail("Ollama service is not running");
      logger.always(chalk.yellow("\nStart Ollama with: ollama serve"));
      logger.always(chalk.blue("Or restart the Ollama app if using the desktop version"));
      process.exit(1);
    }
  }

  /**
   * Handler for starting Ollama service
   */
  private static async startHandler() {
    logger.always(chalk.blue("Starting Ollama service..."));

    try {
      const check = this.safeSpawn("ollama", ["list"]);
      if (!check.error && check.status === 0) {
        logger.always(chalk.yellow("Ollama service is already running!"));
        return;
      }

      if (process.platform === "darwin") {
        try {
          this.safeSpawn("open", ["-a", "Ollama"]);
          logger.always(chalk.green("✅ Ollama app started"));
        } catch {
          this.safeSpawn("ollama", ["serve"], { stdio: "ignore", detached: true });
          logger.always(chalk.green("✅ Ollama service started"));
        }
      } else if (process.platform === "linux") {
        try {
          this.safeSpawn("systemctl", ["start", "ollama"]);
          logger.always(chalk.green("✅ Ollama service started"));
        } catch {
          this.safeSpawn("ollama", ["serve"], { stdio: "ignore", detached: true });
          logger.always(chalk.green("✅ Ollama service started"));
        }
      } else {
        this.safeSpawn("start", ["ollama", "serve"], { stdio: "ignore", shell: true });
        logger.always(chalk.green("✅ Ollama service started"));
      }

      logger.always(chalk.blue("\nWait a few seconds for the service to initialize..."));
    } catch (error: unknown) {
      logger.error(chalk.red("Failed to start Ollama service"));
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(chalk.red("Error:", errorMessage));
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
        logger.always(chalk.gray("  curl -fsSL https://ollama.ai/install.sh | sh"));
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
            choices: [
              { name: "llama2 (7B) - Recommended for general use", value: "llama2" },
              { name: "codellama (7B) - Best for code generation", value: "codellama" },
              { name: "mistral (7B) - Fast and efficient", value: "mistral" },
              { name: "tinyllama (1B) - Lightweight, fast", value: "tinyllama" },
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

    logger.always(chalk.green("\n✅ Setup complete!\n"));
    logger.always(chalk.blue("Next steps:"));
    logger.always("1. List models: " + chalk.gray("neurolink ollama list-models"));
    logger.always("2. Generate text: " + chalk.gray('neurolink generate "Hello!" --provider ollama'));
    logger.always("3. Use specific model: " + chalk.gray('neurolink generate "Hello!" --provider ollama --model codellama'));
    logger.always(chalk.gray("\nFor more information, see: https://docs.neurolink.ai/providers/ollama"));
  }
}
